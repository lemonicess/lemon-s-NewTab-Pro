window.LemonPlugin = {
  mount(root, api) {
    const label = document.createElement('label');
    label.textContent = 'SEARCH THE WEB';
    label.htmlFor = 'query';
    label.style.cssText = 'display:block;color:#b7a4fa;font-size:10px;letter-spacing:2px;font-weight:700;margin:0 0 12px';
    const form = document.createElement('form');
    form.style.cssText = 'display:flex;gap:10px';
    const input = document.createElement('input');
    input.id = 'query';
    input.placeholder = '搜索你想知道的内容…';
    input.autocomplete = 'off';
    input.style.cssText = 'min-width:0;flex:1;padding:13px 15px;border-radius:11px;border:1px solid #ffffff35;background:#ffffff09;color:white';
    const submit = document.createElement('button');
    submit.type = 'submit';
    submit.textContent = '搜索 ↗';
    submit.style.cssText = 'background:#a88beb;color:#19112e;border:0;border-radius:10px;padding:0 16px;font-weight:700';
    const status = document.createElement('p');
    status.style.cssText = 'color:#9b93b5;font-size:11px;margin-top:11px';
    status.textContent = '将通过插件 API 在新标签页打开 Google 搜索';
    form.append(input,submit);
    form.addEventListener('submit',(event) => {
      event.preventDefault();
      const query = input.value.trim();
      if (!query) return;
      if (!api.open('https://www.google.com/search?q=' + encodeURIComponent(query))) status.textContent = '打开失败：插件未获得 open-url 能力或操作不是用户主动触发';
    });
    root.append(label,form,status);
  }
};
