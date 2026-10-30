'use strict';
window.LemonPlugin={mount(root){
  const style=document.createElement('style');style.textContent=`
    .wc-head{color:#c6b0fc;font-size:11px;letter-spacing:2px;font-weight:700;margin-bottom:14px}
    .wc-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}
    .wc-card{background:#ffffff0d;border:1px solid #ffffff20;border-radius:12px;padding:11px 13px}
    .wc-city{color:#bdb5ce;font-size:12px}.wc-time{font-size:24px;font-variant-numeric:tabular-nums;font-weight:700;margin:4px 0}
    .wc-date{font-size:11px;color:#b6a8d0}.wc-foot{font-size:11px;color:#a59bb9;margin-top:14px}`;
  const title=document.createElement('div');title.className='wc-head';title.textContent='世界时钟 · 自动夏令时';
  const grid=document.createElement('div');grid.className='wc-grid';const parts=[];
  for(const [name,zone] of [['北京','Asia/Shanghai'],['东京','Asia/Tokyo'],['伦敦','Europe/London'],['纽约','America/New_York']]){
    const card=document.createElement('div');card.className='wc-card';const city=document.createElement('div');city.className='wc-city';city.textContent=name;const time=document.createElement('div');time.className='wc-time';const date=document.createElement('div');date.className='wc-date';card.append(city,time,date);grid.append(card);parts.push({zone,time,date});}
  const note=document.createElement('div');note.className='wc-foot';note.textContent='使用浏览器 Intl 时区数据，不需要联网。';root.append(style,title,grid,note);
  function tick(){const now=new Date();for(const p of parts){p.time.textContent=new Intl.DateTimeFormat('zh-CN',{timeZone:p.zone,hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).format(now);p.date.textContent=new Intl.DateTimeFormat('zh-CN',{timeZone:p.zone,month:'short',day:'numeric',weekday:'short'}).format(now);}}
  tick();const timer=setInterval(()=>{if(!document.hidden)tick();},15000);addEventListener('pagehide',()=>clearInterval(timer),{once:true});
}};
