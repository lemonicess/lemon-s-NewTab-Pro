import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFile, mkdtemp, mkdir, copyFile, writeFile, stat, readdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { execFileSync } from 'node:child_process';
import schema from '../plugin-schema.js';
const root = resolve(import.meta.dirname, '..');
const sample = JSON.parse(await readFile(join(root,'examples/settings-showcase/plugin.json'),'utf8'));
const classic = JSON.parse(await readFile(join(root,'examples/classic-home/plugin.json'),'utf8'));
const read = name => readFile(join(root,name),'utf8');

test('v0.2.0 设置模式：8 个控件类型与默认值合法', () => {
  const validated = schema.validatePlugin(sample, 'settings-showcase');
  assert.equal(validated.id, 'settings-showcase');
  const fields = schema.fields(sample);
  assert.equal(new Set(fields.map(field => field.type)).size, 8);
  const normalized = schema.normalize(sample, {});
  assert.equal(normalized.title,'我的设置插件');
  assert.equal(normalized.countStep,1);
  assert.equal(normalized.accent,'#a58bfa');
  assert.equal(normalized.target,'https://example.com');
});

test('无效设置会回退默认，异常 URL/颜色/类型无法保存', () => {
  const normalized = schema.normalize(sample,{title:3,accent:'url(javascript:evil)',countStep:-1,target:'file:///secret'});
  assert.equal(normalized.title,'我的设置插件');
  assert.equal(normalized.accent,'#a58bfa');
  assert.equal(normalized.countStep,1);
  assert.equal(normalized.target,'https://example.com');
  const fields = schema.fields(sample);
  assert.equal(schema.validValue(fields.find(f=>f.key==='target'), 'javascript:alert(1)'),false);
  assert.equal(schema.validValue(fields.find(f=>f.key==='countStep'),7),true);
});

test('拒绝重复设置 key、未知类型、超范围默认值', () => {
  const group=sample.settings[0];
  const duplicate={...sample,settings:[{...group,fields:[...group.fields,group.fields[0]]}]};
  assert.throws(()=>schema.validatePlugin(duplicate,'settings-showcase'),/重复或无效/);
  const unsafe={...sample,settings:[{...group,fields:[{key:'test',type:'html',label:'HTML',default:'<img>'}]}]};
  assert.throws(()=>schema.validatePlugin(unsafe,'settings-showcase'));
  const range={...sample,settings:[{...group,fields:[{key:'amount',type:'number',label:'数值',min:0,max:10,step:2,default:5}]}]};
  assert.throws(()=>schema.validatePlugin(range,'settings-showcase'));
});

test('全屏布局合法，不能要求超过 12 栏，权限不得随意声明', () => {
  assert.equal(schema.validatePlugin(classic,'classic-home').layout.mode,'fullscreen');
  assert.throws(()=>schema.validatePlugin({...classic,layout:{mode:'fullscreen',span:6,height:640}},'classic-home'));
  assert.throws(()=>schema.validatePlugin({...classic,capabilities:['chrome.storage']},'classic-home'));
});

test('v0.2.0 新 API 在沙箱中更新设置并请求独立存储', async () => {
  let listener, script, capturedApi;
  const messages=[];
  const parent={postMessage:(msg,origin)=>messages.push({msg,origin})};
  const rootElement={replaceChildren(){},append(){}};
  const document={getElementById:()=>rootElement,createElement:()=>({}),head:{append(el){script=el;vm.runInContext('window.LemonPlugin={mount(root,api){globalThis.capturedApi=api;globalThis.initial=api.settings.get()}}',context);el.onload();}}};
  const context=vm.createContext({document,parent,window:{addEventListener:(name,handler)=>{if(name==='message')listener=handler;}},
    location:{protocol:'chrome-extension:',host:'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'},
    TextEncoder,Blob,URL:class Url extends URL{static createObjectURL(){return 'blob:null/test'}static revokeObjectURL(){}},
    navigator:{userActivation:{isActive:true}},setTimeout,clearTimeout,console,Promise});
  vm.runInContext(await read('sandbox.js'),context);
  assert.equal(messages[0].msg.type,'sandbox:loaded');
  const packet={channel:'lemon-plugin-v1',type:'host:init',id:'example-plugin',source:'window.LemonPlugin={mount(){}}',settings:{title:'A'},capabilities:['storage','open-url','background']};
  listener({source:parent,origin:'https://malicious.example',data:packet});
  assert.equal(script,undefined,'错误父源不得初始化');
  listener({source:parent,origin:'chrome-extension://aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',data:packet});
  await new Promise(r=>setImmediate(r));
  const api=context.capturedApi;
  assert.equal(context.initial.title,'A');
  let updated;
  api.settings.onChange(settings=>updated=settings.title);
  listener({source:parent,origin:'chrome-extension://aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',data:{channel:'lemon-plugin-v1',type:'host:settings-changed',id:'example-plugin',settings:{title:'B'}}});
  assert.equal(updated,'B');
  assert.equal(api.settings.get().title,'B');
  const future=api.storage.get('tasks',[]);
  const request=messages.find(x=>x.msg.type==='plugin:storage');
  assert.equal(request.msg.key,'tasks');
  listener({source:parent,origin:'chrome-extension://aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',data:{channel:'lemon-plugin-v1',type:'host:storage-response',id:'example-plugin',requestId:request.msg.requestId,result:[1,2],error:null}});
  assert.deepEqual(await future,[1,2]);
  assert.equal(api.background.set('assets/photo.png'),true);
  assert.equal(api.background.set('../secret.png'),false);
  assert.equal(api.layout.update({span:10,height:900}),true);
  assert.equal(api.layout.update({height:5000}),false);
  assert.equal(api.open('file:///secret'),false);
  const imagePromise=api.assets.image('assets/logo.png');
  const assetPacket=messages.find(x=>x.msg.type==='plugin:asset');
  assert.equal(assetPacket.msg.asset,'assets/logo.png');
  listener({source:parent,origin:'chrome-extension://aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',data:{channel:'lemon-plugin-v1',type:'host:asset-response',id:'example-plugin',requestId:assetPacket.msg.requestId,result:'data:image/png;base64,AAAA'}});
  assert.equal(await imagePromise,'data:image/png;base64,AAAA');
  await assert.rejects(api.assets.image('assets/../secret.png'));
  assert.ok(messages.some(x=>x.msg.type==='plugin:background'&&x.msg.asset==='assets/photo.png'));
});

