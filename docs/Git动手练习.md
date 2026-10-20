# 用这三个项目学 Git

先理解：Git 在本机保存版本；GitHub 保存远程仓库。`commit` 在本机存档，`push` 才上传。

每轮只做下面一节，保留输出供检查。材料看完不算完成，能亲手操作才算。

## 1. 查看当前版本

```sh
git status
git log --oneline -5
git remote -v
```

检查点：能说出所在分支、有没有未提交修改、远程仓库是什么。若没有远程仓库，先按部署教程建立自己的 GitHub 仓库。

## 2. 保存你的第一次修改

新建 `docs/my-learning.md`，写上日期和今天亲手做过的一件事。

```sh
git status
git diff
git add docs/my-learning.md
git diff --staged
git commit -m "docs: record my first learning step"
git status
```

新文件在 `add` 前不会出现在普通 `git diff` 中；用 `git status` 查看新文件，再用 `git diff --staged` 阅读准备提交的内容。

检查点：能指出工作区、暂存区、提交分别是什么；提交后状态干净。

## 3. 同步到 GitHub

```sh
git push
git fetch origin
git status
git pull --ff-only
```

`fetch` 下载远程版本信息，不直接修改当前工作文件。`pull --ff-only` 只在可以直接快进时更新，有分叉时停止；出现错误先发原文，不强制覆盖。

## 4. 分支上练一个小功能

先确认 `git status` 干净，再开始：

```sh
git switch -c practice/my-first-change
```

只修改网页的一句说明，保存、用 `git diff` 检查、提交。确认本地网页正常后：

```sh
git switch main
git merge practice/my-first-change
git push origin main
```

检查点：能解释分支、合并及正式发布的关系。不要每改一个字就推到 `main`；本地提交可以很频繁，正式发布按阶段进行。

## 5. 只在练习文件中处理一次冲突

在 `docs/my-learning.md` 加入一行 `本周目标：理解 Git` 并提交。然后：

```sh
git switch -c practice/conflict
```

把这一行改成 `本周目标：学会分支` 并提交；切回 `main`，把同一行改成 `本周目标：完成项目` 并提交，再执行：

```sh
git merge practice/conflict
```

打开文件，找到 `<<<<<<<`、`=======`、`>>>>>>>`。保留你决定的最终文本，删除冲突标记，然后：

```sh
git add docs/my-learning.md
git commit -m "docs: resolve practice conflict"
git status
```

尚未解决时要退出此次合并，可用 `git merge --abort`。练习前必须保证工作区干净。

## 6. 撤销一条错误提交

只对练习文件做一次故意写错的修改并提交，确认该提交是最后一个、且不是合并提交，再执行：

```sh
git log --oneline -3
git revert HEAD
```

这会创建一个新提交来抵消错误。不要对不认识的版本执行 `reset --hard` 或强制推送。

## 7. 交付版本

三个项目验收完成后：

```sh
git status
git tag -a v1.0 -m "Delivery for 2026-10-28"
git push origin main
git push origin v1.0
```

现在暂不学习 rebase、cherry-pick、bisect、worktree；先把上述操作用熟。
