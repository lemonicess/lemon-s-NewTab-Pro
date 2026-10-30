# lemon's NewTab Pro · 插件开发指南（v0.2.0）

如果你会写一点 HTML / JavaScript，就能写插件；**无需 Node.js 运行时依赖、npm、Webpack、Vue 或 React**。Node.js 只用于开发阶段的目录/清单脚本。

## 1. 从零创建插件（推荐）

在包含 `manifest.json` 的项目根目录运行：

```bash
node scripts/create-plugin.mjs weather-note --settings
```

脚本自动创建：

```text
plugins/weather-note/
├── plugin.json       # 插件清单、布局、设置定义
└── main.js           # 插件界面与交互逻辑
```

并同步生成 `plugins/registry.json`。去 `chrome://extensions/` **重新加载**扩展，然后打开新标签页。

需要全屏页面而不是卡片？

```bash
node scripts/create-plugin.mjs my-home --settings --fullscreen
```

已有相同目录时脚本不会覆盖。你也可以复制 `examples/hello-plugin`，将目录名和 `plugin.json.id` 同步改成新 ID。

## 2. 两个必需文件

### `plugin.json`

```json
{
  "id": "weather-note",
  "name": "我的卡片",
  "version": "1.0.0",
  "description": "我的第一个插件",
  "icon": "✦",
  "layout": { "span": 4, "height": 240 },
  "defaultEnabled": true,
  "capabilities": [],
  "settings": [{
    "id": "basic", "title": "基本设置", "description": "自动生成设置页",
    "fields": [
      { "key": "content", "type": "text", "label": "显示内容", "default": "我的插件", "maxLength": 100 },
      { "key": "accent", "type": "color", "label": "文字颜色", "default": "#ffffff" },
      { "key": "visible", "type": "toggle", "label": "显示内容", "default": true }
    ]
  }]
}
```

`id` 需与目录名完全一致（小写字母开头，后接数字/短横线；长度 2–40）。`version` 格式为 `x.y.z`，与宿主版本单独管理。`layout.span` 为 1–12，`layout.height` 为 130–1200 像素。不要自行填写 `entry` 字段；生成工具会固定指向 `plugins/<id>/main.js`。

### `main.js`

```js
window.LemonPlugin = {
  mount(root, api) {
    // root：你的 DOM 容器，只在本插件沙箱里。
    // api：经过宿主校验的能力，不是原生 chrome.*。
    const text = document.createElement('h2');
    root.append(text);
    function update(s) {
      text.textContent = s.visible ? s.content : '';
      text.style.color = s.accent;
    }
    update(api.settings.get());
    api.settings.onChange(update);
  }
};
```

保存后重新加载扩展，按“插件管理 → 你的插件 → 设置”即可看到宿主自动绘制的设置项。**不必自己绘制设置页面**，甚至无需写保存逻辑。

## 3. 设置字段类型

在 `plugin.json.settings` 中添加设置分组，里面的 `fields` 对应输入控件。一个插件最多 12 个分组、64 个字段，同一插件内所有 `key` 唯一。设置 key 可以采用 `camelCase`。

| type | 用途 | 需要的字段 | 默认值示例 |
|------|------|------------|------------|
| `toggle` | 开关 | `default` | `true` |
| `text` | 单行文本 | `default`；可选 `maxLength` | `"Hello"` |
| `textarea` | 多行文本 / CSS 文本 | `default`；可选 `maxLength` | `""` |
| `number` | 数字输入 | `min`、`max`、`step`、`default` | `20` |
| `slider` | 滑块 | `min`、`max`、`step`、`default` | `70` |
| `color` | RGB 颜色选择 | `default` | `"#aabbcc"` |
| `select` | 下拉选择 | `options`、`default` | `"google"` |
| `url` | HTTP(S) 网址 | `default` | `"https://example.com"` |

所有字段都要求 `key`, `type`, `label`, `default`，并可加 `description` 提示。`select` 的选项形式为 `[{"value":"google","label":"Google"},...]`。`url` 可为空字符串，非空值必须是合法 HTTP(S) URL；任何输入都由宿主再次校验。

```json
{
  "key": "size", "type": "slider", "label": "时钟字号",
  "min": 40, "max": 120, "step": 5, "default": 80,
  "description": "保存后立即生效"
}
```

插件读取初始设置：

```js
const current = api.settings.get();
console.log(current.size);
```

监听用户在管理器里保存的设置：

```js
const unsubscribe = api.settings.onChange(next => {
  console.log('设置更新：', next);
  // 更新 DOM / CSS 变量，不需要重启插件
});
```

`api.settings.get()` 返回当前设置的副本；不要在插件里直接改写它。`unsubscribe()` 可取消监听。

## 4. 自己设计卡片或全屏页面

插件可以使用标准 DOM API，创建元素、表单、事件、`<style>`、动画等，甚至实现整套自己的页面风格。CSS 在插件自己的沙箱 iframe 里，不会改动宿主 UI。

普通卡片：

```json
"layout": { "span": 6, "height": 300 }
```

完全独立的新标签页：

```json
"layout": { "mode": "fullscreen", "span": 12, "height": 640 }
```

全屏插件的 iframe 占据整个视口；宿主的插件管理按钮始终位于其上层。为避免插件互相遮挡，推荐只启用一个全屏主页插件。可参考 `examples/classic-home/`，它包含时钟、搜索、分组卡片与大量自定义样式。

插件可在运行时调整**普通卡片**尺寸：

```js
api.layout.update({ span: 8, height: 420 });
```

