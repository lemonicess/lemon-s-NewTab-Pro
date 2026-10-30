# lemon's NewTab Pro v0.2.0

**一个核心尽可能小、功能全部由本地插件实现的 Chrome 新标签页。** 插件开发不需要前端框架、不需要 npm 依赖，也不需要修改核心代码。

> 当前状态：开发预览版（Alpha）。已进行自动化测试，但受测试环境浏览器策略限制，尚未完成真实 Chrome 扩展加载验收。请先备份现有扩展目录和配置。

## 五分钟上手

1. 解压，打开 `chrome://extensions/`，开启开发者模式 → **加载已解压的扩展程序** → 选择包含 `manifest.json` 的目录。
2. 首次打开只有默认南瓜背景和右上角插件管理入口。`plugins/` 初始没有功能插件。
3. 在**项目根目录**执行：

```bash
node scripts/create-plugin.mjs my-first-plugin --settings
```

4. 到 `chrome://extensions/` 点击“重新加载”，打开新标签页。右上角插件管理中可以找到插件和自动生成的“设置”按钮。
5. 编辑 `plugins/my-first-plugin/main.js` 修改插件的界面，再重新加载扩展。

无需创建插件也能试玩官方示例：

```bash
node scripts/install-examples.mjs --list
node scripts/install-examples.mjs hello-plugin settings-showcase classic-home
```

然后重新加载扩展。**`classic-home` 默认禁用**，需要手动在插件管理中启用；它会用全屏布局复刻旧版风格的时钟、搜索和导航。

## v0.2.0 新增

- **统一插件设置框架**：插件通过 `plugin.json` 声明设置分组和字段，宿主自动生成设置界面，保存至 `chrome.storage.local`（普通网页预览使用 `localStorage`）。
- 提供 8 种字段：`toggle`、`text`、`textarea`、`number`、`slider`、`color`、`select`、`url`；宿主校验默认值和用户输入。
- 设置可在运行中推送给插件：`api.settings.get()`、`api.settings.onChange(callback)`。
- **独立持久化**：声明 `storage` 能力后可用 `api.storage.get/set/remove()`；不同插件的数据按插件 ID 隔离。每插件最多 32 项、总 JSON 16 KiB。
- **插件本地资源**：`api.assets.image()` 以受限 Data URI 加载本插件图片，`api.assets.text()` 可读取插件自己的 CSS/JSON/TXT，便于复杂界面拆分文件。
- **自由布局**：传统 12 栏卡片和 `fullscreen` 全屏插件均受支持；卡片尺寸还可通过 `api.layout.update()` 动态改变。
- **受限背景接口**：声明 `background` 能力后可切换插件目录 `assets/` 中的图片或 MP4，支持恢复默认背景。并不支持任意远程 JS/远程背景。
- **开发脚手架**：`scripts/create-plugin.mjs` 一条命令生成有效插件并更新注册清单；支持 `--settings` 和 `--fullscreen`。
- 新增 `hello-plugin`、`settings-showcase`、`classic-home` 示例；示例总数 18 个，均不随核心默认启用。

## 文件和职责

```text
lemon-NewTab-Pro-v0.2.0/
├── manifest.json             # 扩展配置，版本 0.2.0
├── index.html / index.css    # 仅背景、插件画布、插件管理和设置框架
├── index.js                 # 宿主运行器、设置表单、存储和受限 API
├── plugin-schema.js         # Node 和浏览器共用的插件格式校验
├── sandbox.html / .js / .css # 无 Chrome API 权限的插件脚本沙箱
├── plugins/
│   ├── .gitkeep
│   └── registry.json        # 发行时为空清单；个人插件不进 Git
├── examples/                # 18 个可选插件示例
├── scripts/
│   ├── build-registry.mjs    # 校验并重新生成插件清单
│   ├── install-examples.mjs  # 不覆盖同名插件的示例安装器
│   └── create-plugin.mjs     # 新插件生成器
├── tests/
├── PLUGIN-DEVELOPMENT.md     # 开发者教程与 API 文档
└── RELEASE-NOTES.md
```

## 插件怎么写？

插件目录必须包含 `plugin.json` 和 `main.js`：

```text
plugins/my-plugin/
├── plugin.json
├── main.js
└── assets/                  # 可选，放插件专用的图片/MP4
```

简单的 `plugin.json`：

