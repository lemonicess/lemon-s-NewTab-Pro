window.LemonPlugin = {
  mount(root, api) {
    // 修改这里的条目即可个性化导航；这里不使用旧版配置系统。
    const entries = [
      { name: 'GitHub', url: 'https://github.com/' },
      { name: 'MDN Web Docs', url: 'https://developer.mozilla.org/' },
      { name: 'Figma', url: 'https://www.figma.com/' },
      { name: 'Chrome 扩展', url: 'https://developer.chrome.com/docs/extensions/' }
    ];
    const title = document.createElement('div');
    title.textContent = 'QUICK LINKS';
    title.style.cssText = 'color:#bda8ff;font-size:10px;font-weight:700;letter-spacing:2px;margin-bottom:18px';
    const grid = document.createElement('div');
    grid.style.cssText = 'display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px';
    for (const entry of entries) {
      const button = document.createElement('button');
      button.textContent = `${entry.name} ↗`;
      button.style.cssText = 'padding:12px 14px;text-align:left;border-radius:10px;border:1px solid #ffffff26;color:#ded8fc;background:#ffffff0a';
      button.addEventListener('click', () => api.open(entry.url));
      grid.append(button);
    }
    root.append(title, grid);
  }
};
