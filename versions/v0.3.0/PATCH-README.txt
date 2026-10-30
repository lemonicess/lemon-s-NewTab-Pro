lemon's NewTab Pro v0.3.0 升级补丁

1. 先备份原 v0.2.0 扩展目录。
2. 将本补丁内容覆盖到现有扩展根目录（含 manifest.json 的位置）。
3. 不要删除或覆盖 plugins/、个人目录或 Chrome 扩展数据。
4. 在 chrome://extensions 重新加载扩展，打开新标签页。
5. 右上角 → 插件管理 → 导入插件文件夹 / 选择官方示例。无须 Node.js。

注意：新导入插件存放在扩展 IndexedDB 中。保持原扩展安装目录路径，避免扩展 ID 改变导致本地数据不能自动继承。
