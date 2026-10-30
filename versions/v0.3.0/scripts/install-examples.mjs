#!/usr/bin/env node
// 仅安装本项目 examples/ 中的本地测试插件；不会覆盖已有插件目录。
import { cp, mkdir, readdir, readFile, rm, lstat } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildRegistry, validatePlugin } from './build-registry.mjs';
import { writeFile } from 'node:fs/promises';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const examples = join(root, 'examples');
const plugins = join(root, 'plugins');
const args = process.argv.slice(2);

async function main() {
  const names = (await readdir(examples, { withFileTypes: true }))
    .filter(item => item.isDirectory()).map(item => item.name).sort();
  if (!args.length || args.includes('--help') || args.includes('--list')) {
    console.log('使用: node scripts/install-examples.mjs <插件ID...>  或  --all');
    console.log('现有示例: ' + names.join(', '));
    return;
  }
  const selected = args.length === 1 && args[0] === '--all' ? names : [...new Set(args)];
  for (const id of selected) if (!names.includes(id)) throw Error(`未找到示例插件：${id}`);
  for (const id of selected) {
    const definition = JSON.parse(await readFile(join(examples,id,'plugin.json'),'utf8'));
    validatePlugin(definition,id);
  }
  for (const id of selected) {
    const target = join(plugins,id);
    try { await mkdir(target); }
    catch (err) {
      if (err.code === 'EEXIST') { console.log(`跳过 ${id}（插件目录已存在，未覆盖）`); continue; }
      throw err;
    }
    try {
      // 主脚本通过声明式入口加载；asset 只允许普通本地图片文件。
      for (const filename of ['plugin.json','main.js']) {
        await cp(join(examples,id,filename), join(target,filename), { errorOnExist:true,force:false });
      }
      const sourceAssets = join(examples, id, 'assets');
      let assetEntries = [];
      try { assetEntries = await readdir(sourceAssets, {withFileTypes:true}); }
      catch(error) { if (error.code !== 'ENOENT') throw error; }
      if (assetEntries.length) {
        const assetDirStat = await lstat(sourceAssets);
        if (!assetDirStat.isDirectory() || assetDirStat.isSymbolicLink()) throw Error('示例资源不能使用符号链接目录');
        await mkdir(join(target,'assets'));
        for (const asset of assetEntries) {
          if (!asset.isFile() || !/^[a-zA-Z0-9_-]+\.(png|jpe?g|webp|gif)$/i.test(asset.name)) throw Error(`不支持的资源文件：${asset.name}`);
          const source = join(sourceAssets,asset.name);
          const stat = await lstat(source);
          if (stat.isSymbolicLink() || stat.size > (asset.name.endsWith('.mp4') ? 50 : 3) * 1024 * 1024) throw Error(`资源异常或超过 3MB：${asset.name}`);
          await cp(source, join(target,'assets',asset.name), {errorOnExist:true,force:false});
        }
      }
      console.log(`已安装 ${id}`);
    } catch (err) {
      await rm(target,{recursive:true,force:true});
      throw err;
    }
  }
  const registry = await buildRegistry(plugins);
  await writeFile(join(plugins,'registry.json'),JSON.stringify(registry,null,2)+'\n');
  console.log(`已更新清单：${registry.plugins.length} 个插件。请在 chrome://extensions/ 中重新加载扩展。`);
}
main().catch(err => {console.error('安装失败：'+err.message);process.exitCode=1;});
