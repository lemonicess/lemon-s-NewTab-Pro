'use strict';
window.LemonPlugin={mount(root){
  const style=document.createElement('style');style.textContent=`
    .pl-top{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:15px}
    .pl-title{font-size:15px;font-weight:750}.pl-generate{border:0;border-radius:9px;padding:9px 12px;background:#c5a9f5;color:#291639;font-weight:700}
    .pl-row{display:flex;gap:9px;min-height:135px}.pl-color{display:flex;flex:1;min-width:0;align-items:end;justify-content:center;border-radius:10px;padding:9px 3px;font:11px/1.3 monospace;text-align:center;user-select:text}
    .pl-note{color:#aca3bd;font-size:11px;margin-top:12px}`;
  const header=document.createElement('div');header.className='pl-top';const title=document.createElement('span');title.className='pl-title';title.textContent='随机配色卡';
  const generate=document.createElement('button');generate.className='pl-generate';generate.textContent='重新生成';header.append(title,generate);
  const row=document.createElement('div');row.className='pl-row';const note=document.createElement('div');note.className='pl-note';note.textContent='每种颜色的十六进制值可直接选中复制。';
  function rand(max){if(globalThis.crypto?.getRandomValues){const data=new Uint32Array(1);crypto.getRandomValues(data);return data[0]%max;}return Math.floor(Math.random()*max);}
  function render(){row.replaceChildren();for(let i=0;i<5;i++){const n=rand(16777216),hex='#'+n.toString(16).padStart(6,'0').toUpperCase();const r=n>>16,g=(n>>8)&255,b=n&255,luma=.2126*r+.7152*g+.0722*b;const item=document.createElement('div');item.className='pl-color';item.style.backgroundColor=hex;item.style.color=luma>145?'#16101f':'#fff';item.textContent=hex;row.append(item);}}
  generate.addEventListener('click',render);root.append(style,header,row,note);render();
}};
