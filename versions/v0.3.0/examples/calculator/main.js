'use strict';
window.LemonPlugin={
  mount(root){
    const style=document.createElement('style');style.textContent=`
      .ca-head{font-size:11px;letter-spacing:2px;font-weight:700;color:#c9b1ff}
      .ca-display{margin:10px 0 15px;background:#ffffff0c;border:1px solid #ffffff22;border-radius:12px;text-align:right;padding:14px;font-size:28px;min-height:66px;overflow:hidden;text-overflow:ellipsis;font-variant-numeric:tabular-nums}
      .ca-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px}
      .ca-key{padding:11px 0;border-radius:9px;background:#ffffff15;color:white;border:1px solid #ffffff1c;font-size:17px}
      .ca-key[data-op=true]{color:#d5baff;background:#8a61c32b}.ca-key[data-kind=equals]{background:#c6abfc;color:#241336;font-weight:700}
      .ca-note{color:#a9a0be;font-size:11px;margin-top:12px}`;
    const head=document.createElement('div');head.className='ca-head';head.textContent='基础计算器 · 无 eval';
    const display=document.createElement('output');display.className='ca-display';display.style.display='block';display.setAttribute('aria-live','polite');
    const grid=document.createElement('div');grid.className='ca-grid';
    const note=document.createElement('div');note.className='ca-note';note.textContent='支持加、减、乘、除；除以零显示错误。';
    let input='0',acc=null,op=null,newInput=false;
    const operation=(a,b,o)=>o==='+'?a+b:o==='−'?a-b:o==='×'?a*b:a/b;
    const compact=n=>Number.isFinite(n)?String(Number(n.toPrecision(12))):'错误';
    function draw(){display.textContent=input;}
    function reset(){input='0';acc=null;op=null;newInput=false;draw();}
    function key(k){if(k==='C'){reset();return;}if(k==='⌫'){input=input.length>1?input.slice(0,-1):'0';draw();return;}
      if(/[0-9]/.test(k)&&k.length===1||k==='.'){if(input==='错误')reset();if(newInput){input='0';newInput=false;}if(k==='.'&&input.includes('.'))return;if(input.replace(/[^0-9]/g,'').length>=12)return;input=input==='0'&&k!=='.'?k:input+k;draw();return;}
      if(k==='±'){if(input!=='错误'&&Number(input)!==0)input=input.startsWith('-')?input.slice(1):'-'+input;draw();return;}
      if(['+','−','×','÷','='].includes(k)){const current=Number(input);if(input==='错误')return;
        if(op!==null&&acc!==null&&!newInput){input=compact(operation(acc,current,op));if(input==='错误'){acc=null;op=null;newInput=true;draw();return;}acc=Number(input);}else if(acc===null)acc=current;
        op=k==='='?null:k;if(k==='=')acc=null;newInput=true;draw();}
    }
    for(const k of ['C','⌫','±','÷','7','8','9','×','4','5','6','−','1','2','3','+','0','.','=']){const b=document.createElement('button');b.type='button';b.className='ca-key';b.textContent=k;if(['+','−','×','÷'].includes(k))b.dataset.op='true';if(k==='=')b.dataset.kind='equals';if(k==='0')b.style.gridColumn='span 2';b.addEventListener('click',()=>key(k));grid.append(b);}
    root.append(style,head,display,grid,note);draw();
  }
};
