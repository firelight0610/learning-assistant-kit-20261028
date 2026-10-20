# 把有后端的网页部署到 Netlify

网页工作方式：浏览器 → `/api/tasks` 云函数 → Postgres 数据库。数据保存在服务器数据库中，不使用浏览器本地存储冒充后端。

## 1. GitHub 仓库

先检查 `git remote -v`。如果已经有 `origin`，核实地址，不要重复创建仓库或覆盖现有远程配置。

如果还没有远程仓库，在 GitHub 新建空仓库，不自动生成 README；把网页上给出的仓库地址添加为 `origin`，再推送 `main`。不要上传 `node_modules`、`.local`、`.netlify` 或任何授权码。

## 2. 连接 Netlify

在 Netlify 项目中进入 **Project configuration → Build & deploy → Continuous deployment → Repository**，连接你刚建立的 GitHub 仓库。若创建新项目，选择从 Git 导入。

| 设置 | 填写内容 |
|---|---|
| Base directory | 留空，使用仓库根目录 |
| Production branch | `main` |
| Build command | `node scripts/check.mjs` |
| Publish directory | `web/public` |
| Functions directory | `netlify/functions` |
| Node version | 24，仓库配置已指定 |

仓库已有 `netlify.toml`，优先使用文件里的配置。依赖中包含 `@netlify/database`，数据库迁移位于 `netlify/database/migrations`，由 Netlify 部署流程处理。不要在云函数启动时重复建表或插入初始任务。

先进行一次预览部署，检查页面、任务接口、数据库；成功后再正式部署。生产数据不在预览中随意修改；本项目只放公开演示内容。

## 3. 打开公网访问

新项目可能默认是私有。正式部署成功后，项目所有者在 **Project configuration → General → Visitor access → Project visibility** 中选择 **Public** 并保存。

使用无痕窗口或未登录 Netlify 的手机打开正式网址。能看到页面并读取任务才算公网访问成功。仅登录自己的账号后能打开不算。

## 4. 验证持久保存

1. 在正式网页新建一条日期为 10 月 28 日的测试任务。
2. 刷新浏览器，再从手机打开，确认这条任务仍在。
3. 对网页说明做一次小修改并合并推送到 `main`。
4. 等 Netlify 部署成功，确认网页说明已更新、同一条任务仍在。
5. 记录截图，再在网页中删除测试任务。

## 5. 费用与日常更新

使用 Free 方案，不启用自动充值或付费功能。当前官网免费额度每月 300 credits，正式部署和运行会消耗额度；以账户页面实际显示为准。

日常在功能分支修改、测试、提交；阶段完成后合并到 `main`。这样既能练 Git，也能减少重复正式部署。

遇到部署错误，保留**完整错误、部署日志网址、项目名和分支**。不要把数据库连接串发到聊天或提交到 GitHub，也不要通过关闭密钥扫描来绕过真实泄露。

参考：[部署](https://docs.netlify.com/deploy/create-deploys/)、[数据库](https://docs.netlify.com/build/data-and-storage/netlify-database/)、[费用](https://www.netlify.com/pricing/)。
