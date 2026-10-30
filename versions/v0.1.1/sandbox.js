'use strict';
(() => {
  const CHANNEL = 'lemon-plugin-v1';
  const MAX_SCRIPT_BYTES = 512 * 1024;
  const root = document.getElementById('root');
  // 即便 sandbox 的安全来源是 "null"，location.href 仍是打包的 chrome-extension:// URL。
  // 以其扩展 ID 校验发送 host:init 的真实父页面来源，不依赖可能为空的 document.referrer。
  const expectedHostOrigin = location.protocol === 'chrome-extension:' && /^[a-p]{32}$/.test(location.host)
    ? `chrome-extension://${location.host}` : null;
  let started = false;
  let hostOrigin = null;
  let pluginId = null;
  let capabilities = [];

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

  window.addEventListener('message', event => {
    if (started || event.source !== parent || !expectedHostOrigin || event.origin !== expectedHostOrigin) return;
    const data = event.data;
    if (!data || data.channel !== CHANNEL || data.type !== 'host:init') return;
    const id = data.id;
    if (typeof id !== 'string' || !/^[a-z][a-z0-9-]{1,39}$/.test(id) ||
        typeof data.source !== 'string' || new TextEncoder().encode(data.source).byteLength > MAX_SCRIPT_BYTES) return;
    started = true;
    hostOrigin = event.origin;
    pluginId = id;
    capabilities = Array.isArray(data.capabilities) ? data.capabilities.filter(c => c === 'open-url') : [];
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
    // Blob 来源只来自宿主读取的本地 plugins/<ID>/main.js，不从网络下载 JS；
    // 在无扩展 API 的独立沙箱中运行，而非主页面或扩展特权上下文执行。
    const url = URL.createObjectURL(new Blob([data.source], { type: 'text/javascript' }));
    const script = document.createElement('script');
    script.src = url;
    script.onload = () => {
      URL.revokeObjectURL(url);
      if (!window.LemonPlugin || typeof window.LemonPlugin.mount !== 'function') {
        fail('main.js 必须声明 window.LemonPlugin.mount(root, api)');
        return;
      }
      root.replaceChildren();
      try {
        const result = window.LemonPlugin.mount(root, api);
        Promise.resolve(result).then(() => send('plugin:ready'), () => fail('初始化失败'));
      } catch (error) { fail(error?.message || '初始化失败'); }
    };
    script.onerror = () => { URL.revokeObjectURL(url); fail('插件脚本被安全策略阻止或加载失败'); };
    document.head.append(script);
  });

  window.addEventListener('error', event => {
    if (started) fail(event.message || '脚本运行异常');
  });
  if (expectedHostOrigin) parent.postMessage({ channel: CHANNEL, type: 'sandbox:loaded' }, expectedHostOrigin);
})();
