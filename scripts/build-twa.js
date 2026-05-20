#!/usr/bin/env node
/**
 * scripts/build-twa.js
 * Pilote bubblewrap init + build de façon non-interactive
 * en injectant twa-manifest.json comme configuration.
 *
 * Utilisé par le workflow GitHub Actions (.github/workflows/build-android.yml)
 */
import { execSync }        from 'node:child_process';
import { readFileSync, writeFileSync, existsSync, mkdirSync, copyFileSync } from 'node:fs';
import { join, dirname }   from 'node:path';
import { fileURLToPath }   from 'node:url';

const ROOT       = join(dirname(fileURLToPath(import.meta.url)), '..');
const TWA_DIR    = join(ROOT, 'android-twa');
const MANIFEST   = join(ROOT, 'twa-manifest.json');
const KEYSTORE   = join(ROOT, 'android.keystore');

const run = (cmd, opts = {}) => {
  console.log(`\n$ ${cmd}`);
  execSync(cmd, { stdio: 'inherit', cwd: ROOT, ...opts });
};

// ── 1. Vérifier les prérequis ─────────────────────────────────────────────
console.log('\n── TWA Build Setup ──────────────────────────────');

['node','java','bubblewrap'].forEach(bin => {
  try {
    const v = execSync(`${bin} --version 2>&1`).toString().trim().split('\n')[0];
    console.log(`  ✅ ${bin}: ${v}`);
  } catch {
    console.error(`  ❌ ${bin} introuvable`);
    if (bin !== 'bubblewrap') process.exit(1);
  }
});

// ── 2. Keystore debug ────────────────────────────────────────────────────
if (!existsSync(KEYSTORE)) {
  console.log('\n── Génération keystore debug ────────────────────');
  run(
    `keytool -genkeypair -v \
      -keystore "${KEYSTORE}" \
      -alias odys-key \
      -keyalg RSA -keysize 2048 \
      -validity 10000 \
      -storepass odys-debug \
      -keypass   odys-debug \
      -dname "CN=odys Debug, OU=Debug, O=odys, L=Unknown, ST=Unknown, C=FR"`,
    { stdio: 'pipe' }
  );
  console.log('  ✅ Keystore debug généré : android.keystore');
} else {
  console.log('  ✅ Keystore existant réutilisé');
}

// ── 3. Injecter les chemins keystore dans twa-manifest.json ──────────────
const twaMf = JSON.parse(readFileSync(MANIFEST, 'utf8'));
twaMf.signingKey = { path: KEYSTORE, alias: 'odys-key' };
writeFileSync(MANIFEST, JSON.stringify(twaMf, null, 2));
console.log('  ✅ twa-manifest.json mis à jour avec chemin keystore');

// ── 4. Générer le projet Android avec BubbleWrap ─────────────────────────
console.log('\n── BubbleWrap init ──────────────────────────────');
if (existsSync(TWA_DIR)) {
  console.log('  ℹ️  Dossier android-twa existant — skip init');
} else {
  mkdirSync(TWA_DIR, { recursive: true });
  run(
    `bubblewrap init \
      --manifest "${MANIFEST}" \
      --directory "${TWA_DIR}"`,
    { env: { ...process.env, BUBBLEWRAP_SKIP_UPDATE_CHECK: '1' } }
  );
}

// ── 5. Build APK ─────────────────────────────────────────────────────────
console.log('\n── BubbleWrap build APK ─────────────────────────');
run(
  `bubblewrap build \
    --skipPwaValidation \
    --manifest "${MANIFEST}" \
    --directory "${TWA_DIR}"`,
  { env: { ...process.env, BUBBLEWRAP_SKIP_UPDATE_CHECK: '1' } }
);

// ── 6. Localiser l'APK et le déplacer ────────────────────────────────────
const candidates = [
  join(TWA_DIR, 'app', 'build', 'outputs', 'apk', 'release', 'app-release-unsigned.apk'),
  join(TWA_DIR, 'app', 'build', 'outputs', 'apk', 'debug',   'app-debug.apk'),
  join(TWA_DIR, 'app-release-signed.apk'),
];
const apkSrc = candidates.find(p => existsSync(p));
if (apkSrc) {
  const dest = join(ROOT, 'odys.apk');
  copyFileSync(apkSrc, dest);
  console.log(`\n✅ APK disponible : odys.apk`);
} else {
  console.warn('\n⚠️  APK non localisé automatiquement — chercher dans android-twa/');
}
