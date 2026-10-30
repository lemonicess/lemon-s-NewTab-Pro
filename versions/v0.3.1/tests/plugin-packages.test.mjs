import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile, readdir} from 'node:fs/promises';
import {join, resolve} from 'node:path';
import packages from '../plugin-packages.js';
import schema from '../plugin-schema.js';
const root=resolve(import.meta.dirname,'..');
function file(path,content) {
  const input=new File([content],path.split('/').at(-1));
  Object.defineProperty(input,'webkitRelativePath',{value:path});
  return input;
}
const base={id:'my-addon',name:'测试插件',version:'1.0.0'};
const fileList=()=>[file('my-addon/plugin.json',JSON.stringify(base)),file('my-addon/main.js','window.LemonPlugin={mount(){}}')];

test('两文件最简插件无需 Node 工具即可通过浏览器目录导入校验',async()=>{
  const result=await packages.readFolder(fileList(),schema);
  assert.equal(result.id,'my-addon');
  assert.equal(result.manifest.apiVersion,1);
  assert.equal(result.manifest.layout.span,6);
  assert.equal(result.manifest.defaultEnabled,false);
  assert.equal(result.manifest.capabilities.length,0);
});

test('导入资源被隔离在插件 assets/，支持静态图片、字体和视频',async()=>{
  const result=await packages.readFolder([...fileList(),file('my-addon/assets/bg.png','PNG'),file('my-addon/assets/font.woff2','FONT')],schema);
  assert.equal(Object.keys(result.assets).length,2);
  assert.equal(packages.assetType('assets/font.woff2'),'font/woff2');
  assert.equal(packages.assetType('assets/bg.mp4'),'video/mp4');
  assert.equal(packages.assetType('assets/../../private'),null);
});

test('拒绝混合目录、路径逃逸、额外脚本及无清单插件',async()=>{
  await assert.rejects(packages.readFolder([...fileList(),file('other-addon/main.js','x')],schema),/一次只能/);
  await assert.rejects(packages.readFolder([...fileList(),file('my-addon/assets/../evil.txt','x')],schema),/路径|不支持|请选择/);
  await assert.rejects(packages.readFolder([...fileList(),file('my-addon/extra.js','alert(1)')],schema),/不支持/);
  await assert.rejects(packages.readFolder([file('my-addon/main.js','x')],schema),/必须包含/);
  await assert.rejects(packages.readFolder([file('my-addon/main.js','x'),file('my-addon/plugin.json','{}')],schema),/ID|name|version/);
});

test('同一个插件中的重复资源和大脚本被阻止',async()=>{
  await assert.rejects(packages.readFolder([...fileList(),file('my-addon/main.js','another')],schema),/重复/);
  await assert.rejects(packages.readFolder([file('my-addon/plugin.json',JSON.stringify(base)),file('my-addon/main.js','x'.repeat(513*1024))],schema),/512 KB/);
});

test('v0.3.1 UI 不要求 Node.js，同时存在导入入口与示例目录',async()=>{
  const html=await readFile(join(root,'index.html'),'utf8');
  const js=await readFile(join(root,'index.js'),'utf8');
  const m=JSON.parse(await readFile(join(root,'manifest.json'),'utf8'));
  const catalog=JSON.parse(await readFile(join(root,'examples/catalog.json'),'utf8'));
  assert.match(html,/id="plugin-folder-input"/);
  assert.match(html,/webkitdirectory/);
  assert.match(html,/id="install-example"/);
  assert.match(js,/packages\.put\(pack\)/);
  assert.match(js,/selectedBackgroundId\(\)/);
  assert.equal(m.version,'0.3.1');
  assert.equal(catalog.plugins.length,(await readdir(join(root,'examples'),{withFileTypes:true})).filter(x=>x.isDirectory()).length);
  assert.ok(catalog.plugins.some(x=>x.id==='classic-home'));
});

test('旧版字段可以兼容，新插件 API 版本受控',()=>{
  const old=schema.validatePlugin({ ...base,layout:{span:8,height:300},capabilities:[],defaultEnabled:true },'my-addon');
  assert.equal(old.layout.span,8);
  assert.throws(()=>schema.validatePlugin({...base,apiVersion:999},'my-addon'),/API/);
});

test('浏览器原生 IndexedDB 安装快照的保存、读取、枚举与卸载逻辑',async()=>{
  const database = new Map();
  const mockDB={
    objectStoreNames:{contains:()=>true},close(){},
    transaction(_name,_mode){
      const tx={oncomplete:null,onerror:null,onabort:null,error:null};
      tx.objectStore=()=>{
        const op=(run)=>{
          const request={result:undefined,error:null,onsuccess:null,onerror:null};
          queueMicrotask(()=>{
            try {request.result=run();request.onsuccess?.();queueMicrotask(()=>tx.oncomplete?.());}
            catch(error){request.error=error;request.onerror?.();tx.error=error;tx.onerror?.();}
          });
          return request;
        };
        return {get:id=>op(()=>database.get(id)),getAll:()=>op(()=>[...database.values()]),put:pack=>op(()=>database.set(pack.id,pack)),delete:id=>op(()=>database.delete(id))};
      };
      return tx;
    }
  };
  const original=globalThis.indexedDB;
  globalThis.indexedDB={open(){
    const request={result:mockDB,onsuccess:null,onerror:null,onupgradeneeded:null,onblocked:null};
    queueMicrotask(()=>request.onsuccess?.());return request;
  }};
  try {
    const item=await packages.readFolder(fileList(),schema);
    await packages.put(item);
    assert.equal((await packages.get(item.id)).manifest.name,'测试插件');
    assert.equal((await packages.list()).length,1);
    const persisted = (await packages.list())[0];
    assert.equal(Object.hasOwn(persisted.manifest,'entry'),false,'新安装记录不应存储派生 entry');
    assert.equal(schema.validateStoredPlugin(persisted.manifest,persisted.id).name,'测试插件');
    // v0.3.0 saved a normalized manifest that included entry. Simulate a
    // user upgrading without reinstalling or deleting their browser data.
    const legacy = {...persisted,manifest:schema.validatePlugin(base,persisted.id)};
    await packages.put(legacy);
    const recovered=(await packages.list())[0];
    assert.throws(()=>schema.validatePlugin(recovered.manifest,recovered.id),/entry/);
    assert.equal(schema.validateStoredPlugin(recovered.manifest,recovered.id).name,'测试插件');
    await packages.remove(item.id);
    assert.equal((await packages.list()).length,0);
  } finally {if(original===undefined)delete globalThis.indexedDB;else globalThis.indexedDB=original;}
});
