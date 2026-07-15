# Datara Publisher

Aplicación interna para publicar `datara-website` con un clic.

## Funciones

- Detecta automáticamente los archivos modificados.
- Genera un mensaje de commit con los nombres de los archivos y la fecha.
- Ejecuta `git add -A`, `git commit` y `git push`.
- Muestra el estado y el resultado en una consola visual.
- Incluye accesos directos al sitio, GitHub y Cloudflare.
- Evita crear commits cuando no hay cambios.

## Probar sin compilar

1. Copia esta carpeta a tu computadora.
2. Abre `publisher_config.json` y confirma la ruta del repositorio.
3. Ejecuta `iniciar_publisher.bat`.

## Crear el ejecutable

Haz doble clic en:

`crear_ejecutable.bat`

La primera vez instalará PyInstaller. Al terminar encontrarás:

`dist\Datara Publisher.exe`

Conserva `publisher_config.json` junto al `.exe`.

## Configuración

El archivo `publisher_config.json` permite cambiar:

- Ruta del repositorio.
- Rama.
- Remoto.
- URL del sitio.
- URL de GitHub.
- URL de Cloudflare.
- Si se abre el sitio después de publicar.

## Flujo automático

1. Detecta cambios.
2. Crea un mensaje como:

   `Auto deploy: Navbar.tsx, globals.css | 2026-07-15 09:30`

3. Publica en `origin/main`.
4. GitHub recibe el cambio.
5. Cloudflare Pages despliega automáticamente.
