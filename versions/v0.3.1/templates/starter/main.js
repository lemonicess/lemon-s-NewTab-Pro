// lemon's NewTab Pro v0.3.1 - 不需要 npm、Node.js 或构建工具。
Lemon.mount((root, api) => {
  root.innerHTML = `
    <style>
      * { box-sizing: border-box; }
      body { margin: 0; font: 16px system-ui; color: #fff; }
      .panel { min-height: 220px; display: grid; place-items: center;
        border-radius: 18px; background: #17192fdb; padding: 24px; text-align: center; }
      button { border: 0; border-radius: 9px; padding: 10px 18px;
        background: #b49aff; color: #20182b; cursor: pointer; }
    </style>
    <div class="panel">
      <div><h2>我的第一个插件</h2><p id="counter">点击次数：0</p><button id="add">点我 +1</button></div>
    </div>`;
  let count = 0;
  root.querySelector('#add').addEventListener('click', () => {
    root.querySelector('#counter').textContent = `点击次数：${++count}`;
  });
});
