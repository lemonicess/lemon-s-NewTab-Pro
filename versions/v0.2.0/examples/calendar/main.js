'use strict';
window.LemonPlugin={mount(root){
  const style=document.createElement('style');style.textContent=`
    .cl-head{display:flex;justify-content:space-between;align-items:center;gap:8px;margin-bottom:16px}
    .cl-month{font-size:19px;font-weight:750}.cl-nav{display:flex;gap:6px}.cl-nav button{border:1px solid #ffffff30;border-radius:8px;background:#ffffff10;color:white;padding:6px 11px}
    .cl-grid{display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:5px;text-align:center}
    .cl-day{color:#a8a2bb;font-size:11px;padding-bottom:5px}.cl-cell{border:1px solid transparent;border-radius:9px;background:#ffffff0b;color:#e8dfff;min-width:0;padding:7px 0;font-size:13px}
    .cl-cell.today{border-color:#c5a8ff}.cl-cell.selected{background:#bea1fa;color:#261438;font-weight:700}.cl-cell:disabled{opacity:.15}
    .cl-status{margin-top:14px;font-size:12px;color:#b6a8d6}`;
  const today=new Date();let year=today.getFullYear(),month=today.getMonth(),selected=null;
  const title=document.createElement('span');title.className='cl-month';const nav=document.createElement('div');nav.className='cl-nav';
  const head=document.createElement('div');head.className='cl-head';const grid=document.createElement('div');grid.className='cl-grid';const status=document.createElement('div');status.className='cl-status';
  function btn(text,fn){const b=document.createElement('button');b.textContent=text;b.type='button';b.addEventListener('click',fn);nav.append(b);}
  btn('‹',()=>shift(-1));btn('今天',()=>{year=today.getFullYear();month=today.getMonth();selected=null;render();});btn('›',()=>shift(1));head.append(title,nav);
  function shift(delta){const d=new Date(year,month+delta,1);year=d.getFullYear();month=d.getMonth();selected=null;render();}
  function render(){title.textContent=`${year} 年 ${month+1} 月`;grid.replaceChildren();for(const weekday of ['一','二','三','四','五','六','日']){const x=document.createElement('span');x.className='cl-day';x.textContent=weekday;grid.append(x);}
    const offset=(new Date(year,month,1).getDay()+6)%7,days=new Date(year,month+1,0).getDate();for(let i=0;i<offset;i++){const placeholder=document.createElement('span');grid.append(placeholder);}
    for(let day=1;day<=days;day++){const b=document.createElement('button');b.className='cl-cell';b.textContent=String(day);b.type='button';if(year===today.getFullYear()&&month===today.getMonth()&&day===today.getDate())b.classList.add('today');if(day===selected)b.classList.add('selected');b.setAttribute('aria-label',`${year}年${month+1}月${day}日`);b.addEventListener('click',()=>{selected=day;render();});grid.append(b);}
    status.textContent=selected?`已选日期：${year}-${String(month+1).padStart(2,'0')}-${String(selected).padStart(2,'0')}`:'点击日期可选中 · 紫色边框表示今天';}
  root.append(style,head,grid,status);render();
}};
