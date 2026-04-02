# 发布流程

本项目使用 [Changesets](https://github.com/changesets/changesets) 管理版本，通过 GitHub Actions 自动发布到 npm。

---

## 前置条件（首次配置，只需做一次）

### 1. 获取 npm Token

1. 登录 [npmjs.com](https://www.npmjs.com)
2. 点右上角头像 → **Access Tokens** → **Generate New Token** → **New Granular Access Token**
3. 填写配置：
   - **Token name**：随便填，如 `github-actions`
   - **Packages and scopes**：选 **Read and write**
   - **Bypass two-factor authentication**：**必须勾选**
4. 点击生成，复制 token（只显示一次）

### 2. 配置包的 2FA 设置

1. npmjs.com → 进入 `cmap-core` 包页面 → **Settings**
2. **Publishing access** 选择：
   **Require two-factor authentication or a granular access token with bypass 2fa enabled**

### 3. 将 Token 添加到 GitHub

1. 打开 GitHub 仓库 → **Settings** → **Secrets and variables** → **Actions**
2. 点 **New repository secret**
3. Name 填 `NPM_TOKEN`，Value 粘贴第一步复制的 token

---

## 日常发布流程

### 第一步：记录本次改动

在开发完成后，运行以下命令创建一条 changeset 记录：

```bash
pnpm change
```

命令会交互式提问：
- 选择版本变更类型（方向键选择，空格确认）：
  - `patch`：修复 bug（`0.0.x`）
  - `minor`：新增功能，向���兼容（`0.x.0`）
  - `major`：破坏性变更（`x.0.0`）
- 填写本次变更的描述

完成后会在 `.changeset/` 目录生成一个 `.md` 文件，**将它连同代码一起提交**：

```bash
git add .
git commit -m "feat: 你的改动描述"
git push
```

### 第二步：等待 Action 创建版本 PR

push 到 `main` 后，GitHub Actions 检测到 `.changeset/` 里有新文件，会自动创建一个标题为 `chore: update versions` 的 PR。

这个 PR 的内容是：
- 自动 bump `package.json` 里的版本号
- 更新 `CHANGELOG.md`
- 清空 `.changeset/` 目录

### 第三步：合并 PR，触发发布

在 GitHub 上找到这个 PR，确认无误后 **合并它**。

合并后 Actions 会再次触发，这次会自动：
1. 构建项目（`pnpm run build`）
2. 将新版本发布到 npm

在 GitHub 仓库的 **Actions** 页面可以看到运行状态，成功后即可在 npm 上看到新版本。

---

## 本地一键发布（不经过 CI）

如果想在本地直接发布，不走 GitHub Actions 流程，可以使用：

```bash
pnpm pub
```

这条命令会依次执行：
1. `changeset` — 交互式填写版本类型和描述
2. `changeset version` — 自动 bump 版本号、更新 CHANGELOG
3. `pnpm run build` — 构建
4. `changeset publish` — 发布到 npm

> **前提**：本地需要先登录 npm（`npm login`），或在 `~/.npmrc` 中配置好 token。

---



```
写代码
  ↓
pnpm change（记录改动类型和描述）
  ↓
git commit + git push
  ↓
Action 自动创建版本 PR
  ↓
合并 PR
  ↓
Action 自动构建 + 发布到 npm ✅
```

---

## 常见问题

**Q：Action 一直在创建 PR，但不发布？**

`.changeset/` 目录里还有 changeset 文件未消费。合并版本 PR 之后，Action 才会走发布流程。

**Q：发布时报 `EOTP` 错误？**

npm Token 没有开启 `bypass 2fa`，或包的 2FA 设置不对。按前置条件重新检查。

**Q：想发布但没有新功能，只是想重新触发？**

```bash
git commit --allow-empty -m "ci: 触发发布"
git push
```
