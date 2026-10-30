/* Installed plugins are immutable snapshots of user-selected folders, scoped to this extension.
 * No Node.js, filesystem write access, or network download is used. */
'use strict';
(function (root, factory) {
  const api = factory();
  root.LemonPackages = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(globalThis, () => {
  const DB_NAME = 'lemon-newtab-installed-plugins';
  const DB_VERSION = 1;
  const MAX_SCRIPT = 512 * 1024;
  const MAX_MANIFEST = 64 * 1024;
  const MAX_RESOURCE = 50 * 1024 * 1024;
  const MAX_PACKAGE = 60 * 1024 * 1024;
  const MAX_ASSETS = 128;
  const MIMES = Object.freeze({ png:'image/png', jpg:'image/jpeg', jpeg:'image/jpeg', webp:'image/webp', gif:'image/gif', mp4:'video/mp4', txt:'text/plain', json:'application/json', css:'text/css', woff:'font/woff', woff2:'font/woff2' });
  const ID = /^[a-z][a-z0-9-]{1,39}$/;
  function assetType(path) {
    if (typeof path !== 'string' || path.length > 160 || !/^assets\/[a-zA-Z0-9_./-]+$/.test(path) ||
        path.split('/').some(part => !part || part === '.' || part === '..')) return null;
    return MIMES[path.split('.').at(-1).toLowerCase()] || null;
  }
  function rootPath(path) {
    if (typeof path !== 'string' || path.includes('\\') || path.startsWith('/') || path.includes('//')) throw Error('文件路径无效');
    const parts = path.split('/');
    if (parts.length < 2 || parts.some(p => !p || p === '.' || p === '..')) throw Error('请选择插件文件夹，不能选择单个文件');
    return { folder:parts[0], path:parts.slice(1).join('/') };
  }
  function checkFiles(files) {
    const entries = new Map();let folder=null;let total=0;let assets=0;
    for (const file of files) {
      const {folder:next,path} = rootPath(file.webkitRelativePath || file.relativePath || file.path);
      if (folder !== null && folder !== next) throw Error('一次只能导入一个插件文件夹');
      folder=next;
      if (!ID.test(folder)) throw Error('文件夹名称必须是小写英文、数字及连字符（2–40 位）');
      if (entries.has(path)) throw Error(`重复文件：${path}`);
      if (!file || !Number.isFinite(file.size) || file.size < 0) throw Error('文件大小无效');
      if (path === 'main.js') {if (file.size > MAX_SCRIPT) throw Error('main.js 超过 512 KB');}
      else if (path === 'plugin.json') {if (file.size > MAX_MANIFEST) throw Error('plugin.json 超过 64 KB');}
      else {
        if (['README.md','LICENSE','LICENSE.txt','.gitkeep','.DS_Store','Thumbs.db'].includes(path)) continue;
        if (!assetType(path)) throw Error(`不支持的文件（只允许 assets/ 中的受限资源）：${path}`);
        if (file.size > MAX_RESOURCE || ++assets > MAX_ASSETS) throw Error('资源数量或大小超过限制');
      }
      total += file.size;
      if (total > MAX_PACKAGE) throw Error('单个插件不能超过 60 MB');
      entries.set(path,file);
    }
    if (!folder || !entries.has('main.js') || !entries.has('plugin.json')) throw Error('文件夹必须包含 plugin.json 和 main.js');
    return { id:folder, entries, total };
  }
  async function readFolder(files, schema) {
    const {id, entries, total} = checkFiles(files);
    const json = JSON.parse(await entries.get('plugin.json').text());
    const manifest = schema.validatePlugin(json,id);
    const source = await entries.get('main.js').text();
    if (new TextEncoder().encode(source).byteLength > MAX_SCRIPT) throw Error('main.js 超过 512 KB');
    const assets = Object.create(null);
    for (const [path, file] of entries) if (path.startsWith('assets/')) assets[path] = { blob: file.slice(0,file.size,assetType(path)), size:file.size, mime:assetType(path) };
    return { id, manifest, source, assets, total, installedAt:Date.now() };
  }
  function openDB() {
    return new Promise((resolve,reject) => {
      if (typeof indexedDB === 'undefined') { reject(Error('当前浏览器不支持 IndexedDB'));return; }
      const request=indexedDB.open(DB_NAME,DB_VERSION);
      request.onupgradeneeded=()=>{if(!request.result.objectStoreNames.contains('packages')) request.result.createObjectStore('packages',{keyPath:'id'});};
      request.onsuccess=()=>resolve(request.result);
      request.onerror=()=>reject(request.error || Error('无法打开插件数据库'));
      request.onblocked=()=>reject(Error('插件数据库被其他页面占用，请关闭其他新标签页后重试'));
    });
  }
  async function transaction(mode, work) {
    const db=await openDB();
    try {
      return await new Promise((resolve,reject)=>{
        let result;const tx=db.transaction('packages',mode);const store=tx.objectStore('packages');
        tx.oncomplete=()=>resolve(result);tx.onerror=()=>reject(tx.error||Error('插件数据库操作失败'));
        tx.onabort=()=>reject(tx.error||Error('插件数据库事务被中止'));
        try {const req=work(store);if(req){req.onsuccess=()=>{result=req.result;};req.onerror=()=>{ /* transaction.onerror owns failure */ };}}
        catch(error){tx.abort();reject(error);}
      });
    } finally {db.close();}
  }
  const list=()=>transaction('readonly',store=>store.getAll());
  const get=id=>transaction('readonly',store=>store.get(id));
  const put=pack=>transaction('readwrite',store=>store.put(pack));
  const remove=id=>transaction('readwrite',store=>store.delete(id));
  return Object.freeze({checkFiles,assetType,readFolder,list,get,put,remove,MAX_RESOURCE,MAX_PACKAGE});
});
