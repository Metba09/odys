#!/usr/bin/env node
/**
 * scripts/fix-pwa.js
 * Corrige automatiquement les champs manquants dans manifest.json
 * et s'assure que index.html référence bien le SW et le manifest.
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
let fixed = 0;
const fix  = m => { console.log(`  🔧 ${m}`); fixed++; };
const ok   = m => console.log(`  ✅ ${m}`);

console.log('\n── PWA Auto-Fix ─────────────────────────────────');

// ── 1. manifest.json ─────────────────────────────────────────────────────
const mpath = join(ROOT, 'manifest.json');
const manifest = existsSync(mpath) ? JSON.parse(readFileSync(mpath, 'utf8')) : {};
let mDirty = false;

const defaults = {
  name:             'Odyssée de la Sagesse',
  short_name:       'odys',
  description:      'Un voyage éditorial hors ligne.',
  start_url:        './index.html',
  scope:            './',
  display:          'standalone',
  orientation:      'any',
  background_color: '#f9f7f2',
  theme_color:      '#af944d',
  lang:             'fr',
};

for (const [k, v] of Object.entries(defaults)) {
  if (!manifest[k]) {
    manifest[k] = v;
    fix(`manifest.json : champ "${k}" ajouté → "${v}"`);
    mDirty = true;
  }
}

// Vérifier icônes minimales
const icons = manifest.icons || [];
const needed = [
  { src: 'icons/icon-192x192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
  { src: 'icons/icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
  { src: 'icons/icon-maskable-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
];
for (const ni of needed) {
  const found = icons.find(i => i.src === ni.src && i.purpose === ni.purpose);
  if (!found) {
    icons.push(ni);
    fix(`manifest.json : icône "${ni.src}" (${ni.purpose}) ajoutée`);
    mDirty = true;
  }
}
if (mDirty) manifest.icons = icons;

if (mDirty) {
  writeFileSync(mpath, JSON.stringify(manifest, null, 2));
  fix('manifest.json sauvegardé');
} else {
  ok('manifest.json déjà complet');
}

// ── 2. index.html ─────────────────────────────────────────────────────────
const ipath = join(ROOT, 'index.html');
if (existsSync(ipath)) {
  let html = readFileSync(ipath, 'utf8');
  let hDirty = false;

  if (!html.includes('manifest.json')) {
    html = html.replace('</head>', '  <link rel="manifest" href="manifest.json">\n</head>');
    fix('index.html : <link rel="manifest"> ajouté');
    hDirty = true;
  }

  if (!html.includes('theme-color')) {
    html = html.replace('</head>', '  <meta name="theme-color" content="#af944d">\n</head>');
    fix('index.html : meta theme-color ajouté');
    hDirty = true;
  }

  if (!html.includes('service-worker')) {
    const swSnippet = `\n<script>\nif('serviceWorker' in navigator){\n  window.addEventListener('load',()=>{\n    navigator.serviceWorker.register('./service-worker.js');\n  });\n}\n</script>\n`;
    html = html.replace('</body>', swSnippet + '</body>');
    fix('index.html : enregistrement SW ajouté');
    hDirty = true;
  }

  if (hDirty) {
    writeFileSync(ipath, html);
    fix('index.html sauvegardé');
  } else {
    ok('index.html déjà conforme');
  }
}

console.log(`\n── ${fixed} correction(s) appliquée(s) ───────────────`);
console.log(fixed > 0 ? '\n✅ Corrections appliquées\n' : '\n✅ Aucune correction nécessaire\n');
