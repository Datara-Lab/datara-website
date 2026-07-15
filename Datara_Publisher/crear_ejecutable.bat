@echo off
title Compilar Datara Publisher
cd /d "%~dp0"

echo ==========================================
echo       COMPILAR DATARA PUBLISHER
echo ==========================================
echo.

py -m pip install --upgrade pyinstaller
if errorlevel 1 (
    echo.
    echo ERROR: No se pudo instalar PyInstaller.
    pause
    exit /b 1
)

echo.
echo Creando ejecutable...
py -m PyInstaller ^
    --noconfirm ^
    --clean ^
    --onefile ^
    --windowed ^
    --name "Datara Publisher" ^
    datara_publisher.py

if errorlevel 1 (
    echo.
    echo ERROR: No se pudo crear el ejecutable.
    pause
    exit /b 1
)

copy /Y publisher_config.json "dist\publisher_config.json" >nul

echo.
echo ==========================================
echo EJECUTABLE CREADO CORRECTAMENTE
echo.
echo Ruta:
echo %CD%\dist\Datara Publisher.exe
echo ==========================================
echo.
pause
