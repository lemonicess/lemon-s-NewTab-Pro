import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, mkdtemp, mkdir, writeFile, rm, symlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { buildRegistry, validatePlugin } from '../scripts/build-registry.mjs';

const sample = {
  id: 'my-plugin', name: '我的插件', version: '1.0.0', description: '描述', icon: '★',
  layout: { span: 6, height: 240 }, defaultEnabled: true, capabilities: []
};

test('有效清单通过校验并产生唯一安全入口', () => {
  const result = validatePlugin(sample, 'my-plugin');
  assert.equal(result.entry, 'plugins/my-plugin/main.js');
});
test('拒绝目录遍历与路径不一致', () => {
  for (const id of ['../abc','a/b','a..','evil_thing','A-capital']) {
    assert.throws(() => validatePlugin({ ...sample, id }, id));
  }
  assert.throws(() => validatePlugin(sample, 'other-plugin'));
});
test('拒绝未授权能力与额外字段', () => {
  assert.throws(() => validatePlugin({ ...sample, capabilities:['chrome.tabs'] }, 'my-plugin'));
  assert.throws(() => validatePlugin({ ...sample, arbitraryScript:'https://example.com/a.js' }, 'my-plugin'));
  assert.throws(() => validatePlugin({ ...sample, capabilities:['open-url','open-url'] }, 'my-plugin'));
});
test('拒绝异常布局和无效版本', () => {
  assert.throws(() => validatePlugin({ ...sample, layout: {span: 13,height:240} }, 'my-plugin'));
  assert.throws(() => validatePlugin({ ...sample, version: 'latest' }, 'my-plugin'));
});
test('真实目录能构建 registry', async () => {
  const base = resolve(import.meta.dirname, '..', 'plugins');
  const registry = await buildRegistry(base);
  assert.ok(registry.plugins.some(p => p.id === 'welcome'));
  assert.equal(registry.format, 1);
});
test('生成的清单格式与文件对应', async () => {
  const base = resolve(import.meta.dirname, '..', 'plugins');
  const saved = JSON.parse(await readFile(join(base,'registry.json'), 'utf8'));
  const fresh = await buildRegistry(base);
  assert.deepEqual(saved.plugins, fresh.plugins);
});
test('缺少入口脚本会失败', async () => {
  const base = await mkdtemp(join(tmpdir(), 'lemon-plugins-'));
  try {
    const dir = join(base, sample.id);
    await mkdir(dir);
    await writeFile(join(dir,'plugin.json'), JSON.stringify(sample));
    await assert.rejects(buildRegistry(base));
  } finally { await rm(base, {recursive:true,force:true}); }
});
test('可拒绝符号链接入口', async () => {
  const base = await mkdtemp(join(tmpdir(), 'lemon-plugins-'));
  try {
    const dir = join(base, sample.id);
    await mkdir(dir);
    await writeFile(join(dir,'plugin.json'), JSON.stringify(sample));
    await symlink(join(dir,'plugin.json'), join(dir,'main.js'));
    await assert.rejects(buildRegistry(base), /普通文件/);
  } finally { await rm(base, {recursive:true,force:true}); }
});
