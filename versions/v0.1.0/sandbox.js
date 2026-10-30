'use strict';
(() => {
  const CHANNEL = 'lemon-plugin-v1';
  const root = document.getElementById('root');
  let started = false;
  let hostOrigin = null;
  let pluginId = null;
  let capabilities = [];
  const referrerOrigin = (() => {
    try { return new URL(document.referrer).origin; } catch { return null; }
  })();

  function send(type, payload = {}) {
    if (!hostOrigin || !pluginId) return;
    parent.postMessage({ channel: CHANNEL, type, id: pluginId, ...payload }, hostOrigin);
  }

  function fail(reason) {
    root.replaceChildren();
    const label = document.createElement('p');
    label.className = 'plugin-error';
    label.textContent = `插件无法启动：${reason}`;
    root.append(label);
    send('plugin:error', { message: String(reason).slice(0, 180) });
  }

  window.addEventListener('error', (event) => {
    if (started) fail('脚本运行异常');
  });
  window.addEventListener('message', (event) => {
    if (started || event.source !== parent || !referrerOrigin || event.origin !== referrerOrigin ||
        !referrerOrigin.startsWith('chrome-extension://')) return;
    const message = event.data;
    if (!message || message.channel !== CHANNEL || message.type !== 'host:init') return;
    const id = message.id;
    if (typeof id !== 'string' || !/^[a-z][a-z0-9-]{1,39}$/.test(id)) return;
    let scriptURL;
    try {
      scriptURL = new URL(message.entry);
      const expected = new URL(`plugins/${id}/main.js`, `${event.origin}/`);
      if (scriptURL.href !== expected.href) return;
    } catch { return; }
    started = true;
    hostOrigin = event.origin;
    pluginId = id;
    capabilities = Array.isArray(message.capabilities) ? message.capabilities.filter(c => c === 'open-url') : [];

    // 无需给插件暴露 postMessage 协议或扩展权限：只提供经过能力门控的 API。
    const api = Object.freeze({
      id,
      open(url) {
        if (!capabilities.includes('open-url') || !navigator.userActivation.isActive ||
            typeof url !== 'string' || url.length > 2048) return false;
        let target;
        try { target = new URL(url); } catch { return false; }
        if (!['https:', 'http:'].includes(target.protocol) || target.username || target.password) return false;
        send('plugin:open-url', { url: target.href });
        return true;
      }
    });
    const script = document.createElement('script');
    script.src = scriptURL.href;
    script.onload = () => {
      if (!window.LemonPlugin || typeof window.LemonPlugin.mount !== 'function') {
        fail('main.js 必须声明 window.LemonPlugin.mount(root, api)');
        return;
      }
      root.replaceChildren();
      try {
        const result = window.LemonPlugin.mount(root, api);
        Promise.resolve(result).then(() => send('plugin:ready'), () => fail('初始化失败'));
      } catch { fail('初始化失败'); }
    };
    script.onerror = () => fail('无法载入插件脚本');
    document.head.append(script);
  });
})();
