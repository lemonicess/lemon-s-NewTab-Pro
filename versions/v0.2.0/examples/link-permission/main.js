'use strict';
window.LemonPlugin={mount(root,api){
  const style=document.createElement('style');style.textContent=`
    .lp-title{font-size:17px;font-weight:700;margin-bottom:8px}.lp-note{color:#bab1cb;font-size:12px;margin-bottom:14px}
    .lp-links{display:flex;flex-wrap:wrap;gap:8px}.lp-btn{border:1px solid #ffffff36;background:#ffffff14;color:white;border-radius:10px;padding:10px 14px}
    .lp-status{min-height:38px;color:#a9a1c1;font-size:12px;margin-top:16px;overflow-wrap:anywhere}`;
  const title=document.createElement('div');title.className='lp-title';title.textContent='URL 权限门控测试';
  const note=document.createElement('div');note.className='lp-note';note.textContent='插件请求打开外部网址，宿主应该弹出首次站点确认。';
  const buttons=document.createElement('div');buttons.className='lp-links';const status=document.createElement('div');status.className='lp-status';
  for(const [text,url] of [['打开 GitHub','https://github.com/'],['打开 MDN','https://developer.mozilla.org/'],['测试非法协议','javascript:alert(1)']]){
    const b=document.createElement('button');b.className='lp-btn';b.textContent=text;b.addEventListener('click',()=>{const accepted=api.open(url);status.textContent=accepted?`已提交打开请求：${url}（宿主仍可能拒绝）`:`已被插件 API 拒绝：${url}`;});buttons.append(b);}
  root.append(style,title,note,buttons,status);
}};
