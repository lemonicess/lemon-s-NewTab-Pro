'use strict';
window.LemonPlugin = {
  mount(root) {
    const style = document.createElement('style');
    style.textContent = `
      .pm-eyebrow{color:#c1abff;font-size:11px;letter-spacing:2px;font-weight:700}
      .pm-time{font-size:clamp(48px,5vw,72px);font-weight:750;letter-spacing:-3px;font-variant-numeric:tabular-nums;margin:12px 0}
      .pm-row{display:flex;flex-wrap:wrap;gap:9px}.pm-btn{padding:9px 14px;border:1px solid #ffffff33;border-radius:11px;background:#ffffff12;color:#f2eaff}
      .pm-btn[aria-pressed=true],.pm-btn.primary{background:#c3a5ff;color:#241539;font-weight:700}
      .pm-hint{color:#a9a2bd;font-size:12px;margin-top:14px}`;
    const label = document.createElement('div'); label.className='pm-eyebrow'; label.textContent='专注计时器 · 番茄钟';
    const time = document.createElement('div'); time.className='pm-time'; time.setAttribute('role','timer');
    const mode = document.createElement('div'); mode.className='pm-row';
    const controls = document.createElement('div'); controls.className='pm-row'; controls.style.marginTop='14px';
    const hint=document.createElement('p');hint.className='pm-hint';hint.textContent='计时仅在当前标签页会话有效。';
    let duration=25*60, remaining=duration, deadline=0, running=false;
    const format=seconds=>`${String(Math.floor(seconds/60)).padStart(2,'0')}:${String(seconds%60).padStart(2,'0')}`;
    function draw(){time.textContent=format(remaining);document.title='番茄钟 '+time.textContent;}
    function update(){if(!running)return;remaining=Math.max(0,Math.ceil((deadline-Date.now())/1000));if(remaining===0){running=false;start.textContent='开始';hint.textContent='本轮完成！点击开始可以再计时。'}draw();}
    function preset(labelText,seconds){const b=document.createElement('button');b.className='pm-btn';b.type='button';b.textContent=labelText;b.addEventListener('click',()=>{duration=seconds;remaining=seconds;running=false;start.textContent='开始';hint.textContent='已切换到'+labelText;sync();draw();});mode.append(b);return b;}
    const focus=preset('专注 25 分钟',25*60),rest=preset('短休 5 分钟',5*60);
    function sync(){focus.setAttribute('aria-pressed',String(duration===1500));rest.setAttribute('aria-pressed',String(duration===300));}
    const start=document.createElement('button');start.className='pm-btn primary';start.textContent='开始';start.addEventListener('click',()=>{if(running){update();running=false;start.textContent='继续';}else{if(remaining===0)remaining=duration;deadline=Date.now()+remaining*1000;running=true;start.textContent='暂停';}draw();});
    const reset=document.createElement('button');reset.className='pm-btn';reset.textContent='重置';reset.addEventListener('click',()=>{running=false;remaining=duration;start.textContent='开始';hint.textContent='计时已重置';draw();});
    controls.append(start,reset);root.append(style,label,time,mode,controls,hint);sync();draw();
    const timer=setInterval(update,250);addEventListener('pagehide',()=>clearInterval(timer),{once:true});
  }
};
