'use strict';
(() => {
  const CHANNEL = 'lemon-plugin-v1';
  const ENABLED_KEY = 'lemon.plugins.enabled.v1';
  const SETTINGS_KEY = 'lemon.plugins.settings.v1';
  const DATA_KEY = 'lemon.plugins.data.v1';
  const START_TIMEOUT_MS = 12000;
  const MAX_SCRIPT_BYTES = 512 * 1024;
  const schema = globalThis.LemonSchema;
  const board = document.getElementById('plugin-board');
  const list = document.getElementById('plugin-list');
  const count = document.getElementById('plugin-count');
  const messageBox = document.getElementById('global-message');
  const overlay = document.getElementById('manager-overlay');
  const manager = overlay.querySelector('.manager');
  const openButton = document.getElementById('manage-open');
  const settingsView = document.getElementById('settings-view');
  const settingsForm = document.getElementById('settings-form');
  const settingsStatus = document.getElementById('settings-status');
  const settingsTitle = document.getElementById('settings-title');
  const settingsDescription = document.getElementById('settings-description');
  const backgroundElement = document.querySelector('.backdrop');
  const backgroundVideo = document.getElementById('background-video');
  let plugins = [];
  let enabled = Object.create(null);
  let savedSettings = Object.create(null);
  let settingsById = Object.create(null);
  let editingPlugin = null;
  let priorFocus = null;
  let backgroundOwner = null;
  const frames = new Map();
  let queuedDataWrite = Promise.resolve();

  function notify(message) {
    messageBox.textContent = message || '';
    messageBox.hidden = !message;
  }
  const store = {
    async read(key) {
      if (globalThis.chrome?.storage?.local) {
        const data = await chrome.storage.local.get(key);
        return data[key] && typeof data[key] === 'object' ? data[key] : {};
      }
      try { const data = JSON.parse(localStorage.getItem(key) || '{}'); return data && typeof data === 'object' ? data : {}; }
      catch { return {}; }
    },
    async write(key, value) {
      if (globalThis.chrome?.storage?.local) await chrome.storage.local.set({ [key]: value });
      else localStorage.setItem(key, JSON.stringify(value));
    }
  };
  function validateRegistry(raw) {
    if (!schema || !raw || raw.format !== 1 || !Array.isArray(raw.plugins) || raw.plugins.length > 64) throw Error('插件清单格式不正确。');
    const seen = new Set();
    return raw.plugins.map(item => {
      if (!item || typeof item.id !== 'string' || seen.has(item.id) || item.entry !== `plugins/${item.id}/main.js`) throw Error('清单入口错误或插件 ID 重复');
      schema.validatePlugin(Object.fromEntries(Object.entries(item).filter(([key]) => key !== 'entry')), item.id);
      seen.add(item.id);
      return item;
    });
  }
  async function readRegistry() {
    const url = globalThis.chrome?.runtime?.getURL ? chrome.runtime.getURL('plugins/registry.json') : 'plugins/registry.json';
    const response = await fetch(url, {cache: 'no-store'});
    if (response.status === 404) return [];
    if (!response.ok) throw Error(`读取插件清单失败（HTTP ${response.status}）`);
    return validateRegistry(await response.json());
  }
  async function readPluginSource(plugin) {
    const path = `plugins/${plugin.id}/main.js`;
    const url = globalThis.chrome?.runtime?.getURL ? chrome.runtime.getURL(path) : new URL(path, location.href).href;
    const response = await fetch(url, {cache: 'no-store'});
    if (!response.ok) throw Error(`无法读取 main.js（HTTP ${response.status}）`);
    if (Number(response.headers.get('content-length')) > MAX_SCRIPT_BYTES) throw Error('插件脚本超过 512 KB');
    const source = await response.text();
    if (new TextEncoder().encode(source).byteLength > MAX_SCRIPT_BYTES) throw Error('插件脚本超过 512 KB');
    return source;
  }
  function defaultBackground() {
    backgroundOwner = null;
    backgroundElement.style.backgroundImage = '';
    backgroundVideo.pause();
    backgroundVideo.removeAttribute('src');
    backgroundVideo.load();
    backgroundVideo.hidden = true;
  }
  function forget(record) {
    clearTimeout(record.timer);
    if (frames.get(record.plugin.id) === record) frames.delete(record.plugin.id);
    if (backgroundOwner === record.plugin.id) defaultBackground();
  }
  function showPluginError(record, reason) {
    if (frames.get(record.plugin.id) !== record || record.finished) return;
    record.finished = true;
    clearTimeout(record.timer);
    const error = document.createElement('div');
    error.className = 'tile-error'; error.setAttribute('role','alert');
    const text = document.createElement('span');
    text.textContent = `${record.plugin.name}：${String(reason).slice(0,160)}`;
    const retry = document.createElement('button');
    retry.type = 'button'; retry.textContent = '重试';
    retry.addEventListener('click', () => {
      if (frames.get(record.plugin.id) !== record) return;
      forget(record);
      const fresh = createTile(record.plugin);
      record.tile.replaceWith(fresh);
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
        channel: CHANNEL, type: 'host:init', id: record.plugin.id, source,
        capabilities: record.plugin.capabilities, settings: { ...settingsById[record.plugin.id] }
      }, '*'); // 透明来源的 sandbox；接收方核对父窗口及 extension origin
    } catch (error) { showPluginError(record, error.message); }
  }
  function createTile(plugin) {
    const tile = document.createElement('article');
    tile.className = 'tile';
    if (plugin.layout.mode === 'fullscreen') tile.classList.add('tile-fullscreen');
    tile.style.setProperty('--tile-span', String(plugin.layout.span));
    tile.style.setProperty('--tile-height', `${plugin.layout.height}px`);
    const frame = document.createElement('iframe');
    frame.className = 'tile-frame'; frame.title = plugin.name;
    frame.setAttribute('sandbox', 'allow-scripts');
    frame.src = globalThis.chrome?.runtime?.getURL ? chrome.runtime.getURL('sandbox.html') : 'sandbox.html';
    const record = { plugin, frame, tile, initSent:false, ready:false, finished:false, timer:null, launches:[], requests:[] };
    frames.set(plugin.id, record);
    tile.append(frame);
    record.timer = setTimeout(() => showPluginError(record, '启动超时（12 秒），请检查插件脚本和浏览器控制台。'), START_TIMEOUT_MS);
    frame.addEventListener('error', () => showPluginError(record, '无法加载插件沙箱'));
    return tile;
  }
  function renderBoard() {
    for (const record of frames.values()) clearTimeout(record.timer);
    frames.clear();
    defaultBackground();
    board.replaceChildren();
    let active = 0;
    for (const plugin of plugins) {
      if (!enabled[plugin.id]) continue;
      active++;
      board.append(createTile(plugin));
    }
    count.textContent = String(active);
  }
  function showList() {
    editingPlugin = null;
    list.hidden = false;
    settingsView.hidden = true;
    document.getElementById('manager-desc').hidden = false;
  }
  function controlFor(field, value) {
    let input;
    if (field.type === 'select') {
      input = document.createElement('select');
      for (const option of field.options) {
        const opt = document.createElement('option'); opt.value = option.value; opt.textContent = option.label; input.append(opt);
      }
      input.value = value;
    } else if (field.type === 'textarea') {
      input = document.createElement('textarea'); input.rows = 3; input.value = value;
    } else {
      input = document.createElement('input');
      input.type = ({toggle:'checkbox',slider:'range',number:'number',color:'color',url:'url'})[field.type] || 'text';
      if (field.type === 'toggle') input.checked = value;
      else input.value = String(value);
    }
    if (field.min !== undefined) input.min = String(field.min);
    if (field.max !== undefined) input.max = String(field.max);
    if (field.step !== undefined) input.step = String(field.step);
    if (field.maxLength !== undefined) input.maxLength = field.maxLength;
    if (field.placeholder !== undefined) input.placeholder = field.placeholder;
    input.name = field.key;
    if (field.type === 'slider') {
      const valueLabel = document.createElement('output'); valueLabel.textContent = String(value);
      input.addEventListener('input', () => {valueLabel.textContent = input.value;});
      const wrapper = document.createElement('div'); wrapper.className = 'setting-slider'; wrapper.append(input,valueLabel);
      return { input, element:wrapper };
    }
    return { input, element:input };
  }
  function openSettings(plugin) {
    editingPlugin = plugin;
    list.hidden = true;
    settingsView.hidden = false;
    document.getElementById('manager-desc').hidden = true;
    settingsTitle.textContent = `${plugin.icon || '◈'} ${plugin.name} · 设置`;
    settingsDescription.textContent = plugin.description;
    settingsStatus.textContent = '';
    settingsForm.replaceChildren();
    for (const group of (plugin.settings || [])) {
      const fieldset = document.createElement('fieldset'); fieldset.className = 'settings-group';
      const legend = document.createElement('legend'); legend.textContent = group.title; fieldset.append(legend);
      if (group.description) { const hint = document.createElement('p'); hint.className='setting-description';hint.textContent=group.description;fieldset.append(hint); }
      for (const field of group.fields) {
        const line = document.createElement('div'); line.className = 'setting-field';
        const label = document.createElement('label'); label.textContent = field.label;
        label.htmlFor = `setting-${field.key}`;
        const control = controlFor(field, settingsById[plugin.id][field.key]);
        control.input.id = `setting-${field.key}`;
        line.append(label,control.element);
        if (field.description) { const hint = document.createElement('p'); hint.className='setting-description'; hint.textContent=field.description;line.append(hint); }
        fieldset.append(line);
      }
      settingsForm.append(fieldset);
    }
    document.getElementById('settings-back').focus();
  }
  function readForm(plugin) {
    const values = Object.create(null);
    for (const field of schema.fields(plugin)) {
      const input = settingsForm.elements.namedItem(field.key);
      if (!input) throw Error(`缺少设置 ${field.key}`);
      let value = field.type === 'toggle' ? input.checked :
        (field.type === 'number' || field.type === 'slider') ? Number(input.value) : input.value;
      if (!schema.validValue(field, value)) throw Error(`「${field.label}」不是合法的值`);
      values[field.key] = value;
    }
    return values;
  }
  async function saveSettings(plugin, values) {
    const next = { ...savedSettings, [plugin.id]: values };
    await store.write(SETTINGS_KEY, next);
    savedSettings = next;
    settingsById[plugin.id] = values;
    const record = frames.get(plugin.id);
    if (record && !record.finished && record.initSent) {
      record.frame.contentWindow?.postMessage({channel: CHANNEL,type:'host:settings-changed',id:plugin.id,settings:{...values}}, '*');
    }
  }
  function renderManager() {
    list.replaceChildren();
    if (!plugins.length) {
      const p=document.createElement('p');p.className='no-plugins';p.textContent='没有已注册的插件。将插件文件夹放入 plugins/ 并重新生成清单。';list.append(p);
    }
    for (const plugin of plugins) {
      const item=document.createElement('div');item.className='manage-item';
      const wrap=document.createElement('div');wrap.className='manage-item-main';
      const title=document.createElement('div');title.className='manage-item-title';title.textContent=`${plugin.icon || '◈'}  ${plugin.name}`;
      const version=document.createElement('span');version.className='manage-item-version';version.textContent=`v${plugin.version}`;title.append(version);
      const desc=document.createElement('div');desc.className='manage-item-desc';desc.textContent=plugin.description;
      wrap.append(title,desc);
      if (plugin.capabilities.length) {
        const caps=document.createElement('div');caps.className='manage-item-capabilities';
        const names={'open-url':'打开外链（确认）','storage':'本插件持久化数据','background':'更换页面背景'};
        caps.textContent='能力：'+plugin.capabilities.map(value=>names[value]||value).join(' · ');
        wrap.append(caps);
      }
      const controls=document.createElement('div');controls.className='manage-controls';
      if (plugin.settings?.length) {
        const config=document.createElement('button');config.type='button';config.className='configure-button';config.textContent='设置';
        config.setAttribute('aria-label',`设置 ${plugin.name}`);config.addEventListener('click',()=>openSettings(plugin));controls.append(config);
      }
      const toggle=document.createElement('button');toggle.className='switch';toggle.type='button';toggle.setAttribute('role','switch');
      toggle.setAttribute('aria-label',`${enabled[plugin.id]?'禁用':'启用'} ${plugin.name}`);
      toggle.setAttribute('aria-checked',String(Boolean(enabled[plugin.id])));
      toggle.addEventListener('click', async () => {
        const previous=Boolean(enabled[plugin.id]);enabled[plugin.id]=!previous;toggle.disabled=true;
        try {await store.write(ENABLED_KEY,{...enabled});renderBoard();renderManager();notify('');}
        catch(error){enabled[plugin.id]=previous;renderManager();notify(`无法保存状态：${error.message}`);}
      });
      controls.append(toggle);item.append(wrap,controls);list.append(item);
    }
  }
  async function refresh() {
    notify('');
    try {
      const [allEnabled, allSettings, catalog] = await Promise.all([store.read(ENABLED_KEY),store.read(SETTINGS_KEY),readRegistry()]);
      plugins=catalog;enabled=Object.create(null);settingsById=Object.create(null);savedSettings=allSettings;
      for (const plugin of plugins) {
        enabled[plugin.id]=typeof allEnabled[plugin.id]==='boolean'?allEnabled[plugin.id]:plugin.defaultEnabled;
        settingsById[plugin.id]=schema.normalize(plugin,allSettings[plugin.id]);
      }
    } catch(error) { plugins=[];enabled=Object.create(null);settingsById=Object.create(null);notify(`${error.message} 请检查插件清单。`); }
    showList();renderBoard();renderManager();
  }
  function showManager() {priorFocus=document.activeElement;overlay.hidden=false;document.body.style.overflow='hidden';manager.focus();}
  function hideManager() {overlay.hidden=true;document.body.style.overflow='';priorFocus?.focus();}
  openButton.addEventListener('click',showManager);
  document.getElementById('manage-close').addEventListener('click',hideManager);
  document.getElementById('overlay-dim').addEventListener('click',hideManager);
  document.getElementById('reload-registry').addEventListener('click',refresh);
  document.getElementById('settings-back').addEventListener('click',showList);
  settingsForm.addEventListener('submit',async event => {
    event.preventDefault();const plugin=editingPlugin;if(!plugin)return;
    try {const values=readForm(plugin);await saveSettings(plugin,values);settingsStatus.textContent='已保存，插件会立即收到新的设置。';notify('');}
    catch(error){settingsStatus.textContent=`保存失败：${error.message}`;}
  });
  document.getElementById('settings-reset').addEventListener('click',async () => {
    const plugin=editingPlugin;if(!plugin)return;
    try {await saveSettings(plugin,schema.normalize(plugin));openSettings(plugin);settingsStatus.textContent='已恢复默认设置';}
    catch(error){settingsStatus.textContent=`重置失败：${error.message}`;}
  });
  document.addEventListener('keydown',event => {
    if(overlay.hidden)return;
    if(event.key==='Escape'){event.preventDefault();if(editingPlugin)showList();else hideManager();return;}
    if(event.key!=='Tab')return;
    const focusable=[...manager.querySelectorAll('button:not(:disabled),input:not(:disabled),select:not(:disabled),textarea:not(:disabled)')].filter(el=>el.getClientRects().length);
    if(!focusable.length)return;
    if(event.shiftKey&&document.activeElement===focusable[0]){event.preventDefault();focusable.at(-1).focus();}
    else if(!event.shiftKey&&document.activeElement===focusable.at(-1)){event.preventDefault();focusable[0].focus();}
  });

  function rateAllowed(record) {
    const now=Date.now();record.requests=record.requests.filter(t=>now-t<60000);
    if(record.requests.length>=120)return false;
    record.requests.push(now);return true;
  }
  function answer(record,requestId,result,error) {
    if(frames.get(record.plugin.id)!==record||record.finished)return;
    record.frame.contentWindow?.postMessage({channel:CHANNEL,type:'host:storage-response',id:record.plugin.id,requestId,result,error},'*');
  }
  async function storageRequest(record,data) {
    if(!record.plugin.capabilities.includes('storage') || !rateAllowed(record))return;
    if(!Number.isInteger(data.requestId)||data.requestId<1||!['get','set','remove'].includes(data.action)||typeof data.key!=='string'||!/^[a-z][a-z0-9_-]{0,63}$/.test(data.key))return;
    const handler=async()=>{
      try {
        const all=await store.read(DATA_KEY);
        const own=all[record.plugin.id] && typeof all[record.plugin.id]==='object'?{...all[record.plugin.id]}:{};
        if(data.action==='get'){answer(record,data.requestId,Object.hasOwn(own,data.key)?own[data.key]:null,null);return;}
        if(data.action==='set') {
          const content=JSON.stringify(data.value);
          if(content===undefined||content.length>16384)throw Error('数据必须是合法 JSON，且不得超过 16 KB');
          own[data.key]=JSON.parse(content);
        } else delete own[data.key];
        if(Object.keys(own).length>32 || new TextEncoder().encode(JSON.stringify(own)).byteLength>16384)throw Error('插件数据上限为 32 项 / 16 KB');
        await store.write(DATA_KEY,{...all,[record.plugin.id]:own});
        answer(record,data.requestId,true,null);
      }catch(error){answer(record,data.requestId,null,String(error.message).slice(0,180));}
    };
    queuedDataWrite=queuedDataWrite.then(handler,handler);
    await queuedDataWrite;
  }
  async function handleAsset(record,data) {
    if(!rateAllowed(record)||!Number.isInteger(data.requestId)||data.requestId<1||!['text','image'].includes(data.kind))return;
    const asset=data.asset;
    if(typeof asset!=='string'||asset.length>160||!/^assets\/[a-zA-Z0-9_./-]+$/.test(asset)||asset.split('/').some(s=>!s||s==='.'||s==='..'))return;
    const ext=asset.split('.').at(-1).toLowerCase();
    const imageMimes={png:'image/png',jpg:'image/jpeg',jpeg:'image/jpeg',webp:'image/webp',gif:'image/gif'};
    if(data.kind==='image'&&!imageMimes[ext])return;
    if(data.kind==='text'&&!['txt','css','json'].includes(ext))return;
    try {
      const path=`plugins/${record.plugin.id}/${asset}`;
      const url=globalThis.chrome?.runtime?.getURL?chrome.runtime.getURL(path):new URL(path,location.href).href;
      const response=await fetch(url,{cache:'no-store'});
      if(!response.ok)throw Error('资源不存在');
      const maxBytes=data.kind==='image'?1024*1024:256*1024;
      if(Number(response.headers.get('content-length'))>maxBytes)throw Error('插件资源超过大小限制');
      const bytes=new Uint8Array(await response.arrayBuffer());
      if(bytes.byteLength>maxBytes)throw Error('插件资源超过大小限制');
      let result;
      if(data.kind==='text')result=new TextDecoder().decode(bytes);
      else {
        let binary='';
        for(let i=0;i<bytes.length;i+=8192)binary+=String.fromCharCode(...bytes.subarray(i,i+8192));
        result=`data:${imageMimes[ext]};base64,${btoa(binary)}`;
      }
      if(frames.get(record.plugin.id)===record&&!record.finished)record.frame.contentWindow?.postMessage({channel:CHANNEL,type:'host:asset-response',id:record.plugin.id,requestId:data.requestId,result},'*');
    }catch(error){
      if(frames.get(record.plugin.id)===record&&!record.finished)record.frame.contentWindow?.postMessage({channel:CHANNEL,type:'host:asset-response',id:record.plugin.id,requestId:data.requestId,error:String(error.message).slice(0,160)},'*');
    }
  }
  function handleBackground(record,data) {
    if(!record.plugin.capabilities.includes('background') || !rateAllowed(record))return;
    if(data.asset===null){if(backgroundOwner===record.plugin.id)defaultBackground();return;}
    const asset=data.asset;
    if(typeof asset!=='string'||asset.length>160||!/^assets\/[a-zA-Z0-9_./-]+\.(?:png|jpg|jpeg|webp|gif|mp4)$/.test(asset)||asset.split('/').some(segment=>segment==='.'||segment==='..'||!segment))return;
    const path=`plugins/${record.plugin.id}/${asset}`;
    const url=globalThis.chrome?.runtime?.getURL?chrome.runtime.getURL(path):new URL(path,location.href).href;
    backgroundOwner=record.plugin.id;
    if (asset.toLowerCase().endsWith('.mp4')) {
      backgroundElement.style.backgroundImage = '';
      backgroundVideo.hidden = false;
      backgroundVideo.src = url;
      backgroundVideo.play().catch(() => { if (backgroundOwner === record.plugin.id) defaultBackground(); });
    } else {
      backgroundVideo.pause(); backgroundVideo.removeAttribute('src');backgroundVideo.load();backgroundVideo.hidden=true;
      const image = new Image();
      image.onload = () => { if (backgroundOwner === record.plugin.id) backgroundElement.style.backgroundImage = `url("${url}")`; };
      image.onerror = () => { if (backgroundOwner === record.plugin.id) defaultBackground(); };
      image.src = url;
    }
  }
  window.addEventListener('message',event => {
    const data=event.data;
    if(event.origin!=='null'||!data||data.channel!==CHANNEL)return;
    // 所有沙箱均为 opaque/null origin，必须绑定真正的 iframe WindowProxy。
    const record=[...frames.values()].find(entry=>event.source===entry.frame.contentWindow);
    if(!record||record.finished)return;
    if(data.type==='sandbox:loaded'){initialize(record);return;}
    if(data.id!==record.plugin.id||!record.initSent)return;
    if(data.type==='plugin:ready'){record.ready=true;clearTimeout(record.timer);}
    else if(data.type==='plugin:error')showPluginError(record,String(data.message||'插件启动失败'));
    else if(data.type==='plugin:layout'){
      if(!rateAllowed(record))return;
      if(record.plugin.layout.mode==='fullscreen')return;
      if(data.span!==undefined&&Number.isInteger(data.span)&&data.span>=1&&data.span<=12)record.tile.style.setProperty('--tile-span',String(data.span));
      if(data.height!==undefined&&Number.isInteger(data.height)&&data.height>=130&&data.height<=1200)record.tile.style.setProperty('--tile-height',`${data.height}px`);
    }
    else if(data.type==='plugin:storage')void storageRequest(record,data);
    else if(data.type==='plugin:asset')void handleAsset(record,data);
    else if(data.type==='plugin:background')handleBackground(record,data);
    else if(data.type==='plugin:open-url'&&record.plugin.capabilities.includes('open-url')){
      if(!rateAllowed(record)||typeof data.url!=='string'||data.url.length>2048)return;
      let target;try{target=new URL(data.url);}catch{return;}
      if(!['https:','http:'].includes(target.protocol)||target.username||target.password)return;
      const now=Date.now();record.launches=record.launches.filter(when=>now-when<30000);
      if(record.launches.length>=3)return;
      if(!window.confirm(`插件「${record.plugin.name}」请求打开外部网站：\n${target.href}\n\n是否允许本次打开？`))return;
      record.launches.push(now);
      if(globalThis.chrome?.tabs?.create)chrome.tabs.create({url:target.href,active:true}).catch(()=>{});
      else window.open(target.href,'_blank','noopener,noreferrer');
    }
  });
  refresh();
})();