test('未声明 storage/background/open-url 的插件不能使用对应能力', async () => {
  const code=await read('sandbox.js');
  let listener;
  const sent=[];
  const parent={postMessage:m=>sent.push(m)};
  const context=vm.createContext({document:{getElementById:()=>({replaceChildren(){},append(){}}),createElement:()=>({}),head:{append(el){vm.runInContext('window.LemonPlugin={mount(r,api){globalThis.api=api}}',context);el.onload();}}},parent,
    window:{addEventListener:(n,cb)=>{if(n==='message')listener=cb;}},
    location:{protocol:'chrome-extension:',host:'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'},
    TextEncoder,Blob,URL:class U extends URL{static createObjectURL(){return 'blob:null/test'}static revokeObjectURL(){}},
    navigator:{userActivation:{isActive:true}},setTimeout,clearTimeout,console,Promise});
  vm.runInContext(code,context);
  listener({source:parent,origin:'chrome-extension://aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',data:{channel:'lemon-plugin-v1',type:'host:init',id:'safe-plugin',source:'window.LemonPlugin={}',settings:{},capabilities:[]}});
  await new Promise(r=>setImmediate(r));
  assert.equal(context.api.background.set('assets/photo.png'),false);
  assert.equal(context.api.open('https://example.com'),false);
  await assert.rejects(context.api.storage.get('data'),/需要 storage/);
  assert.equal(sent.filter(m=>m.type==='plugin:storage').length,0);
});

test('生成器在独立临时目录内生成可运行模板及注册清单', async () => {
  const temp = await mkdtemp(join(tmpdir(),'lemon-v2-kit-'));
  await mkdir(join(temp,'scripts'));await mkdir(join(temp,'plugins'));
  for(const path of ['plugin-schema.js','scripts/build-registry.mjs','scripts/create-plugin.mjs']){
    await copyFile(join(root,path),join(temp,path));
  }
  execFileSync(process.execPath,[join(temp,'scripts/create-plugin.mjs'),'my-new-plugin','--settings','--fullscreen'],{cwd:temp});
  const definition=JSON.parse(await readFile(join(temp,'plugins/my-new-plugin/plugin.json'),'utf8'));
  assert.equal(definition.layout.mode,'fullscreen');
  assert.equal(schema.fields(definition).length,2);
  const registry=JSON.parse(await readFile(join(temp,'plugins/registry.json'),'utf8'));
  assert.equal(registry.plugins.length,1);
  assert.equal((await stat(join(temp,'plugins/my-new-plugin/main.js'))).isFile(),true);
  assert.throws(()=>execFileSync(process.execPath,[join(temp,'scripts/create-plugin.mjs'),'my-new-plugin'],{cwd:temp,stdio:'pipe'}));
});

test('默认插件清单为空；经典主页背景资源包含在示例而非核心', async () => {
  const registry=JSON.parse(await read('plugins/registry.json'));
  assert.deepEqual(registry.plugins,[]);
  assert.equal((await stat(join(root,'examples/classic-home/assets/aurora.png'))).isFile(),true);
  const html=await read('index.html');
  assert.match(html,/id="settings-view"/);
  assert.match(html,/id="background-video"/);
});
