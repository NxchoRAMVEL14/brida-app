# Centro de Control Comercial — Código fuente

Aplicación web progresiva (PWA) de gestión comercial. Versión 2.6.

Este paquete contiene **todo el código fuente** necesario para modificar y recompilar
la aplicación por tu cuenta, sin depender de nadie.

---

## Qué hay aquí

| Archivo | Qué es |
|---|---|
| `app.jsx` | **La aplicación completa** (~1,750 líneas). Aquí vive todo: pestañas, pipeline, comisiones, asistente, manual. |
| `ilustraciones.jsx` | Las maquetas SVG de cada pantalla que se muestran dentro del manual. |
| `xlsx.jsx` | Generador de archivos Excel con formato de moneda. |
| `main.jsx` | Punto de entrada: monta la app en el navegador. |
| `input.css` | Entrada de Tailwind (no se edita normalmente). |
| `tailwind.config.js` | Configuración de Tailwind: le dice qué archivos escanear. |
| `package.json` | Lista de dependencias. |
| `build.sh` | Script que compila todo y genera el `index.html` final. |
| `sw.js` | Service Worker: hace que la app funcione sin internet. |
| `manifest.webmanifest` | Permite instalar la app con ícono propio. |
| `icon-192.png`, `icon-512.png` | Íconos de la aplicación. |

---

## Requisitos

Solo necesitas **Node.js 18 o superior** instalado en tu computadora
(descárgalo de nodejs.org — instalador estándar, siguiente-siguiente).

Para comprobar que quedó instalado, abre una terminal y escribe:

```
node --version
```

---

## Cómo compilar

1. Abre una terminal **dentro de esta carpeta**.
2. La primera vez, instala las dependencias:

```
npm install
```

3. Cada vez que quieras generar el archivo final:

```
bash build.sh
```

Eso produce `dist/index.html`: un archivo único y autónomo (código, estilos y
librerías incrustados) listo para subir a GitHub Pages.

En Windows, si `bash` no funciona, puedes correr los dos comandos del script a mano:

```
npx esbuild main.jsx --bundle --minify --format=iife --loader:.jsx=jsx --jsx=automatic --define:process.env.NODE_ENV=\"production\" --outfile=bundle.js
npx tailwindcss -c tailwind.config.js -i input.css -o tw.css --minify
```

...y después ejecutar `node ensamblar.js`, que une ambos en `dist/index.html`.

---

## Cómo publicarla

Sube a tu repositorio de GitHub: `index.html` (el de `dist/`), `sw.js`,
`manifest.webmanifest`, `icon-192.png` e `icon-512.png`.
Luego Settings → Pages → Branch `main` y `/(root)`.

---

## Cómo está construida (mapa rápido de `app.jsx`)

El archivo está organizado en bloques, en este orden:

1. **Paleta y constantes** — colores del diseño HMI, etapas del pipeline (`ETAPAS`,
   `ACTIVAS`, `FLUJO`), categorías de tiempo, prioridades.
2. **Utilidades** — formato de fechas, moneda, minutos; generación de CSV.
3. **Piezas de interfaz** — componentes pequeños reutilizables (`Sec`, `Dot`, `Etiqueta`).
4. **`TareaFila`** — un pendiente con su editor expandible.
5. **Google Calendar / compartir** — construcción de URLs e integración con el menú
   Compartir de Android.
6. **Intérprete local** — reglas que convierten dictado en pendientes/oportunidades.
7. **`MANUAL`** — el contenido del manual de ayuda (texto plano; edítalo libremente).
8. **`OppEditor`** — el formulario de una oportunidad del pipeline.
9. **`App`** — el componente principal: estado, cálculos derivados (`useMemo`) y
   el render de las 6 pestañas.

**Dónde se guardan los datos:** todo vive en un objeto llamado `data`, que se
serializa a JSON en `localStorage` bajo la clave `edb-centro-v1`. Búscala en el
archivo para ver exactamente cómo se lee y escribe (funciones `useEffect` inicial
y `guardar`).

---

## Si algún día migras a la nube

La clave está en la función `guardar` y en el `useEffect` que carga los datos al
inicio: son los **únicos dos puntos** donde la app toca el almacenamiento.
Reemplazar `localStorage` por llamadas a un servicio en la nube (Supabase, Firebase)
se hace principalmente ahí, más el manejo de sesión de usuario.

---

## Licencia

El código es tuyo. Úsalo, modifícalo y distribúyelo como quieras.
