# 微信公众号「对话即发布」工具

> 两套发布方案：🚀 API 直推草稿（推荐） | 🤖 Puppeteer 浏览器自动化（备用）

## 快速开始

```bash
git clone https://github.com/lgd970/wechat-passage.git
cd wechat-passage
npm install
PUPPETEER_SKIP_DOWNLOAD=true npm install puppeteer
```

### 配置

编辑 `.env`：
```env
WECHAT_APPID=wx2de4bc540ba157f7
WECHAT_APPSECRET=你的AppSecret
WECHAT_DEFAULT_AUTHOR=SpongebobSquarepants
```

> ⚠️ 需在 MP 后台「设置与开发 → 基本配置 → IP白名单」添加你的公网 IP

### 发布文章

```bash
# 🚀 API 模式（推荐：3秒，无浏览器）
npm run publish "020-蓝色为什么最受欢迎"

# 🤖 Puppeteer 模式（备用：15秒，需浏览器）
npm run publish:puppeteer "020-蓝色为什么最受欢迎"
```

## 两套方案对比

| | 🚀 API 模式 | 🤖 Puppeteer 模式 |
|------|------|------|
| **脚本** | `src/api_publish.js` | `src/publish_puppeteer.js` |
| **原理** | 微信官方 draft/add 接口 | Puppeteer 浏览器自动化 |
| **速度** | ~3 秒 | ~15 秒 |
| **浏览器** | 不需要 | 需要 (headless) |
| **图片** | 自动下载 → 上传微信 CDN | 外部 URL 或手动上传 |
| **依赖** | AppID + AppSecret + IP白名单 | cookies.json |
| **稳定性** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ |

## 文章文件夹结构

```
articles/
└── 020-蓝色为什么最受欢迎/
    ├── content.html    # 正文 HTML
    ├── meta.json       # {"title":"...","author":"...","credit":"Sponge × DeepSeek","cover":"images/xx.jpg"}
    └── images/         # 至少 3 张配图
```

### content.html 格式规范

```html
<p style="text-indent:2em;">正文段落（左对齐 + 首行缩进2字符）</p>
<h2>小标题</h2>
<blockquote style="background:#f8f9fa;padding:12px;margin:10px 0;border-left:3px solid #3498db;">
  <p style="margin:0;text-indent:2em;">引用内容</p>
</blockquote>
<img src="https://images.pexels.com/xxx.jpeg?w=800" style="width:100%;margin:15px 0;" />
<!-- ⚠️ 严禁 <table>（微信乱码） -->
```

## API 发布流程

```
获取 access_token（缓存2小时）
    ↓
上传封面图 → thumb_media_id
    ↓
下载正文图片 → 上传微信 CDN → 替换 URL
    ↓
调用 draft/add → 草稿箱 ✅
```

## 项目结构

```
wechat-passage/
├── src/
│   ├── api_publish.js          # 🚀 API 发布（推荐）
│   ├── publish_puppeteer.js    # 🤖 Puppeteer 发布（备用）
│   ├── login.js                # 扫码登录
│   ├── config.js               # 全局配置
│   └── utils.js                # 工具函数
├── articles/                   # 文章存档（20篇）
├── .env                        # 密钥配置
├── cookies.json                # MP 后台登录态
└── .token_cache.json           # API token 缓存
```

## 环境要求

- Node.js ≥ 18
- Google Chrome（Puppeteer 模式需要）
- 微信公众平台 AppID + AppSecret

## 详细文档

| 版本 | 文档 |
|------|------|
| 🚀 API 模式 | [README-API.md](README-API.md) |
| 🤖 Puppeteer 模式 | [README-Puppeteer.md](README-Puppeteer.md) |

## 优劣对比

| 维度 | 🚀 API | 🤖 Puppeteer |
|------|--------|-------------|
| **速度** | ⭐⭐⭐⭐⭐ ~3秒 | ⭐⭐⭐ ~15秒 |
| **可靠性** | ⭐⭐⭐⭐⭐ 官方接口 | ⭐⭐⭐ UI 可能变动 |
| **图片处理** | ⭐⭐⭐⭐⭐ 自动上传 CDN | ⭐⭐ 外部 URL 不稳定 |
| **部署难度** | ⭐⭐⭐⭐ 需 AppID+白名单 | ⭐⭐⭐⭐⭐ 只需 Chrome |
| **跨平台** | ⭐⭐⭐⭐⭐ 纯 HTTP | ⭐⭐⭐ 需配置 Chrome 路径 |
| **维护成本** | ⭐⭐⭐⭐⭐ 低 | ⭐⭐⭐ 中 |
| **最终发表** | 手动确认 | 手动确认 |
| **推荐场景** | 日常使用 | 备用/调试 |

> **结论：日常用 API，Puppeteer 留着当备用。** 两者最终都需要手动点发表（微信限制）。

## License

MIT

## 公众号

**SpongebobSquarepants**

Sponge × DeepSeek
