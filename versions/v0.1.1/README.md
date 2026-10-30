# lemon's NewTab Pro v0.1.1 — 极简主页与启动修复版

**v0.1.1** 是基于 v0.1.0 的小版本更新，正式包含插件启动握手修复、12 秒超时提示与极简主页；适用于此前一直显示“正在启动插件”的安装。插件协议保持 v1，不需要重新安装插件。

## 这次改了什么

- 主页移除原介绍区、品牌横幅、页脚和空插件提示；**没有启用插件时只显示默认 `pumpkin-8384698_960_720.jpg` 背景**。
- 主页只保留右上角的**插件管理按钮**，以及用于渲染插件的透明网格容器。宿主不再给插件强加顶部标题栏；插件的内容由插件自身绘制。
- 沙箱与宿主建立 `sandbox:loaded → host:init → plugin:ready` 握手，不再依赖可能为空的 `document.referrer`。
- 宿主从本地 `plugins/<插件ID>/main.js` 读取脚本源码，再送到受限沙箱用 Blob URL 运行。这避免让沙箱直接跨源加载非公开扩展资源。**不会向互联网下载执行代码，也不添加 `web_accessible_resources`。**
- 添加 12 秒启动超时、错误提示及“重试”按钮，避免无限显示“正在启动插件”。
- 继续保留 iframe 的不透明来源、`postMessage` 来源与窗口验证、文件大小限制及 Chrome MV3 权限隔离。外链打开每次都要宿主确认。

旧版具体为何卡住尚不能在用户的 Chrome 环境中确认；上述调整重点解决了加载脚本和消息握手这两处可能导致卡住的环节。

## 从 v0.1.0 升级到 v0.1.1（推荐使用核心补丁包）

只需要替换下列 **7 个核心文件**（包括更新版本号的 `manifest.json`）：

```text
manifest.json
index.html
index.css
index.js
sandbox.html
sandbox.css
sandbox.js
```

**不要删除或覆盖 `plugins/` 文件夹及 `plugins/registry.json`，不需要重新安装现有插件。**

步骤：

1. 退出正在使用的扩展新标签页（不必卸载扩展），备份项目目录。
2. 将核心补丁 ZIP 解压到 **含有 `manifest.json` 的项目根目录**，同名文件允许覆盖。
3. 打开 `chrome://extensions/`，点击 **lemon's NewTab Pro → 重新加载**。
4. 新建标签页。若插件仍有问题，应在 12 秒内看到具体失败提示和重试按钮。
5. 在新标签页按 `F12` 查看 Console 中的异常，或在扩展管理页检查错误。

补丁 ZIP **不包含任何 `plugins/` 文件**，不会触碰你已经安装的插件。

## 全新安装

1. 解压完整项目 ZIP，确保选中的是直接包含 `manifest.json` 的文件夹。
2. 到 `chrome://extensions/` 打开开发者模式 → “加载已解压的扩展程序”。
3. 新标签页默认只有背景和右上角插件管理入口。`plugins/registry.json` 是合法的空插件清单。
4. 想安装测试插件，请在 **项目根目录**执行：

```bash
node scripts/install-examples.mjs --list
node scripts/install-examples.mjs clock calculator pomodoro
```

如已位于 `scripts/` 目录，直接运行 `node install-examples.mjs --all` 即可。安装后到 `chrome://extensions/` 重新加载扩展。

- `examples/`：15 个可选示例，不会在首次安装时自动启用。
- `plugins/`：初始为空（含 `.gitkeep` 和一份空 `registry.json`）。用户复制插件后才加载；`.gitignore` 不追踪本地用户插件及自动生成的清单。
- `scripts/build-registry.mjs`：在项目根目录执行，扫描已安装插件生成 `plugins/registry.json`。
- `scripts/install-examples.mjs`：安装官方示例，不覆盖已有同名插件。

## 插件格式（协议 v1）

插件目录为 `plugins/<id>/plugin.json` 和 `plugins/<id>/main.js`。

`plugin.json`：

```json
{
  "id": "my-plugin",
  "name": "我的插件",
  "version": "1.0.0",
  "description": "插件功能描述",
  "icon": "◆",
  "layout": { "span": 6, "height": 240 },
  "defaultEnabled": true,
  "capabilities": []
}
```

`main.js`：

```javascript
window.LemonPlugin = {
  mount(root, api) {
    const element = document.createElement('p');
    element.textContent = 'Hello ' + api.id;
    root.append(element);
  }
};
```

支持 `layout.span` (1–12)、`layout.height` (130–640 px)，能力 `[]` 或 `["open-url"]`。插件脚本最多 512 KB，`api.open(url)` 仅允许用户主动操作中的 HTTP/HTTPS 链接，并且宿主仍需确认打开。

该沙箱**不提供**扩展 API、通用网络请求、插件专属持久化存储。待办插件等示例刷新后会重置数据。不要安装来源不明的代码，沙箱不等于抵御恶意代码的绝对保证。

## 验证

```bash
node --test tests/*.test.mjs
node --check index.js
node --check sandbox.js
```

自动测试覆盖示例插件、清单和插件加载协议。**由于测试环境 Chromium 被管理员策略阻止访问测试页面和加载扩展，本版尚未完成真实 Chrome 扩展环境的运行验收。**
