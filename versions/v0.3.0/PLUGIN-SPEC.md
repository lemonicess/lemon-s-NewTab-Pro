# lemon's NewTab Pro 插件规范 v1（宿主 v0.3.0）

这是当前**规范性文件**。以 `plugin-schema.js` 和 `plugin-packages.js` 的实际校验规则为最终执行依据。插件源代码只在不具扩展权限的 sandbox iframe 内运行。

## 1. 包格式（必需）

每个插件是一个**唯一目录**，例如 `my-weather/`：

```
my-weather/
  plugin.json     # UTF-8 JSON，不超过 64 KB
  main.js         # UTF-8 JavaScript，不超过 512 KB
  assets/         # 可选：图片、视频、woff/woff2、css、txt、json
    background.jpg
  README.md       # 可选，导入时忽略
```

只要目录中有 `plugin.json` 与 `main.js` 就是完整插件。开发者无须编译。目录名等于插件 ID，小写英文字母开头，后接小写字母、数字或 `-`，长度 2–40。不要随意更改 ID：**ID 是存储命名空间和插件身份，重命名等于安装新插件**。

**最简 `plugin.json`**：

```json
{"id":"my-weather","name":"我的插件","version":"1.0.0"}
```

**可选字段与默认值**：

| 字段 | 类型 | 默认值 | 含义 |
|---|---|---|---|
| `apiVersion` | 数字 | `1` | 目前只支持 1 |
| `description` | 字符串，最多 180 字符 | `""` | 功能描述 |
| `icon` | 字符串，最多 8 字符 | `"◈"` | 插件符号 |
| `layout` | 对象 | `{ "span":6,"height":240 }` | 卡片宽度为 1–12 栏，高度 130–1200px；全屏需 `mode:"fullscreen",span:12` |
| `defaultEnabled` | 布尔 | `false` | 打包内插件初次加载默认状态；**用户导入的插件无论此值是什么都从禁用开始** |
| `capabilities` | 数组 | `[]` | 下文列出的能力白名单 |
| `settings` | 数组 | 无 | 宿主生成的设置组（见下文） |

插件版本格式 `major.minor.patch`，例如 `1.0.0`；不能包含除上述字段外的未知键。更新保留相同 ID，**用户需要确认，且更新后的本地插件默认禁用**。

## 2. 入口与生命周期

推荐写法（v0.3.0）：

```js
Lemon.mount((root, api) => {
  const p = document.createElement('p');
  p.textContent = 'Hello NewTab';
  root.append(p);
});
```

旧版写法完全兼容：

```js
window.LemonPlugin = {
  mount(root, api) { root.textContent = 'Hello'; }
};
```

`mount` 可返回 Promise。成功时发送 `plugin:ready`；抛错或拒绝 Promise 会显示异常。超时 12 秒会给出重试；iframe 在禁用、卸载或刷新时销毁，所以必须避免依赖其他插件窗口的全局变量。

**每个插件都有自己的 iframe 文档和全局作用域**。CSS、DOM ID、脚本变量、事件监听器不会直接影响别的插件。不要访问 `parent.document`、`top`、`chrome.*`，这些接口不会提供。

## 3. 声明能力（最小权限）

`capabilities` 仅允许：

- `"storage"`：`api.storage.get(key, fallback)` / `set(key, jsonValue)` / `remove(key)`。同一插件最多 32 个键、合计 16 KB；键是以小写字母起始的英数/下划线/连字符（最长 64），不同插件绝不共享空间。
- `"open-url"`：`api.open('https://example.com')`。仅允许 http/https，拒绝用户名密码 URL，必须在用户激活期间调用，宿主每次确认，最多 30 秒内 3 次。
- `"background"`：`api.background.set('assets/photo.png')`、`reset()`。只允许当前被选为**背景控制者**的已启用插件改变宿主背景；另一插件不能抢占。也支持目录里的 MP4。

不声明就不能使用这些能力。任何能力都**不会赋予直接访问浏览器书签、标签、文件系统、Chrome 存储或任意网络请求的权限**。安装/更新时用户可以审阅声明的能力。

## 4. 普通能力（无需声明）

