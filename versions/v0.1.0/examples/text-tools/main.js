'use strict';
window.LemonPlugin={mount(root){
  const style=document.createElement('style');style.textContent=`
    .tt-title{font-size:16px;font-weight:700;margin-bottom:10px}.tt-area{display:block;width:100%;height:118px;resize:vertical;border:1px solid #ffffff38;border-radius:10px;background:#ffffff0b;color:white;padding:12px;font-size:13px;line-height:1.5;font-family:inherit}
    .tt-stats{display:flex;gap:9px;margin:12px 0;flex-wrap:wrap}.tt-stat{background:#ffffff13;border-radius:9px;padding:7px 10px;font-size:12px}
    .tt-actions{display:flex;gap:8px;flex-wrap:wrap}.tt-btn{padding:9px 11px;background:#ffffff18;color:white;border:1px solid #ffffff2b;border-radius:9px}
    .tt-note{font-size:11px;color:#b7a9ca;margin-top:11px}`;
  const title=document.createElement('div');title.className='tt-title';title.textContent='文本实验台';
  const area=document.createElement('textarea');area.className='tt-area';area.placeholder='输入一些文字，测试独立插件中的编辑功能…';area.maxLength=5000;area.setAttribute('aria-label','测试文本');
  const stats=document.createElement('div');stats.className='tt-stats';const actions=document.createElement('div');actions.className='tt-actions';
  const note=document.createElement('div');note.className='tt-note';note.textContent='全部运算在插件内部完成，不上传、不持久化。';
  function draw(){stats.replaceChildren();const s=area.value;for(const [name,value] of [['字符',s.length],['字数',s.trim()?s.trim().split(/\s+/u).length:0],['行数',s?s.split(/\r\n|\r|\n/).length:0]]){const item=document.createElement('span');item.className='tt-stat';item.textContent=`${name} ${value}`;stats.append(item);}}
  function button(label,fn){const b=document.createElement('button');b.type='button';b.className='tt-btn';b.textContent=label;b.addEventListener('click',()=>{fn();draw();area.focus();});actions.append(b);}
  button('去除两端空格',()=>area.value=area.value.trim());button('转为大写',()=>area.value=area.value.toUpperCase());button('转为小写',()=>area.value=area.value.toLowerCase());button('清空',()=>area.value='');
  area.addEventListener('input',draw);root.append(style,title,area,stats,actions,note);draw();
}};
