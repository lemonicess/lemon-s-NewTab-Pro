'use strict';
(() => {
  const CHANNEL = 'lemon-plugin-v1';
  const STORAGE_KEY = 'lemon.plugins.enabled.v1';
  const board = document.getElementById('plugin-board');
  const list = document.getElementById('plugin-list');
  const count = document.getElementById('plugin-count');
  const empty = document.getElementById('empty-state');
  const messageBox = document.getElementById('global-message');
  const overlay = document.getElementById('manager-overlay');
  const manager = overlay.querySelector('.manager');
  const openButton = document.getElementById('manage-open');
  let plugins = [];
  let enabled = Object.create(null);
  let frames = new Map();
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
      if (globalThis.chrome?.storage?.local) {
        await chrome.storage.local.set({ [STORAGE_KEY]: value });
      } else localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
    }
  };

  function validateRegistry(raw) {
    if (!raw || raw.format !== 1 || !Array.isArray(raw.plugins) || raw.plugins.length > 64) {
      throw new Error('插件清单格式不正确。');
    }
    const seen = new Set();
    return raw.plugins.map(item => {
      if (!item || typeof item.id !== 'string' || !/^[a-z][a-z0-9-]{1,39}$/.test(item.id) || seen.has(item.id) ||
          item.entry !== `plugins/${item.id}/main.js` || typeof item.name !== 'string' || item.name.length > 40 || !item.name ||
          typeof item.description !== 'string' || item.description.length > 180 ||
          typeof item.version !== 'string' || !/^\d+\.\d+\.\d+$/.test(item.version) ||
          typeof item.defaultEnabled !== 'boolean' ||
          !Array.isArray(item.capabilities) || item.capabilities.some(c => c !== 'open-url') ||
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
    if (!response.ok) throw new Error(`无法读取 plugins/registry.json（HTTP ${response.status}）。`);
    return validateRegistry(await response.json());
  }

  function createTile(plugin) {
    const tile = document.createElement('article');
    tile.className = 'tile';
    tile.style.setProperty('--tile-span', String(plugin.layout.span));
    tile.style.setProperty('--tile-height', `${plugin.layout.height}px`);
    const heading = document.createElement('header');
    heading.className = 'tile-top';
    const icon = document.createElement('span');
    icon.className = 'tile-symbol';
    icon.textContent = plugin.icon || '◈';
    const title = document.createElement('span');
    title.className = 'tile-title';
    title.textContent = plugin.name;
    const meta = document.createElement('span');
    meta.className = 'tile-meta';
    meta.textContent = `V${plugin.version}`;
    heading.append(icon, title, meta);
    const frame = document.createElement('iframe');
    frame.className = 'tile-frame';
    frame.title = plugin.name;
    frame.setAttribute('sandbox', 'allow-scripts');
    frame.setAttribute('referrerpolicy', 'no-referrer-when-downgrade');
    frame.src = globalThis.chrome?.runtime?.getURL ? chrome.runtime.getURL('sandbox.html') : 'sandbox.html';
    tile.append(heading, frame);
    const record = { plugin, frame, tile, ready: false, launches: [], approvedHosts: new Set() };
    frame.addEventListener('load', () => {
      frame.contentWindow?.postMessage({
        channel: CHANNEL,
        type: 'host:init',
        id: plugin.id,
        entry: globalThis.chrome?.runtime?.getURL
          ? chrome.runtime.getURL(plugin.entry)
          : new URL(plugin.entry, location.href).href,
        capabilities: plugin.capabilities
      }, '*'); // 仅用于发送到具有不透明来源的目标沙箱；返回消息将严格校验 source。
    });
    frames.set(plugin.id, record);
    return tile;
  }

  function renderBoard() {
    frames.clear();
    board.replaceChildren();
    let active = 0;
    for (const plugin of plugins) {
      if (!enabled[plugin.id]) continue;
      active++;
      board.append(createTile(plugin));
    }
    empty.hidden = active !== 0;
    count.textContent = String(active);
  }

  function renderManager() {
    list.replaceChildren();
    if (!plugins.length) {
      const label = document.createElement('p');
      label.className = 'no-plugins';
      label.textContent = '未注册插件，请先生成插件清单。';
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
      // 旧插件记录不存在时采用插件提供的初始状态；永久记住用户手动开关状态。
      enabled = Object.create(null);
      for (const plugin of plugins) {
        enabled[plugin.id] = typeof stored[plugin.id] === 'boolean' ? stored[plugin.id] : plugin.defaultEnabled;
      }
    } catch (error) {
      plugins = [];
      enabled = Object.create(null);
      notify(`${error.message} 请运行 node scripts/build-registry.mjs 后重新加载扩展。`);
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
  document.getElementById('empty-manage').addEventListener('click', showManager);
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
    // 沙箱页使用不透明来源（event.origin === 'null'），所以必须绑定 iframe 窗口对象及插件 ID。
    if (event.origin !== 'null' || !data || data.channel !== CHANNEL || typeof data.id !== 'string') return;
    const record = frames.get(data.id);
    if (!record || event.source !== record.frame.contentWindow) return;
    if (data.type === 'plugin:ready') {
      record.ready = true;
    } else if (data.type === 'plugin:error') {
      const error = document.createElement('div');
      error.className = 'tile-error';
      error.textContent = `${record.plugin.name}：${String(data.message || '启动失败').slice(0, 140)}`;
      record.frame.replaceWith(error);
    } else if (data.type === 'plugin:open-url' && record.plugin.capabilities.includes('open-url')) {
      if (typeof data.url !== 'string' || data.url.length > 2048) return;
      let target;
      try { target = new URL(data.url); } catch { return; }
      if (!['https:', 'http:'].includes(target.protocol) || target.username || target.password) return;
      const now = Date.now();
      record.launches = record.launches.filter(when => now - when < 30000);
      if (record.launches.length >= 3) return;
      // 不信任 iframe 消息中的『用户已点击』主张：外部导航需宿主侧逐站确认。
      if (!record.approvedHosts.has(target.origin)) {
        const approved = window.confirm(`插件「${record.plugin.name}」请求打开外部网站：\n${target.origin}\n\n允许本次页面会话中该插件打开这个站点吗？`);
        if (!approved) return;
        record.approvedHosts.add(target.origin);
      }
      record.launches.push(now);
      if (globalThis.chrome?.tabs?.create) {
        chrome.tabs.create({ url: target.href, active: true }).catch(() => {});
      } else window.open(target.href, '_blank', 'noopener,noreferrer');
    }
  });
  refresh();
})();
