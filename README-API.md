# 🚀 微信公众号 API 发布模式（推荐）

> 基于微信官方 `draft/add` 接口，3 秒直推草稿箱，无需浏览器。

## 原理

```
获取 access_token → 上传封面 → 下载正文图片 → 上传微信CDN → draft/add → 草稿箱
```

## 前置条件

| 条件 | 说明 |
|------|------|
| AppID + AppSecret | MP 后台 → 设置与开发 → 基本配置 |
| IP 白名单 | 添加你电脑的公网 IP（`curl ifconfig.me`） |
| Node.js ≥ 18 | 支持原生 fetch + FormData |

## 配置

编辑 `.env`：

```env
WECHAT_APPID=wx2de4bc540ba157f7
WECHAT_APPSECRET=你的AppSecret
WECHAT_DEFAULT_AUTHOR=SpongebobSquarepants
```

## 使用

```bash
# 单篇发布
npm run publish "020-蓝色为什么最受欢迎"

# 批量发布
for d in articles/012-*; do
  npm run publish "$(basename "$d")"
done
```

## 执行流程

```
$ npm run publish "020-蓝色为什么最受欢迎"

🔑 获取 access_token...
✅ token 就绪
🖼️  上传封面...
✅ 封面: 9Fs9mvKSSf...
📷 上传正文图片 (2 张)...
  下载: https://images.pexels.com/...  ← 从 Pexels 下载
  ✅ http://mmbiz.qpic.cn/...            ← 上传到微信 CDN，替换 URL
📝 创建草稿...
✅ 草稿已创建！
   📋 后台: https://mp.weixin.qq.com → 草稿箱
```

## 关键实现

| 步骤 | API | 说明 |
|------|-----|------|
| 获取 token | `cgi-bin/token` | 缓存 2 小时 |
| 封面上传 | `material/add_material` | 永久素材 |
| 正文图片上传 | `media/uploadimg` | 返回 `mmbiz.qpic.cn` URL |
| 创建草稿 | `draft/add` | 一次调用完成 |

## HTML 能力（API 模式 vs Puppeteer 模式）

| 元素 | Puppeteer | API |
|------|-----------|-----|
| `<table>` 表格 | ❌ 被 ProseMirror 净化 | ✅ 完整保留 |
| 彩色背景 `background` | ❌ | ✅ |
| 渐变色 `linear-gradient` | ❌ | ✅ |
| Flex 布局 | ❌ | ✅ |
| `<blockquote>` 多样化 | ⚠️ 有限 | ✅ |
| 图片 | 外部 URL（可能不显示） | 自动下载→上传微信 CDN |

> **API 模式下，所有标准 HTML/CSS（内联style）均可使用。** 仍然不支持外链 CSS、JavaScript、iframe。

## 局限

- 需 AppID + AppSecret（个人订阅号需去开放平台获取）
- 需配置 IP 白名单（换网络需重新添加）
- 作者名不能超过 8 个字符（微信号限制）
- 无法自动发布（需手动在后台/订阅号助手点「发表」）
- 图片需逐张下载再上传，多图文章稍慢
