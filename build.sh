#!/usr/bin/env bash
set -e
echo "1/3 Compilando la aplicación..."
npx esbuild main.jsx --bundle --minify --format=iife --loader:.jsx=jsx --jsx=automatic --define:process.env.NODE_ENV='"production"' --outfile=bundle.js
echo "2/3 Generando estilos..."
npx tailwindcss -c tailwind.config.js -i input.css -o tw.css --minify
echo "3/3 Ensamblando index.html..."
node ensamblar.js
echo "Listo: dist/index.html"
