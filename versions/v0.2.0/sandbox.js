'use strict';
(() => {
  const CHANNEL = 'lemon-plugin-v1';
  const MAX_SCRIPT_BYTES = 512 * 1024;
  const root = document.getElementById('root');
  const expectedHostOrigin = location.protocol === 'chrome-extension:' && /^[a-p]{32}$/.test(location.host)
    ? `chrome-extension://${location.host}` : null;
  let started = false;
  let hostOrigin = null;
  let pluginId = null;
  let capabilities = [];
  let currentSettings = Object.freeze({});
  let listeners = new Set();
  let requestId = 0;
  const pending = new Map();

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
  function request(action, key, value) {
    if (!capabilities.includes('storage')) return Promise.reject(Error('需要 storage 能力'));
    if (typeof key !== 'string' || !/^[a-z][a-z0-9_-]{0,63}$/.test(key)) return Promise.reject(Error('存储 key 不合法'));
    const id = ++requestId;
    return new Promise((resolve,reject) => {
      const timer = setTimeout(() => { pending.delete(id); reject(Error('存储请求超时')); }, 6000);
      pending.set(id, {resolve,reject,timer});
      send('plugin:storage', { requestId:id,action,key,value });
    });
  }
  function assetRequest(kind, asset) {
    if(typeof asset!=='string'||asset.length>160||!/^assets\/[a-zA-Z0-9_./-]+$/.test(asset)||asset.split('/').some(s=>!s||s==='.'||s==='..'))return Promise.reject(Error('资源路径不合法'));
    if(kind==='image'&&!/\.(png|jpe?g|webp|gif)$/i.test(asset))return Promise.reject(Error('只允许图片资源'));
    if(kind==='text'&&!/\.(txt|css|json)$/i.test(asset))return Promise.reject(Error('只允许文本资源'));
    const id=++requestId;
    return new Promise((resolve,reject)=>{
      const timer=setTimeout(()=>{pending.delete(id);reject(Error('资源请求超时'));},6000);
      pending.set(id,{resolve,reject,timer});
      send('plugin:asset',{requestId:id,kind,asset});
    });
  }
  function initPlugin(data, event) {
    const id = data.id;
    if (typeof id !== 'string' || !/^[a-z][a-z0-9-]{1,39}$/.test(id) ||
        typeof data.source !== 'string' || new TextEncoder().encode(data.source).byteLength > MAX_SCRIPT_BYTES) return;
    started = true;
    hostOrigin = event.origin;
    pluginId = id;
    capabilities = Array.isArray(data.capabilities)
      ? data.capabilities.filter(c => ['open-url','storage','background'].includes(c)) : [];
    currentSettings = Object.freeze(data.settings && typeof data.settings === 'object' && !Array.isArray(data.settings)
      ? {...data.settings} : {});
    const api = Object.freeze({
      id,
      assets: Object.freeze({image(asset) { return assetRequest('image',asset); },text(asset) { return assetRequest('text',asset); }}),
      settings: Object.freeze({
        get() { return {...currentSettings}; },
        onChange(handler) {
          if (typeof handler !== 'function') throw TypeError('onChange 需要函数');
          listeners.add(handler);
          return () => listeners.delete(handler);
        }
      }),
      storage: Object.freeze({
        get(key, fallback = null) { return request('get',key).then(v => v === null ? fallback : v); },
        set(key, value) { return request('set',key,value); },
        remove(key) { return request('remove',key); }
      }),
      layout: Object.freeze({
        update(layout) {
          if (!layout || typeof layout !== 'object') return false;
          const {span,height} = layout;
          if (span !== undefined && (!Number.isInteger(span) || span < 1 || span > 12)) return false;
          if (height !== undefined && (!Number.isInteger(height) || height < 130 || height > 1200)) return false;
          send('plugin:layout', {span,height}); return true;
        }
      }),
      background: Object.freeze({
        set(asset) {
          if (!capabilities.includes('background') || typeof asset !== 'string' ||
              !/^assets\/[a-zA-Z0-9_./-]+\.(?:png|jpg|jpeg|webp|gif|mp4)$/.test(asset) ||
              asset.split('/').some(s => !s || s === '.' || s === '..')) return false;
          send('plugin:background',{asset});return true;
        },
        reset() { if (!capabilities.includes('background')) return false;send('plugin:background',{asset:null});return true; }
      }),
      open(url) {
        if (!capabilities.includes('open-url') || !navigator.userActivation?.isActive ||
            typeof url !== 'string' || url.length > 2048) return false;
        let target;
        try { target = new URL(url); } catch { return false; }
        if (!['https:', 'http:'].includes(target.protocol) || target.username || target.password) return false;
        send('plugin:open-url', { url: target.href });
        return true;
      }
    });
    // JS 仅来自宿主已经读取的本地扩展文件，不运行网络下载脚本，沙箱无 chrome.* 权限。
    const url = URL.createObjectURL(new Blob([data.source], { type:'text/javascript' }));
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
        Promise.resolve(result).then(() => send('plugin:ready'), error => fail(error?.message || '初始化失败'));
      } catch (error) { fail(error?.message || '初始化失败'); }
    };
    script.onerror = () => { URL.revokeObjectURL(url); fail('插件脚本被安全策略阻止或加载失败'); };
    document.head.append(script);
  }
  window.addEventListener('message', event => {
    if (event.source !== parent || !expectedHostOrigin || event.origin !== expectedHostOrigin) return;
    const data = event.data;
    if (!data || data.channel !== CHANNEL) return;
    if (!started && data.type === 'host:init') { initPlugin(data, event);return; }
    if (!started || data.id !== pluginId) return;
    if (data.type === 'host:settings-changed') {
      if (!data.settings || typeof data.settings !== 'object' || Array.isArray(data.settings)) return;
      currentSettings = Object.freeze({...data.settings});
      for (const listener of [...listeners]) {
        try { listener({...currentSettings}); } catch (error) { console.error('插件设置回调错误', error); }
      }
    } else if (data.type === 'host:storage-response' || data.type === 'host:asset-response') {
      const response = pending.get(data.requestId);
      if (!response) return;
      pending.delete(data.requestId);clearTimeout(response.timer);
      if (data.error) response.reject(Error(data.error));
      else response.resolve(data.result);
    }
  });
  window.addEventListener('error', event => { if (started) fail(event.message || '脚本运行异常'); });
  if (expectedHostOrigin) parent.postMessage({ channel: CHANNEL, type: 'sandbox:loaded' }, expectedHostOrigin);
})();
