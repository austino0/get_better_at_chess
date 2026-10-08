# ADR-0004 — Stockage local SQLite

**Statut** : accepté (2026-10-08)

## Décision

- Les données de l'utilisateur vivent dans une base **SQLite locale**, identique sur toutes les
  plateformes (application Windows et web : SQLite WASM dans un Worker, stockée dans le navigateur
  via OPFS).
- Le code ne parle à la base que par l'interface `Db` (`packages/db/src/port.ts`). Les tests
  utilisent le SQLite intégré à Node (`node:sqlite`) avec le même SQL.
- Stockage OPFS « pool SAH » (`installOpfsSAHPoolVfs`) : il n'exige pas les en-têtes COOP/COEP,
  contrairement au VFS OPFS classique, donc rien à configurer côté Tauri ni côté hébergement web.
- Schéma versionné par `PRAGMA user_version` ; une migration n'est jamais modifiée, on en ajoute
  une. Chaque migration est transactionnelle ; une base plus récente que l'application est
  refusée plutôt que d'être abîmée.
- Identifiants **UUIDv7** générés sur l'appareil.
- Politique de sécurité Tauri : `script-src 'self' 'wasm-unsafe-eval'` et `worker-src 'self' blob:`
  (nécessaires à SQLite WASM).

## Conséquences

- **Une seule connexion à la fois** : le pool SAH verrouille le stockage. Une seconde fenêtre ou un
  second onglet sur le même profil affiche « Stockage local indisponible ». À traiter si le web
  multi-onglets devient un besoin (verrou Web Locks ou Worker partagé).
- Poids : le Worker SQLite fait ~135 Ko de JavaScript compressé plus ~400 Ko de WASM, chargés à
  part de l'application (budgets séparés dans `CONSTRAINTS.md`). Le fichier `sqlite3-worker1`
  inutilisé que Vite embarque pourra être retiré si le poids de l'installeur devient un sujet.
- Les types SQLite autres que texte, nombre et NULL (octets, grands entiers) sont refusés ou
  convertis explicitement à la frontière du Worker ; à élargir quand une table en aura besoin.
