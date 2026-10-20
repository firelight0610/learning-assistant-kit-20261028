# 行知 · 学习助手三件套

目标：2026 年 10 月 28 日展示有后端的网页、GitHub Actions 自动邮件和 STM32 小作品，同时亲手学习 Git。

**先阅读 [开始这里](docs/开始这里.md)。** 每天 2～3 小时，采用“讲一点 → 你操作 → 检查结果”的方式。

**网页：<https://xingzhi-study-kit-1028.netlify.app>** · [GitHub 自动检查](https://github.com/firelight0610/learning-assistant-kit-20261028/actions)

网页与手动收件已完成，当前从[下一轮行动：45 分钟 Git 与硬件准备](docs/下一轮行动.md)继续。

## 三个作品

| 作品 | 实现 | 当前边界 |
|---|---|---|
| 学习任务看板 | HTML/CSS/JavaScript + Netlify Functions + Netlify Database | 新增、完成、恢复、删除、筛选；真实后端保存数据；共享演示空间 |
| 每日计划邮件 | Python 标准库 + QQ SMTP + GitHub Actions | 手动与北京时间 08:17 定时；需本人配置邮箱 Secrets 并验证送达 |
| STM32 专注计时器 | 可移植 C99 计时核心 + HAL 接入参考 | 核心已实现；屏幕、下载器及引脚未核实，尚不能直接烧录 |

交付入口、真实验证结果和待办见 [交付清单](docs/交付与验收.md)。网页截图在 [evidence](evidence/README.md)。

## 本地运行网页

需要 Node.js 24 和 pnpm 11.25.0。在仓库根目录执行：

```text
pnpm install --frozen-lockfile
pnpm dev
```

打开 `http://127.0.0.1:8888`。本地使用 Netlify 提供的 Postgres 兼容数据库，数据写入忽略目录 `.local/database`。关闭后再启动可保留任务；首次启动自动应用数据库迁移，不重复插入初始数据。

这台电脑也可以在 PowerShell 中执行 `./启动学习看板.ps1`，脚本会寻找已安装的 Node 和 pnpm。

## 项目位置

```text
web/public/             页面、样式、交互
web/server/             任务接口与参数验证
netlify/functions/      Netlify 云函数入口
netlify/database/       SQL 建表与初始任务
mail/                   邮件脚本和每日计划
hardware/               C 计时核心、测试、STM32 接入说明
.github/workflows/      自动邮件和项目检查
docs/                   逐步教程、进度表、交付清单
```

## 验证

```text
pnpm run build
pnpm test
python -m unittest discover -s tests -p test_mail.py
python mail/send_plan.py --dry-run --date 2026-10-24
```

有 C 编译器时，在 Bash 或 GitHub Actions 中运行：

```sh
mkdir -p hardware/build
cc -std=c99 -Wall -Wextra -Werror hardware/src/focus_timer.c hardware/tests/test_focus_timer.c -Ihardware/include -o hardware/build/test_focus_timer
hardware/build/test_focus_timer
```

GitHub 的 `Project checks` 工作流执行这些检查。C 的 25 分钟测试使用模拟时间，**不能代替开发板连续运行 25 分钟的实测**。

## 部署和凭证

- 网页：[Netlify 部署教程](docs/Netlify部署.md)。先预览验证，再发布正式版；正式网址必须允许未登录访问。
- 邮件：[QQ 邮件教程](docs/邮件自动化.md)。默认脚本只预览，实际发送需 `--send`。
- QQ 授权码和邮箱地址只放 GitHub Secrets；数据库连接串交由 Netlify 管理。
- `.netlify`、本地数据库、依赖和编译产物已忽略，不提交到 Git。
- 使用 Netlify Free，不开付费功能。频繁提交在开发分支进行，阶段完成才合并到 `main`，减少正式部署消耗。

参考：[Netlify Functions](https://docs.netlify.com/build/functions/overview/)、[Netlify Database](https://docs.netlify.com/build/data-and-storage/netlify-database/)、[GitHub Actions 调度](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#schedule)。
