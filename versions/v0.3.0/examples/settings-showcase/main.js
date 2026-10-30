window.LemonPlugin = {
  async mount(root, api) {
    let config = api.settings.get();
    let count = await api.storage.get('count', 0);
    const panel = document.createElement('div');
    const icon = document.createElement('img');
    icon.alt = '本地插件图标';
    icon.width = 37;
    icon.height = 37;
    icon.style.cssText = 'float:right;width:37px;height:37px';
    try { icon.src = await api.assets.image('assets/icon.png'); } catch { icon.hidden = true; }
    const title = document.createElement('h2');
    const description = document.createElement('p');
    const actions = document.createElement('div');
    const counter = document.createElement('button');
    const link = document.createElement('button');
    counter.type = link.type = 'button';
    counter.addEventListener('click', async () => {
      count += config.countStep;
      await api.storage.set('count', count);
      render();
    });
    link.textContent = '打开测试网址 ↗';
    link.addEventListener('click', () => api.open(config.target));
    actions.append(counter, link);
    panel.append(icon, title, description, actions);
    root.append(panel);
    const render = () => {
      root.style.cssText = `height:100%;box-sizing:border-box;padding:${config.padding}px;border:1px solid #ffffff42;border-radius:15px;background:#191327df;color:#fff;font:14px system-ui`;
      title.textContent = config.title;
      title.style.cssText = `color:${config.accent};font-size:${config.large ? 28 : 19}px;margin:0 0 8px`;
      description.textContent = config.description;
      description.style.cssText = 'font-size:13px;opacity:.8';
      actions.style.cssText = `display:flex;flex-direction:${config.direction};align-items:flex-start;gap:9px;margin-top:16px`;
      counter.textContent = `持久计数：${count}（点击 +${config.countStep}）`;
      for (const button of [counter,link]) button.style.cssText = 'padding:10px;border-radius:9px;background:#ffffff20;color:#fff;border:1px solid #ffffff35';
    };
    render();
    api.settings.onChange(next => {config=next;render();});
    api.layout.update({height: config.direction === 'column' ? 300 : 260});
  }
};
