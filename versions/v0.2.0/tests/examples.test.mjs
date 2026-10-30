import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readdir, readFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { validatePlugin } from '../scripts/build-registry.mjs';

const rootPath = resolve(import.meta.dirname, '..', 'examples');

function node(tagName='div') {
  const listeners = new Map();
  const children = [];
  const classTokens = new Set();
  return {
    tagName, children, listeners, style:{setProperty(){}}, dataset:{}, value:'', textContent:'', className:'',
    classList: {add:(...tokens)=>tokens.forEach(t=>classTokens.add(t)),contains:(t)=>classTokens.has(t)},
    setAttribute(key,value){this[key]=String(value);},
    addEventListener(key,handler){listeners.set(key,handler);},
    removeEventListener(key){listeners.delete(key);},
    append(...items){children.push(...items);},
    replaceChildren(...items){children.splice(0,children.length,...items);},
    focus(){},
    click(){listeners.get('click')?.({preventDefault(){}});}
  };
}

function findAll(element,predicate){
  return [...(predicate(element)?[element]:[]),...element.children.flatMap(c=>findAll(c,predicate))];
}

async function mountExample(id) {
  const definition=JSON.parse(await readFile(join(rootPath,id,'plugin.json'),'utf8'));
  globalThis.testDefaults=Object.fromEntries((definition.settings||[]).flatMap(group=>group.fields).map(field=>[field.key,field.default]));
  const src = await readFile(join(rootPath,id,'main.js'),'utf8');
  const root=node('main');
  const window = {innerWidth:700,innerHeight:300,addEventListener(){},removeEventListener(){}};
  const document = {hidden:false,createElement:node,title:'',head:{append(){}}};
  const opened=[];
  const api={id,open(url){opened.push(url);return /^https?:\/\//.test(url);},
    settings:{get(){return requireSettings;},onChange(){return ()=>{};}},
    storage:{async get(key,fallback){return fallback;},async set(){return true;},async remove(){return true;}},
    layout:{update(){return true;}},background:{set(){return true;},reset(){return true;}},
    assets:{async image(){return 'data:image/png;base64,AA==';},async text(){return ''}}
  };
  const requireSettings=globalThis.testDefaults || {};
  const context=vm.createContext({window,document,addEventListener(){},setInterval(){return 1;},clearInterval(){},Intl,Date,Math,Number,String,Array,Set,Uint32Array,console});
  vm.runInContext(src, context, {filename:`${id}/main.js`,timeout:2000});
  assert.equal(typeof window.LemonPlugin?.mount,'function',`${id}: 缺失 mount`);
  await window.LemonPlugin.mount(root,api);
  assert.ok(root.children.length>0,`${id}: 未生成任何 DOM 内容`);
  delete globalThis.testDefaults;
  return {root,opened,api};
}

test('所有示例都有合法 manifest、合法 JS 且可以独立 mount',async()=>{
  const dirs=(await readdir(rootPath,{withFileTypes:true})).filter(e=>e.isDirectory()).map(e=>e.name);
  assert.equal(dirs.length,18);
  for(const id of dirs){
    const p=JSON.parse(await readFile(join(rootPath,id,'plugin.json'),'utf8'));
    assert.equal(validatePlugin(p,id).entry,`plugins/${id}/main.js`);
    await mountExample(id);
  }
});

test('计算器加法、除以零和清零正常',async()=>{
  const {root}=await mountExample('calculator');
  const keys=findAll(root,n=>n.tagName==='button');
  const hit=text=>{const b=keys.find(n=>n.textContent===text);assert.ok(b);b.click();};
  const display=findAll(root,n=>n.tagName==='output')[0];
  hit('7');hit('+');hit('3');hit('=');assert.equal(display.textContent,'10');
  hit('C');hit('5');hit('÷');hit('0');hit('=');assert.equal(display.textContent,'错误');
  hit('C');assert.equal(display.textContent,'0');
});

test('待办输入作为纯文本显示，勾选与删除均有效',async()=>{
  const {root}=await mountExample('todo');
  const field=findAll(root,n=>n.tagName==='input'&&n.type!=='checkbox')[0];
  const form=findAll(root,n=>n.tagName==='form')[0];
  field.value='<script>alert(1)</script>';
  form.listeners.get('submit')({preventDefault(){}});
  const items=findAll(root,n=>n.tagName==='li');
  assert.equal(items.length,1);
  assert.ok(findAll(root,n=>n.tagName==='label').some(n=>n.textContent==='<script>alert(1)</script>'));
  const checkbox=findAll(root,n=>n.tagName==='input'&&n.type==='checkbox')[0];
  checkbox.checked=true;checkbox.listeners.get('change')();
  assert.equal(findAll(root,n=>n.tagName==='li').length,1);
  findAll(root,n=>n.tagName==='button'&&n.textContent==='×')[0].click();
  assert.equal(findAll(root,n=>n.tagName==='li').length,0);
});

test('外链插件非法协议由受限 API 拒绝',async()=>{
  const {root,opened}=await mountExample('link-permission');
  const buttons=findAll(root,n=>n.tagName==='button');
  buttons.find(n=>n.textContent==='测试非法协议').click();
  assert.deepEqual(opened,['javascript:alert(1)']); // 请求到模拟 API，模拟 API 返回拒绝
  assert.ok(findAll(root,n=>n.className==='lp-status')[0].textContent.includes('拒绝'));
});
