lemon's NewTab Pro v0.1.1 → v0.2.0 核心升级补丁

本包所有路径都是相对于扩展项目根目录（含 manifest.json 的位置）。

1. 先备份原 v0.1.1 目录，特别是 plugins/ 和用户插件。
2. 将 ZIP 中全部内容合并解压到当前 v0.1.1 项目根目录，允许覆盖同名核心文件。
3. 若旧版 plugins/registry.json 已注册个人插件，不要删除它。本补丁不包含 plugins/。
4. 在项目根目录执行 node scripts/build-registry.mjs（建议），确认插件清单无误。
5. 到 chrome://extensions 重新加载扩展，然后打开新标签页。
6. 若需要示例，运行 node scripts/install-examples.mjs hello-plugin settings-showcase classic-home

插件配置存储于 chrome.storage.local，保持扩展 ID 和本地扩展路径尽量不变。
详细开发说明参见 PLUGIN-DEVELOPMENT.md。
