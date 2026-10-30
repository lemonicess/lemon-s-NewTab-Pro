window.LemonPlugin = {
  mount(root) {
    const clock = document.createElement('div');
    clock.style.cssText = 'font-size:clamp(38px,5vw,61px);line-height:1.1;font-weight:720;letter-spacing:-2px;margin:28px 0 13px;font-variant-numeric:tabular-nums';
    const date = document.createElement('div');
    date.style.cssText = 'color:#aea7c6;font-size:13px';
    root.append(clock, date);
    function tick() {
      const now = new Date();
      clock.textContent = new Intl.DateTimeFormat('zh-CN',{hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).format(now);
      date.textContent = new Intl.DateTimeFormat('zh-CN',{weekday:'long',year:'numeric',month:'long',day:'numeric'}).format(now);
    }
    tick();
    const timer = setInterval(() => { if (!document.hidden) tick(); }, 1000);
    addEventListener('pagehide', () => clearInterval(timer), { once:true });
  }
};
