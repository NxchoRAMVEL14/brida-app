// Une el CSS y el JavaScript compilados en un único index.html autónomo.
const fs = require("fs");
const path = require("path");

const css = fs.readFileSync("tw.css", "utf8");
const bundle = fs.readFileSync("bundle.js", "utf8").replace(/<\/script/g, "<\\/script");

const html = `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>Brida</title>
<meta name="theme-color" content="#17161B">
<link rel="manifest" href="./manifest.webmanifest">
<link rel="icon" href="./icon-192.png">
<link rel="apple-touch-icon" href="./icon-192.png">
<style>${css}</style>
<style>html,body,#root{margin:0;min-height:100%;background:#17161B}</style>
</head>
<body>
<noscript>Esta app necesita JavaScript.</noscript>
<div id="root"></div>
<script>${bundle}</script>
<script>
if ("serviceWorker" in navigator) {
  window.addEventListener("load", function () {
    navigator.serviceWorker.register("./sw.js").catch(function () {});
  });
}
</script>
</body>
</html>
`;

fs.mkdirSync("dist", { recursive: true });
fs.writeFileSync(path.join("dist", "index.html"), html);
["sw.js", "manifest.webmanifest", "icon-192.png", "icon-512.png"].forEach((f) => {
  if (fs.existsSync(f)) fs.copyFileSync(f, path.join("dist", f));
});
console.log("dist/index.html:", (html.length / 1024).toFixed(0), "KB");
