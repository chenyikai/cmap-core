# 发布流程

本项目使用 [Changesets](https://github.com/changesets/changesets) 管理版本，通过 GitHub Actions 自动发布到 npm。  
每次发布时，Changesets 会自动将变更描述追加到项目根目录的 **`CHANGELOG.md`**。

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

## 如何记录每次改动（维护 CHANGELOG）

开发完成后，运行以下命令写下本次改动的描述：

```bash
pnpm change
```

命令会交互式提问：
- 选择版本变更类型（方向键选择，空格确认）：
  - `patch`：修复 bug（`0.0.x`）
  - `minor`：新增功能，向下兼容（`0.x.0`）
  - `major`：破坏性变更（`x.0.0`）
- 填写本次变更的描述（这段描述会自动写入 `CHANGELOG.md`）

完成后会在 `.changeset/` 目录生成一个 `.md` 文件。之后执行任意发布命令时，Changesets 会自动读取它、更新版本号并写入 `CHANGELOG.md`。

> 如果跳过这一步直接发布，CHANGELOG 里会记录一条通用的 `Version bump.`，没有实际描述。

---

## 发布方式

### 方式一：CI 自动发布（推荐）

```
pnpm change（记录改动）
  ↓
git commit + git push
  ↓
Action 自动创建版本 PR（bump 版本号 + 更新 CHANGELOG）
  ↓
合并 PR
  ↓
Action 自动构建 + 发布到 npm ✅
```

完成后会在 `.changeset/` 目录生成一个 `.md` 文件，**将它连同代码一起提交**：

```bash
git add .
git commit -m "feat: 你的改动描述"
git push
```

push 到 `main` 后，GitHub Actions 检测到 `.changeset/` 里有新文件，会自动创建一个标题为 `chore: update versions` 的 PR。合并这个 PR 后，Actions 会自动构建并发布到 npm。

### 方式二：本地直接发布（不经过 CI）

> **前提**：本地需要先登录 npm（`npm login`），或在 `~/.npmrc` 中配置好 token。

#### 带描述的发布（推荐，CHANGELOG 有实际内容）

```bash
pnpm change        # 先填写改动描述
pnpm pub:patch     # 再发布补丁版本
```

#### 快速发布（跳过描述，CHANGELOG 记录 "Version bump."）

```bash
pnpm pub:patch     # 直接发布，无需填写描述
```

#### 交互式发布（一条命令完成所有步骤）

```bash
pnpm pub
```

---

## 版本号说明

| 命令 | 版本变化 | 适用场景 |
|------|----------|----------|
| `pnpm pub:patch` | `0.0.x` → `0.0.x+1` | 修复 bug、调整小参数，不新增功能 |
| `pnpm pub:minor` | `0.x.0` → `0.x+1.0` | 新增功能，向下兼容 |
| `pnpm pub:major` | `x.0.0` → `x+1.0.0` | 破坏性变更，大版本升级 |

> `pub:patch / pub:minor / pub:major` 三条命令：若已通过 `pnpm change` 创建了 changeset 文件，则直接使用该文件；否则自动生成一条通用的 `Version bump.` 记录。

发布成功后，脚本会自动执行以下操作，无需手动处理：

```
git tag v1.2.3
git push --tags
```

在 GitHub 仓库的 **Tags** 页面即可看到对应的 `vX.X.X` 标签。

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

**Q：CHANGELOG.md 里的描述都是 "Version bump."，没有实际内容？**

发布前先运行 `pnpm change` 写下改动描述，再执行发布命令。
