/*
 * 自带布局的完整主页插件。只有本插件的 iframe 负责呈现时钟、搜索和导航。
 * 示例中所有 DOM 均由插件创建，不需要修改宿主 index.html。
 */
window.LemonPlugin = {
  async mount(root, api) {
    let config = api.settings.get();
    const defaultLinks = [
      {id:'work',title:'工作',items:[{title:'GitHub',url:'https://github.com'},{title:'Figma',url:'https://www.figma.com'}]},
      {id:'daily',title:'日常',items:[{title:'Google',url:'https://www.google.com'},{title:'Wikipedia',url:'https://www.wikipedia.org'}]}
    ];
    let groups = await api.storage.get('groups', defaultLinks);
    if (!Array.isArray(groups)) groups = defaultLinks;
    const style = document.createElement('style');
    style.textContent = `
      #root{padding:0!important;height:100%}
      .classic{min-height:100vh;box-sizing:border-box;padding:var(--top) 22px 70px;color:var(--text);text-align:center;
        font-family:system-ui,-apple-system,'Segoe UI',sans-serif;background:linear-gradient(#10101b15,#10101b33)}
      .classic-clock{font-size:var(--clock);font-weight:640;letter-spacing:-4px;line-height:1.06;font-variant-numeric:tabular-nums;text-shadow:0 3px 26px #0007}
      .classic-date{font-size:16px;letter-spacing:1px;text-shadow:0 2px 12px #0008;margin:12px 0 35px}
      .classic-heading{font-size:13px;letter-spacing:4px;font-weight:660;text-transform:uppercase;margin:12px 0 23px;opacity:.9}
      .classic-search{margin:0 auto 44px;display:flex;align-items:center;max-width:640px;padding:8px;background:#1918247d;border:1px solid #ffffff65;border-radius:17px;box-shadow:0 12px 40px #0005;backdrop-filter:blur(22px)}
      .classic-search input{flex:1;min-width:0;border:0;outline:none;color:inherit;background:transparent;padding:12px 16px;font:17px system-ui}
      .classic-search input::placeholder{color:#fff9}
      .classic-search button,.classic-add button{border:0;border-radius:11px;background:var(--accent);color:#161225;padding:12px 18px;font-weight:700}
      .classic-groups{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:25px;max-width:920px;text-align:left;margin:0 auto}
      .classic-group-title{font-size:14px;font-weight:700;margin-bottom:13px;text-shadow:0 2px 10px #0008}
      .classic-links{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}
      .classic-link{display:flex;align-items:center;justify-content:space-between;gap:8px;background:rgba(24,22,39,var(--glass));border:1px solid #ffffff42;border-radius:14px;min-height:62px;padding:0 16px;backdrop-filter:blur(13px);box-shadow:0 4px 20px #0003}
      .classic-link button{color:inherit;background:none;border:0;text-align:left;font:600 15px system-ui;cursor:pointer;flex:1;padding:10px 0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
      .classic-link .classic-delete{font-size:21px;flex:none;opacity:.65;padding:5px;line-height:1}
      .classic-add{display:flex;flex-wrap:wrap;gap:8px;justify-content:center;margin:29px auto 0;max-width:760px}
      .classic-add input,.classic-add select{background:#151421ac;color:white;border:1px solid #ffffff65;border-radius:9px;padding:9px 12px;min-width:120px}
      .classic-add input{flex:1}.classic-add select{max-width:140px}
      .classic-add small{width:100%;opacity:.72}
      @media(max-width:700px){.classic-groups{grid-template-columns:1fr}.classic-clock{letter-spacing:-2px}.classic-links{grid-template-columns:1fr}.classic{padding-left:16px;padding-right:16px}}
    `;
    document.head.append(style);
    const customStyle = document.createElement('style');document.head.append(customStyle);
    const page = document.createElement('div');page.className='classic';
    const clock = document.createElement('div');clock.className='classic-clock';
    const date = document.createElement('div');date.className='classic-date';
    const heading = document.createElement('div');heading.className='classic-heading';
    const form = document.createElement('form');form.className='classic-search';
    const input = document.createElement('input');input.placeholder='搜索互联网…';input.setAttribute('aria-label','搜索关键词');
    const searchButton = document.createElement('button');searchButton.type='submit';searchButton.textContent='搜索 ↗';
    form.append(input,searchButton);
    const navigation=document.createElement('div');navigation.className='classic-groups';
    const addForm=document.createElement('form');addForm.className='classic-add';
    const nameInput=document.createElement('input');nameInput.placeholder='卡片名称';nameInput.required=true;nameInput.maxLength=40;
    const urlInput=document.createElement('input');urlInput.placeholder='https://example.com';urlInput.required=true;urlInput.type='url';
    const groupInput=document.createElement('select');
    const addButton=document.createElement('button');addButton.type='submit';addButton.textContent='添加卡片';
    const help=document.createElement('small');help.textContent='示例支持增删卡片并在刷新后保留；更多拖拽和分组编辑可继续由插件实现。';
    addForm.append(nameInput,urlInput,groupInput,addButton,help);
    page.append(clock,date,heading,form,navigation,addForm);
    root.append(page);
    const engines={google:'https://www.google.com/search?q=',bing:'https://www.bing.com/search?q=',duck:'https://duckduckgo.com/?q='};
    function drawClock(){
      const now=new Date();
      const opts={hour:'2-digit',minute:'2-digit',hour12:false};
      if(config.showSeconds)opts.second='2-digit';
      clock.textContent=now.toLocaleTimeString('zh-CN',opts);
      date.textContent=now.toLocaleDateString('zh-CN',{year:'numeric',month:'long',day:'numeric',weekday:'long'});
    }
    const tick=setInterval(drawClock,1000);window.addEventListener('pagehide',()=>clearInterval(tick),{once:true});
    form.addEventListener('submit',event=>{event.preventDefault();if(input.value.trim())api.open((engines[config.engine]||engines.google)+encodeURIComponent(input.value.trim()));});
    const safeWebLink=value=>{
      try{const u=new URL(value);return ['http:','https:'].includes(u.protocol)&&!u.username&&!u.password?u.href:null;}catch{return null;}
    };
    async function saveGroups(){await api.storage.set('groups',groups);}
    function drawLinks(){
      navigation.replaceChildren();groupInput.replaceChildren();
      for(const group of groups){
        if(!group||typeof group.title!=='string'||!Array.isArray(group.items))continue;
        const option=document.createElement('option');option.value=group.id;option.textContent=group.title;groupInput.append(option);
        const wrap=document.createElement('section');
        const title=document.createElement('div');title.className='classic-group-title';title.textContent=group.title;
        const list=document.createElement('div');list.className='classic-links';
        for(const item of group.items){
          if(!item||typeof item.title!=='string'||!safeWebLink(item.url))continue;
          const card=document.createElement('div');card.className='classic-link';
          const open=document.createElement('button');open.type='button';open.textContent=item.title;
          open.addEventListener('click',()=>api.open(item.url));
          const del=document.createElement('button');del.className='classic-delete';del.type='button';del.textContent='×';del.title='删除卡片';
          del.addEventListener('click',async()=>{group.items=group.items.filter(link=>link!==item);await saveGroups();drawLinks();});
          card.append(open,del);list.append(card);
        }
        wrap.append(title,list);navigation.append(wrap);
      }
    }
    addForm.addEventListener('submit',async event=>{
      event.preventDefault();const url=safeWebLink(urlInput.value.trim());if(!url)return;
      const group=groups.find(group=>group.id===groupInput.value);if(!group)return;
      group.items.push({title:nameInput.value.trim().slice(0,40),url});
      try{await saveGroups();nameInput.value='';urlInput.value='';drawLinks();}
      catch(err){help.textContent='保存失败：'+err.message;}
    });
    function apply(next){
      config=next;
      page.style.setProperty('--clock',`${config.clockSize}px`);
      page.style.setProperty('--top',`${config.topOffset}px`);
      page.style.setProperty('--text',config.textColor);
      page.style.setProperty('--accent',config.accent);
      page.style.setProperty('--glass',String(config.glass/100));
      date.hidden=!config.showDate;form.hidden=!config.showSearch;navigation.hidden=!config.showNav;addForm.hidden=!config.showNav;
      heading.textContent=config.heading;
      customStyle.textContent=config.extraCss;
      if(config.alternateBg)api.background.set('assets/aurora.png');else api.background.reset();
      drawClock();
    }
    drawLinks();apply(config);
    api.settings.onChange(apply);
  }
};
