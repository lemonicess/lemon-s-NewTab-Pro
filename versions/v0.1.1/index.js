'use strict';
(() => {
  const CHANNEL = 'lemon-plugin-v1';
  const STORAGE_KEY = 'lemon.plugins.enabled.v1';
  const START_TIMEOUT_MS = 12000;
  const MAX_SCRIPT_BYTES = 512 * 1024;
  const board = document.getElementById('plugin-board');
  const list = document.getElementById('plugin-list');
  const count = document.getElementById('plugin-count');
  const messageBox = document.getElementById('global-message');
  const overlay = document.getElementById('manager-overlay');
  const manager = overlay.querySelector('.manager');
  const openButton = document.getElementById('manage-open');
  let plugins = [];
  let enabled = Object.create(null);
  const frames = new Map();
  let priorFocus = null;

  function notify(message) {
    messageBox.textContent = message;
    messageBox.hidden = !message;
  }

  const store = {
    async read() {
      if (globalThis.chrome?.storage?.local) {
        const data = await chrome.storage.local.get(STORAGE_KEY);
        return data[STORAGE_KEY] || {};
      }
      try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}'); } catch { return {}; }
    },
    async write(value) {
      if (globalThis.chrome?.storage?.local) await chrome.storage.local.set({ [STORAGE_KEY]: value });
      else localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
    }
  };

  function validateRegistry(raw) {
    if (!raw || raw.format !== 1 || !Array.isArray(raw.plugins) || raw.plugins.length > 64) {
      throw new Error('插件清单格式不正确。');
    }
    const seen = new Set();
    return raw.plugins.map(item => {
      if (!item || typeof item.id !== 'string' || !/^[a-z][a-z0-9-]{1,39}$/.test(item.id) || seen.has(item.id) ||
          item.entry !== `plugins/${item.id}/main.js` || typeof item.name !== 'string' || item.name.length > 40 || !item.name.trim() ||
          typeof item.icon !== 'string' || [...item.icon].length > 8 ||
          typeof item.description !== 'string' || item.description.length > 180 ||
          typeof item.version !== 'string' || !/^\d+\.\d+\.\d+$/.test(item.version) ||
          typeof item.defaultEnabled !== 'boolean' ||
          !Array.isArray(item.capabilities) || new Set(item.capabilities).size !== item.capabilities.length ||
          item.capabilities.some(c => c !== 'open-url') ||
          !item.layout || !Number.isInteger(item.layout.span) || item.layout.span < 1 || item.layout.span > 12 ||
          !Number.isInteger(item.layout.height) || item.layout.height < 130 || item.layout.height > 640) {
        throw new Error('插件清单中存在无效插件：' + String(item?.id || '(未知)'));
      }
      seen.add(item.id);
      return item;
    });
  }

  async function readRegistry() {
    const url = globalThis.chrome?.runtime?.getURL ? chrome.runtime.getURL('plugins/registry.json') : 'plugins/registry.json';
    const response = await fetch(url, { cache: 'no-store' });
    if (response.status === 404) return [];
    if (!response.ok) throw new Error(`无法读取 plugins/registry.json（HTTP ${response.status}）。`);
    return validateRegistry(await response.json());
  }

  async function readPluginSource(plugin) {
    // 扩展主页是可信宿主，可以读取本地已打包资源；沙箱不再跨源直接请求插件文件。
    // 不允许 URL 由插件任意指定，只使用经过验证的 plugins/<id>/main.js。
    const path = `plugins/${plugin.id}/main.js`;
    const url = globalThis.chrome?.runtime?.getURL ? chrome.runtime.getURL(path) : new URL(path, location.href).href;
    const response = await fetch(url, { cache: 'no-store' });
    if (!response.ok) throw new Error(`无法读取 main.js（HTTP ${response.status}）`);
    const contentLength = Number(response.headers.get('content-length'));
    if (contentLength > MAX_SCRIPT_BYTES) throw new Error('插件脚本超过 512 KB 限制');
    const source = await response.text();
    if (new TextEncoder().encode(source).byteLength > MAX_SCRIPT_BYTES) throw new Error('插件脚本超过 512 KB 限制');
    return source;
  }

  function forget(record) {
    clearTimeout(record.timer);
    if (frames.get(record.plugin.id) === record) frames.delete(record.plugin.id);
  }

  function showPluginError(record, reason) {
    if (frames.get(record.plugin.id) !== record || record.finished) return;
    record.finished = true;
    clearTimeout(record.timer);
    const error = document.createElement('div');
    error.className = 'tile-error';
    error.setAttribute('role', 'alert');
    const text = document.createElement('span');
    text.textContent = `${record.plugin.name}：${String(reason).slice(0, 160)}`;
    const retry = document.createElement('button');
    retry.type = 'button';
    retry.textContent = '重试';
    retry.addEventListener('click', () => {
      if (frames.get(record.plugin.id) !== record) return;
      const newTile = createTile(record.plugin);
      record.tile.replaceWith(newTile);
      forget(record);
    });
    error.append(text, retry);
    record.frame.replaceWith(error);
  }

  async function initialize(record) {
    if (frames.get(record.plugin.id) !== record || record.initSent || record.finished) return;
    record.initSent = true;
    try {
      const source = await readPluginSource(record.plugin);
      if (frames.get(record.plugin.id) !== record || record.finished) return;
      record.frame.contentWindow?.postMessage({
        channel: CHANNEL,
        type: 'host:init',
        id: record.plugin.id,
        source,
        capabilities: record.plugin.capabilities
      }, '*'); // 目标是具有不透明来源的独立沙箱；接收端会校验父窗口及扩展来源。
    } catch (error) { showPluginError(record, error.message); }
  }

  function createTile(plugin) {
    const tile = document.createElement('article');
    tile.className = 'tile';
    tile.style.setProperty('--tile-span', String(plugin.layout.span));
    tile.style.setProperty('--tile-height', `${plugin.layout.height}px`);
    const frame = document.createElement('iframe');
    frame.className = 'tile-frame';
    frame.title = plugin.name;
    frame.setAttribute('sandbox', 'allow-scripts');
    frame.src = globalThis.chrome?.runtime?.getURL ? chrome.runtime.getURL('sandbox.html') : 'sandbox.html';
    const record = { plugin, frame, tile, initSent: false, finished: false, timer: null, launches: [] };
    frames.set(plugin.id, record);
    tile.append(frame);
    record.timer = setTimeout(() => showPluginError(record, '启动超时（12 秒）。请检查插件脚本或浏览器控制台。'), START_TIMEOUT_MS);
    frame.addEventListener('error', () => showPluginError(record, '无法加载插件沙箱'));
    // sandbox.js 会主动发送 sandbox:loaded。双向握手避免在 sandbox 尚未监听消息时丢失初始化。
    return tile;
  }

  function renderBoard() {
    for (const record of frames.values()) clearTimeout(record.timer);
    frames.clear();
    board.replaceChildren();
    let active = 0;
    for (const plugin of plugins) {
      if (!enabled[plugin.id]) continue;
      active++;
      board.append(createTile(plugin));
    }
    count.textContent = String(active);
  }

  function renderManager() {
    list.replaceChildren();
    if (!plugins.length) {
      const label = document.createElement('p');
      label.className = 'no-plugins';
      label.textContent = '目前没有安装插件。请将插件复制到 plugins/ 后重新生成清单。';
      list.append(label);
      return;
    }
    for (const plugin of plugins) {
      const item = document.createElement('div');
      item.className = 'manage-item';
      const descWrap = document.createElement('div');
      descWrap.className = 'manage-item-main';
      const title = document.createElement('div');
      title.className = 'manage-item-title';
      title.textContent = `${plugin.icon || '◈'}  ${plugin.name}`;
      const version = document.createElement('span');
      version.className = 'manage-item-version';
      version.textContent = `v${plugin.version}`;
      title.append(version);
      const desc = document.createElement('div');
      desc.className = 'manage-item-desc';
      desc.textContent = plugin.description;
      descWrap.append(title, desc);
      const toggle = document.createElement('button');
      toggle.className = 'switch';
      toggle.type = 'button';
      toggle.setAttribute('role', 'switch');
      toggle.setAttribute('aria-label', `${enabled[plugin.id] ? '禁用' : '启用'} ${plugin.name}`);
      toggle.setAttribute('aria-checked', String(Boolean(enabled[plugin.id])));
      toggle.addEventListener('click', async () => {
        const before = Boolean(enabled[plugin.id]);
        enabled[plugin.id] = !before;
        toggle.disabled = true;
        try {
          await store.write({ ...enabled });
          renderBoard();
          renderManager();
          const next = [...list.querySelectorAll('button')].find(b => b.getAttribute('aria-label')?.endsWith(plugin.name));
          next?.focus();
          notify('');
        } catch (error) {
          enabled[plugin.id] = before;
          renderManager();
          notify(`无法保存插件状态：${error.message}`);
        }
      });
      item.append(descWrap, toggle);
      list.append(item);
    }
  }

  async function refresh() {
    notify('');
    try {
      const [stored, catalog] = await Promise.all([store.read(), readRegistry()]);
      plugins = catalog;
      enabled = Object.create(null);
      for (const plugin of plugins) {
        enabled[plugin.id] = typeof stored[plugin.id] === 'boolean' ? stored[plugin.id] : plugin.defaultEnabled;
      }
    } catch (error) {
      plugins = [];
      enabled = Object.create(null);
      notify(`${error.message} 请检查插件清单。`);
    }
    renderBoard();
    renderManager();
  }

  function showManager() {
    priorFocus = document.activeElement;
    overlay.hidden = false;
    document.body.style.overflow = 'hidden';
    manager.focus();
  }
  function hideManager() {
    overlay.hidden = true;
    document.body.style.overflow = '';
    priorFocus?.focus();
  }
  openButton.addEventListener('click', showManager);
  document.getElementById('manage-close').addEventListener('click', hideManager);
  document.getElementById('overlay-dim').addEventListener('click', hideManager);
  document.getElementById('reload-registry').addEventListener('click', refresh);
  document.addEventListener('keydown', event => {
    if (overlay.hidden) return;
    if (event.key === 'Escape') { event.preventDefault(); hideManager(); return; }
    if (event.key !== 'Tab') return;
    const focusable = [...manager.querySelectorAll('button:not(:disabled)')];
    if (!focusable.length) { event.preventDefault(); return; }
    if (event.shiftKey && document.activeElement === focusable[0]) { event.preventDefault(); focusable.at(-1).focus(); }
    else if (!event.shiftKey && document.activeElement === focusable.at(-1)) { event.preventDefault(); focusable[0].focus(); }
  });

  window.addEventListener('message', event => {
    const data = event.data;
    if (event.origin !== 'null' || !data || data.channel !== CHANNEL) return;
    // 沙箱来源为不透明 origin；不能只信任 ID 或 origin，必须检查具体 iframe 的 WindowProxy。
    const record = [...frames.values()].find(entry => event.source === entry.frame.contentWindow);
    if (!record || record.finished) return;
    if (data.type === 'sandbox:loaded') {
      initialize(record);
      return;
    }
    if (data.id !== record.plugin.id || !record.initSent) return;
    if (data.type === 'plugin:ready') {
      record.ready = true;
      clearTimeout(record.timer);
    } else if (data.type === 'plugin:error') {
      showPluginError(record, String(data.message || '启动失败'));
    } else if (data.type === 'plugin:open-url' && record.plugin.capabilities.includes('open-url')) {
      if (typeof data.url !== 'string' || data.url.length > 2048) return;
      let target;
      try { target = new URL(data.url); } catch { return; }
      if (!['https:', 'http:'].includes(target.protocol) || target.username || target.password) return;
      const now = Date.now();
      record.launches = record.launches.filter(when => now - when < 30000);
      if (record.launches.length >= 3) return;
      // 每次打开均由宿主确认，避免恶意插件绕过 API 的用户手势检查后静默打开网页。
      if (!window.confirm(`插件「${record.plugin.name}」请求打开外部网站：\n${target.href}\n\n是否允许本次打开？`)) return;
      record.launches.push(now);
      if (globalThis.chrome?.tabs?.create) chrome.tabs.create({ url: target.href, active: true }).catch(() => {});
      else window.open(target.href, '_blank', 'noopener,noreferrer');
    }
  });
  refresh();
})();
