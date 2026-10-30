#!/usr/bin/env node
// No dependencies. Generate a runnable plugin, never overwrite an existing folder.
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildRegistry } from './build-registry.mjs';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const id = process.argv[2];
const sampleSettings = process.argv.includes('--settings');
const fullscreen = process.argv.includes('--fullscreen');
if (!id || !/^[a-z][a-z0-9-]{1,39}$/.test(id)) {
  console.error('用法：node scripts/create-plugin.mjs my-plugin [--settings] [--fullscreen]');
  process.exit(1);
}
const directory=join(root,'plugins',id);
const definition={
  id,name:id,version:'1.0.0',description:'我的 lemon 插件',icon:'✦',
  layout:fullscreen?{mode:'fullscreen',span:12,height:640}:{span:4,height:220},
  defaultEnabled:true,capabilities:[]
};
if(sampleSettings)definition.settings=[{id:'appearance',title:'外观',fields:[
  {key:'message',type:'text',label:'显示文字',default:'Hello lemon!',maxLength:100},
  {key:'color',type:'color',label:'文字颜色',default:'#ffffff'}
]}];
const script=`// 这是你的插件入口。你可以在 iframe 沙箱内使用普通 DOM、CSS 与定时器。\nwindow.LemonPlugin = {\n  mount(root, api) {\n    const title = document.createElement('h1');\n    title.style.cssText = 'font:700 26px system-ui;margin:0';\n    root.style.cssText = 'padding:24px;border-radius:16px;background:#191525c9;min-height:100%;box-sizing:border-box';\n    root.append(title);\n    function render(settings) {\n      title.textContent = settings.message || 'Hello lemon!';\n      title.style.color = settings.color || '#ffffff';\n    }\n    render(api.settings.get());\n    api.settings.onChange(render);\n  }\n};\n`;
try {
  await mkdir(directory);
  await writeFile(join(directory,'plugin.json'),JSON.stringify(definition,null,2)+'\n');
  await writeFile(join(directory,'main.js'),script);
  const registry=await buildRegistry(join(root,'plugins'));
  await writeFile(join(root,'plugins','registry.json'),JSON.stringify(registry,null,2)+'\n');
  console.log(`插件已创建：plugins/${id}/`);
  console.log('两个文件已生成并注册。请在 chrome://extensions 重新加载扩展。');
} catch(error) {
  console.error('创建失败：'+error.message+'（已有插件不会被覆盖）');
  process.exitCode=1;
}
