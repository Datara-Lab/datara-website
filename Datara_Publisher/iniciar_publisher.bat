@echo off
cd /d "%~dp0"
py datara_publisher.py
if errorlevel 1 pause
