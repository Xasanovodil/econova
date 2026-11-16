@echo off
setlocal
cd /d "%~dp0"
title Econova - Navroz kochasi
if not exist "server.js" goto missing_files
if not exist "public\vendor\three.module.js" goto missing_files
if not exist "public\vendor\three.core.js" goto missing_files
if not exist "public\vendor\OrbitControls.js" goto missing_files
if not exist "public\vendor\BufferGeometryUtils.js" goto missing_files
where node >nul 2>&1
if errorlevel 1 goto missing_node
node -e "if (Number(process.versions.node.split('.')[0]) < 24) process.exit(1)"
if errorlevel 1 goto missing_node
echo Econova ochilmoqda. Bu oynani ochiq qoldiring.
node server.js --open
if errorlevel 1 pause
exit /b
:missing_files
echo Project files are missing. Close this window, right-click the downloaded ZIP,
echo choose Extract all, then open START_ECONOVA.cmd inside the extracted folder.
echo ZIP ichidan ishga tushirmang. Avval Extract all tugmasini bosing.
pause
exit /b 1
:missing_node
echo Node.js 24 or later is required. Install it from https://nodejs.org/en/download
echo Node.js 24 ni ornatib, shu faylni qayta oching.
pause
exit /b 1
