@echo off
setlocal
cd /d "%~dp0"
title Econova - Navroz kochasi
where node >nul 2>&1
if errorlevel 1 (
  echo Node.js 24 topilmadi. https://nodejs.org/en/download dan ornatib, qayta oching.
  pause
  exit /b 1
)
node -e "if (Number(process.versions.node.split('.')[0]) < 24) process.exit(1)"
if errorlevel 1 (
  echo Node.js 24 yoki yangiroq versiyasi kerak.
  pause
  exit /b 1
)
if not exist "node_modules\three\package.json" (
  echo Birinchi ishga tushirish: grafik kutubxona ornatilmoqda...
  call npm ci --omit=dev --no-audit --no-fund
  if errorlevel 1 (
    echo Ornatish tugamadi. Internetni tekshiring va qayta oching.
    pause
    exit /b 1
  )
)
echo Econova ochilmoqda. Bu oynani ochiq qoldiring.
node server.js --open
if errorlevel 1 pause
