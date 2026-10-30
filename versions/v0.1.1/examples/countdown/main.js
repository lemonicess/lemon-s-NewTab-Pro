'use strict';
window.LemonPlugin={mount(root){
  const style=document.createElement('style');style.textContent=`
    .cd-title{font-size:16px;font-weight:700;margin-bottom:14px}.cd-form{display:flex;gap:9px;flex-wrap:wrap}
    .cd-input{color:white;border:1px solid #ffffff37;border-radius:9px;background:#292138;padding:10px;min-width:0}
    .cd-go{border:0;border-radius:9px;background:#c1a6fa;color:#28163b;font-weight:700;padding:10px 15px}
    .cd-clock{font-variant-numeric:tabular-nums;font-size:clamp(23px,4vw,38px);font-weight:750;margin:22px 0 7px;overflow-wrap:anywhere}
    .cd-status{font-size:12px;color:#b2a6cc}`;
  const title=document.createElement('div');title.className='cd-title';title.textContent='自定义倒计时';const form=document.createElement('form');form.className='cd-form';
  const input=document.createElement('input');input.type='datetime-local';input.className='cd-input';input.required=true;input.setAttribute('aria-label','目标日期与时间');
  const go=document.createElement('button');go.className='cd-go';go.textContent='设定目标';form.append(input,go);
  const clock=document.createElement('div');clock.className='cd-clock';const status=document.createElement('div');status.className='cd-status';
  let target=0;const initial=new Date(Date.now()+24*3600*1000);const local=new Date(initial.getTime()-initial.getTimezoneOffset()*60000);input.value=local.toISOString().slice(0,16);
  function tick(){if(!target){clock.textContent='—';status.textContent='请设定目标时间';return;}const diff=target-Date.now();if(diff<=0){clock.textContent='00天 00:00:00';status.textContent='目标时间已到';return;}let seconds=Math.ceil(diff/1000);const day=Math.floor(seconds/86400);seconds%=86400;const hh=Math.floor(seconds/3600);seconds%=3600;const mm=Math.floor(seconds/60),ss=seconds%60;clock.textContent=`${day}天 ${String(hh).padStart(2,'0')}:${String(mm).padStart(2,'0')}:${String(ss).padStart(2,'0')}`;status.textContent='剩余时间 · 按本地时区计算，刷新后重置';}
  form.addEventListener('submit',event=>{event.preventDefault();const value=new Date(input.value).getTime();if(!Number.isFinite(value)){status.textContent='请输入有效日期';return;}target=value;tick();});
  root.append(style,title,form,clock,status);target=new Date(input.value).getTime();tick();const timer=setInterval(()=>{if(!document.hidden)tick();},1000);addEventListener('pagehide',()=>clearInterval(timer),{once:true});
}};
