// Copies the game into www/ for the Android wrapper (Capacitor).
const fs = require("fs"), path = require("path");
const root = path.join(__dirname, ".."), out = path.join(root, "www");
fs.rmSync(out, { recursive: true, force: true }); fs.mkdirSync(out);
for (const f of ["index.html", "manifest.json", "css", "js", "vendor", "assets", "world"]) {
  const src = path.join(root, f); if (fs.existsSync(src)) fs.cpSync(src, path.join(out, f), { recursive: true });
}
console.log("web build ready in www/");
