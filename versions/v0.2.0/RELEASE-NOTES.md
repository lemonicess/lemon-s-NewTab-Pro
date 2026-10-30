# lemon's NewTab Pro · 发布记录

## v0.2.0（开发预览版）

- 插件可以在 `plugin.json.settings` 注册设置分组与 8 种字段，宿主生成、校验和保存设置页面。
- `api.settings.get/onChange` 提供初始值及保存后的即时通知。
- `api.storage.get/set/remove` 为声明 `storage` 能力的插件提供按插件 ID 隔离的持久化数据（每插件 16 KiB / 32 键）。
- `layout.mode = "fullscreen"` 支持插件独立构建整页主页；`api.layout.update` 支持普通卡片运行时调整尺寸。
- 插件静态资源 API：`api.assets.image/text` 读取本插件目录中的本地图片、CSS、JSON 和 TXT，支持独立文件组织，无额外权限。
- `background` 能力可切换本地图片/MP4 并恢复默认背景；外部网站打开仍由宿主逐次确认。
- 新增 `plugin-schema.js` 共用清单/设置校验、`create-plugin.mjs` 开发脚手架、`PLUGIN-DEVELOPMENT.md` 开发手册。
- 增加 `hello-plugin`、`settings-showcase`、`classic-home` 三个示例（现有示例共 18 个）。
- 原有普通插件 API 保持兼容，registry 格式维持 v1。
- 默认 `plugins/` 仍为空，不预置任何活动插件；原南瓜背景和插件管理入口保留。

**测试状态：** Node 自动化测试与静态检查已完成。测试机器的 Chromium 扩展管理页面被管理员策略阻止，因此未完成真实扩展加载/运行验收。

**已知限制：** 当前无插件市场、签名、在线自动安装；设置框架只支持声明式标准控件，没有任意 HTML 注入；经典主页示例不等同于旧版 v0.9.x 的完整功能复刻。插件在安装、删除或修改文件后需要重建清单并重新加载扩展。

## v0.1.1

修复沙箱启动握手与 12 秒超时；精简为默认背景、插件画布和插件管理入口。

## v0.1.0

新建插件化扩展核心，采用本地插件目录、清单生成和 MV3 隔离沙箱。
