# lemon's NewTab Pro — 插件开发完整指南

> **适用宿主版本：** v0.3.1  
> **插件协议：** API v1  
> **文档类型：** 开发入门、接口参考、插件规范与调试手册  
> **文档定位：** 供第三方开发者阅读，可直接放入项目仓库  
> **重要说明：** 本文按 v0.3.1 的 `plugin-schema.js`、`plugin-packages.js`、`sandbox.js`、`index.js` 和官方示例编写。如果本文与某个版本的实际代码冲突，以**对应版本的源码校验与运行实现**为准。

---

## 目录

1. [项目与插件模型](#1-项目与插件模型)
2. [5 分钟写出第一个插件](#2-5-分钟写出第一个插件)
3. [安装、更新与卸载插件](#3-安装更新与卸载插件)
4. [插件文件夹的正式规范](#4-插件文件夹的正式规范)
5. [`plugin.json` 完整参考](#5-pluginjson-完整参考)
6. [插件启动与生命周期](#6-插件启动与生命周期)
7. [宿主 API 完整参考](#7-宿主-api-完整参考)
8. [统一插件设置界面](#8-统一插件设置界面)
9. [本地数据存储](#9-本地数据存储)
10. [图片、CSS、字体和背景资源](#10-图片css字体和背景资源)
11. [布局、全屏与插件冲突规则](#11-布局全屏与插件冲突规则)
12. [可直接复制的完整计数器插件](#12-可直接复制的完整计数器插件)
13. [安全机制与开发限制](#13-安全机制与开发限制)
14. [兼容、版本号与发布建议](#14-兼容版本号与发布建议)
15. [调试与常见问题](#15-调试与常见问题)
16. [发布前自检清单](#16-发布前自检清单)
17. [参考示例与术语表](#17-参考示例与术语表)

---

## 1. 项目与插件模型

**lemon's NewTab Pro** 是基于 Chrome Manifest V3 的新标签页扩展。核心本身尽可能保持简单：默认背景、插件管理界面、插件运行容器以及必要的安全/存储/设置服务。时钟、搜索、导航等可见功能由插件提供。

```
Chrome 新标签页
└── lemon's NewTab Pro 宿主（扩展页面）
    ├── 插件管理器
    │   ├── 导入 / 更新 / 卸载
    │   ├── 启用 / 禁用
    │   └── 自动生成插件设置界面
    ├── 数据、资源和权限代理
    └── 插件面板
        ├── 插件 A：独立 sandbox iframe
        ├── 插件 B：独立 sandbox iframe
        └── 插件 C：独立 sandbox iframe
```

**设计原则：**

- **无 Node.js 依赖：** 写插件、导入插件、安装插件、正常运行插件均不需要 Node.js、npm 或构建工具。
- **一个插件一个沙箱：** 插件的 DOM、CSS 和 JS 全局变量在不同 iframe 中运行，避免直接互相污染。
- **通过 API 请求能力：** 插件不能直接访问宿主 DOM 或高权限 Chrome 扩展 API；设置、存储、资源、背景和外链经由宿主提供的 API。
- **权限最小化：** 不需要额外能力的插件不声明 `capabilities`；需要时只申请对应项目。
- **先安装再启用：** 用户从文件夹或示例目录安装的插件默认禁用，需明确启用。
- **不自动监控源目录：** 导入是将文件复制为浏览器内部的插件快照；修改磁盘原文件后需要**重新导入**。

> 安全隔离可以大幅减少样式、变量和数据冲突，但不是 CPU、内存或恶意行为的绝对隔离。请只安装可信来源的插件。

## 2. 5 分钟写出第一个插件

### 2.1 建立文件夹

创建下面的结构（名称可以换成你自己的合法插件 ID）：

```text
hello-lemon/
├── plugin.json
└── main.js
```

**文件夹名称必须与 `plugin.json` 的 `id` 完全一致**。示例使用 `hello-lemon`。

### 2.2 编写 `plugin.json`

```json
{
  "id": "hello-lemon",
  "name": "你好，lemon!",
  "version": "1.0.0"
}
```

这三个字段就是最简插件的全部必填内容；其它字段有默认值。

### 2.3 编写 `main.js`

```javascript
Lemon.mount((root, api) => {
  const container = document.createElement('div');
  container.style.cssText =
    'padding:24px;color:white;background:#251d3f;border-radius:16px;';

  const title = document.createElement('h2');
  title.textContent = '你好，lemon\'s NewTab Pro！';

  const button = document.createElement('button');
  button.type = 'button';
  button.textContent = '点我';
  button.addEventListener('click', () => {
    title.textContent = '插件交互成功！';
  });

  container.append(title, button);
  root.append(container);
});
```

> `root` 是**当前插件沙箱里的内容节点**，不是宿主页面。`api` 是宿主提供的受限接口对象。

### 2.4 导入并启用

1. 在 Chrome 中加载已经解压的 lemon's NewTab Pro 扩展（首次安装：打开 `chrome://extensions` → 开发者模式 → 加载已解压的扩展程序 → 选择含 `manifest.json` 的扩展目录）。
2. 打开一个新标签页，点击右上角的**插件管理**。
3. 点击**导入插件文件夹**，选择 `hello-lemon/` 文件夹。
4. 核对弹窗中的插件名、版本和声明能力，确认安装。
5. 安装成功后，在插件列表中点击**启用**。
6. 主页上出现一个可点击的卡片，即说明插件正常运行。

**整个过程不需要 `node` 命令，也不需要生成 `registry.json`。**

## 3. 安装、更新与卸载插件

### 3.1 普通用户安装方式

| 方式 | 操作 | 是否需要 Node.js |
|---|---|---|
| 导入本地插件 | 插件管理 → 导入插件文件夹 → 选择插件目录 | 否 |
| 安装官方示例 | 插件管理 → 示例下拉框 → 安装示例 | 否 |
| 安装扩展内预置插件 | 由发行包在 `plugins/registry.json` 中登记 | 用户不需要 |

**不要只选 `main.js` 文件**，必须选择同时包含 `plugin.json` 与 `main.js` 的**文件夹**。

### 3.2 更新插件

将本地 `plugin.json` 的 `version` 改为新的 `x.y.z`，完成代码修改后：

1. 在插件管理中再次选择**原来那个文件夹**。
2. 宿主发现相同的 `id` 后，提示更新并展示声明能力。
3. 用户确认后替换此前保存的插件代码和资源。
4. **更新后的插件默认禁用**；用户审查后自行重新启用。
5. 插件原有的设置和持久化数据会保留（除非字段或数据结构已经不兼容）。

**注意：** 本版不会监控外部文件变更，也没有内置的插件在线自动更新功能。

### 3.3 卸载插件

在插件管理器点击**卸载**，会删除 IndexedDB 里保存的插件代码和资源副本；**不会删除磁盘上的原始插件文件夹**。当前实现还会保留该插件的设置和存储数据，以供将来重装恢复。因此，卸载不等于清除全部个人数据。

### 3.4 “本地导入”与“扩展自带”是两回事

- **本地导入插件：** 通过图形界面读入文件夹，代码与资源保存在扩展的 IndexedDB；可由用户卸载。
- **扩展自带插件：** 代码真实位于扩展目录的 `plugins/<id>/` 中，并被 `plugins/registry.json` 登记；通常供仓库维护者打包发行使用。
- 如果本地导入插件与内置插件 ID 相同，宿主会优先保留内置插件，并拒绝用本地包更新它。
- 核心发行包可以只提供**空的注册清单**；不代表插件安装功能不可用。

## 4. 插件文件夹的正式规范

### 4.1 标准目录

```text
my-plugin/
├── plugin.json          # 必需；UTF-8 JSON
├── main.js              # 必需；UTF-8 JavaScript，普通脚本
├── README.md            # 可选；说明文件
├── LICENSE              # 可选；许可证
└── assets/              # 可选；只放白名单资源
    ├── icon.png
    ├── style.css
    ├── data.json
    ├── background.jpg
    └── custom.woff2
```

根目录允许的额外说明/占位文件：`README.md`、`LICENSE`、`LICENSE.txt`、`.gitkeep`、`.DS_Store`、`Thumbs.db`（导入时忽略）。**其它资源文件必须放在 `assets/` 下**。

不要在根目录混放 `package.json`、`node_modules/`、额外的 JS/HTML 等文件并直接导入；当前导入器会拒绝不在白名单内的路径。需要留下开发辅助文件时，可把实际可分发目录单独整理出来。

### 4.2 ID 与目录名

正式规则：

```regex
^[a-z][a-z0-9-]{1,39}$
```

即：长度 **2–40 个字符**；首字符必须是小写英文字母；后面只能出现小写英文字母、数字、连字符 `-`。

| 合法 | 不合法 |
|---|---|
| `my-clock` | `My-Clock`（大写） |
| `counter2` | `counter_2`（下划线） |
| `a1` | `a`（不足 2 位） |
| `classic-home` | `我的插件`（中文 ID） |

**ID 是插件身份，也是设置和存储命名空间。** 升级同一个插件时保持 ID 不变；更改 ID 会被当成另一个插件，而不是旧插件的更新。

### 4.3 文件类型与容量

| 对象 | 限制 |
|---|---|
| `plugin.json` | 不超过 64 KiB |
| `main.js` | 不超过 512 KiB |
| 资源数量 | 最多 128 个 |
| 单个资源文件 | 不超过 50 MiB |
| 整个插件包 | 不超过 60 MiB |
| 总插件数量 | 最多 64 个（包括扩展自带插件） |

支持的资源扩展名：

- 图片：`.png`、`.jpg`、`.jpeg`、`.webp`、`.gif`
- 视频：`.mp4`（主要用于背景）
- 字体：`.woff`、`.woff2`
- 文本：`.txt`、`.json`、`.css`

**不接受**额外 `.js`、`.html`、`.svg`、可执行程序或任意其它扩展名，也不接受 `../` 路径越界、绝对路径、反斜杠路径等。为了最大兼容性，资源文件名建议使用小写字母、数字、`-` 与 `_`。

## 5. `plugin.json` 完整参考

### 5.1 所有顶级字段

| 字段 | 类型 | 必填 | 默认值 / 说明 |
|---|---|---|---|
| `id` | 字符串 | 是 | 必须与插件文件夹名一致 |
| `name` | 字符串 | 是 | 用户可见名称，不超过 40 字符 |
| `version` | 字符串 | 是 | 严格为 `数字.数字.数字`，如 `1.2.0` |
| `apiVersion` | 数字 | 否 | 默认 `1`；目前只支持 `1` |
| `description` | 字符串 | 否 | 不超过 180 字符 |
| `icon` | 字符串 | 否 | 最多 8 个 Unicode 字符，默认 `◈` |
| `layout` | 对象 | 否 | 默认 `{ "span": 6, "height": 240 }` |
| `defaultEnabled` | 布尔 | 否 | 默认 `false`；用户导入插件始终从禁用开始 |
| `capabilities` | 字符串数组 | 否 | 默认 `[]`，只能声明白名单能力 |
| `settings` | 对象数组 | 否 | 宿主自动生成插件设置页 |

顶级字段采用**严格白名单**：不支持的额外键会导致导入失败。尤其**不要写 `entry`**；它是宿主内部计算的字段，不是开发者应填写的清单字段。

### 5.2 较完整的合法示例

```json
{
  "id": "sample-panel",
  "name": "示例面板",
  "version": "1.0.0",
  "apiVersion": 1,
  "description": "演示布局、设置和本地存储",
  "icon": "🧩",
  "layout": {
    "mode": "card",
    "span": 5,
    "height": 280
  },
  "defaultEnabled": false,
  "capabilities": ["storage"],
  "settings": [
    {
      "id": "appearance",
      "title": "外观",
      "fields": [
        {
          "key": "showTitle",
          "type": "toggle",
          "label": "显示标题",
          "default": true
        },
        {
          "key": "accent",
          "type": "color",
          "label": "强调色",
          "default": "#b49aff"
        }
      ]
    }
  ]
}
```

> 提示：这段 JSON 的插件 ID 为 `sample-panel`，因此文件夹也必须名为 `sample-panel`。**不要把上面示例直接放入 `hello-lemon/`**，否则 ID 不匹配。

### 5.3 布局配置

```json
"layout": { "mode": "card", "span": 6, "height": 300 }
```

- `mode`：`card` 或 `fullscreen`，省略相当于卡片模式。
- `span`：占据 12 栏布局中的 **1–12 栏**，必须是整数。
- `height`：初始卡片高度，范围 **130–1200 px**，必须是整数。
- `fullscreen`：全屏插件必须设置 `span: 12`，例如：

```json
"layout": { "mode": "fullscreen", "span": 12, "height": 640 }
```

在全屏模式下，宿主只显示当前全屏插件的面板内容；插件可自行在 iframe 内设计完整主页布局。全屏不代表得到宿主 DOM 控制权。

### 5.4 权限能力声明

**目前仅支持这三个能力名称：**

| 能力 | 用途 | 不等于什么 |
|---|---|---|
| `storage` | 使用 `api.storage` 读写插件私有持久化数据 | 不等于访问 Chrome 原始存储或其它插件数据 |
| `open-url` | 经用户操作和宿主确认后打开 HTTP(S) 网页 | 不等于任意联网权限 |
| `background` | 请求将本插件的本地图片/MP4 设置为宿主背景 | 不等于抢占背景控制权 |

例如：

```json
"capabilities": ["storage", "open-url"]
```

能力不能重复，也不能包含未知名称。**没有实际需求就不要申请。** `settings`、`assets`、`layout` 的普通受限 API 无需另外声明。

## 6. 插件启动与生命周期

### 6.1 推荐入口：`Lemon.mount`

```javascript
Lemon.mount((root, api) => {
  root.textContent = '启动成功';
});
```

### 6.2 兼容旧入口：`window.LemonPlugin`

```javascript
window.LemonPlugin = {
  mount(root, api) {
    root.textContent = '启动成功';
  }
};
```

两种写法**二选一**即可。推荐新插件使用第一种。`main.js` 是**普通 JavaScript 脚本**，当前不是 ES Module 入口；不要直接使用顶层 `import`、`export` 或依赖 npm 自动打包。

### 6.3 异步启动

`mount` 可以返回 Promise：

```javascript
Lemon.mount(async (root, api) => {
  const counter = await api.storage.get('count', 0);
  root.textContent = `已记录 ${counter} 次`; 
});
```

宿主在 `mount` 正常完成后确认插件就绪；脚本抛错或 Promise 拒绝会显示插件错误。插件启动有 **12 秒超时**；建议把耗时操作放在启动后处理，不要让 `mount` 一直等待。

### 6.4 生命周期建议

1. 沙箱 iframe 创建。
2. 宿主向沙箱提供当前插件代码、设置与已声明能力。
3. 执行 `main.js`，注册并调用 `mount(root, api)`。
4. `mount` 正常完成后进入运行状态。
5. 设置保存时调用已注册的 `api.settings.onChange` 回调。
6. 插件被禁用、全屏布局切换、页面刷新或宿主重绘时，其 iframe 可能被销毁并重建。

**当前没有统一的 `unmount()` 插件回调。** 应按 iframe 生命周期设计：避免长时间占用资源，合理管理定时器，不要依赖 iframe 销毁后的后台任务。可以监听沙箱内的 `pagehide` 以清理自己创建的定时器。

```javascript
Lemon.mount((root) => {
  const timer = setInterval(() => {
    root.textContent = new Date().toLocaleTimeString();
  }, 1000);

  window.addEventListener('pagehide', () => clearInterval(timer), { once: true });
});
```

## 7. 宿主 API 完整参考

插件入口的第二个参数 `api` 是唯一推荐的宿主服务入口。

### 7.1 API 速查表

| API | 返回值 | 需要声明能力 | 用途 |
|---|---|---|---|
| `api.id` | `string` | 否 | 当前插件 ID |
| `api.settings.get()` | `object` | 否 | 获取当前插件设置的副本 |
| `api.settings.onChange(fn)` | 取消监听函数 | 否 | 监听设置保存 |
| `api.storage.get(key, fallback)` | `Promise<any>` | `storage` | 读取私有数据 |
| `api.storage.set(key, value)` | `Promise<boolean>` | `storage` | 保存 JSON 数据 |
| `api.storage.remove(key)` | `Promise<boolean>` | `storage` | 删除数据项 |
| `api.layout.update({span, height})` | `boolean` | 否 | 申请修改自己的卡片尺寸 |
| `api.assets.text(path)` | `Promise<string>` | 否 | 读取本插件 txt/css/json |
| `api.assets.image(path)` | `Promise<string>` | 否 | 返回图片 Data URI |
| `api.assets.font(path)` | `Promise<string>` | 否 | 返回字体 Data URI |
| `api.open(url)` | `boolean` | `open-url` | 请求打开外部网页 |
| `api.background.set(path)` | `boolean` | `background` | 请求应用本地图片/MP4 背景 |
| `api.background.reset()` | `boolean` | `background` | 请求恢复默认背景 |

**布尔返回值不等于最终执行成功。** 例如 `api.open()` 返回 `true` 表示请求已经发送，用户仍可拒绝；`api.background.set()` 返回 `true` 也不等于插件已经获得背景控制权。

### 7.2 设置：`api.settings`

```javascript
let config = api.settings.get();

const unsubscribe = api.settings.onChange((next) => {
  config = next;
  // 用新设置更新当前插件的 DOM
});
```

- 获取的是当前插件设置的**浅拷贝**。
- `onChange` 在用户通过宿主设置页**保存后**触发。
- 不存在 `api.settings.set()`：设置应由用户通过宿主统一界面修改。
- 返回的取消监听函数可在插件内部自行调用。

### 7.3 持久化：`api.storage`

```javascript
const saved = await api.storage.get('visits', 0);
await api.storage.set('visits', saved + 1);
await api.storage.remove('visits');
```

- 需在清单中声明 `"capabilities": ["storage"]`。
- `get` 允许传入备用值；如果保存值为 `null`，当前实现也会回退到备用值，**不适合依赖“存储的 null”与“键不存在”之间的区别**。
- 数据必须能进行 JSON 序列化；不保存函数、DOM 节点、循环引用等对象。
- 每个插件最多 **32 个键，总计 16 KiB**；键规则：`^[a-z][a-z0-9_-]{0,63}$`。
- 资源/存储请求在沙箱侧有约 **6 秒超时**。请使用 `try/catch` 处理失败。

> 注意：`storage` 键可以使用下划线 `_`，但 `settings` 的字段 `key` **不支持下划线**。两套命名规则不同。

### 7.4 布局：`api.layout.update`

```javascript
api.layout.update({ span: 8, height: 360 });
```

- 只能修改**当前插件自己的卡片**。
- `span` 为 1–12 的整数；`height` 为 130–1200 的整数；可以只提供其中一项。
- 对全屏插件，宿主会忽略动态卡片尺寸更新；建议直接在 `plugin.json` 配好全屏布局。
- 布尔返回值只是基本参数检查结果，不能作为宿主实际排版完成的确认。
- 当前动态尺寸只作用于运行中的面板；不是永久修改清单。

### 7.5 本地资源：`api.assets`

```javascript
const cssText = await api.assets.text('assets/style.css');
const imageDataUri = await api.assets.image('assets/icon.png');
const fontDataUri = await api.assets.font('assets/custom.woff2');
```

每次只能读取**当前插件** `assets/` 下的安全相对路径，不得访问其它插件资源。

| 方法 | 允许格式 | 单次读取上限 |
|---|---|---|
| `text` | txt / css / json | 256 KiB |
| `image` | png / jpg / jpeg / webp / gif | 1 MiB |
| `font` | woff / woff2 | 2 MiB |

即使导入时允许最大 50 MiB 的资源，**`api.assets.image()` 仍然只支持最多 1 MiB 的图片读取**。较大的背景图/视频应使用 `api.background.set()`，而不是当作普通图片 Data URI 加载。

### 7.6 外链：`api.open`

```javascript
button.addEventListener('click', () => {
  const submitted = api.open('https://example.com');
  if (!submitted) console.warn('打开请求未被接受');
});
```

- 需要 `open-url` 能力。
- 只允许 `http://` 和 `https://`；拒绝含用户名、密码的 URL。
- 要在**用户实际激活**期间调用（通常是点击事件同步执行）。
- 宿主会向用户确认，允许才打开；30 秒最多 3 次。不要在用户点击后先 `await` 很久再调用。
- `api.open()` 不是 HTTP API；不能读取网页响应，也不能绕过确认。

**反例（可能因失去用户激活状态失败）：**

```javascript
button.addEventListener('click', async () => {
  await someAsyncOperation();
  api.open('https://example.com');
});
```

### 7.7 背景：`api.background`

```javascript
api.background.set('assets/background.jpg');
// 或
api.background.set('assets/loop.mp4');
// 恢复默认背景
api.background.reset();
```

- 需要 `background` 能力。
- 只能引用本插件 `assets/` 下的 png、jpg、jpeg、webp、gif、mp4。
- 插件必须**处于启用状态，且被宿主选定为背景控制者**，请求才可能实际生效。
- 背景冲突由宿主仲裁：多个插件不能同时接管宿主背景。
- 用户切换背景控制者时，旧背景会被清空；新插件可能需要在重新启动或重新应用设置时再次发送背景请求。
- 背景读取和加载也可能失败，因此不要把 `set()` 返回 `true` 当成已显示成功。

## 8. 统一插件设置界面

你**不需要自己绘制设置弹窗**。只要在 `plugin.json` 中写 `settings`，宿主插件管理器会生成统一的设置页和保存按钮。

### 8.1 一个完整设置声明

下面片段放在 `plugin.json` 的顶层（与 `id`、`name`、`version` 同级）：

```json
"settings": [
  {
    "id": "appearance",
    "title": "外观",
    "description": "调整插件显示效果",
    "fields": [
      {"key":"showTitle","type":"toggle","label":"显示标题","default":true},
      {"key":"title","type":"text","label":"标题文字","default":"我的主页","maxLength":40},
      {"key":"notes","type":"textarea","label":"备注","default":"","maxLength":300},
      {"key":"size","type":"number","label":"字号","min":12,"max":36,"step":2,"default":20},
      {"key":"opacity","type":"slider","label":"透明度","min":0,"max":100,"step":5,"default":50},
      {"key":"accent","type":"color","label":"强调色","default":"#b49aff"},
      {"key":"engine","type":"select","label":"搜索引擎","default":"bing","options":[
        {"value":"bing","label":"Bing"},
        {"value":"google","label":"Google"}
      ]},
      {"key":"site","type":"url","label":"主页网址","default":"https://example.com"}
    ]
  }
]
```

> 这是一段 **JSON 字段片段**，并非独立 JSON 文档；复制时注意与其它顶级字段之间的逗号。

### 8.2 支持的 8 种类型

| `type` | 界面 | `default` 类型 | 额外约束 |
|---|---|---|---|
| `toggle` | 开关 | 布尔值 | `true` / `false` |
| `text` | 单行输入 | 字符串 | 可配置 `maxLength`，上限 500 |
| `textarea` | 多行输入 | 字符串 | 可配置 `maxLength`，上限 4000 |
| `number` | 数字输入 | 数字 | 必需 `min/max/step` |
| `slider` | 滑块 | 数字 | 必需 `min/max/step` |
| `color` | 颜色选择 | 字符串 | 必须为 `#RRGGBB`，不支持 8 位透明度 |
| `select` | 下拉选择 | 字符串 | 必需 `options`，默认值必须属于选项 |
| `url` | 网址输入 | 字符串 | 只允许 http/https，无凭据；允许空字符串 |

数值类型还必须满足：`min < max`，`step > 0`，默认值落在范围内且与步长对齐。

### 8.3 字段命名规则

设置组 `id` 和设置项 `key` 使用：

```regex
^[a-z][a-zA-Z0-9-]{0,39}$
```

- 首字符为小写英文字母；后续允许大小写英文字母、数字、连字符。
- 长度为 **1–40 字符**；不允许下划线 `_`。
- 同插件中组 `id` 不得重复；所有组之间的设置 `key` 也不能重复。
- `title` 最多 60 字符，`label` 最多 64 字符，`description` 最多 240 字符，`placeholder` 最多 120 字符。
- 最多 **12 个设置组**，每组 **1–20 个字段**，全插件最多 **64 个设置项**。
- `select` 最多 30 个选项，选项值不可重复。
- 设置字段只能使用实现所允许的属性：`key`、`type`、`label`、`description`、`default`、`placeholder`、`min`、`max`、`step`、`maxLength`、`options`。

### 8.4 实时更新界面

```javascript
Lemon.mount((root, api) => {
  const heading = document.createElement('h2');
  root.append(heading);

  function render(settings) {
    heading.textContent = settings.title;
    heading.style.color = settings.accent;
  }

  render(api.settings.get());
  api.settings.onChange(render);
});
```

当用户在宿主设置页点击保存时，配置会经过字段校验后存储，并通知运行中的插件；**不是插件内部每次键盘输入都立即触发**。

### 8.5 修改已发布设置的兼容性

- **尽量不要改旧 `key`**。改名会使旧设置无法按原键读取，通常回退到新默认值。
- 更改类型、数值范围或 `select` 选项前应考虑历史值；宿主会把不再合法的历史设置归一化为默认值。
- 不要把大型任务数据放在 `settings`；设置用于小而结构化的用户偏好，任务列表、计数器等应使用 `storage`。

## 9. 本地数据存储

### 9.1 何时使用

**适合：** 待办列表、点击计数、导航分组、用户自定义标签、小型状态数据。  
**不适合：** 大型数据库、图片二进制、视频文件、跨插件共享数据或高频写入的大量数据。

### 9.2 保存与异常处理

```javascript
Lemon.mount(async (root, api) => {
  const output = document.createElement('p');
  const button = document.createElement('button');
  button.textContent = '添加一次';
  root.append(output, button);

  let count = await api.storage.get('count', 0);
  output.textContent = `次数：${count}`;

  button.addEventListener('click', async () => {
    button.disabled = true;
    try {
      await api.storage.set('count', count + 1);
      count += 1;
      output.textContent = `次数：${count}`;
    } catch (error) {
      output.textContent = `保存失败：${error.message}`;
    } finally {
      button.disabled = false;
    }
  });
});
```

记得在 `plugin.json` 中声明：

```json
"capabilities": ["storage"]
```

### 9.3 命名空间与数据管理

宿主按插件 ID 隔离数据，插件 A 无法经 `api.storage` 读取插件 B 的数据。设置与普通数据分别管理。**当前没有插件间共享数据 API，也没有原子增量更新接口。**

多个标签页可能同时打开同一插件；如果它们都修改同一键，存在覆盖旧值的风险。复杂插件应自行设计写入节流和冲突处理，不能假定每次 `get → set` 都是跨标签页原子事务。

## 10. 图片、CSS、字体和背景资源

### 10.1 用本地 CSS 美化插件

`assets/style.css`：

```css
.panel {
  padding: 20px;
  border-radius: 16px;
  background: rgba(28, 22, 49, 0.85);
  color: white;
}
```

`main.js`：

```javascript
Lemon.mount(async (root, api) => {
  const css = await api.assets.text('assets/style.css');
  const style = document.createElement('style');
  style.textContent = css;
  document.head.append(style);

  const panel = document.createElement('div');
  panel.className = 'panel';
  panel.textContent = '本地 CSS 已加载';
  root.append(panel);
});
```

**不需要**在宿主 `index.html` 中添加 `<link>`，也不应修改主项目的 `index.css`。

### 10.2 用本地图片

```javascript
Lemon.mount(async (root, api) => {
  const img = document.createElement('img');
  img.alt = '插件图标';
  img.src = await api.assets.image('assets/icon.png');
  img.width = 96;
  root.append(img);
});
```

### 10.3 用本地字体

```javascript
const fontUri = await api.assets.font('assets/custom.woff2');
const style = document.createElement('style');
style.textContent = `
  @font-face { font-family: PluginFont; src: url("${fontUri}") format("woff2"); }
  .plugin-title { font-family: PluginFont, sans-serif; }
`;
document.head.append(style);
```

上面的字体示例需要放在插件 `mount` 函数中执行。字体只能作用于当前插件沙箱。

### 10.4 对背景的正确理解

- 插件**自己的卡片背景**可以直接通过 CSS 设置，不需要 `background` 能力。
- 需要改变**整个宿主的新标签页背景**时，才声明 `background` 并调用 `api.background.set()`。
- 如果同时有多个背景插件，宿主插件管理器负责选择控制者；其他插件的背景请求会被忽略。
- MP4 背景可能消耗更多 CPU/GPU，建议压缩资源并提供降级处理。

## 11. 布局、全屏与插件冲突规则

### 11.1 卡片模式

默认卡片占 **6/12 栏**，初始高度 240px。不同插件可以在宿主容器中并排显示、分别调整自己的内部 DOM。需要改变大小，使用 `layout` 清单声明或 `api.layout.update`。

### 11.2 全屏模式

在 `plugin.json` 中设置：

```json
"layout": { "mode": "fullscreen", "span": 12, "height": 640 }
```

适合做完整主页、仪表盘、旧版 v0.9.x 风格的时钟/搜索/导航组合。**同一时刻只会展示一个全屏插件。** 启用新的全屏插件时，宿主会关闭其它全屏插件的启用状态；全屏显示时普通卡片可能仍处于启用状态，但被隐藏。

### 11.3 各类冲突及其解决办法

| 类型 | 宿主行为 | 开发者该怎么做 |
|---|---|---|
| CSS / DOM 冲突 | 独立 iframe | 只操作本插件 `root` / 当前 iframe DOM |
| JS 全局变量冲突 | 沙箱间全局作用域隔离 | 不假设能共享 `window` 状态 |
| 设置冲突 | 按插件 ID 分区 | 稳定维护设置 `key` |
| 数据冲突 | 按插件 ID 分区 | 用 `api.storage`，别访问其它插件数据 |
| 全屏冲突 | 只展示一个全屏插件 | 全屏插件自行完成整页布局 |
| 背景冲突 | 只有被选中者能生效 | 背景切换后允许重新应用 |
| 文件路径冲突 | 只能读取本插件 `assets/` | 所有资源跟随插件打包 |
| 外链滥用 | 用户确认与限频 | 仅在点击时请求打开 |
| 插件初始化失败 | 单独报错与重试 | 捕获异常，避免无限等待 |

**仍然可能发生的影响：** 高 CPU 循环、大量计时器、巨型素材、非常频繁的宿主消息请求仍可能使浏览器卡顿。宿主当前并没有严格的每插件 CPU/内存预算。开发者应主动优化性能。

## 12. 可直接复制的完整计数器插件

这个例子同时展示：**自动生成设置界面 + 持久计数 + 交互 DOM + 即时换色 + 动态卡片高度**。不需要第三方依赖。

### 12.1 文件结构

```text
counter-demo/
├── plugin.json
└── main.js
```

### 12.2 `plugin.json`

```json
{
  "id": "counter-demo",
  "name": "计数器演示",
  "version": "1.0.0",
  "description": "演示宿主设置框架与插件私有存储",
  "icon": "🔢",
  "layout": { "span": 5, "height": 280 },
  "capabilities": ["storage"],
  "settings": [
    {
      "id": "appearance",
      "title": "外观",
      "fields": [
        {
          "key": "heading",
          "type": "text",
          "label": "标题",
          "default": "我的计数器",
          "maxLength": 40
        },
        {
          "key": "accent",
          "type": "color",
          "label": "按钮颜色",
          "default": "#b49aff"
        },
        {
          "key": "largeText",
          "type": "toggle",
          "label": "大字号",
          "default": false
        }
      ]
    },
    {
      "id": "behavior",
      "title": "计数",
      "fields": [
        {
          "key": "step",
          "type": "number",
          "label": "每次增加",
          "min": 1,
          "max": 20,
          "step": 1,
          "default": 1
        }
      ]
    }
  ]
}
```

### 12.3 `main.js`

```javascript
Lemon.mount(async (root, api) => {
  let settings = api.settings.get();
  let count = await api.storage.get('count', 0);

  const panel = document.createElement('section');
  const title = document.createElement('h2');
  const value = document.createElement('p');
  const add = document.createElement('button');
  const reset = document.createElement('button');
  const status = document.createElement('small');

  panel.style.cssText = [
    'box-sizing:border-box',
    'height:100%',
    'padding:24px',
    'border-radius:16px',
    'background:rgba(28,22,49,.9)',
    'color:#fff',
    'font-family:system-ui,sans-serif'
  ].join(';');

  add.type = 'button';
  reset.type = 'button';
  reset.textContent = '归零';
  status.style.display = 'block';
  status.style.marginTop = '12px';

  function render() {
    title.textContent = settings.heading;
    title.style.fontSize = settings.largeText ? '28px' : '20px';
    title.style.margin = '0 0 12px';
    value.textContent = `当前计数：${count}`;
    value.style.fontSize = settings.largeText ? '23px' : '17px';
    add.textContent = `增加 +${settings.step}`;
    add.style.background = settings.accent;
    add.style.color = '#20182b';
    add.style.padding = '10px 14px';
    add.style.marginRight = '8px';
    add.style.borderRadius = '8px';
    reset.style.padding = '10px 14px';
    reset.style.borderRadius = '8px';
  }

  async function save(next) {
    add.disabled = true;
    reset.disabled = true;
    status.textContent = '';
    try {
      await api.storage.set('count', next);
      count = next;
      render();
    } catch (error) {
      status.textContent = `保存失败：${error.message}`;
    } finally {
      add.disabled = false;
      reset.disabled = false;
    }
  }

  add.addEventListener('click', () => save(count + settings.step));
  reset.addEventListener('click', () => save(0));
  panel.append(title, value, add, reset, status);
  root.append(panel);
  render();

  api.settings.onChange((next) => {
    settings = next;
    render();
    api.layout.update({height: settings.largeText ? 320 : 280});
  });
});
```

### 12.4 验证流程

1. 选择 `counter-demo/` 导入，并确认安装。
2. 在插件管理列表中**启用**它。
3. 点击“增加”，刷新新标签页，数字应当保留。
4. 在插件管理中点击本插件的“设置”。
5. 修改标题、按钮颜色和每次增加步长，保存设置。
6. 返回卡片，应直接看到新标题/颜色；下次点击按新步长增加。
7. 禁用后重新启用，计数仍应保持。

如果某一步失败，按后面的“调试与常见问题”排查。

## 13. 安全机制与开发限制

### 13.1 为什么不允许随便读取磁盘目录？

Chrome 扩展不能在后台无授权地扫描用户任意目录。**用户必须主动选择插件文件夹**；宿主把文件内容校验后保存到自身数据库。这是安全设计，不是 Node.js 的运行依赖。

### 13.2 为什么插件没有 `chrome.*` 权限？

插件运行在声明为 Chrome MV3 沙箱页面的独立 iframe 中，不能直接访问宿主的 Chrome 扩展高权限 API。这可以降低插件与扩展核心互相影响的风险，但也意味着不能随意调用 `chrome.bookmarks`、`chrome.tabs`、`chrome.storage`、系统文件读取等功能。

### 13.3 CSP 与网络限制

当前沙箱采用严格内容安全策略（CSP），包括 `connect-src 'none'`、`frame-src 'none'`、`form-action 'none'`。因此：

- 不能把 `fetch('https://...')` 当作联网接口使用。
- 不能通过外部 `<script src="https://...">` 引入在线 JavaScript。
- 不能直接嵌入外站 iframe 或提交表单到外站。
- 不能自由下载第三方页面再执行代码。
- 不能让一个插件读取另一个插件的安装目录。
- 当前不提供插件专属联网代理或书签、历史记录等高级浏览器能力。

这些限制**不能通过修改插件清单绕过**。如未来需要网络/API 接入，应由**未来版本的宿主**提供明确授权、域名白名单、响应限制和用户隐私控制，而不是让插件直接突破沙箱。

### 13.4 开发者应遵守的安全准则

1. 处理用户输入时优先使用 `textContent`，避免直接拼入 `innerHTML`；示例中若使用静态可信模板，仍要确保没有混入用户输入。
2. 外链 URL 使用 `new URL(...)` 解析并限制 `http:`/`https:`。
3. 不存储账户密码、Token 或其它机密；普通本地存储不是加密保险箱。
4. 只声明实际需要的能力，并在 `README.md` 说明用途。
5. 控制定时器、DOM 节点数和媒体体积，避免卡顿。
6. 所有异步 API 做失败处理；不要因一次资源缺失使整个插件不可用。
7. 不依赖私有宿主对象、iframe 父窗口 DOM、内部消息协议或未公开接口。

## 14. 兼容、版本号与发布建议

### 14.1 两套版本要分清

- **宿主版本**：例如 lemon's NewTab Pro `v0.3.1`。
- **插件版本**：开发者自己的 `plugin.json.version`，例如 `1.2.0`。
- **插件 API 版本**：当前固定为 `apiVersion: 1`；不等同于宿主版本号。

当前插件版本格式只接受 `x.y.z` 三段数字；`1.0.0-beta` 这种后缀**不被接受**。

### 14.2 兼容性维护

- 保持插件 ID 不变。
- 谨慎更改 `settings.key` 和 `storage` 数据结构。
- 新功能按需要增加声明能力，但要让用户清楚知道权限变化。
- 尽量使用已公开的 `Lemon.mount` 与 `api.*`，不要引用 `index.js` 内部细节。
- v0.3.1 仍兼容旧式 `window.LemonPlugin = { mount(...) {} }`。

### 14.3 推荐发布方式

一个插件对应一个独立文件夹。推荐至少提供：

```text
my-plugin/
├── plugin.json
├── main.js
├── README.md
├── LICENSE
└── assets/
```

推荐的 README 内容：插件名称、用途、截图、最低兼容宿主版本、安装步骤、权限说明、数据保留说明、更新日志和已知问题。

**发布插件时不要声称插件已通过 Chrome Web Store 的独立安全审核。** 插件在受限沙箱中运行也不代表任意第三方代码一定安全、一定符合法规或商店政策。

## 15. 调试与常见问题

### 15.1 应当先做的检查

1. 插件文件夹名与 `plugin.json.id` 完全相同。
2. `plugin.json` 是**合法 JSON**：双引号、不能有注释、不能有尾随逗号。
3. `main.js` 存在且为普通 JavaScript 脚本。
4. 导入的是**整个插件文件夹**，不是单个文件。
5. 安装后插件默认**禁用**，要在列表里手动启用。
6. 修改原始文件以后，要**再次导入更新**；仅重新打开标签页不会自动载入硬盘修改。
7. 查看插件管理界面的错误提示与浏览器开发者工具控制台。

### 15.2 典型错误对照

| 现象 | 常见原因 | 建议处理 |
|---|---|---|
| 安装后仍是 0 个插件 | 没有完成导入；旧 v0.3.0 清单验证缺陷 | 确认宿主为 v0.3.1，点“刷新插件列表”，查看错误提示 |
| 安装成功但主页没有卡片 | 插件默认禁用 | 到插件列表手动启用 |
| 导入时提示 ID 不匹配 | 文件夹名和 `id` 不一致 | 二者改为完全一致的小写 ID |
| 提示 `plugin.json` 无效 | JSON 拼写错误、字段类型错误或多余字段 | 对照本文第 5、8 节及 `plugin-schema.js` |
| 提示不支持的文件 | 根目录混入了多余文件、资源没有放在 `assets/` | 移走不允许的文件 |
| “正在启动插件”后超时 | `mount` 长时间未完成或脚本报错 | 检查控制台、异步等待和入口函数 |
| `需要 storage 能力` | 未声明 `storage` | 在 `capabilities` 中添加 `storage` 后重新导入 |
| `存储 key 不合法` | 使用了空格、中文或大写开头的键 | 使用小写字母开头的合法存储键 |
| `api.open()` 返回 `false` | 未声明能力、URL 非法或失去用户激活状态 | 在点击回调内同步调用，并声明 `open-url` |
| 背景设置请求没有效果 | 未声明能力或不是选中的背景控制者 | 先启用插件，再在管理器指定背景控制者 |
| 大图片加载失败 | `api.assets.image` 限 1 MiB | 压缩图片或改用背景能力 |
| `fetch` 联网失败 | 沙箱 CSP 禁止任意网络连接 | 当前版本不支持，不能靠清单绕过 |
| 硬盘上的代码改了却不生效 | 插件安装的是数据库快照 | 重新导入该文件夹更新 |

### 15.3 如何检查错误信息

Chrome 中打开新标签页后按 `F12` 打开开发者工具，查看 Console。插件运行于独立 iframe，必要时在 DevTools 中切换到对应的 `sandbox.html` 执行上下文查看日志。**正常插件问题优先看控制台，不要先删除扩展或清空扩展数据。**

### 15.4 安全调试建议

先安装一个最简插件验证宿主能正常加载，再逐步增加 `settings`、`storage`、`assets`、`open-url`、`background`。如果添加某个能力后才出错，问题往往就在新加入的清单配置或 API 调用中。

## 16. 发布前自检清单

- [ ] `plugin.json.id` 与目录名一致，且符合 ID 规则。
- [ ] `plugin.json.version` 为 `x.y.z` 三段数字。
- [ ] `plugin.json` 无额外未知字段，JSON 格式合法。
- [ ] `main.js` 使用 `Lemon.mount(...)` 或兼容入口。
- [ ] `main.js` 不直接使用未经支持的 `import/export`、Chrome 高权限 API 或任意网络下载执行。
- [ ] `capabilities` 只申请实际使用的能力。
- [ ] 所有设置 `key` 唯一、默认值合法、范围正确。
- [ ] `storage` 键合规，数据量不超过 32 键 / 16 KiB。
- [ ] 所有资源位于 `assets/`，类型、数量与大小符合限制。
- [ ] 所有异步 API 调用有错误处理。
- [ ] `api.open()` 由明确的用户操作触发。
- [ ] 若需要宿主背景控制，已经声明 `background` 并测试控制权切换。
- [ ] 在 Chrome 中测试插件安装、启用、禁用、重启新标签页、设置保存、卸载、重新导入。
- [ ] 在两个或更多插件同时启用时测试 CSS、性能与数据隔离。
- [ ] 如为全屏插件，检查与其它全屏插件/卡片的互斥效果。
- [ ] 文档注明兼容宿主版本、权限、功能与已知限制。

## 17. 参考示例与术语表

### 17.1 官方示例优先阅读顺序

| 示例目录 | 用来学习什么 |
|---|---|
| `templates/starter/` | 最简的两文件插件模板 |
| `examples/starter-card/` | 简单卡片和点击交互 |
| `examples/settings-showcase/` | 八类设置控件、即时变化、存储与资源 |
| `examples/clock/` | 定时更新界面 |
| `examples/todo/` | 小型列表与状态交互 |
| `examples/link-permission/` | 外链能力及用户确认 |
| `examples/layout-probe/` | 卡片尺寸和布局实验 |
| `examples/classic-home/` | 全屏插件：时钟、日期、搜索、导航与主题 |

**经典主页插件**用于演示用插件接近复刻旧版 v0.9.x 界面，但不代表已经完整实现旧版的所有功能。

### 17.2 常见术语

- **宿主（Host）**：lemon's NewTab Pro 扩展核心，管理插件和受限 API。
- **插件（Plugin）**：由 `plugin.json`、`main.js` 和可选资源组成的独立功能包。
- **沙箱（Sandbox）**：没有高权限 Chrome 扩展 API 的 iframe 执行环境。
- **Manifest**：插件清单，即 `plugin.json`，不是 Chrome 扩展自己的 `manifest.json`。
- **Capability**：插件清单声明的额外能力，如 `storage`。
- **Registry**：`plugins/registry.json`，用于扩展自带的插件；普通导入无需维护。
- **IndexedDB**：当前扩展用来保存用户导入的插件源码及资源快照的浏览器本地数据库。
- **插件设置（Settings）**：由宿主根据 `plugin.json.settings` 自动生成的配置。
- **插件数据（Storage）**：由插件代码通过 `api.storage` 保存的 JSON 数据。

---

## 结束语

lemon's NewTab Pro 的开发理念是：**让普通插件开发者只需要写 `plugin.json` 和 `main.js`，把复杂的加载、安全边界、设置界面和数据隔离交给宿主。**

建议从最简两文件插件起步，再逐渐学习设置、私有存储、本地资源、背景和全屏布局。开发时始终以明确的 API 和最少的能力声明为边界，不依赖未公开的宿主内部实现。

**本文对应的规范基线：lemon's NewTab Pro v0.3.1 / Plugin API v1。**
