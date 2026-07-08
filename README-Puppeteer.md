# 🤖 微信公众号 Puppeteer 发布模式（备用）

> 基于 Puppeteer 浏览器自动化，模拟人工操作 MP 后台。

## 原理

```
启动 headless Chrome → Cookie登录 → 打开编辑器 → CDP注入标题
→ execCommand注入正文 → 封面上传图库 → 三步确认 → 点击发表
```

## 前置条件

| 条件 | 说明 |
|------|------|
| Google Chrome | 需已安装 |
| cookies.json | 首次 `npm run login` 扫码生成 |
| Node.js ≥ 18 | |

## 首次登录

```bash
npm run login
# Chrome 窗口打开 → 手机微信扫码 → Cookie 自动保存
```

## 使用

```bash
# 默认 headless 后台（无弹窗）
npm run publish:puppeteer "001-每天喝8杯水是错的"

# 可见窗口（调试用）
node src/publish_puppeteer.js "001-xxx" --show
```

## 执行流程（9步全自动）

```
 1. Cookie 登录          → isLoggedIn() 检测
 2. 打开编辑器             → click('.new-creation__menu-item')
 3. 标题注入              → 标题 ProseMirror + CDP Input.insertText
 4. 作者注入              → nativeSetter 绕过 Vue 响应式
 5. 正文注入              → body ProseMirror + execCommand insertHTML
 6. 封面上传图库           → input[type="file"].uploadFile()
 7. 封面三步确认           → js_imagedialog → 选图 → 确定 → 下一步 → 确认
 8. 点击发表              → el.click()
 9. 等待保存              → 关闭浏览器
```

## 关键技术发现

| 问题 | 解决方案 |
|------|---------|
| 页面有**两个 ProseMirror**（标题+正文） | 标题用 `[data-placeholder="请在这里输入标题"]`<br>正文用 `.rich_media_content .ProseMirror` |
| Vue 输入框 `.value=` 无效 | 用 `nativeSetter` 绕过 Vue 响应式 |
| `dispatchEvent(MouseEvent)` 不触发 Vue 事件 | 改用原生 `el.click()` |
| headless 模式 `insertHTML` 不生效 | 必须 `headless: false`，窗口可移到屏幕外 |
| 封面选择器不是原生 file input | 点 `js_imagedialog` → 图片库 → 三步确认 |

## 局限

- 需要 Chrome 浏览器（约 15 秒启动）
- 受 MP 后台 UI 改动影响（选择器可能失效）
- 封面依赖图片库已有图片
- 无法跨平台自动化（依赖 Chrome 路径配置）
- 最终发表仍需手动确认