- `api.id`：当前插件唯一 ID。
- `api.settings.get()`：读取当前规范化配置副本。`api.settings.onChange(fn)`：保存设置后通知；返回取消监听函数。
- `api.layout.update({span:8,height:360})`：更新自己的卡片尺寸；全屏模式尺寸不可在运行时修改。
- `api.assets.text('assets/theme.css')`：读取本插件的 css、json 或 txt（<=256 KB），结果是字符串。
- `api.assets.image('assets/logo.png')`：读取本插件图片（<=1 MB），返回 `data:` URI。
- `api.assets.font('assets/font.woff2')`：读取字体（<=2 MB），返回 `data:` URI，可用于插件 iframe 的自定义字体样式。

脚本默认不能进行网络请求：沙箱 CSP 的 `connect-src` 为 `none`，`form-action`、`object-src`、`frame-src` 亦为 `none`。禁止直接执行外部下载的 JavaScript；静态资源必须随插件一起分发或通过宿主提供的受限 API 读取。

## 5. 设置格式（宿主统一渲染）

```json
{
  "id":"my-weather", "name":"示例", "version":"1.0.0",
  "settings":[{"id":"general","title":"常规","fields":[
    {"key":"showTitle","type":"toggle","label":"显示标题","default":true},
    {"key":"accent","type":"color","label":"颜色","default":"#b49aff"},
    {"key":"size","type":"slider","label":"字号","min":12,"max":60,"step":2,"default":24},
    {"key":"engine","type":"select","label":"搜索引擎","default":"bing","options":[{"value":"bing","label":"Bing"},{"value":"google","label":"Google"}]}
  ]}]
}
```

字段类型共有 `toggle`、`text`、`textarea`、`number`、`slider`、`color`、`select`、`url` 八种。最多 12 组，每组 1–20 项，全插件最多 64 个设置。每组 ID 唯一、每个设置 `key` 在本插件内唯一。必须提供符合类型和范围的 `default`。`url` 仅接受 http/https。用户保存时宿主验证，非法值不会覆盖合法存储。

设置的 `key` 尽量保持向后兼容，修改类型或删除旧字段可能让历史数据恢复默认值。

## 6. 资源与容量

插件目录仅允许 `plugin.json`、`main.js`、常见说明文件和 `assets/` 中的**白名单资源**：png、jpg、jpeg、webp、gif、mp4、woff、woff2、css、txt、json。禁止额外 JS、HTML、SVG、绝对路径、`../` 越界、符号链接访问、危险 URL。最多 128 个资源，单资源 <=50 MB，单插件包 <=60 MB；总插件数最多 64。由于文件夹选择器是浏览器提供的，用户需要亲自授权选取目录。

安装时读取并复制到扩展本地 IndexedDB，不修改原始目录；**不会自动更新**。安装版本应固定标识和资源内容，重复 ID 会要求明确确认（与扩展内置同 ID 则拒绝）。

## 7. 冲突仲裁（强制）

- **样式/DOM 冲突**：独立 sandbox iframe；任何插件的 CSS 只能影响自己。
- **存储/设置冲突**：宿主用插件 ID 分区；插件不能读取其他插件的数据。
- **全屏冲突**：只允许一个全屏插件在主页呈现；启用新全屏插件时自动禁用其他全屏插件。全屏运行期间其他卡片隐藏但仍处于启用状态。
- **背景冲突**：插件管理中仅选一个当前背景控制者，其他插件的背景请求被忽略。切换背景控制者会清空原控制者的背景，需让新插件重新应用背景（例如禁用/启用该插件）。
- **资源冲突**：每个插件只可访问自己的 `assets/`。
- **外链冲突**：宿主限频并逐次弹出确认。
- **出错处理**：启动异常/超时仅显示该插件的错误卡片和重试，不自动停止整个主页。

**剩余风险**：同源浏览器进程可能因 CPU 密集代码或巨大的媒体资源变卡；沙箱隔离主要保护权限和 DOM，不是严格的 CPU/内存配额。管理员策略、扩展 ID 变更、恶意脚本及浏览器实现差异不在本协议的绝对保障范围内。

## 8. 分发与兼容

普通用户只需导入文件夹并在管理器启用，无需 Node.js。示例可以从内置下拉框一键安装。旧版 `plugins/registry.json` 作为**打包内插件注册**兼容保留，但推荐普通用户使用图形界面导入。发布包的 `plugins/` 默认空、只包含 `.gitkeep` 与空注册清单；`.gitignore` 忽略个人插件。

需要上架 Chrome Web Store 的开发者应自行评估平台政策和隐私声明；沙箱中的用户安装脚本不意味着任何插件都会自动通过商店审核。
