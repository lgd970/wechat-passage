# 微信公众号「对话即发布」工具

> 基于 Puppeteer 的微信公众号全自动发布脚本。从选题研究到文章发布，全程 headless 后台运行。

## 功能

- **一键发布**：`node src/publish.js "001-文章名"` 全自动完成登录→标题→正文→封面→发表
- **headless 后台模式**：无浏览器弹窗，静默运行
- **Cookie 持久化**：首次扫码登录后，长期免登录
- **富文本正文注入**：CDP + execCommand 双通道，支持图片嵌入
- **封面自动选择**：上传到微信图库 → 三步确认（确定→下一步→确认）
- **文章文件夹管理**：每篇文章独立文件夹，HTML 正文 + JSON 元数据 + 图片

## 快速开始

### 环境要求

- Node.js ≥ 18
- Google Chrome（已安装）
- Windows / macOS / Linux

### 安装

```bash
git clone https://github.com/lgd970/wechat-passage.git
cd wechat-passage
npm install
PUPPETEER_SKIP_DOWNLOAD=true npm install puppeteer  # 跳过 Chromium 下载，使用本地 Chrome
```

编辑 `src/config.js`，设置本地 Chrome 路径：

```js
CHROME_PATH: 'C:/Program Files/Google/Chrome/Application/chrome.exe', // Windows
// CHROME_PATH: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', // macOS
```

### 首次登录

```bash
npm run login
```

Chrome 窗口打开 → 手机微信扫码 → Cookie 自动保存到 `cookies.json`。

### 发布文章

```bash
# 默认 headless 后台模式（无弹窗）
node src/publish.js "001-每天喝8杯水是错的"

# 可见窗口模式（调试用）
node src/publish.js "001-每天喝8杯水是错的" --show
```

## 文章文件夹结构

```
articles/
└── 001-每天喝8杯水是错的/
    ├── content.html    # 文章正文 HTML（微信兼容格式）
    ├── meta.json       # {"title":"...","author":"...","credit":"...","cover":"images/xx.jpg"}
    └── images/
        ├── 01_cover.jpg
        └── ...
```

### content.html 写作规范

```html
<!-- 正文段落：左对齐 + 首行缩进2字符 -->
<p style="text-indent:2em;">段落内容</p>

<!-- 小标题 -->
<h2>标题文字</h2>

<!-- 引用块 -->
<blockquote style="background:#f8f9fa;padding:12px;margin:10px 0;border-left:3px solid #3498db;">
  <p style="margin:0;text-indent:2em;">引用内容</p>
</blockquote>

<!-- ⚠️ 严禁使用 <table> 标签（微信会乱码） -->

<!-- 图片 -->
<img src="https://images.pexels.com/xxx.jpeg?w=800" alt="" style="width:100%;margin:15px 0;" />

<!-- 结尾 -->
<section style="font-size:12px;color:#999;">
  <p><strong>参考资料</strong></p>
  <p>...</p>
</section>
```

### meta.json

```json
{
  "title": "文章标题（发布时显示）",
  "author": "反常识研究所",
  "credit": "Sponge × DeepSeek",
  "cover": "images/01_cover.jpg"
}
```

## 项目结构

```
wechat-passage/
├── src/
│   ├── publish.js       # 发布主脚本（核心）
│   ├── login.js         # 扫码登录 + Cookie 保存
│   ├── config.js        # 全局配置
│   └── utils.js         # Cookie 管理、日志、DOM 辅助
├── articles/            # 文章存档
│   ├── 001-xxx/
│   ├── 002-xxx/
│   └── ...
├── .env                 # 环境变量（gitignore）
├── cookies.json         # 微信登录态（gitignore）
├── package.json
└── README.md
```

## 发布流程（9步全自动）

```
 1. Cookie 登录         → isLoggedIn() 检测
 2. 打开编辑器            → click('.new-creation__menu-item') + 新标签页检测
 3. 标题注入             → 标题 ProseMirror + CDP Input.insertText
 4. 作者注入             → nativeSetter 绕过 Vue 响应式
 5. 正文注入             → .rich_media_content ProseMirror + execCommand insertHTML
 6. 封面上传             → body file input → 图片库
 7. 封面三步确认          → js_imagedialog → 选图 → 确定 → 下一步 → 确认
 8. 点击发表             → el.click() 原生点击
 9. 等待保存 → 关闭浏览器
```

## 关键技术点

### 两个 ProseMirror
- **标题 PM**：`[data-placeholder="请在这里输入标题"]` → CDP insertText
- **正文 PM**：`.rich_media_content .ProseMirror` → execCommand insertHTML

### Vue 输入框绕过
```js
const ns = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(el), 'value')?.set;
if (ns) ns.call(el, value);  // 绕过 Vue getter/setter
el.dispatchEvent(new Event('input', { bubbles: true }));
```

### 封面三步
```js
// 1) 上传到图库
input[type="file"].uploadFile(coverPath)
// 2) 点可见 js_imagedialog → 选第一张图
// 3) 确定 → 下一步 → 确认
```

### 绿色发表按钮
```js
button.weui-desktop-btn_primary  // rgb(6, 173, 86)
```

## 自动化率

| 步骤 | 方式 |
|------|------|
| 选题 | 🤖 AI 对话 |
| 研究 | 🤖 WebSearch |
| 写作 | 🤖 AI 生成 |
| 配图 | 🤖 Pexels 下载 |
| 标题/作者/正文/封面 | 🤖 Puppeteer |
| 发表按钮 | 🤖 Puppeteer |
| 确认弹窗 | 👆 手动（微信强制） |
| 扫码验证 | 👆 手动（微信强制） |

**自动化率 ≈ 90%**。剩余两步是微信的安全机制，认证后可走官方 API 实现全自动。

## License

MIT

## Credits

**Sponge × DeepSeek**

微信公众号：反常识研究所
