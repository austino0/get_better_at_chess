# CONSTRAINTS — la barre de qualité du projet

Ce fichier est un contrat. La CI (`pnpm check`) fait respecter ce qui est automatisable.
**Un seuil ne baisse jamais.** Il peut monter. Contourner une règle (suppression, test sauté,
assertion retirée) est refusé en relecture.

## Code

- TypeScript `strict` + `noUncheckedIndexedAccess` + `exactOptionalPropertyTypes`.
- Interdits : `any` explicite, `@ts-ignore`, `@ts-expect-error`, `@ts-nocheck`, commentaires
  `eslint-disable` (ignorés par la configuration : `noInlineConfig`).
- ESLint `strictTypeChecked` sans avertissement ; Prettier appliqué.
- Chaque fichier source porte `SPDX-License-Identifier: GPL-3.0-or-later` (vérifié par
  `scripts/check-headers.mjs`).

## Tests

- Couverture minimale sur `packages/*/src` : lignes 90 %, fonctions 90 %, instructions 90 %,
  branches 80 %.
- Toute correction de bug commence par un test qui échoue.
- Pas de test supprimé ou désactivé pour « faire passer » la CI.

## Architecture

- La logique métier vit dans `packages/*`, sans dépendance à une plateforme (DOM, Tauri, réseau
  direct). La plateforme est injectée par des interfaces (« ports »).
- Identifiants : UUIDv7 générés sur l'appareil. Journaux de révisions : ajout seulement.
- Chaque migration de base de données est versionnée et testée.
- Le client ne contient jamais de code du serveur privé ; il parle au serveur par l'API HTTP décrite
  dans ce dépôt.

## Performance (budgets, mesurés dès que l'application existe)

- Démarrage de l'application < 2 s ; premier problème affiché < 300 ms.
- JavaScript du build web, vérifié par `pnpm check:bundle` (qui tourne dans la CI) ; les limites ne
  peuvent que baisser :
  - application (chargée au démarrage) : **120 Ko gzip maximum** ;
  - Worker SQLite (chargé à part, avec son fichier `.wasm` de ~400 Ko non compté ici) : **150 Ko gzip maximum**.

## Données personnelles

- Aucune donnée n'est envoyée au serveur hors de ce qui est listé dans `DATA.md`.
- Pas de SDK publicitaire ni de traceur dans l'application Windows/mobile.
