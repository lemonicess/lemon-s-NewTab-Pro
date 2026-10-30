window.LemonPlugin = {
  mount(root) {
    const box=document.createElement('div');
    box.style.cssText='padding:24px;border-radius:16px;background:#17192fdb;color:white;text-align:center';
    const title=document.createElement('h2');title.textContent='我的第一个插件';
    const count=document.createElement('p');count.textContent='点击次数：0';
    const button=document.createElement('button');button.textContent='点我 +1';
    let n=0;button.addEventListener('click',()=>{count.textContent=`点击次数：${++n}`;});
    box.append(title,count,button);root.append(box);
  }
};