```json
{
  "id": "my-plugin",
  "name": "我的插件",
  "version": "1.0.0",
  "description": "练习写插件",
  "icon": "✦",
  "layout": { "span": 4, "height": 220 },
  "defaultEnabled": true,
  "capabilities": [],
  "settings": [{
    "id": "general", "title": "基本设置", "fields": [
      { "key": "title", "type": "text", "label": "标题", "default": "Hello!" },
      { "key": "color", "type": "color", "label": "文字颜色", "default": "#ffffff" }
    ]
  }]
}
```

`main.js`：

```javascript
window.LemonPlugin = {
  mount(root, api) {
    const title = document.createElement('h1');
    root.append(title);
    function update(settings) {
      title.textContent = settings.title;
      title.style.color = settings.color;
    }
    update(api.settings.get());
    api.settings.onChange(update);
  }
};
```

把目录放入 `plugins/`，再运行 `node scripts/build-registry.mjs`，重新加载 Chrome 扩展即可。**不要把脚本复制到宿主 `index.js` 中。**

更深入的设置类型、事件、持久化、背景、全屏页面、安全限制请看 [PLUGIN-DEVELOPMENT.md](PLUGIN-DEVELOPMENT.md)。

## 开发和测试

```bash
node --test tests/*.test.mjs
node scripts/build-registry.mjs
node scripts/install-examples.mjs clock search calendar
```

从 `scripts/` 子目录运行时，请去掉前缀 `scripts/`，或者先 `cd ..` 回到根目录。

### Git 仓库与用户插件

`.gitignore` 默认忽略 `/plugins/*`，只追踪 `/plugins/.gitkeep`。用户自己的插件与生成的 `registry.json` 不提交 Git。官方 `examples/` 应当提交。发行打包时应主动附上 `plugins/registry.json` 的**空清单**，即使仓库没有追踪它。

**升级补丁不包含 `plugins/`**，以免覆盖用户插件。请先备份；不要通过覆盖整个用户目录、`git clean -fdx` 等方式清理本地安装。

## 从 v0.1.1 升级

把提供的 `v0.2.0-core-patch.zip` **覆盖解压至现有扩展项目根目录**，不要删除原有 `plugins/`。v0.2.0 保持原有 `LemonPlugin.mount`、`open-url` 能力和 registry `format: 1`，旧插件无需迁移；生成的清单可重新运行 `node scripts/build-registry.mjs` 校验。

新版增加核心文件 `plugin-schema.js`，升级补丁已经包含。更新后到扩展管理页重新加载。如果旧版使用已经被移除或不兼容的本地文件，请依据 Chrome 开发者工具排查。设置属于扩展 `chrome.storage.local`，**请保持扩展 ID 不变**，不要随意删除重装。

## 安全说明

- Chrome MV3 扩展主页的代码必须来自本地扩展包；插件脚本只由宿主读取 `plugins/<ID>/main.js`，发送到没有扩展 API 权限的 `sandbox.html` iframe 执行；不是通过远程下载 JS 绕过 CSP。
- 沙箱脚本与主页通过 `postMessage` 交互；宿主校验消息来源窗口、插件 ID 和声明的能力。
- 插件无法直接访问宿主的 DOM、扩展存储或任意 Chrome API。`open-url` 需要用户操作，并由宿主逐次确认；存储按 ID 隔离且限额；背景仅允许本地 `assets/` 媒体。
- 运行沙箱可以降低部分权限风险，但**无法保证恶意插件绝对无害**。仅安装可信插件；检查 `plugin.json` 中声明的能力和 JS 源码。
- 未打包扩展中新增加的插件必须重新生成清单并重新加载扩展；Chrome 不允许扩展随意扫描磁盘目录并在不重新加载的情况下执行任意新增文件。
- 当前不具备插件数字签名、插件商店或权限审核；不代表已经取得 Chrome Web Store 的上架审核许可。

## 与 v0.9.0 的关系

`examples/classic-home` 展示了利用 `fullscreen` 插件复刻旧版的时钟、搜索、分组导航和玻璃卡片，并用设置框架控制字体、颜色、位置和透明度；卡片增加、删除和存储均由插件负责。**不是 v0.9.x 全部功能的逐项复刻**：拖拽排序、Bing 每日壁纸、书签导入等尚未纳入示例，完整功能需要开发者继续扩展。
