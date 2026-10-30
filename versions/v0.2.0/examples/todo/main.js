'use strict';
window.LemonPlugin = {
  mount(root) {
    const style=document.createElement('style');style.textContent=`
      .td-title{font-size:17px;font-weight:700;margin-bottom:14px}.td-form{display:flex;gap:8px}
      .td-input{flex:1;min-width:0;border:1px solid #ffffff38;border-radius:10px;background:#ffffff12;color:white;padding:10px 12px}
      .td-btn{border:1px solid #ffffff35;border-radius:10px;padding:8px 12px;background:#bb9df1;color:#211634;font-weight:700}
      .td-list{list-style:none;padding:0;margin:15px 0;display:grid;gap:8px;max-height:165px;overflow:auto}
      .td-item{display:flex;align-items:center;gap:9px;background:#ffffff0c;border:1px solid #ffffff18;border-radius:9px;padding:8px}
      .td-item label{flex:1;min-width:0;overflow-wrap:anywhere}.td-item.done label{text-decoration:line-through;color:#9b93b0}
      .td-remove{border:0;background:transparent;color:#c7bce4;font-size:18px;cursor:pointer}
      .td-note{font-size:11px;color:#aba0bc;margin-top:12px}`;
    const title=document.createElement('div');title.className='td-title';title.textContent='今日待办';
    const form=document.createElement('form');form.className='td-form';
    const input=document.createElement('input');input.className='td-input';input.placeholder='添加一件待办事项…';input.maxLength=120;input.setAttribute('aria-label','新的待办事项');
    const add=document.createElement('button');add.className='td-btn';add.textContent='添加';form.append(input,add);
    const list=document.createElement('ul');list.className='td-list';
    const status=document.createElement('div');status.className='td-note';
    const tasks=[];
    function render(){list.replaceChildren();for(const task of tasks){const li=document.createElement('li');li.className='td-item'+(task.done?' done':'');const check=document.createElement('input');check.type='checkbox';check.checked=task.done;check.setAttribute('aria-label','完成 '+task.text);check.addEventListener('change',()=>{task.done=check.checked;render();});const label=document.createElement('label');label.textContent=task.text;const remove=document.createElement('button');remove.className='td-remove';remove.textContent='×';remove.type='button';remove.setAttribute('aria-label','删除 '+task.text);remove.addEventListener('click',()=>{tasks.splice(tasks.indexOf(task),1);render();});li.append(check,label,remove);list.append(li);}
      status.textContent=`${tasks.filter(t=>t.done).length} / ${tasks.length} 已完成 · 本插件暂无持久化存储，刷新会清空。`;
    }
    form.addEventListener('submit',event=>{event.preventDefault();const text=input.value.trim();if(!text||tasks.length>=30)return;tasks.push({text,done:false});input.value='';render();input.focus();});
    root.append(style,title,form,list,status);render();
  }
};
