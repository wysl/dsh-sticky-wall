# 发布流程（维护者）

这个包用 **npm Trusted Publishing（OIDC）** 发布，仓库里不保存 `NPM_TOKEN`。
发布工作流：`.github/workflows/publish.yml`（文件名必须保持 `publish.yml`，npm 的 Trusted Publisher 配置按文件名匹配）。

## 一次性准备（首次发布）

1. npm 账号需要有 `@xia-sc` scope 的发布权限，并确认 `@xia-sc/dsh-todo` 尚未被占用：

   ```bash
   npm whoami
   npm view @xia-sc/dsh-todo version   # 首次应为 404
   ```

2. 在本机做第一次手动发布（这一步用 token，OIDC 还不能用）：

   ```bash
   npm login
   npm publish --access public
   ```

3. 打开 npmjs.com → 该包的 **Settings → Publishing access → Trusted Publisher**，
   添加 **GitHub Actions**，填写：

   | 字段 | 值 |
   | --- | --- |
   | Organization or user | `xia-sc` |
   | Repository | `dsh-todo` |
   | Workflow filename | `publish.yml` |
   | Environment | 留空（工作流没有使用 environment） |

4. 保存后，**不要**再创建 `NPM_TOKEN` secret；之后每次发布都用 GitHub 的 OIDC 临时凭证。
   如果第 2 步用了 automation token，建议在 npm 里撤销它。

## 日常发布

1. 更新 `package.json` 的 `version`（SemVer），同步 `CHANGELOG.md`。
2. 提交并推送 `main`。
3. 二选一触发发布：
   - **GitHub Release**：创建 tag `v<version>`（例如 `v0.1.1`）并发布 Release；
     工作流会先校验 tag 与 `package.json` 版本一致，再发布。
   - **手动**：Actions → **Publish** → **Run workflow**（发布 `main` 上的当前版本）。
4. 到 npm 包页面确认新版本与 **Provenance** 标识；GitHub Actions 运行记录里有完整日志。

## 注意

- 仓库必须是 **public**，否则 npm 无法校验 provenance 来源。
- 不要修改工作流文件名；改了要同步更新 npm 上的 Trusted Publisher 配置。
- 发布前工作流会跑语法检查和 `node test/selftest.mjs`，测试失败不会发布。
- 首次手动发布之后如果改了包名或 scope，需要重新配置 Trusted Publisher。
