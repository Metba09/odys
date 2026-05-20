#!/usr/bin/env node
/**
 * scripts/validate-pwa.js
 * Valide manifest.json et émet des warnings/errors structurés.
 */
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

let errors = 0, warnings = 0;

function ok(msg)   { console.log(`  ✅ ${msg}`); }
function warn(msg) { console.warn(`  ⚠️  ${msg}`); warnings++; }
function fail(msg) { console.error(`  ❌ ${msg}`); errors++; }

console.log('\n── PWA Manifest Validation ──────────────────────');

// 1. manifest.json existe
const mpath = join(ROOT, 'manifest.json');
if (!existsSync(mpath)) { fail('manifest.json introuvable'); process.exit(1); }
ok('manifest.json trouvé');

let manifest;
try {
  manifest = JSON.parse(readFileSync(mpath, 'utf8'));
  ok('manifest.json parsé (JSON valide)');
} catch (e) {
  fail(`manifest.json invalide : ${e.message}`);
  process.exit(1);
}

// 2. Champs obligatoires
const required = ['name','short_name','start_url','display','background_color','theme_color','icons'];
for (const f of required) {
  manifest[f] ? ok(`champ "${f}" présent`) : fail(`champ "${f}" manquant`);
}

// 3. Icônes
const icons = manifest.icons || [];
const has192 = icons.some(i => i.sizes === '192x192');
const has512 = icons.some(i => i.sizes === '512x512');
const hasMaskable = icons.some(i => i.purpose?.includes('maskable'));
has192    ? ok('icône 192x192 présente')    : fail('icône 192x192 manquante (obligatoire Chrome)');
has512    ? ok('icône 512x512 présente')    : fail('icône 512x512 manquante (obligatoire TWA)');
hasMaskable ? ok('icône maskable présente') : warn('icône maskable absente (recommandée Android)');

// 4. Vérifier que les fichiers icônes existent
for (const icon of icons) {
  const fp = join(ROOT, icon.src);
  existsSync(fp) ? ok(`icône fichier OK: ${icon.src}`) : fail(`icône fichier manquant: ${icon.src}`);
}

// 5. display: standalone ou fullscreen pour TWA
['standalone','fullscreen','minimal-ui'].includes(manifest.display)
  ? ok(`display "${manifest.display}" compatible TWA`)
  : warn(`display "${manifest.display}" non optimal pour TWA`);

// 6. orientation
manifest.orientation
  ? ok(`orientation "${manifest.orientation}" définie`)
  : warn('orientation non définie');

// 7. service worker déclaré dans index.html
const indexPath = join(ROOT, 'index.html');
if (existsSync(indexPath)) {
  const html = readFileSync(indexPath, 'utf8');
  html.includes('service-worker')
    ? ok('service-worker référencé dans index.html')
    : fail('service-worker non référencé dans index.html');
  html.includes('manifest.json')
    ? ok('manifest.json lié dans index.html')
    : fail('manifest.json non lié dans index.html');
}

console.log(`\n── Résultat : ${errors} erreur(s), ${warnings} avertissement(s) ─────`);
if (errors > 0) {
  console.error('\n❌ Validation échouée — exécutez `node scripts/fix-pwa.js`\n');
  process.exit(1);
}
console.log('\n✅ Manifest PWA valide\n');
