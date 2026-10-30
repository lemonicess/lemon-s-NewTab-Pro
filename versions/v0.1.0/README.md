# lemon's NewTab Pro v0.1.0

**lemon's NewTab Pro v0.1.0** 是基于原 v0.9.1 重新搭建的插件化新标签页概念原型。核心只保留插件加载器、布局网格、最小插件管理入口和安全沙箱；旧时钟、搜索、导航、整套设置 UI、Bing 壁纸、视频背景、旧配置系统均未移植。

> 这不是原版的向后兼容升级。升级前请备份原版目录和你已有的配置；建议先作为一个**独立的未打包扩展**试用。Chrome 一次只能有一个扩展接管新标签页，需要按 Chrome 提示选择。

## 快速安装

1. 解压 ZIP，找到根目录中的 `manifest.json`。
2. 打开 `chrome://extensions/`，开启开发者模式，点击「加载已解压的扩展程序」。
3. 选择 **包含 `manifest.json` 的目录**，然后打开新标签页。
4. 默认只启用 `plugins/welcome` 示例欢迎插件，不会出现原有内置时钟、搜索或设置页。

不需要 npm 或构建框架；只有**添加/删除插件时**需要本机 Node.js 18+ 来生成清单。

## 目录结构

```
├─ manifest.json             # MV3，声明 sandbox.html 为沙箱页
├─ index.html / index.css    # 主页 UI
├─ index.js                  # 宿主：清单加载、开关、沙箱、权限网关
├─ sandbox.html              # 所有插件共用的独立沙箱入口
├─ sandbox.css / sandbox.js  # 插件运行时以及受限 API
├─ plugins/
│  ├─ registry.json          # 自动生成，勿手工编辑
│  └─ welcome/
│     ├─ plugin.json         # 插件描述文件
│     └─ main.js             # 插件源码
├─ examples/
│  ├─ clock/                 # 可选的时钟
│  ├─ search/                # 可选的搜索框
│  └─ links/                 # 可选的导航链接
├─ scripts/build-registry.mjs
└─ tests/registry.test.mjs
```

## 添加一个插件

1. 在扩展根目录的 `plugins/` 里创建子目录，例如 `plugins/my-plugin/`。目录名只能使用小写英文字母、数字、连字符，且以字母开头，长度 2–40。
2. 创建 `plugin.json` 与 `main.js`（文件名必须完全一致）。
3. 在扩展根目录运行 `node scripts/build-registry.mjs`；完成后生成/刷新 `plugins/registry.json`。
4. 到 `chrome://extensions/` **重新加载这个未打包扩展**，再打开新标签页。
5. 通过页面右上角「管理插件」启用或禁用插件。新插件首次启用状态由 `defaultEnabled` 决定。

注意：扩展本身的版本是 **v0.1.0**；每个插件在 `plugin.json` 内拥有独立的版本号，因此下面的示例插件仍使用 `1.0.0`。

`plugin.json` 示例：

```json
{
  "id": "my-plugin",
  "name": "我的小组件",
  "version": "1.0.0",
  "description": "一个由本地文件定义的组件",
  "icon": "◆",
  "layout": { "span": 6, "height": 240 },
  "defaultEnabled": true,
  "capabilities": []
}
```

- `layout.span`：桌面 12 栏网格中占据 1–12 栏；小屏自动占满。
- `layout.height`：插件 iframe 的高度，范围 130–640 像素；不是自动计算。
- `capabilities`：目前只支持 `"open-url"`，表示允许插件请求打开外部 HTTP/HTTPS 页面（宿主逐站确认）；缺省是 `[]`，没有其他浏览器权限。
- `defaultEnabled`：仅决定第一次出现时的启用状态；后续开关状态使用 `chrome.storage.local` 持久保存。
- `plugin.json` 之外没有入口自动扫描；所有插件代码都必须是**扩展目录本地文件**，不能使用外链 JavaScript。

`main.js` 示例：

```js
window.LemonPlugin = {
  mount(root, api) {
    const title = document.createElement('h2');
    title.textContent = 'Hello from ' + api.id;
    root.append(title);
  }
};
```

`root` 是该插件专属 iframe 内的根节点，允许自由创建 DOM、编辑自己的样式。插件不直接控制主页，也不能直接访问 `chrome.*` 或其他插件 iframe。

## 安装示例插件

复制整个 `examples/clock/` 到 `plugins/clock/`，运行 `node scripts/build-registry.mjs`，再在扩展管理页点击重新加载，就能启用独立实现的时钟。类似地可复制 `examples/search/`（搜索框）或 `examples/links/`（快捷导航）。它们都不是主页的内置部分。

Windows 可用资源管理器复制文件夹，然后在扩展根目录打开终端运行上述命令；macOS/Linux 可运行：

```sh
cp -R examples/clock plugins/clock
node scripts/build-registry.mjs
```

## 插件 API v1

| API | 作用 | 约束 |
| --- | --- | --- |
| `window.LemonPlugin.mount(root, api)` | 启动插件，返回 Promise 也可以 | 仅运行在插件自己的沙箱中 |
| `api.id` | 读取当前插件 ID | 只读 |
| `api.open('https://…')` | 请求在新标签页打开 URL | 必须声明 `open-url`，需要用户在插件里主动操作，宿主对新站点确认；限制 30 秒 3 次 |

没有提供任意文件系统访问、DOM 越权访问、后台常驻脚本、通用网络代理、系统设置改写接口或 `chrome.storage` 直通权限。

## 安全设计与边界

- Chrome MV3 正常扩展页面禁止远程脚本、动态 `eval`；本项目不试图绕过这些安全规则。
- 插件运行在 `manifest.json` 声明的 `sandbox.html` 页面中，采用独立的不透明来源，没有扩展 API 访问权。宿主和插件仅以 `postMessage` 通信。
- 宿主按 **iframe 的 `contentWindow` + 插件 ID + 消息协议 + 不透明来源** 验证消息来源；对外部导航做能力检查、HTTP/HTTPS 校验、速率限制与逐站确认。
- 沙箱 CSP 禁用 `connect-src`、远程脚本、子框架、表单提交与对象加载；没有 `unsafe-eval`。DOM 所需的本地 CSS 和样式属性可以使用。
- 生成清单前校验所有 `plugin.json`，拒绝目录穿越、非法字段、未知权限和符号链接入口脚本。

**限制：** 这是一种显著缩小权限面的隔离方案，不是恶意 JavaScript 的完美防护。插件仍可能消耗 CPU/内存、诱导点击，或尝试导航其沙箱自身；不要安装来源不明的源码。如果将来需要网络、存储、跨插件通信，应为每类权限设计单独的申请/授权机制。

**为什么不直接扫描 `plugins/`？** 普通 MV3 扩展并没有任意列举本地扩展目录的 API。开发者使用 Node.js 在扩展之外生成静态 `registry.json`，浏览器只加载已安装的本地打包资源；目录变化后手动重载扩展。此方式是兼容浏览器安全模型的做法，而非规避机制。

**静态网页预览限制：** 沙箱与插件加载需要 Chrome 扩展环境的隔离规则；通过 `file://` 或普通 HTTP 静态服务器预览不能用于验证插件运行。

## 运行测试

```sh
node --test tests/registry.test.mjs
node --check index.js
node --check sandbox.js
```

目前是第一版核心引擎原型，没有实现插件安装 UI、自动目录监听、插件市场、API 权限细分、旧版配置迁移、自动插件内容尺寸和热更新。
