# 10 分钟写出第一个插件（免 Node.js）

## 第 1 步：准备两个文件

新建文件夹 `my-first-plugin`，里面创建 `plugin.json` 和 `main.js`。可以直接从 `templates/starter/` 复制两份文件并修改 `plugin.json` 的 ID 与文件夹名一致。

`plugin.json`：

```json
{
  "id":"my-first-plugin",
  "name":"我的第一个插件",
  "version":"1.0.0"
}
```

`main.js`：

```javascript
Lemon.mount((root, api) => {
  const heading = document.createElement('h2');
  heading.textContent = '我的插件运行成功！';
  root.append(heading);
});
```

没有 `npm install`，也不用写 HTML 模板或构建脚本。`root` 是该插件**独立 iframe** 内的内容区域。可以正常创建 DOM、CSS、定时器和交互。

## 第 2 步：一键导入

Chrome 加载 `lemon's NewTab Pro` 扩展后，新标签页右上角打开插件管理，点击 **导入插件文件夹**，选择刚才的 `my-first-plugin` 文件夹，确认安装并打开启用开关。插件会立刻出现。编辑源文件以后，需要再次导入该目录完成更新；安装过程保留历史设置和数据。

## 第 3 步：有需要再增加选项

在 `plugin.json` 里追加 `settings`：

```json
"settings":[{"id":"ui","title":"外观","fields":[
  {"key":"message","type":"text","label":"显示文字","default":"Hello"},
  {"key":"highlight","type":"color","label":"文字颜色","default":"#ffffff"}
]}]
```

并在 `main.js` 中读取、监听：

```js
Lemon.mount((root, api) => {
  const label = document.createElement('h2');
  root.append(label);
  function repaint(settings) {
    label.textContent = settings.message;
    label.style.color = settings.highlight;
  }
  repaint(api.settings.get());
  api.settings.onChange(repaint);
});
```

主程序会自动显示对应设置页，用户保存后立即更新插件，不用重开标签页。

## 第 4 步：持久保存数据（可选）

给 `plugin.json` 加上 `"capabilities":["storage"]`，然后：

```js
Lemon.mount(async (root, api) => {
  let clicks = await api.storage.get('clicks',0);
  const button = document.createElement('button');
  const update = () => button.textContent = `点了 ${clicks} 次`;
  button.addEventListener('click',async () => {
    clicks++;
    update();
    await api.storage.set('clicks',clicks);
  });
  update();root.append(button);
});
```

`storage` 只能访问当前插件自己的键。不能接触其他插件数据。最常见的开发问题是忘记声明 `capabilities`。

## 第 5 步：设计大插件

你可以把 `layout` 设为 `{ "mode":"fullscreen", "span":12, "height":640 }`，独占整屏；也可以用 `api.layout.update({span:8,height:500})` 控制自己的卡片大小。插件自由渲染自己的页面，可以仿照 `examples/classic-home` 构建 v0.9.x 风格的时钟、搜索、导航和主题页面，但宿主仍负责高权限与设置管理。

**继续阅读** `PLUGIN-SPEC.md`（唯一正式规范）和 `examples/settings-showcase/`（所有设置控件示例）。可选的 Node.js 开发脚本仍在 `scripts/`，不使用它们也能开发、安装、运行和更新插件。
