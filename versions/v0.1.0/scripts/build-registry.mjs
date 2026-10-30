#!/usr/bin/env node
import { readdir, readFile, writeFile, lstat, realpath } from 'node:fs/promises';
import { join, dirname, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const pluginsRoot = join(root, 'plugins');
const ID = /^[a-z][a-z0-9-]{1,39}$/;
const allowed = new Set(['id','name','version','description','icon','layout','defaultEnabled','capabilities']);

export function validatePlugin(value, dirName) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw Error(`${dirName}: plugin.json 必须是对象`);
  for (const key of Object.keys(value)) if (!allowed.has(key)) throw Error(`${dirName}: 不认识的字段 ${key}`);
  if (!ID.test(dirName) || value.id !== dirName) throw Error(`${dirName}: ID 不符合格式或与目录名称不同`);
  if (typeof value.name !== 'string' || !value.name.trim() || value.name.length > 40) throw Error(`${dirName}: name 无效`);
  if (typeof value.description !== 'string' || value.description.length > 180) throw Error(`${dirName}: description 无效`);
  if (typeof value.icon !== 'string' || [...value.icon].length > 8) throw Error(`${dirName}: icon 无效`);
  if (typeof value.version !== 'string' || !/^\d+\.\d+\.\d+$/.test(value.version)) throw Error(`${dirName}: version 必须是 x.y.z`);
  if (typeof value.defaultEnabled !== 'boolean') throw Error(`${dirName}: defaultEnabled 必须是布尔值`);
  if (!value.layout || Object.keys(value.layout).sort().join(',') !== 'height,span' ||
      !Number.isInteger(value.layout.span) || value.layout.span < 1 || value.layout.span > 12 ||
      !Number.isInteger(value.layout.height) || value.layout.height < 130 || value.layout.height > 640) throw Error(`${dirName}: layout 无效`);
  if (!Array.isArray(value.capabilities) || new Set(value.capabilities).size !== value.capabilities.length ||
      value.capabilities.some(v => v !== 'open-url')) throw Error(`${dirName}: 不支持的 capabilities`);
  return { ...value, entry: `plugins/${dirName}/main.js` };
}

export async function buildRegistry(base = pluginsRoot) {
  const entries = await readdir(base, { withFileTypes: true });
  const result = [];
  const safeRoot = await realpath(base);
  for (const entry of entries.sort((a,b) => a.name.localeCompare(b.name, 'en'))) {
    if (!entry.isDirectory()) continue;
    const dir = join(base, entry.name);
    const resolvedDir = await realpath(dir);
    if (!resolvedDir.startsWith(safeRoot + sep)) throw Error(`拒绝指向插件目录之外的符号链接：${entry.name}`);
    const mainFile = join(dir, 'main.js');
    const jsonFile = join(dir, 'plugin.json');
    const [mainStat, jsonStat] = await Promise.all([lstat(mainFile), lstat(jsonFile)]);
    if (!mainStat.isFile() || mainStat.isSymbolicLink() || !jsonStat.isFile() || jsonStat.isSymbolicLink()) {
      throw Error(`插件 ${entry.name} 必须含有普通文件 main.js 和 plugin.json`);
    }
    const definition = JSON.parse(await readFile(jsonFile, 'utf8'));
    result.push(validatePlugin(definition, entry.name));
  }
  if (result.length > 64) throw Error('插件上限为 64 个');
  return { format: 1, generatedAt: new Date().toISOString(), plugins: result };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const data = await buildRegistry();
    await writeFile(join(pluginsRoot, 'registry.json'), JSON.stringify(data, null, 2) + '\n');
    console.log(`✓ 已注册 ${data.plugins.length} 个插件 → plugins/registry.json`);
    for (const item of data.plugins) console.log(`  • ${item.id}  (${item.name})`);
  } catch (error) {
    console.error('✗ 插件清单生成失败：', error.message);
    process.exitCode = 1;
  }
}
