'use strict';
window.LemonPlugin={mount(root){
  const style=document.createElement('style');style.textContent=`
    .di-title{font-size:16px;font-weight:700;margin-bottom:18px}.di-controls{display:flex;align-items:center;gap:12px;flex-wrap:wrap}
    .di-controls select,.di-roll{padding:9px 13px;border-radius:9px;border:1px solid #ffffff30;background:#292238;color:white}
    .di-roll{background:#c4abff;color:#211632;font-weight:700}.di-results{display:flex;gap:12px;margin:21px 0;flex-wrap:wrap}
    .di-die{width:62px;height:62px;display:grid;place-items:center;border:1px solid #ffffff2e;border-radius:13px;background:#ffffff13;font-size:32px}
    .di-hint{color:#afa2c9;font-size:12px}`;
  const title=document.createElement('div');title.className='di-title';title.textContent='骰子实验室';
  const controls=document.createElement('div');controls.className='di-controls';const select=document.createElement('select');select.setAttribute('aria-label','骰子数量');
  for(let n=1;n<=4;n++){const opt=document.createElement('option');opt.value=String(n);opt.textContent=n+' 颗骰子';select.append(opt);}
  const roll=document.createElement('button');roll.className='di-roll';roll.textContent='掷骰子';controls.append(select,roll);
  const results=document.createElement('div');results.className='di-results';const hint=document.createElement('div');hint.className='di-hint';
  function randomDie(){if(globalThis.crypto?.getRandomValues){const numbers=new Uint32Array(1);crypto.getRandomValues(numbers);return numbers[0]%6+1;}return Math.floor(Math.random()*6)+1;}
  function throwDice(){results.replaceChildren();let sum=0;for(let i=0;i<Number(select.value);i++){const n=randomDie();sum+=n;const item=document.createElement('div');item.className='di-die';item.textContent='⚀⚁⚂⚃⚄⚅'[n-1];item.setAttribute('aria-label',n+' 点');results.append(item);}hint.textContent='总点数：'+sum+' · 仅供交互测试使用';}
  roll.addEventListener('click',throwDice);select.addEventListener('change',throwDice);root.append(style,title,controls,results,hint);throwDice();
}};
