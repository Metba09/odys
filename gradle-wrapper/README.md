# gradle-wrapper/

Ce répertoire contient le **Gradle Wrapper** pré-bundlé pour le projet
Odyssée de la Sagesse TWA, afin de garantir des builds reproductibles sur
GitHub Actions sans dépendre d'une installation Gradle externe.

## Contenu

```
gradle-wrapper/
├── gradlew                          # Script Unix (sh) — rendu +x avant usage
├── gradlew.bat                      # Script Windows
└── gradle/
    └── wrapper/
        ├── gradle-wrapper.jar       # Bootstrap JAR (~57 Ko) — inclus dans le dépôt
        └── gradle-wrapper.properties  # Pointe vers Gradle 8.9
```

## Version Gradle

| Paramètre       | Valeur                                               |
|-----------------|------------------------------------------------------|
| Version Gradle  | **8.9**                                              |
| Distribution    | `gradle-8.9-bin.zip`                                 |
| URL             | `https://services.gradle.org/distributions/`         |
| Android AGP     | Compatible 8.x                                       |
| Android SDK     | 35 (compileSdk / targetSdk)                          |
| Java requis     | 17 (Temurin)                                         |

## Pourquoi bundler le Gradle Wrapper ?

BubbleWrap génère `gradlew` et `gradle-wrapper.jar` lors du `bubblewrap init`,
mais ce comportement est fragile en CI car :

- La version de Gradle générée peut varier selon la version de BubbleWrap.
- Le fichier `gradle-wrapper.jar` peut être absent si l'init est partiel.
- Les caches Gradle sont plus efficaces avec une version fixe et connue.

En bundlant ces fichiers dans le dépôt, le workflow CI peut :
1. Exécuter `bubblewrap init` pour générer la structure Android.
2. **Écraser** `gradlew` et `gradle/wrapper/` avec les versions bundlées.
3. Lancer `./gradlew assembleDebug` de façon fiable et déterministe.

## Mise à jour du Gradle Wrapper

Pour mettre à jour vers une nouvelle version de Gradle :

```bash
# Depuis la racine du projet
cd gradle-wrapper
gradle wrapper --gradle-version=X.Y --distribution-type=bin
# Puis committer gradlew, gradlew.bat, gradle/wrapper/gradle-wrapper.jar,
# gradle/wrapper/gradle-wrapper.properties
```

## Utilisation dans le workflow CI

Le step **"Inject bundled Gradle wrapper"** dans `.github/workflows/build-android.yml`
copie automatiquement ces fichiers vers le répertoire `android-twa/` généré par
BubbleWrap avant le build.
