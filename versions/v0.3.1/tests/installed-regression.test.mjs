import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve,join } from 'node:path';
import schema from '../plugin-schema.js';
import packages from '../plugin-packages.js';

const root=resolve(import.meta.dirname,'..');
const basic={id:'example-widget',name:'安装回归示例',version:'1.0.0'};
function inputFile(path,contents) {
  const file=new File([contents],path.split('/').at(-1));
  Object.defineProperty(file,'webkitRelativePath',{value:path});
  return file;
}

test('开发者 plugin.json 严格模式不会允许自定义 entry',()=>{
  assert.throws(()=>schema.validatePlugin({...basic,entry:'evil.js'},basic.id),/entry/);
});
test('新安装的标准化包再次通过列表校验',async()=>{
  const files=[inputFile('example-widget/plugin.json',JSON.stringify(basic)),inputFile('example-widget/main.js','Lemon.mount(()=>{})')];
  const pack=await packages.readFolder(files,schema);
  assert.equal(Object.hasOwn(pack.manifest,'entry'),false);
  const item=schema.validateStoredPlugin(pack.manifest,pack.id);
  assert.equal(item.entry,'plugins/example-widget/main.js');
});
test('v0.3.0 历史安装记录被正确恢复，但不允许任意入口',()=>{
  const legacy=schema.validatePlugin(basic,basic.id);
  assert.equal(schema.validateStoredPlugin(legacy,basic.id).name,basic.name);
  assert.throws(()=>schema.validateStoredPlugin({...legacy,entry:'plugins/another-plugin/main.js'},basic.id),/入口不匹配/);
  assert.throws(()=>schema.validateStoredPlugin({...legacy,unexpected:true},basic.id),/不支持字段/);
});
test('安装后核验实际注册成功再提示用户',async()=>{
  const code=await readFile(join(root,'index.js'),'utf8');
  assert.match(code,/schema\.validateStoredPlugin\(item\.manifest,item\.id\)/);
  assert.match(code,/plugins\.some\(item=>item\.id===pack\.id && item\._source===\'installed\'\)/);
  assert.match(code,/const refreshed = await refresh\(\)/);
  assert.match(code,/count\.textContent = String\(plugins\.length\)/);
});
