"""Preview a study plan, or explicitly send it via QQ SMTP. Standard library only."""
import argparse
from datetime import date, datetime, timedelta, timezone
from email.message import EmailMessage
from email.utils import format_datetime, make_msgid
import json
import os
from pathlib import Path
import smtplib
import ssl
import sys

CHINA_TIME = timezone(timedelta(hours=8), name="Asia/Shanghai")
DEFAULT_PLAN = Path(__file__).with_name("plan.json")


def load_plan(path):
    with Path(path).open(encoding="utf-8") as plan_file:
        plan = json.load(plan_file)
    if not isinstance(plan, dict) or not isinstance(plan.get("days"), dict):
        raise ValueError("计划文件需要包含 days 对象。")
    for day, tasks in plan["days"].items():
        date.fromisoformat(day)
        if not isinstance(tasks, list) or not all(isinstance(task, str) and task.strip() for task in tasks):
            raise ValueError("每天的任务需要填写为非空字符串列表。")
    fallback = plan.get("default_tasks", [])
    if not isinstance(fallback, list) or not all(isinstance(task, str) and task.strip() for task in fallback):
        raise ValueError("default_tasks 需要是任务列表。")
    if not isinstance(plan.get("project_url", ""), str):
        raise ValueError("project_url 需要是字符串。")
    return plan


def render_plan(plan, target_date):
    tasks = plan["days"].get(target_date.isoformat(), plan.get("default_tasks", []))
    lines = [f"今天是 {target_date.isoformat()}（北京时间）", "", "今天的小目标："]
    lines.extend(f"{index}. {task}" for index, task in enumerate(tasks, start=1))
    if not tasks:
        lines.append("今天尚未安排任务，请更新仓库里的 mail/plan.json。")
    if plan.get("project_url", "").strip():
        lines.extend(["", "学习任务网页：", plan["project_url"].strip()])
    lines.extend(["", "完成一个小步骤后，记得检查修改并保存一个 Git 版本。", "", "行知 · 小步前进，认真完成。"])
    return f"学习计划 | {target_date.isoformat()}", "\n".join(lines)


def checked_address(value, field):
    value = value.strip()
    if any(character in value for character in "\r\n,; ") or value.count("@") != 1:
        raise ValueError(f"{field} 需要填写一个有效邮箱地址。")
    local, domain = value.split("@")
    if not local or "." not in domain or domain.startswith(".") or domain.endswith("."):
        raise ValueError(f"{field} 需要填写一个有效邮箱地址。")
    return value


def send_message(subject, body, environ=None):
    environ = os.environ if environ is None else environ
    required = ("QQ_SMTP_USER", "QQ_SMTP_AUTH_CODE", "MAIL_TO")
    missing = [key for key in required if not environ.get(key, "").strip()]
    if missing:
        raise ValueError("缺少配置：" + ", ".join(missing))
    sender = checked_address(environ["QQ_SMTP_USER"], "QQ_SMTP_USER")
    receiver = checked_address(environ["MAIL_TO"], "MAIL_TO")
    message = EmailMessage()
    message["Subject"] = subject
    message["From"] = sender
    message["To"] = receiver
    message["Date"] = format_datetime(datetime.now(CHINA_TIME))
    message["Message-ID"] = make_msgid()
    message.set_content(body)
    with smtplib.SMTP_SSL("smtp.qq.com", 465, timeout=30, context=ssl.create_default_context()) as smtp:
        smtp.login(sender, environ["QQ_SMTP_AUTH_CODE"].strip())
        refused = smtp.send_message(message)
        if refused:
            raise smtplib.SMTPException("Recipient refused")


def main(argv=None):
    parser = argparse.ArgumentParser(description="预览或发送每日学习计划；默认只预览，不发信。")
    parser.add_argument("--plan", type=Path, default=DEFAULT_PLAN)
    parser.add_argument("--date", type=date.fromisoformat, default=None, help="指定计划日期 YYYY-MM-DD，默认北京时间今天")
    mode = parser.add_mutually_exclusive_group()
    mode.add_argument("--send", action="store_true", help="实际发送，需要三个环境变量")
    mode.add_argument("--dry-run", action="store_true", help="仅预览，不读取发信凭证")
    args = parser.parse_args(argv)
    try:
        plan = load_plan(args.plan)
        target_date = args.date or datetime.now(CHINA_TIME).date()
        subject, body = render_plan(plan, target_date)
        if args.send:
            send_message(subject, body)
            print(f"邮件已提交至 QQ SMTP，计划日期：{target_date.isoformat()}。请在收件箱或垃圾邮件中确认送达。")
        else:
            print(subject + "\n\n" + body)
            print("\n[仅预览：未发送邮件]", file=sys.stderr)
        return 0
    except smtplib.SMTPException:
        print("邮件发送失败，请检查 QQ 邮箱 SMTP 服务、授权码与收件人设置。", file=sys.stderr)
        return 1
    except (ValueError, OSError) as error:
        # Configuration messages contain field names, never credential values.
        if isinstance(error, ValueError) and not isinstance(error, json.JSONDecodeError):
            print(f"配置错误：{error}", file=sys.stderr)
        else:
            print("操作失败，请检查计划文件路径、JSON 格式以及发信时的网络连接。", file=sys.stderr)
        return 1


if __name__ == "__main__":
    sys.exit(main())
