#!/usr/bin/env node
/**
 * 全自动写作+发布总指挥
 * 用法: node --env-file=.env src/auto.js
 */
import readline from 'node:readline';
import fs from 'node:fs/promises';
import path from 'node:path';
import { execSync } from 'node:child_process';

const DEEPSEEK_KEY = process.env.DEEPSEEK_API_KEY;
const UNSPLASH_KEY = process.env.UNSPLASH_ACCESS_KEY;
const ARTICLES_DIR = path.resolve('articles');

if (!DEEPSEEK_KEY) {
  console.log('❌ 请先配置 DEEPSEEK_API_KEY 到 .env 文件');
  process.exit(1);
}

// ── System Prompt ──
const SYSTEM_PROMPT = `你是一个专业公众号写手。根据用户选题自动判断类型并匹配风格：
- 科普类：反常识切入，研究引用支撑，娓娓道来
- 办公/教程类：步骤清晰，实操导向，看完就能用
- 生活/美食类：接地气，有个人经验和具体细节
- 观点/评论类：逻辑严密，论据充分，有独立见解

通用规则：
- 每段不超过3行，首行缩进 style="text-indent:2em"
- 用「你」不用「人们」，像朋友聊天
- 严禁AI腔：「值得注意的是」「综上所述」「从某种程度上来说」
- 至少引用2个研究/数据来源

返回格式：
<title>文章标题（≤25字）</title>
<keywords>英文,关键词,用逗号分隔,3到5个</keywords>
<content>
（完整HTML，公众号兼容：内联style，可用table/色块/图片，图片src用关键词描述即可）
</content>`;

// ── 交互 ──
const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
function ask(q) { return new Promise(r => rl.question(q, r)); }

async function main() {
  console.log('\n🤖 微信公众号 AI 写作助手\n');

  // ① 选题
  const topic = await ask('请输入选题（任何领域均可）：\n> ');
  if (!topic.trim()) { console.log('已取消'); process.exit(0); }
  console.log(`\n📝 选题: ${topic}`);

  // ②③ 调 DeepSeek 写作
  console.log('✍️  AI 写作中...');
  const aiResponse = await callDeepSeek(topic);
  const title = extractTag(aiResponse, 'title') || topic;
  const keywords = extractTag(aiResponse, 'keywords') || 'article,writing';
  const html = extractTag(aiResponse, 'content') || wrapDefault(topic);

  console.log(`   标题: ${title}`);

  // ④ 配图
  console.log('🖼️  下载配图...');
  const imageDir = await downloadImages(keywords);

  // ⑤ 组装
  const issueNumber = await getNextIssue();
  const folderName = `${String(issueNumber).padStart(3, '0')}-${safeName(title)}`;
  const folderPath = path.join(ARTICLES_DIR, folderName);

  await fs.mkdir(path.join(folderPath, 'images'), { recursive: true });

  // 移动图片
  const images = await fs.readdir(imageDir);
  for (let i = 0; i < Math.min(images.length, 5); i++) {
    await fs.copyFile(
      path.join(imageDir, images[i]),
      path.join(folderPath, 'images', `${String(i + 1).padStart(2, '0')}.jpg`)
    );
  }

  // 写 content.html
  const finalHtml = html
    .replace(/src="[^"]*"/g, (_, i) => {
      const imgNum = Math.min(Math.floor(i / 600) + 1, images.length);
      return `src="https://images.unsplash.com/placeholder?w=800"`;
    })
    .replace('第 X 期', `第 ${issueNumber} 期`);

  await fs.writeFile(path.join(folderPath, 'content.html'), finalHtml);

  // 写 meta.json
  const meta = {
    title,
    author: '反常识研究所',
    credit: 'Sponge × DeepSeek',
    cover: 'images/01.jpg',
  };
  await fs.writeFile(path.join(folderPath, 'meta.json'), JSON.stringify(meta, null, 2));

  console.log(`📦 已组装: ${folderName}`);

  // ⑥ 发布
  console.log('🚀 推送到草稿箱...');
  try {
    execSync(`node --env-file=.env src/api_publish.js "${folderName}"`, {
      cwd: path.resolve('..'),
      stdio: 'inherit',
    });
  } catch (e) {
    console.log(`⚠️  自动发布失败，请手动运行: npm run publish "${folderName}"`);
  }

  // ⑦ 通知
  console.log(`\n✅ 第 ${issueNumber} 期「${title}」已就绪！`);
  console.log('📱 请打开订阅号助手App确认发表\n');

  rl.close();
}

// ── DeepSeek API ──
async function callDeepSeek(topic) {
  const res = await fetch('https://api.deepseek.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${DEEPSEEK_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'deepseek-chat',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: `选题：${topic}\n请生成一篇适合微信公众号发布的文章。` },
      ],
      temperature: 0.8,
      max_tokens: 4096,
    }),
  });
  const data = await res.json();
  return data.choices?.[0]?.message?.content || '';
}

// ── Unsplash 搜图 ──
async function downloadImages(keywords) {
  const tmpDir = path.join(ARTICLES_DIR, '.tmp_images');
  await fs.mkdir(tmpDir, { recursive: true });

  const kw = keywords.split(',')[0].trim();
  let downloaded = 0;

  if (UNSPLASH_KEY) {
    try {
      const res = await fetch(
        `https://api.unsplash.com/search/photos?query=${encodeURIComponent(kw)}&per_page=5`,
        { headers: { Authorization: `Client-ID ${UNSPLASH_KEY}` } }
      );
      const data = await res.json();
      for (const photo of (data.results || [])) {
        const imgRes = await fetch(photo.urls.regular);
        const buf = Buffer.from(await imgRes.arrayBuffer());
        downloaded++;
        await fs.writeFile(path.join(tmpDir, `${String(downloaded).padStart(2, '0')}.jpg`), buf);
      }
    } catch (e) { /* 失败继续 */ }
  }

  // 兜底：如果 Unsplash 失败或没配 key，创建占位文件标记
  if (downloaded === 0) {
    console.log('   ⚠️  未配置 UNSPLASH_ACCESS_KEY，跳过配图');
    for (let i = 1; i <= 3; i++) {
      await fs.writeFile(path.join(tmpDir, `${String(i).padStart(2, '0')}.jpg`), Buffer.alloc(0));
    }
  } else {
    console.log(`   ✅ 下载 ${downloaded} 张图片`);
  }

  return tmpDir;
}

// ── 工具 ──
function extractTag(text, tag) {
  const re = new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`, 'i');
  return text.match(re)?.[1]?.trim();
}

async function getNextIssue() {
  try {
    const dirs = await fs.readdir(ARTICLES_DIR);
    const nums = dirs.map(d => parseInt(d)).filter(n => !isNaN(n));
    return Math.max(0, ...nums) + 1;
  } catch { return 1; }
}

function safeName(title) {
  return title.replace(/[<>:"/\\|?*]/g, '').substring(0, 40);
}

function wrapDefault(topic) {
  return `<section style="text-align:center;color:#999;font-size:14px;margin-bottom:20px;">—— 第 X 期 ——</section>\n<p style="text-indent:2em;">关于「${topic}」的文章内容。</p>`;
}

main();
