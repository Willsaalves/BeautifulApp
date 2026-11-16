@echo off
rem Sobe banco, tuneis do Cloudflare, API e Expo, gravando a URL certa no mobile\.env.local
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\dev-tunnel.ps1" %*
