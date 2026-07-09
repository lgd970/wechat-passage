@echo off
chcp 65001 >nul
title 微信公众号 - AI写作发布
cd /d "%~dp0"
node --env-file=.env src/auto.js
pause
