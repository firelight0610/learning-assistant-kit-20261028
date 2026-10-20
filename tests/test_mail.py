from contextlib import redirect_stderr, redirect_stdout
from datetime import date
import importlib.util
import io
import json
from pathlib import Path
from unittest import TestCase, mock

spec = importlib.util.spec_from_file_location("study_mail", Path(__file__).parents[1] / "mail" / "send_plan.py")
study_mail = importlib.util.module_from_spec(spec)
spec.loader.exec_module(study_mail)


class MailTests(TestCase):
    def test_render_known_day_and_fallback(self):
        plan = study_mail.load_plan(study_mail.DEFAULT_PLAN)
        subject, body = study_mail.render_plan(plan, date(2026, 10, 24))
        self.assertIn("2026-10-24", subject)
        self.assertIn("GitHub Secrets", body)
        self.assertIn("北京时间", body)
        self.assertNotIn("smtp.qq.com", body)
        _, fallback = study_mail.render_plan(plan, date(2026, 11, 1))
        self.assertIn("选择一个小目标", fallback)

    def test_default_run_never_sends_or_reads_credentials(self):
        with mock.patch.object(study_mail, "send_message") as send, redirect_stdout(io.StringIO()), redirect_stderr(io.StringIO()):
            self.assertEqual(study_mail.main(["--date", "2026-10-24"]), 0)
            send.assert_not_called()

    def test_missing_configuration_reports_names_only(self):
        with self.assertRaisesRegex(ValueError, "QQ_SMTP_AUTH_CODE"):
            study_mail.send_message("计划", "正文", {"QQ_SMTP_USER": "learner@qq.com", "MAIL_TO": "learner@qq.com"})

    def test_tls_auth_and_chinese_content(self):
        env = {"QQ_SMTP_USER": "learner@qq.com", "QQ_SMTP_AUTH_CODE": "test-secret", "MAIL_TO": "learner@qq.com"}
        with mock.patch.object(study_mail.smtplib, "SMTP_SSL") as smtp:
            session = smtp.return_value.__enter__.return_value
            session.send_message.return_value = {}
            study_mail.send_message("学习计划", "中文任务", env)
            smtp.assert_called_once()
            self.assertEqual(smtp.call_args.args, ("smtp.qq.com", 465))
            session.login.assert_called_once_with("learner@qq.com", "test-secret")
            message = session.send_message.call_args.args[0]
            self.assertEqual(message["Subject"], "学习计划")
            self.assertIn("中文任务", message.get_content())
            self.assertIn("+0800", message["Date"])

    def test_header_injection_is_rejected(self):
        with self.assertRaises(ValueError):
            study_mail.checked_address("a@qq.com\nBcc: attacker@example.com", "MAIL_TO")

    def test_refused_recipient_is_failure(self):
        env = {"QQ_SMTP_USER": "learner@qq.com", "QQ_SMTP_AUTH_CODE": "test-secret", "MAIL_TO": "learner@qq.com"}
        with mock.patch.object(study_mail.smtplib, "SMTP_SSL") as smtp:
            smtp.return_value.__enter__.return_value.send_message.return_value = {"learner@qq.com": (550, b"no")}
            with self.assertRaises(study_mail.smtplib.SMTPException):
                study_mail.send_message("计划", "正文", env)

    def test_invalid_plan_does_not_echo_content(self):
        plan = {"days": {"2026-10-24": [123]}}
        with mock.patch("pathlib.Path.open", mock.mock_open(read_data=json.dumps(plan))):
            with self.assertRaises(ValueError):
                study_mail.load_plan("plan.json")
