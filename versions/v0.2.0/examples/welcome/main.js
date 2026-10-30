window.LemonPlugin = {
  mount(root, api) {
    const wrap = document.createElement('div');
    wrap.style.cssText = 'display:flex;flex-direction:column;justify-content:center;min-height:225px';
    const badge = document.createElement('div');
    badge.textContent = '✦ PLUGIN LOADED SUCCESSFULLY';
    badge.style.cssText = 'color:#c2affc;font-size:10px;letter-spacing:2px;font-weight:700';
    const title = document.createElement('h2');
    title.textContent = '一切内容，都可以是插件。';
    title.style.cssText = 'font-size:clamp(21px,3vw,30px);letter-spacing:-.8px;margin:14px 0 8px';
    const desc = document.createElement('p');
    desc.textContent = '这里不是内置组件，而是由 plugins/welcome/main.js 渲染的。复制 examples/ 中的示例，创建属于自己的新标签页。';
    desc.style.cssText = 'max-width:520px;color:#aaa4c2;font-size:13px;line-height:1.9;margin:0';
    const bottom = document.createElement('p');
    bottom.textContent = `沙箱已启动 · 插件 ID：${api.id} · 不具有 chrome.* 权限`;
    bottom.style.cssText = 'color:#716a90;font:11px monospace;margin:22px 0 0';
    wrap.append(badge, title, desc, bottom);
    root.append(wrap);
  }
};
