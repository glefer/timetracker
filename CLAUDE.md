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

> `pnpm` est réservé aux opérations changeset/release.

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
package.json                  # Scripts npm-compat + devDeps changeset
.vscode/settings.json         # Active l'extension Deno pour VS Code
scripts/
  publish.sh                  # Build + publish via changeset
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
| `@changesets/cli` | pnpm | Versioning & changelog |

## Release Process

```bash
# 1. Créer un changeset
pnpm changeset

# 2. Bumper les versions
pnpm changeset version

# 3. Build + publish
./scripts/publish.sh   # = deno task build && pnpm changeset publish
```
