#!/usr/bin/env node
/**
 * scripts/validate-sw.js
 * Valide la présence et la structure du service-worker.js
 */
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
let errors = 0, warnings = 0;
const ok   = m => console.log(`  ✅ ${m}`);
const warn = m => { console.warn(`  ⚠️  ${m}`); warnings++; };
const fail = m => { console.error(`  ❌ ${m}`); errors++; };

console.log('\n── Service Worker Validation ────────────────────');

const swPath = join(ROOT, 'service-worker.js');
if (!existsSync(swPath)) { fail('service-worker.js introuvable'); process.exit(1); }
ok('service-worker.js trouvé');

const sw = readFileSync(swPath, 'utf8');

// Événements requis
for (const evt of ['install','activate','fetch']) {
  sw.includes(`'${evt}'`) || sw.includes(`"${evt}"`)
    ? ok(`événement "${evt}" présent`)
    : fail(`événement "${evt}" manquant`);
}

// Stratégies recommandées
sw.includes('caches.open')     ? ok('Cache API utilisée')           : fail('Cache API absente');
sw.includes('skipWaiting')     ? ok('skipWaiting présent')          : warn('skipWaiting absent');
sw.includes('clients.claim')   ? ok('clients.claim présent')        : warn('clients.claim absent');
sw.includes('cache.put')       ? ok('cache.put (mise en cache dynamic) présent') : warn('cache.put absent');

// Fallback offline
sw.includes('offline') || sw.includes('fallback')
  ? ok('fallback offline détecté')
  : warn('aucun fallback offline détecté');

console.log(`\n── Résultat : ${errors} erreur(s), ${warnings} avertissement(s) ─────`);
if (errors > 0) { process.exit(1); }
console.log('\n✅ Service Worker valide\n');
