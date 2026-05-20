# Odyssée de la Sagesse — PWA → Android APK (v8)

## Changements v8 (correctifs GitHub Actions)

### Problèmes corrigés

| # | Problème | Correction |
|---|----------|------------|
| 1 | `bubblewrap init` crash en CI (stdin non-TTY) | Génération directe du projet Android sans BubbleWrap init |
| 2 | AGP 8.3 incompatible avec Gradle 8.9 | Mise à jour vers AGP 8.5.0 |
| 3 | `PIPESTATUS` capturé après pipe (toujours 0) | Log dans fichier + `${PIPESTATUS[0]}` correct |
| 4 | Mauvais répertoire pour `gradlew` | Injection directe dans `android-twa/` (chemin fixe) |
| 5 | `namespace` manquant (AGP 8+) | Ajout `namespace` dans `app/build.gradle` |
| 6 | `ic_launcher` manquant → build crash | Ajout drawable XML `ic_launcher.xml` |
| 7 | Node 24 non stable en CI | Rétrogradé vers Node 20 LTS |

### Architecture du workflow v8

```
validate-pwa  →  build-android
                   ├── setup-java (temurin 17)
                   ├── setup-android + SDK 35
                   ├── Generate keystore
                   ├── Parse twa-manifest.json        ← NEW
                   ├── Generate Android project        ← NEW (remplace bubblewrap init)
                   ├── Inject Gradle wrapper
                   ├── assembleDebug
                   ├── zipalign + apksigner
                   └── upload artifacts
```

## Structure du projet

```
odys-v8/
├── .github/workflows/build-android.yml   ← workflow CI/CD v8
├── gradle-wrapper/                        ← Gradle 8.9 bundlé
│   ├── gradlew
│   └── gradle/wrapper/
│       ├── gradle-wrapper.jar
│       └── gradle-wrapper.properties
├── scripts/
│   ├── build-twa.js
│   ├── fix-pwa.js
│   ├── validate-pwa.js
│   └── validate-sw.js
├── icons/                                 ← icônes PWA
├── screenshots/
├── manifest.json                          ← Web App Manifest
├── twa-manifest.json                      ← config TWA/BubbleWrap
├── service-worker.js
└── index.html
```

## Utilisation

1. Pousser sur la branche `main`
2. Le workflow se lance automatiquement
3. Télécharger `odys-debug-apk-N` dans les Artifacts GitHub Actions

## Configuration

Éditer `twa-manifest.json` pour personnaliser :
- `packageId` : identifiant Android (ex: `io.github.metba09.odys`)
- `host` : domaine GitHub Pages (ex: `metba09.github.io`)
- `startUrl` : chemin de démarrage (ex: `/odys/index.html`)
