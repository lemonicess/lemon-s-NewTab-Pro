import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
const root = resolve(import.meta.dirname, '..');
const read = async path => readFile(join(root, path), 'utf8');

test('主页只保留默认背景、插件画布和管理入口', async () => {
  const html = await read('index.html');
  const css = await read('index.css');
  assert.match(html, /id="plugin-board"/);
  assert.match(html, /id="manage-open"/);
  for (const gone of ['class="intro"','class="footer"','class="masthead"','id="empty-state"','id="heading"']) {
    assert.equal(html.includes(gone), false, gone);
  }
  assert.match(css, /pumpkin-8384698_960_720\.jpg/);
});

test('宿主与沙箱包含完整握手、来源校验与启动超时', async () => {
  const host = await read('index.js');
  const sandbox = await read('sandbox.js');
  assert.match(host, /START_TIMEOUT_MS = 12000/);
  assert.match(host, /type: 'host:init'/);
  assert.match(host, /data\.type==='sandbox:loaded'/);
  assert.match(host, /new TextEncoder\(\)\.encode\(source\)/);
  assert.match(host, /frame\.contentWindow/);
  assert.match(sandbox, /event\.source !== parent/);
  assert.match(sandbox, /event\.origin !== expectedHostOrigin/);
  assert.match(sandbox, /script\.src = url/);
  assert.match(sandbox, /URL\.createObjectURL\(new Blob/);
});

test('隔离沙箱模拟握手后能 mount 并发送 ready，伪造来源不可初始化', async () => {
  const code = await read('sandbox.js');
  const messages = [];
  let listener;
  let script;
  const rootElement = {
    content: [], replaceChildren(){ this.content = []; }, append(el){ this.content.push(el); }
  };
  const parent = { postMessage: (...args) => messages.push(args) };
  const document = {
    getElementById(){return rootElement;},
    createElement(){return {set src(val){this._src=val;}, get src(){return this._src;}};},
    head: {append(el){ script=el; vm.runInContext(src, context); el.onload(); }}
  };
  const context = vm.createContext({
    document,
    parent,
    location: { protocol:'chrome-extension:', host:'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa', href:'chrome-extension://aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa/sandbox.html' },
    window: {addEventListener:(kind,cb)=>{ if(kind==='message')listener=cb; }},
    TextEncoder, Blob, URL: class URLPlus extends URL {static createObjectURL(){return 'blob:null/test-script'} static revokeObjectURL(){}},
    navigator: {userActivation: {isActive:true}},
    Promise
  });
  vm.runInContext(code, context, { timeout:1000 });
  assert.equal(messages[0][0].type, 'sandbox:loaded');
  assert.equal(messages[0][1], 'chrome-extension://aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa');
  const src = 'window.LemonPlugin={mount(root,api){root.append({id:api.id})}}';
  const packet = { channel:'lemon-plugin-v1', type:'host:init', id:'clock', source:src, capabilities:[] };
  listener({source:parent,origin:'https://malicious.example',data:packet});
  assert.equal(script,undefined,'来源错误时不能执行插件');
  listener({source:parent,origin:'chrome-extension://aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',data:packet});
  assert.equal(script.src,'blob:null/test-script');
  await new Promise(resolve => setImmediate(resolve));
  assert.deepEqual(rootElement.content.map(e=>e.id), ['clock']);
  assert.ok(messages.some(([msg])=>msg.type==='plugin:ready' && msg.id==='clock'));
});