受限范围仍为 1–12 栏、130–1200 像素。全屏插件的动态尺寸更新会被忽略。

## 5. 插件专属持久化存储

需要在 `plugin.json` 中声明：

```json
"capabilities": ["storage"]
```

然后在 `main.js` 中写：

```js
window.LemonPlugin = {
  async mount(root, api) {
    const tasks = await api.storage.get('tasks', []);
    tasks.push({ title: '写完插件', done: false });
    await api.storage.set('tasks', tasks);
    // await api.storage.remove('tasks');
  }
};
```

存储是 Promise 异步 API，使用 `await`。每个插件只会读写自己 ID 命名空间的数据，单插件最多 32 个 key、总 JSON 16 KiB。用户删除插件目录不会自动清除已保存数据；当前版本还没有自动迁移或数据清理页面。不要存储密码、令牌或高度敏感的隐私资料。

## 6. 打开网址

清单声明 `"capabilities": ["open-url"]`。在用户点击按钮等真实操作时：

```js
button.addEventListener('click', () => {
  const accepted = api.open('https://www.example.com/');
  if (!accepted) console.warn('请求不合法或未声明能力');
});
```

只允许 HTTP/HTTPS 网址；宿主会进一步弹出确认，最多每 30 秒 3 次。插件不能直接通过 `window.open()` 绕过宿主要求。

## 7. 修改背景（本地图片和 MP4）

声明 `"capabilities": ["background"]`，把自己的资源放在插件目录中：

```text
plugins/my-home/
├── plugin.json
├── main.js
└── assets/
    ├── wall.jpg
    └── animated.mp4
```

```js
api.background.set('assets/wall.jpg');
api.background.set('assets/animated.mp4');
api.background.reset();
```

背景由宿主载入本地文件并渲染在页面底层，离开插件或禁用它后会恢复默认背景。MP4 会静音循环播放，失败时回退默认图。**不支持远程 URL**，避免扩展加载不可控的外部资源。该接口仅接受 `assets/` 路径下的 `.png/.jpg/.jpeg/.webp/.gif/.mp4`；插件作者须附上实际文件，不能引用任意文件系统路径。

`install-examples.mjs` 会复制示例插件顶层 `assets/` 中的图片。非示例的个人插件，可以直接在自己的 `plugins/<id>/assets/` 中加入视频并重新生成清单。

## 8. 使用自己的图标、CSS 与 JSON 文件

不用把所有图片都转成 Base64 写在 `main.js` 里，可以通过宿主安全读取自己目录下的静态资源：

```text
plugins/my-plugin/
├── main.js
├── plugin.json
└── assets/
    ├── icon.png
    ├── theme.css
    └── links.json
```

```js
async mount(root, api) {
  const image = document.createElement('img');
  image.src = await api.assets.image('assets/icon.png'); // 返回 data:image/... URL
  root.append(image);
  const css = await api.assets.text('assets/theme.css');
  const style = document.createElement('style');
  style.textContent = css;
  root.append(style);
  const links = JSON.parse(await api.assets.text('assets/links.json'));
}
```

图片限制 1 MiB，仅 `.png/.jpg/.jpeg/.webp/.gif`；文本限制 256 KiB，仅 `.txt/.css/.json`。宿主只读取插件自身 `assets/` 中的文件，拒绝目录遍历，不需要声明额外能力。它不能用于读取别的插件或本机任意文件。动态/大容量视频请通过 `api.background.set('assets/animated.mp4')` 设置页面背景。`examples/settings-showcase` 中有实际图标加载示例。

## 9. 常见问题

**插件放了文件，却没有显示？**

- 先运行 `node scripts/build-registry.mjs`，确认清单中有它。
- 在 `chrome://extensions/` 重新加载扩展，再打开新标签。
- 核对目录 ID 和 `plugin.json.id` 完全一致。
- 按 F12 查看控制台；12 秒未启动会显示错误和重试。

**想给插件添加第三方依赖？**

v0.2.0 的入口是本地 `main.js`，上限 512 KiB。可以在开发环境使用打包工具，把依赖合并到本地入口文件再安装。不能在运行时从 CDN 加载 JS，插件也不能修改宿主 CSP。

**怎么让插件看起来像 v0.9.x？**

复制 `examples/classic-home` 为自己的插件，把 `layout.mode` 设为 `fullscreen`，在 `settings` 中添加颜色、间距、样式等选项。经典示例已实现时钟、日期、多搜索引擎、分组导航和本地存储；Bing 每日壁纸、书签导入和拖拽尚需开发。

**插件支持自己写设置弹窗吗？**

插件可以在自己的 iframe 内做任何自有 UI。不过推荐把常规设置放在 `plugin.json.settings`，由宿主统一绘制、验证和持久化。v0.2.0 暂未开放让插件向宿主注入自定义 HTML 的能力，以保护管理器安全。

## 10. 安全原则（必读）

- 本地插件依然是不可信代码，只是它在无高权限 API 的隔离沙箱中执行；不要安装来源不明的插件。
- 不存在“绕过 Chrome 扩展安全规则”这一安装方式；需开发者模式 + 重新生成清单 + 重新加载。
- 宿主只接受来源窗口匹配当前 iframe 的消息，再验证 ID、格式、能力和数值范围。
- 自定义 CSS 只会影响本插件沙箱；不要直接拼接陌生人的 HTML 到 DOM。
- 接口是 v1 协议向后兼容扩展，适用于 v0.2.0；未来若升级协议，会另行发布兼容性说明。
