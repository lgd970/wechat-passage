/**
 * 微信公众号发布工具 — 登录模块
 *
 * 用法: node src/login.js
 *
 * 流程:
 *   1. 启动 Chrome（有头模式，方便扫码）
 *   2. 打开 mp.weixin.qq.com
 *   3. 尝试加载本地 cookies，检测是否已登录
 *   4. 未登录则等待用户手机扫码
 *   5. 登录成功后保存 cookies 到本地
 */

import puppeteer from 'puppeteer';
import { CONFIG } from './config.js';
import { loadCookies, saveCookies, isLoggedIn, log, sleep } from './utils.js';

async function main() {
  log('🚀 启动浏览器...');
  const browser = await puppeteer.launch({
    executablePath: CONFIG.CHROME_PATH, // 使用本地 Chrome
    headless: false, // 登录必须可见，方便扫码
    defaultViewport: { width: 1280, height: 800 },
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-blink-features=AutomationControlled', // 隐藏自动化标志
    ],
  });

  const page = await browser.newPage();

  // 设置真实 UA，减少被检测的风险
  await page.setUserAgent(
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36'
  );

  try {
    // 1. 打开 MP 首页
    log('📍 打开微信公众号后台...');
    await page.goto(CONFIG.MP_BASE_URL, {
      waitUntil: 'networkidle2',
      timeout: CONFIG.TIMEOUT.NAVIGATION,
    });

    // 2. 尝试加载已有 cookie
    const hasCookies = await loadCookies(page);
    if (hasCookies) {
      // 刷新页面使 cookie 生效
      await page.reload({ waitUntil: 'networkidle2' });
      await sleep(3000);

      if (await isLoggedIn(page)) {
        log('✅ 已有登录态有效，无需重新扫码！');
        // 更新 cookies（可能有新的有效期）
        await saveCookies(page);
        await browser.close();
        log('👋 登录态已更新，可以开始发布文章了');
        return;
      }
      log('⚠️  登录态已过期，需要重新扫码');
    }

    // 3. 等待用户扫码登录
    log('');
    log('🔐 请在浏览器中扫码登录...');
    log('   （等待最多 2 分钟）');
    log('');

    // 轮询检测登录状态：URL 跳转到后台首页即为登录成功
    const startTime = Date.now();
    let loggedIn = false;

    while (Date.now() - startTime < CONFIG.TIMEOUT.LOGIN) {
      await sleep(2000);
      if (await isLoggedIn(page)) {
        loggedIn = true;
        break;
      }
      // 显示等待进度
      const elapsed = Math.round((Date.now() - startTime) / 1000);
      if (elapsed % 10 === 0) {
        log(`⏳ 等待扫码中... (已等待 ${elapsed}s)`);
      }
    }

    if (!loggedIn) {
      log('❌ 扫码登录超时，请重试');
      await browser.close();
      process.exit(1);
    }

    // 4. 保存 cookie
    log('✅ 登录成功！');
    await sleep(2000); // 确保页面完全加载
    await saveCookies(page);

    log('🎉 完成！现在可以在对话中说「帮我发布文章」来使用了');
  } catch (err) {
    log(`❌ 登录过程出错: ${err.message}`);
    console.error(err);
  } finally {
    await browser.close();
  }
}

main();
