# 可选插件测试

不用 Node.js：打开新标签页 → 插件管理 → “官方示例” → 选择并安装。

当前 `examples/` 含 19 个离线示例，默认不安装、也不启用。推荐首先试 `starter-card`、`settings-showcase`、`classic-home`，分别检查：简单 DOM 卡片、声明式设置和整屏主页。测试时请先单独启用经典主页，避免挡住其他卡片。

维护者如已安装 Node.js，可选执行 `node --test tests/*.test.mjs` 进行源码回归测试。**这不是扩展的运行要求。**
