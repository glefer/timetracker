# CLAUDE.md

## Project Overview

**TimeTracker** — Application de saisie de pointage kilométrique déployée sur [Bunny.net EdgeScript](https://bunny.net/edge-scripting/).

- **Runtime** : Deno (local dev & build)
- **Framework HTTP** : [Hono](https://hono.dev) `v4.6.16`
- **Base de données** : [Bunny Database](https://bunny.net/database/) (libSQL / SQLite-compatible) via `@libsql/client`
- **SDK Bunny** : `@bunny.net/edgescript-sdk@0.12.0`
- **Entry point** : `src/main.ts`
- **Build output** : `dist/index.ts`

## Fonctionnalités

| Section | URL | Description |
|---|---|---|
| Adresses | `/config` | CRUD des adresses (nom + adresse postale) |
| Distances | `/distances` | CRUD des distances entre deux adresses (km) |
| Pointage | `/timesheet` | Saisie des lignes de pointage avec auto-complétion de la distance |

L'application est une SPA légère : les pages sont rendues côté serveur (HTML statique), les interactions se font en JavaScript vanilla via une API REST JSON.

## Development Commands

```bash
# Type-check le projet
deno check src/main.ts

# Linter
deno lint

# Tests
deno test --permit-no-files -A src/**/*.test.ts

# Build (bundle esbuild -> dist/)
mkdir -p dist && deno run -A build.mjs

# Dev local (nécessite BUNNY_DATABASE_URL + BUNNY_DATABASE_AUTH_TOKEN)
BUNNY_DATABASE_URL=... BUNNY_DATABASE_AUTH_TOKEN=... deno run --allow-net --allow-env src/main.ts
```

> `pnpm` est réservé aux opérations de release automatique.

## Project Structure

```
src/
  main.ts                     # Entry point : init DB, register routes, démarrage BunnySDK
  domain/
    addresses.ts              # Types Address, AddressInput
    distances.ts              # Types Distance, DistanceInput
    timesheets.ts             # Types TimesheetEntry, TimesheetEntryInput
  infrastructure/
    mod.ts                    # Instance Hono partagée + types re-exportés
    db.ts                     # Client libSQL + initSchema() (CREATE TABLE IF NOT EXISTS)
  routes/
    addresses.ts              # GET/POST/PUT/DELETE /api/addresses
    distances.ts              # GET/POST/PUT/DELETE /api/distances + GET /api/distances/lookup
    timesheets.ts             # GET/POST/PUT/DELETE /api/timesheets
    pages.ts                  # Routes HTML (/, /config, /distances, /timesheet)
  views/
    layout.ts                 # Template HTML partagé (nav, styles, helpers JS)
    config.ts                 # Page Adresses
    distances.ts              # Page Distances
    timesheet.ts              # Page Pointage
  simple.test.ts              # Placeholder de test Deno
build.mjs                     # esbuild bundler (Deno -> dist/)
deno.json                     # Config Deno : import map + tasks
package.json                  # Scripts npm-compat + devDeps semantic-release
.vscode/settings.json         # Active l'extension Deno pour VS Code
.releaserc.json               # Configuration semantic-release
```

## API REST

### Adresses
| Méthode | Endpoint | Description |
|---|---|---|
| `GET` | `/api/addresses` | Liste toutes les adresses |
| `POST` | `/api/addresses` | Crée une adresse `{ name, address }` |
| `PUT` | `/api/addresses/:id` | Met à jour une adresse |
| `DELETE` | `/api/addresses/:id` | Supprime une adresse |

### Distances
| Méthode | Endpoint | Description |
|---|---|---|
| `GET` | `/api/distances` | Liste avec les noms d'adresses |
| `GET` | `/api/distances/lookup?from=:id&to=:id` | Distance entre deux adresses (bidirectionnel) |
| `POST` | `/api/distances` | Crée `{ from_address_id, to_address_id, distance_km }` |
| `PUT` | `/api/distances/:id` | Met à jour la distance |
| `DELETE` | `/api/distances/:id` | Supprime |

### Pointage
| Méthode | Endpoint | Description |
|---|---|---|
| `GET` | `/api/timesheets` | Liste tous les pointages |
| `POST` | `/api/timesheets` | Crée `{ date, from_address_id, to_address_id, distance_km, note? }` |
| `PUT` | `/api/timesheets/:id` | Met à jour un pointage |
| `DELETE` | `/api/timesheets/:id` | Supprime |

## Schéma de base de données

```sql
CREATE TABLE IF NOT EXISTS addresses (
  id      INTEGER PRIMARY KEY AUTOINCREMENT,
  name    TEXT    NOT NULL,
  address TEXT    NOT NULL
);

CREATE TABLE IF NOT EXISTS distances (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  from_address_id INTEGER NOT NULL REFERENCES addresses(id) ON DELETE CASCADE,
  to_address_id   INTEGER NOT NULL REFERENCES addresses(id) ON DELETE CASCADE,
  distance_km     REAL    NOT NULL,
  UNIQUE(from_address_id, to_address_id)
);

CREATE TABLE IF NOT EXISTS timesheet_entries (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  date            TEXT    NOT NULL,        -- ISO 8601 "YYYY-MM-DD"
  from_address_id INTEGER NOT NULL REFERENCES addresses(id) ON DELETE RESTRICT,
  to_address_id   INTEGER NOT NULL REFERENCES addresses(id) ON DELETE RESTRICT,
  distance_km     REAL    NOT NULL,
  note            TEXT    NOT NULL DEFAULT ''
);
```

Le schéma est créé automatiquement au démarrage via `initSchema()`.

## Variables d'environnement

| Variable | Description |
|---|---|
| `BUNNY_DATABASE_URL` | URL de connexion à la Bunny Database |
| `BUNNY_DATABASE_AUTH_TOKEN` | Token d'authentification |

> Sur Bunny EdgeScript, ces variables sont injectées automatiquement depuis le dashboard Database > Access.

## Key Dependencies

| Dépendance | Source | Rôle |
|---|---|---|
| `@bunny.net/edgescript-sdk@0.12.0` | esm.sh | SDK Bunny (TCP listener, HTTP serve) |
| `hono@4.6.16` | esm.sh | Framework HTTP léger |
| `@libsql/client@0.14.0` | esm.sh | Client Bunny Database (libSQL) |
| `esbuild` | npm (Deno) | Bundler pour le build |
| `@luca/esbuild-deno-loader` | jsr | Plugin Deno pour esbuild |
| `@std/assert` | jsr | Assertions pour les tests |
| `semantic-release` | pnpm | Versioning & releases automatiques |

## Release Process

Le projet utilise **[semantic-release](https://semantic-release.gitbook.io/)** pour automatiser le versioning et les releases basées sur les **[commits conventionnels](https://www.conventionalcommits.org/)**.

### Convention de commits

Tous les commits doivent respecter le format Conventional Commits :

```
<type>(<scope>): <description>

[corps optionnel]

[footer optionnel]
```

**Types reconnus et impact sur la version :**

| Type | Description | Bump version |
|---|---|---|
| `feat` | Nouvelle fonctionnalité | **MINOR** (0.x.0) |
| `fix` | Correction de bug | **PATCH** (0.0.x) |
| `perf` | Amélioration de performance | **PATCH** (0.0.x) |
| `revert` | Annulation d'un commit | **PATCH** (0.0.x) |
| `docs` | Documentation uniquement | Pas de release |
| `style` | Formatage, lint | Pas de release |
| `refactor` | Refactoring sans changement fonctionnel | Pas de release |
| `test` | Ajout/modification de tests | Pas de release |
| `build` | Build system, dépendances | Pas de release |
| `ci` | Configuration CI/CD | Pas de release |
| `chore` | Tâches diverses | Pas de release |

**Breaking changes :**
Pour indiquer un changement incompatible (MAJOR version), ajoutez `BREAKING CHANGE:` dans le footer ou `!` après le type :
```bash
feat!: nouvelle API incompatible
# ou
feat: nouvelle API

BREAKING CHANGE: l'ancienne API a été supprimée
```

### Workflow automatique

```
Developer → Commit (feat/fix/etc.) → Push → Merge to main
                                              ↓
                                        GitHub Actions
                                              ↓
                                    Semantic Release
                                    ├─ Analyse commits
                                    ├─ Bump version (package.json)
                                    ├─ Génère CHANGELOG.md
                                    ├─ Commit + Tag + Push
                                    └─ Crée GitHub Release
                                              ↓
                                    Trigger workflow Deploy
                                              ↓
                                    Build + Deploy Bunny EdgeScript
```

### Commandes

```bash
# Vérifier que le commit suit la convention (local)
git log -1 --pretty=format:"%s"

# Lancer semantic-release en dry-run (voir ce qui serait fait)
pnpm run release --dry-run --no-ci

# La release réelle se fait automatiquement sur push vers main
# via GitHub Actions (.github/workflows/release.yml)
```

### Exemples de commits

```bash
# Feature (MINOR bump: 0.7.3 → 0.8.0)
git commit -m "feat: ajouter export CSV des pointages"

# Fix (PATCH bump: 0.7.3 → 0.7.4)
git commit -m "fix: corriger le calcul des distances bidirectionnelles"

# Performance (PATCH bump)
git commit -m "perf: optimiser la requête de lookup des distances"

# Pas de release
git commit -m "docs: mettre à jour le README"
git commit -m "chore: nettoyer les imports inutilisés"
git commit -m "ci: ajouter cache pnpm dans les workflows"

# Breaking change (MAJOR bump: 0.7.3 → 1.0.0)
git commit -m "feat!: nouvelle API REST v2

BREAKING CHANGE: les endpoints /api/v1/* ont été supprimés, utiliser /api/v2/*"
```

### Fichiers impliqués

- `.releaserc.json` : Configuration semantic-release
- `.github/workflows/release.yml` : Workflow CI pour les releases
- `.github/workflows/deploy.yml` : Déploiement Bunny (trigger sur release)
- `CHANGELOG.md` : Généré automatiquement
- `package.json` : Version bumpée automatiquement

## Process Qualité

Le projet intègre plusieurs mécanismes pour garantir la qualité du code :

### Git Hooks (Husky)

Des hooks Git automatiques valident le code avant chaque commit et push :

**Pre-commit** (`.husky/pre-commit`)
- Exécute `deno task lint` pour vérifier le style du code
- Exécute `deno task check` pour le type-checking TypeScript

**Commit-msg** (`.husky/commit-msg`)
- Valide que le message de commit respecte les conventions (Conventional Commits)
- Utilise `@commitlint/config-conventional`

**Pre-push** (`.husky/pre-push`)
- Exécute `deno task test` pour lancer les tests
- Exécute `deno task build` pour vérifier que le build passe

### Configuration commitlint

Le fichier `commitlint.config.mjs` définit les types de commits autorisés :
- `feat`, `fix`, `perf`, `revert` : Déclenchent une release
- `docs`, `style`, `refactor`, `test`, `build`, `ci`, `chore` : Pas de release

### Pull Requests

**Templates** (`.github/pull_request_template.md`)
- Checklist standardisée pour chaque PR
- Description des changements et tests effectués
- Classification du type de changement

**Workflow de validation** (`.github/workflows/pr-checks.yml`)
- **Quality Checks** : Lint, type-check, tests, build
- **PR Title Check** : Valide que le titre de la PR suit les conventions
- **Dependency Review** : Analyse les dépendances ajoutées (sécurité)
- **Auto Labeler** : Ajoute automatiquement des labels selon les fichiers modifiés

**Labels automatiques** (`.github/labeler.yml`)
- `docs` : Fichiers *.md
- `config` : Fichiers de configuration
- `source` : Code source TypeScript
- `tests` : Fichiers de tests
- `infrastructure` : Domain et infrastructure
- `ui` : Views
- `api` : Routes
- `build` : Système de build

### Issues

**Templates** (`.github/ISSUE_TEMPLATE/`)
- `bug_report.md` : Signaler un bug avec contexte et reproduction
- `feature_request.md` : Proposer une nouvelle fonctionnalité
- `config.yml` : Configuration des liens vers documentation et discussions

### Code Owners

Le fichier `.github/CODEOWNERS` définit les reviewers automatiques par type de fichier :
- Configuration, infrastructure, code source, tests : `@glefer`

### EditorConfig

Le fichier `.editorconfig` garantit la cohérence du formatage :
- UTF-8, LF, indentation 2 espaces
- Trim trailing whitespace
- Paramètres spécifiques par type de fichier

### Workflow CI/CD complet

```
Developer
  ↓ commit
Git Hooks (pre-commit)
  ├─ deno task lint
  └─ deno task check
  ↓ si OK
Git Hooks (commit-msg)
  └─ commitlint validation
  ↓ si OK
Git Hooks (pre-push)
  ├─ deno task test
  └─ deno task build
  ↓ push
GitHub Actions (ci.yml)
  ├─ Lint
  └─ Test
  ↓ merge to main
Semantic Release (release.yml)
  ├─ Analyse commits
  ├─ Bump version
  ├─ Génère CHANGELOG
  ├─ Commit + Tag + Push
  └─ Crée GitHub Release
  ↓ trigger
Deploy (deploy.yml)
  ├─ Build
  └─ Deploy to Bunny EdgeScript
```

### Installation

Après un `git clone`, installer les hooks :

```bash
pnpm install
```

Le script `prepare` dans `package.json` initialise automatiquement Husky.
