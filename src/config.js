/**
 * 微信公众号发布工具 — 配置模块
 * 所有可配置项集中管理，支持环境变量覆盖
 */

import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, '..');

export const CONFIG = {
  // ---- 微信 MP 后台 ----
  MP_BASE_URL: process.env.WECHAT_MP_BASE_URL || 'https://mp.weixin.qq.com',

  // ---- Cookie 持久化路径 ----
  COOKIE_PATH: path.join(PROJECT_ROOT, 'cookies.json'),

  // ---- 默认作者 ----
  DEFAULT_AUTHOR: process.env.WECHAT_DEFAULT_AUTHOR || '',

  // ---- 文章内容临时文件（Claude 将 HTML 写入此文件，脚本读取） ----
  CONTENT_FILE: path.join(PROJECT_ROOT, 'article_content.html'),

  // ---- Puppeteer 启动选项 ----
  // 使用本地 Chrome（国内网络环境无法下载 Chromium）
  CHROME_PATH: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  BROWSER_HEADLESS: process.env.PUPPETEER_HEADLESS === 'true',

  // ---- 各步骤超时 (ms) ----
  TIMEOUT: {
    NAVIGATION: 30_000,
    SELECTOR: 15_000,
    SHORT: 5_000,
    LOGIN: 120_000, // 扫码登录给了 2 分钟
  },

  // ---- 操作间延迟 (ms)，模拟人类操作速度 ----
  DELAY: {
    AFTER_CLICK: 800,
    AFTER_TYPE: 200,
    BETWEEN_STEPS: 1000,
    AFTER_PUBLISH: 5000, // 发布后等待跳转
  },
};
