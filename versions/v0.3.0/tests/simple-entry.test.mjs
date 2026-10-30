import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import vm from 'node:vm';

test('最简 Lemon.mount 能在每个沙箱独立初始化，不访问扩展高权限',async()=>{
  const code=await readFile(resolve(import.meta.dirname,'../sandbox.js'),'utf8');
  const script=await readFile(resolve(import.meta.dirname,'../templates/starter/main.js'),'utf8');
  const events=[];
  const parent={postMessage:(m,origin)=>events.push({m,origin})};
  let listener;
  const root={innerHTML:'',querySelector:()=>({addEventListener(){}}),replaceChildren(){},append(){}};
  let cx;
  const win={addEventListener:(name,callback)=>{if(name==='message')listener=callback;}};
  const doc={getElementById:()=>root,createElement:()=>({}),head:{append(el){cx.Lemon=win.Lemon;vm.runInContext(script,cx);el.onload();}}};
  const U=class extends URL {static createObjectURL(){return 'blob:null/test';}static revokeObjectURL(){}};
  cx=vm.createContext({window:win,document:doc,parent,location:{protocol:'chrome-extension:',host:'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'},
    TextEncoder,Blob,URL:U,navigator:{userActivation:{isActive:true}},console,Promise,setTimeout,clearTimeout});
  vm.runInContext(code,cx);
  assert.equal(events[0].m.type,'sandbox:loaded');
  listener({source:parent,origin:'chrome-extension://aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',data:{
    channel:'lemon-plugin-v1',type:'host:init',id:'my-first-plugin',source:script,settings:{},capabilities:[]
  }});
  await new Promise(r=>setImmediate(r));
  assert.ok(root.innerHTML.includes('我的第一个插件'));
  assert.ok(events.some(e=>e.m.type==='plugin:ready'));
  assert.equal(cx.chrome,undefined);
});
