# lemon's NewTab Pro v0.2.0 — 测试指南

本版含 **18 个可选示例插件**，默认 `plugins/registry.json` 中 `plugins: []`，不会在首次启动时自动安装或启用任何功能插件。

## 建议逐步安装（不要一开始就运行 --all）

```bash
node scripts/install-examples.mjs hello-plugin
node scripts/install-examples.mjs settings-showcase
node scripts/install-examples.mjs classic-home
```

安装或修改插件后重新加载 Chrome 扩展。`classic-home` 默认禁用，需在插件管理器中手动启用以测试全屏首页。

## v0.2.0 重点验收

1. 默认状态：背景 + 右上角插件管理按钮，不出现内置时钟/搜索/导航。
2. `settings-showcase` → 插件管理 → 设置：检查全部 8 种类型控件、保存即时变化、刷新后保留值、恢复默认。
3. `settings-showcase` 的计数按钮：点几次，关闭新标签页再打开，确认存储值保留。
4. `classic-home`：单独启用它并禁用其他覆盖层插件；检查全屏时钟、搜索、卡片增删、设置变化和插件图片背景。
5. `classic-home`：设置 `alternateBg` 为开/关，观察背景；禁用插件后应该恢复原默认背景。
6. `hello-plugin`：只用 plugin.json + main.js 能启动。
7. 回归：旧版示例 clock/search 等仍能启动；打开外链仍需宿主确认。
8. 安全：恶意 URL、缺失能力、非法设置类型应被拒绝；跨插件存储访问不允许。

## 自动化检查

```bash
node --test tests/*.test.mjs
node scripts/build-registry.mjs
```

自动化测试无法替代真实 Chrome MV3 安装和跨源沙箱运行验证。若出现异常，打开 Chrome 新标签页，按 F12 在 Console 中查看报错，并在 `chrome://extensions` 检查扩展错误。

## 可选插件目录

原有示例（15 个）：calculator、calendar、clock、countdown、dice、layout-probe、link-permission、links、palette、pomodoro、search、text-tools、todo、welcome、world-clock。

v0.2.0 新增（3 个）：`hello-plugin`、`settings-showcase`、`classic-home`。
