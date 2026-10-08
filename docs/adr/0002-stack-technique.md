# ADR-0002 — Stack technique

**Statut** : accepté (2026-10-08)

## Décision

- **TypeScript + React + Vite**, coque **Tauri 2** pour Windows ; la version web est le même code.
  Mobile : Tauri mobile ou Capacitor, choix en phase 6 sans réécrire l'interface.
- **chessground** (plateau), **chessops** (règles, FEN, PGN), **ts-fsrs** (répétition espacée).
- **Stockfish WASM** en Web Worker partout ; interface `Engine` prête pour un binaire natif plus tard.
- **SQLite** local (sqlite-wasm + OPFS), mêmes schéma et code sur toutes les plateformes.
- Monorepo **pnpm workspaces**. Turborepo sera ajouté quand plusieurs paquets auront besoin de
  compilations en cascade.
- **TypeScript 6** pour l'instant : typescript-eslint ne supporte pas encore TypeScript 7.
  À réexaminer quand le support sera annoncé.

## Conséquences

- La logique métier est dans des paquets sans dépendance à la plateforme ; la plateforme est
  injectée par des interfaces.
- Risque assumé : Tauri mobile est moins mature que React Native ; Capacitor sert de plan B.
