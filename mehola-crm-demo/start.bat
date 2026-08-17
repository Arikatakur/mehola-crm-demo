@echo off
rem Mehola CRM demo - local launcher.
rem Opens the multi-file version in the default browser.
rem (For the client, send dist\mehola-crm-demo.html instead - it needs nothing.)
cd /d "%~dp0"
python tools\serve.py %*
pause
