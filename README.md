# lemon's NewTab Pro

一个基于 Chrome 扩展（Manifest V3）的新标签页项目，插件在受限沙箱 iframe 中运行。

## 目录结构

```
versions/
  v0.1.0/          首个发布版本（默认带 welcome 插件）
  v0.1.1/          启动握手修复与极简主页
    index.html     主页
    index.js       宿主：插件注册、沙箱握手、超时与重试
    sandbox.*      受限沙箱
    manifest.json  MV3 清单
    examples/      可选测试插件源码（入库）
    plugins/       本地运行时目录（不入库）
    scripts/       build-registry.mjs / install-examples.mjs
    tests/         node:test 测试
```

每个版本目录都是可直接"加载已解压的扩展程序"的独立快照，互不影响。

## 插件与版本库的边界（重要）

`versions/<版本>/plugins/` 是**本机运行时目录**，只用于自己安装测试：

- 插件本体由 `node scripts/install-examples.mjs <插件ID...>` 在本地安装；
- `plugins/registry.json` 由 `node scripts/build-registry.mjs` 在本地生成；
- 二者都被根目录 `.gitignore` 忽略（仅保留 `plugins/.gitkeep` 占位），
  **不会随版本发布，也不会被推送到云端**；
- 因此本地安装/卸载插件不会在 `git status` 里产生任何"版本更新"。

插件的**源码**放在 `examples/<插件ID>/`，属于正常代码，照常入库。

## 本地使用

```bash
cd versions/v0.1.1

node scripts/install-examples.mjs --list      # 查看可选测试插件
node scripts/install-examples.mjs clock todo  # 安装（已存在则跳过，不覆盖）
node scripts/build-registry.mjs               # 重新生成本地清单
```

装完后到 `chrome://extensions/` 点击 **重新加载**。

## 跑测试

测试依赖本地已生成的 `plugins/registry.json`，先在对应版本目录里准备好再跑：

```bash
# v0.1.1：期望 plugins/ 为空
cd versions/v0.1.1 && node scripts/build-registry.mjs
node --test tests/*.mjs        # 18 个测试

# v0.1.0：期望 plugins/ 中只有 welcome
cd versions/v0.1.0 && node scripts/install-examples.mjs welcome
node --test tests/*.mjs        # 11 个测试
```

注意：直接 `node --test tests/`（传目录）在 Node 22 下会报 `MODULE_NOT_FOUND`，请用 `tests/*.mjs`。

## 发布新版本

1. 复制上一版目录为 `versions/vX.Y.Z/`，修改 `manifest.json` 与 `index.js` 的版本号；
2. 同步更新 `README.md` / `RELEASE-NOTES.md`；
3. 确认 `git status` 中**没有** `plugins/` 相关内容；
4. 提交并推送：

```bash
git add versions/vX.Y.Z
git commit -m "vX.Y.Z: 变更摘要"
git push origin main
```

发布给用户的升级补丁只需包含核心文件（`manifest.json`、`index.html`、`index.css`、
`index.js`、`sandbox.*`），不要包含 `plugins/`，否则会覆盖用户已安装的插件。
