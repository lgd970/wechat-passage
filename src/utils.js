/**
 * 微信公众号发布工具 — 公共工具模块
 */

import fs from 'node:fs/promises';
import { CONFIG } from './config.js';

// ============================================================================
// Cookie 持久化
// ============================================================================

/**
 * 从文件加载 cookies 并注入到当前页面
 * @param {import('puppeteer').Page} page
 * @returns {Promise<boolean>} 是否成功加载了 cookie
 */
export async function loadCookies(page) {
  try {
    const raw = await fs.readFile(CONFIG.COOKIE_PATH, 'utf-8');
    const cookies = JSON.parse(raw);
    if (!Array.isArray(cookies) || cookies.length === 0) {
      log('⚠️  cookies.json 为空，跳过加载');
      return false;
    }
    // 替换为同域名 cookies（Puppeteer 要求 url 或 domain）
    for (const c of cookies) {
      // Puppeteer 的 setCookie 如果已有 url 直接使用，否则用 MP_BASE_URL
      if (!c.url) c.url = CONFIG.MP_BASE_URL;
    }
    await page.setCookie(...cookies);
    log(`✅ 已加载 ${cookies.length} 条 cookie`);
    return true;
  } catch (err) {
    if (err.code === 'ENOENT') {
      log('ℹ️  未找到 cookies.json，需要首次登录');
    } else {
      log(`⚠️  加载 cookie 失败: ${err.message}`);
    }
    return false;
  }
}

/**
 * 从当前页面保存 cookies 到文件
 * @param {import('puppeteer').Page} page
 */
export async function saveCookies(page) {
  const cookies = await page.cookies();
  await fs.writeFile(CONFIG.COOKIE_PATH, JSON.stringify(cookies, null, 2), 'utf-8');
  log(`💾 已保存 ${cookies.length} 条 cookie 到 cookies.json`);
}

// ============================================================================
// DOM 操作辅助
// ============================================================================

/**
 * 等待选择器出现后点击
 * @param {import('puppeteer').Page} page
 * @param {string} selector
 * @param {object} [opts]
 */
export async function waitAndClick(page, selector, opts = {}) {
  const timeout = opts.timeout || CONFIG.TIMEOUT.SELECTOR;
  log(`🖱️  等待点击: ${selector}`);
  await page.waitForSelector(selector, { visible: true, timeout });
  await page.click(selector);
  await sleep(CONFIG.DELAY.AFTER_CLICK);
}

/**
 * 等待选择器出现后输入文字
 * @param {import('puppeteer').Page} page
 * @param {string} selector
 * @param {string} text
 * @param {object} [opts]
 */
export async function waitAndType(page, selector, text, opts = {}) {
  const timeout = opts.timeout || CONFIG.TIMEOUT.SELECTOR;
  const clear = opts.clear !== false;
  log(`⌨️  输入文字到: ${selector}`);
  await page.waitForSelector(selector, { visible: true, timeout });
  if (clear) {
    // 三击全选后替换
    await page.click(selector, { clickCount: 3 });
    await sleep(100);
  }
  await page.type(selector, text, { delay: opts.delay || 30 });
  await sleep(CONFIG.DELAY.AFTER_TYPE);
}

// ============================================================================
// 调试辅助
// ============================================================================

/**
 * 截图保存（调试用）
 * @param {import('puppeteer').Page} page
 * @param {string} name
 */
export async function screenshot(page, name) {
  const filePath = `./debug_${name}_${Date.now()}.png`;
  await page.screenshot({ path: filePath, fullPage: true });
  log(`📸 截图已保存: ${filePath}`);
}

// ============================================================================
// 通用工具
// ============================================================================

/** @param {number} ms */
export function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * 带时间戳的日志
 * @param {string} message
 */
export function log(message) {
  const ts = new Date().toLocaleTimeString('zh-CN', { hour12: false });
  console.log(`[${ts}] ${message}`);
}

/**
 * 检查当前页面是否已登录微信 MP
 * 策略：先排除登录页，再确认后台页
 * @param {import('puppeteer').Page} page
 * @returns {Promise<boolean>}
 */
export async function isLoggedIn(page) {
  try {
    const url = page.url();

    // 强信号：URL 包含 token（后台页面特征）
    if (url.includes('token=')) {
      return true;
    }

    // 检查页面内容来判断
    const result = await page.evaluate(() => {
      const bodyText = document.body?.textContent || '';

      // 如果在登录页（有登录按钮、扫码登录等文字），则未登录
      const loginIndicators = ['扫码登录', '记住账号', '找回账号或密码'];
      const hasLoginForm = loginIndicators.some(t => bodyText.includes(t));
      if (hasLoginForm) return false;

      // 如果有明显的后台功能文字，则已登录
      const dashboardIndicators = ['素材管理', '图文消息', '新建群发', '用户管理', '首页'];
      const hasDashboard = dashboardIndicators.some(t => bodyText.includes(t));
      if (hasDashboard) return true;

      // 有侧边栏菜单
      const menuBar = document.querySelector('#menuBar, [class*="main-side"], [class*="app-side"]');
      if (menuBar && menuBar.textContent?.length > 20) return true;

      return false;
    });

    return result;
  } catch {
    return false;
  }
}
