#!/usr/bin/env node
/**
 * 微信公众号 API 发布（完整版：含正文图片上传）
 * 用法: node --env-file=.env src/api_publish.js "001-xxx"
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';

const APPID = process.env.WECHAT_APPID;
const APPSECRET = process.env.WECHAT_APPSECRET;
const FOLDER = process.argv[2];
if (!FOLDER) { console.log('用法: node --env-file=.env src/api_publish.js "001-xxx"'); process.exit(1); }

const dir = path.resolve('articles', FOLDER);
const meta = JSON.parse(await fs.readFile(path.join(dir, 'meta.json'), 'utf-8'));
let html = await fs.readFile(path.join(dir, 'content.html'), 'utf-8');

// ── Token 缓存 ──
const TOKEN_CACHE = path.join(dir, '..', '.token_cache.json');
async function getAccessToken() {
  try {
    const cache = JSON.parse(await fs.readFile(TOKEN_CACHE, 'utf-8'));
    if (cache.expires > Date.now() + 60000) return cache.token;
  } catch {}
  console.log('🔑 获取 access_token...');
  const res = await fetch(`https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid=${APPID}&secret=${APPSECRET}`);
  const data = await res.json();
  if (data.errcode) throw new Error(`Token失败: ${JSON.stringify(data)}`);
  await fs.writeFile(TOKEN_CACHE, JSON.stringify({ token: data.access_token, expires: Date.now() + data.expires_in * 1000 }));
  return data.access_token;
}

const token = await getAccessToken();
console.log('✅ token 就绪');

// ── 封面上传 ──
let thumbMediaId = '';
if (meta.cover) {
  console.log('🖼️  上传封面...');
  thumbMediaId = await uploadImage(path.join(dir, meta.cover), token);
  console.log(`✅ 封面: ${thumbMediaId.substring(0, 10)}...`);
}

// ── 正文图片上传 + 替换 URL ──
const imgRegex = /<img[^>]+src="([^"]+)"/gi;
const imgMatches = [...html.matchAll(imgRegex)];
if (imgMatches.length > 0) {
  console.log(`📷 上传正文图片 (${imgMatches.length} 张)...`);
  for (const match of imgMatches) {
    const originalUrl = match[1];
    console.log(`  下载: ${originalUrl.substring(0, 60)}...`);
    try {
      // 下载图片
      const imgRes = await fetch(originalUrl);
      const imgBuffer = Buffer.from(await imgRes.arrayBuffer());

      // 上传到微信 CDN
      const wxUrl = await uploadBodyImage(imgBuffer, token);
      // 替换 URL
      html = html.replace(originalUrl, wxUrl);
      console.log(`  ✅ ${wxUrl.substring(0, 50)}...`);
    } catch (e) {
      console.log(`  ⚠️  跳过: ${e.message}`);
    }
  }
}

// ── 创建草稿 ──
console.log('📝 创建草稿...');
const draftRes = await fetch(
  `https://api.weixin.qq.com/cgi-bin/draft/add?access_token=${token}`,
  {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      articles: [{
        title: meta.title,
        author: meta.author || '反常识研究所',
        digest: html.replace(/<[^>]*>/g, '').substring(0, 120).trim(),
        content: html,
        content_source_url: '',
        thumb_media_id: thumbMediaId,
        need_open_comment: 0,
        only_fans_can_comment: 0,
      }],
    }),
  }
);
const draftData = await draftRes.json();

if (draftData.media_id) {
  console.log(`✅ 草稿已创建！`);
  console.log(`   📋 后台: https://mp.weixin.qq.com → 草稿箱`);
} else {
  console.error('❌ 失败:', draftData);
}

// ── 辅助函数 ──
async function uploadImage(filePath, token) {
  const bytes = await fs.readFile(filePath);
  const boundary = '----' + createHash('md5').update(String(Math.random())).digest('hex');
  const header = `--${boundary}\r\nContent-Disposition: form-data; name="media"; filename="${path.basename(filePath)}"\r\nContent-Type: image/jpeg\r\n\r\n`;
  const footer = `\r\n--${boundary}--\r\n`;
  const headerBytes = new TextEncoder().encode(header);
  const footerBytes = new TextEncoder().encode(footer);
  const body = new Uint8Array(headerBytes.length + bytes.length + footerBytes.length);
  body.set(headerBytes); body.set(bytes, headerBytes.length); body.set(footerBytes, headerBytes.length + bytes.length);

  const res = await fetch(
    `https://api.weixin.qq.com/cgi-bin/material/add_material?access_token=${token}&type=image`,
    { method: 'POST', headers: { 'Content-Type': `multipart/form-data; boundary=${boundary}` }, body }
  );
  const data = await res.json();
  if (!data.media_id) throw new Error(JSON.stringify(data));
  return data.media_id;
}

async function uploadBodyImage(buffer, token) {
  // 正文图片用 media/uploadimg（返回 CDN URL）
  const boundary = '----' + createHash('md5').update(String(Math.random())).digest('hex');
  const header = `--${boundary}\r\nContent-Disposition: form-data; name="media"; filename="img.jpg"\r\nContent-Type: image/jpeg\r\n\r\n`;
  const footer = `\r\n--${boundary}--\r\n`;
  const headerBytes = new TextEncoder().encode(header);
  const footerBytes = new TextEncoder().encode(footer);
  const body = new Uint8Array(headerBytes.length + buffer.length + footerBytes.length);
  body.set(headerBytes); body.set(buffer, headerBytes.length); body.set(footerBytes, headerBytes.length + buffer.length);

  const res = await fetch(
    `https://api.weixin.qq.com/cgi-bin/media/uploadimg?access_token=${token}`,
    { method: 'POST', headers: { 'Content-Type': `multipart/form-data; boundary=${boundary}` }, body }
  );
  const data = await res.json();
  if (!data.url) throw new Error(JSON.stringify(data));
  return data.url;
}
