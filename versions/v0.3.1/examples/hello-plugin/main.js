// 最简插件：main.js + plugin.json；无需构建工具或第三方框架。
window.LemonPlugin = {
  mount(root, api) {
    root.style.cssText = 'padding:22px;border-radius:18px;background:#181426bb;color:#fff;height:100%;font:16px system-ui';
    const title = document.createElement('h2');
    title.textContent = 'Hello, lemon! 👋';
    const message = document.createElement('p');
    message.textContent = `我的插件 ID：${api.id}`;
    root.append(title, message);
  }
};
