@echo off
chcp 65001 >nul
title 微信公众号AI助手 - 安装配置

echo.
echo ╔══════════════════════════════════════╗
echo ║   微信公众号 AI 写作助手 - 安装配置   ║
echo ╚══════════════════════════════════════╝
echo.

REM 检查 Node.js
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo ❌ 未检测到 Node.js，请先安装：
    echo    https://nodejs.org （下载 LTS 版本）
    echo 安装完成后重新运行本脚本。
    pause
    exit /b 1
)
echo ✅ Node.js 已安装

REM 安装依赖
echo.
echo 📦 安装依赖中...
call npm install
echo ✅ 依赖安装完成

REM 配置 .env
echo.
echo ═══════════════════════════════════════
echo 📋 请准备以下信息：
echo.
echo   1. 微信公众号 AppID 和 AppSecret
echo      获取路径：mp.weixin.qq.com → 设置与开发 → 基本配置
echo.
echo   2. DeepSeek API Key
echo      获取路径：platform.deepseek.com → API Keys
echo.
echo   3. Unsplash Access Key（可选，用于自动配图）
echo      获取路径：unsplash.com/developers → 注册应用
echo ═══════════════════════════════════════
echo.

set /p APPID="请输入 AppID: "
set /p APPSECRET="请输入 AppSecret: "
set /p DSKEY="请输入 DeepSeek API Key: "
set /p UNSPLASH="请输入 Unsplash Access Key（可选，直接回车跳过）: "

REM 写入 .env
(
echo # 微信公众号 API 密钥
echo WECHAT_APPID=%APPID%
echo WECHAT_APPSECRET=%APPSECRET%
echo.
echo # AI 写作
echo DEEPSEEK_API_KEY=%DSKEY%
echo.
echo # 配图（可选）
echo UNSPLASH_ACCESS_KEY=%UNSPLASH%
echo.
echo # 默认作者
echo WECHAT_DEFAULT_AUTHOR=反常识研究所
) > .env

echo.
echo ✅ 配置已保存到 .env 文件

REM 检测公网 IP
echo.
echo 🔍 检测公网 IP...
for /f "delims=" %%i in ('curl -s ifconfig.me 2^>nul') do set PUBIP=%%i
if defined PUBIP (
    echo    你的公网 IP: %PUBIP%
    echo    ⚠️  请将此 IP 添加到 MP 后台白名单：
    echo    mp.weixin.qq.com → 设置与开发 → 基本配置 → IP白名单
) else (
    echo    ⚠️  无法自动检测公网 IP
    echo    请手动访问 ifconfig.me 查看你的 IP
    echo    然后添加到 MP 后台白名单
)

echo.
echo ═══════════════════════════════════════
echo ✅ 安装完成！
echo.
echo 使用方法：
echo   双击 publish.bat   → 输入选题 → AI 自动写文+发布
echo   或者命令行： npm run auto
echo ═══════════════════════════════════════
pause
