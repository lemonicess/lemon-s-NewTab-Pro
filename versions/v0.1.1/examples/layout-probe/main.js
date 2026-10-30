'use strict';
window.LemonPlugin={mount(root,api){
  const style=document.createElement('style');style.textContent=`
    .lt-title{font-size:20px;font-weight:750}.lt-sub{font-size:12px;color:#b7aac9;margin:8px 0 18px}
    .lt-bars{display:grid;grid-template-columns:repeat(12,minmax(0,1fr));gap:5px;margin-bottom:15px}
    .lt-bar{height:42px;border-radius:7px;background:#b89af6;opacity:.45}.lt-bar:nth-child(2n){opacity:.7}.lt-bar:nth-child(3n){opacity:1}
    .lt-read{font:13px/1.6 monospace;color:#ddd0ff;background:#ffffff10;border-radius:9px;padding:10px 12px;overflow-wrap:anywhere}`;
  const title=document.createElement('div');title.className='lt-title';title.textContent='12 栏布局压力测试';
  const sub=document.createElement('div');sub.className='lt-sub';sub.textContent='宽插件用于观察容器伸缩及 iframe 尺寸变更';
  const bars=document.createElement('div');bars.className='lt-bars';for(let i=0;i<12;i++){const bar=document.createElement('div');bar.className='lt-bar';bar.title='第 '+(i+1)+' 栏';bars.append(bar);}
  const read=document.createElement('div');read.className='lt-read';const draw=()=>{read.textContent=`插件 ID: ${api.id} | iframe: ${window.innerWidth} × ${window.innerHeight} px`;};
  root.append(style,title,sub,bars,read);draw();window.addEventListener('resize',draw);addEventListener('pagehide',()=>window.removeEventListener('resize',draw),{once:true});
}};
