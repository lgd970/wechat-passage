/**
 * 微信公众号自动发布
 * 自动：登录→填标题→填作者→填正文→封面→点击发表
 * 手动：确认弹窗你点绿色发表按钮
 */
import puppeteer from 'puppeteer';
import fs from 'node:fs/promises';
import path from 'node:path';
import { CONFIG } from './config.js';
import { loadCookies, isLoggedIn, sleep } from './utils.js';

const FOLDER = process.argv[2];
if (!FOLDER) { console.log('用法: node src/publish.js "001-xxx"'); process.exit(1); }

const dir = path.resolve('articles', FOLDER);
const meta = JSON.parse(await fs.readFile(path.join(dir, 'meta.json'), 'utf-8'));
const html = await fs.readFile(path.join(dir, 'content.html'), 'utf-8');

console.log(`📰 ${meta.title}`);

const browser = await puppeteer.launch({
  executablePath: CONFIG.CHROME_PATH,
  headless: true,
  defaultViewport: { width: 1440, height: 900 },
  protocolTimeout: 120000,
  args: ['--no-sandbox', '--disable-gpu'],
});

const page = await browser.newPage();
const existingTabs = new Set(await browser.pages());

try {
  // ── 登录 ──
  await page.goto(CONFIG.MP_BASE_URL, { waitUntil: 'networkidle2' });
  await loadCookies(page); await page.reload({ waitUntil: 'networkidle2' }); await sleep(3000);
  if (!(await isLoggedIn(page))) { console.log('❌ 未登录'); process.exit(1); }
  console.log('✅ 登录');

  // ── 编辑器 ──
  await page.click('div.new-creation__menu-item'); await sleep(5000);
  let editor = page;
  for (const pg of await browser.pages()) {
    if (!existingTabs.has(pg) && pg.url().includes('appmsg_edit')) { editor = pg; break; }
  }
  await editor.bringToFront(); await sleep(5000);

  // ── 标题 ──
  const tp = await editor.$('.ProseMirror[data-placeholder="请在这里输入标题"]');
  if (tp) { const b = await tp.boundingBox(); if (b) await editor.mouse.click(b.x + 10, b.y + 10); await sleep(500); }
  await (await editor.createCDPSession()).send('Input.insertText', { text: meta.title });
  console.log('✅ 标题');

  // ── 作者 ──
  if (meta.author) await editor.evaluate((a) => {
    const el = document.querySelector('#author'); if (!el) return;
    const ns = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(el), 'value')?.set;
    if (ns) ns.call(el, a); else el.value = a;
    el.dispatchEvent(new Event('input', { bubbles: true }));
  }, meta.author);
  console.log('✅ 作者');

  // ── 正文（先注入，让微信自动上传图片到图库）──
  const bp = await editor.$('.rich_media_content .ProseMirror');
  if (bp) { const b = await bp.boundingBox(); if (b) await editor.mouse.click(b.x + 10, b.y + 10); await sleep(500); }
  await editor.evaluate((h) => {
    const pm = document.querySelector('.rich_media_content .ProseMirror');
    if (pm) { pm.focus(); document.execCommand('selectAll', false); document.execCommand('insertHTML', false, h); }
  }, html);
  // 等微信下载外部图片到图库（关键！封面选择需要用到）
  console.log('⏳ 等待图片上传到微信图库...');
  await sleep(8000);
  console.log('✅ 正文+图片');

  // ── 封面：先上传到图库，再三步选择 ──
  if (meta.cover) {
    const coverPath = path.resolve(dir, meta.cover);

    // 步骤A: 通过 body editor 的 file input 上传封面图片到微信图库
    try {
      const fis = await editor.$$('input[type="file"]');
      if (fis.length > 0) {
        await fis[0].uploadFile(coverPath);
        console.log('  封面已上传到图库');
        await sleep(5000);
      }
    } catch (e) { console.log('  ⚠️  图库上传跳过'); }

    // 步骤B: 打开图片库 → 选择刚上传的图 → 三步确认
    await editor.evaluate(() => { const a = document.querySelector('.setting-group__cover_area'); if (a) a.scrollIntoView({ block: 'center' }); });
    await sleep(500);
    await editor.evaluate(() => { document.querySelectorAll('.js_imagedialog').forEach(el => { if (el.offsetParent) el.click(); }); });
    await sleep(2500);
    // 选第一张（刚上传的在最前面）
    await editor.evaluate(() => {
      document.querySelector('.weui-desktop-img-picker__item:nth-child(1)')?.click();
    });
    await sleep(500);
    for (const t of ['确定', '下一步', '确认']) {
      await editor.evaluate((text) => { document.querySelectorAll('button, span').forEach(el => { if (el.textContent?.trim() === text && el.offsetParent) el.click(); }); }, t);
      await sleep(1500);
    }
    console.log('✅ 封面');
  }

  // ── 发表 ──
  await editor.evaluate(() => window.scrollTo(0, 99999)); await sleep(500);
  await editor.evaluate(() => { document.querySelectorAll('button').forEach(b => { if (b.textContent?.trim() === '发表' && b.offsetParent) b.click(); }); });
  console.log('✅ 已点击发表');

  console.log('✅ 已点击发表，等待保存...');
  await sleep(5000); // 等草稿保存完成

} catch (err) { console.error('❌', err.message); } finally { await browser.close(); }
