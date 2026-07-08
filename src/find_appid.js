import puppeteer from 'puppeteer';
import { CONFIG } from './config.js';
import { loadCookies, sleep } from './utils.js';

const b = await puppeteer.launch({
  executablePath: CONFIG.CHROME_PATH, headless: false,
  defaultViewport: null, args: ['--no-sandbox', '--start-maximized'],
});

const p = await b.newPage();
await p.goto(CONFIG.MP_BASE_URL, { waitUntil: 'networkidle2' });
await loadCookies(p); await p.reload({ waitUntil: 'networkidle2' }); await sleep(3000);

// 直接导航到开发接口管理页面
await p.goto('https://mp.weixin.qq.com/advanced/advanced?action=dev&t=advanced/dev&lang=zh_CN', { waitUntil: 'networkidle2' });
await sleep(3000);
console.log('URL:', p.url().substring(0, 100));

// 搜索页面HTML中的所有 wx 开头的字符串
const html = await p.content();
const wxIds = html.match(/wx[a-z0-9]{16,18}/gi) || [];
const unique = [...new Set(wxIds)].filter(id => !id.includes('_') && id.length >= 16);

console.log('\n页面中找到的 wx AppID:');
unique.forEach(id => console.log('  ' + id));

// 也搜一下 AppSecret 相关
const hasSecret = await p.evaluate(() => {
  const text = document.body?.textContent || '';
  return {
    hasAppID: text.includes('AppID') || text.includes('appid') || text.includes('开发者ID'),
    hasSecret: text.includes('AppSecret') || text.includes('appsecret') || text.includes('开发者密码'),
    appidNearby: text.match(/.{0,30}(AppID|开发者ID).{0,30}/gi),
  };
});
console.log('\n页面上有:', JSON.stringify(hasSecret, null, 2));

// 截图
await p.screenshot({ path: 'dev_page.png' });
console.log('\n截图: dev_page.png');
console.log('浏览器保持打开 30s...');
await sleep(30000);
await b.close();
