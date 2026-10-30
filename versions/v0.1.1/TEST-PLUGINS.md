# lemon's NewTab Pro — 测试插件验收清单

## 推荐体验顺序

1. **插件加载**：仅安装 `welcome`，验证卡片；再启用/禁用，刷新后确认开关状态仍然保存。
2. **计时器**：安装 `pomodoro`、`clock`、`world-clock`、`countdown`。开始番茄钟并切换标签页，回来时应根据真实经过时间更新；计时类示例刷新会重置。
3. **交互组件**：安装 `todo`，创建、完成和删除任务。输入含 `<script>` 字样的文本，应被当成普通文字显示。
4. **计算状态**：安装 `calculator`，检查 `7 + 3 = 10`、`5 ÷ 0 = 错误`、`C` 后恢复。
5. **本地数据与 UI**：安装 `calendar` 切换月份，安装 `palette` 随机生成配色，安装 `dice` 改变骰子个数，安装 `text-tools` 统计文本并执行转换。
6. **权限**：安装 `link-permission`，点击「打开 GitHub」应在宿主确认之后才尝试导航；拒绝应不打开；「测试非法协议」应直接拒绝，不执行 JavaScript URL。
7. **布局**：安装 `layout-probe`（span 12），改变 Chrome 窗口宽度；确认探针尺寸变化，其他插件在窄屏排列成单列。
8. **完全空载**：关闭全部插件后显示空状态；删除 `plugins/` 下已安装插件（保留 `.gitkeep`）、重新生成清单并重载扩展后应仍可正常进入空状态。

## 批量安装

```bash
node scripts/install-examples.mjs --all
```

可通过 `node scripts/install-examples.mjs --list` 列出所有示例，或按 ID 安装。安装同名插件会跳过，不会覆盖个人修改。安装完毕**必须**在 `chrome://extensions/` 重新加载扩展。

## 重要边界

- 插件源码都位于 `examples/<id>/main.js`，每个 `plugin.json` 都遵循当前 v1 协议；不可直接给 `main.js` 增加需要更高权限的扩展 API。
- 测试插件不联网、不获取浏览器私人数据；`search`、`links` 与 `link-permission` 只在点击后请求宿主打开外部 URL。
- 没有持久化插件存储接口，测试数据会在刷新和重新打开标签页后丢失。
- 沙箱 CSS 限制在各自 iframe 中；全局布局由宿主控制。
- 这些是用于验证插件架构的示例，不代表所有交互及视觉场景都已经过真实 Chrome 测试。
