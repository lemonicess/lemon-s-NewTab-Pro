import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve, join } from 'node:path';
const root = resolve(import.meta.dirname, '..');
const json = async rel => JSON.parse(await readFile(join(root, rel),'utf8'));
const text = async rel => readFile(join(root, rel),'utf8');

test('MV3 sandbox 与最小宿主权限正确声明', async () => {
  const manifest = await json('manifest.json');
  assert.equal(manifest.manifest_version, 3);
  assert.deepEqual(manifest.permissions,['storage']);
  assert.deepEqual(manifest.sandbox.pages,['sandbox.html']);
  assert.match(manifest.content_security_policy.sandbox, /sandbox allow-scripts/);
  assert.doesNotMatch(manifest.content_security_policy.sandbox,/allow-same-origin|unsafe-eval/);
  assert.match(manifest.content_security_policy.sandbox,/connect-src 'none'/);
  assert.match(manifest.content_security_policy.extension_pages,/script-src 'self'/);
});
test('仅欢迎插件默认注册，不在核心中注册旧时钟、搜索框', async () => {
  const registry = await json('plugins/registry.json');
  assert.deepEqual(registry.plugins.map(p=>p.id),['welcome']);
  const html = await text('index.html');
  assert.ok(!html.includes('id="clock"'));
  assert.ok(!html.includes('id="search"'));
  assert.ok(!html.includes('id="settings"'));
});
test('宿主包含沙箱消息来源校验和 URL 协议过滤', async () => {
  const script = await text('index.js');
  assert.match(script,/event\.origin !== 'null'/);
  assert.match(script,/event\.source !== record\.frame\.contentWindow/);
  assert.match(script,/record\.plugin\.capabilities\.includes\('open-url'\)/);
  assert.match(script,/window\.confirm/);
  assert.match(script,/'https:', 'http:'/);
});
