# ADR-0005 — Moteur Stockfish WASM

**Statut** : accepté (2026-10-08)

## Décision

- Le moteur est **Stockfish 19 « lite » monothread** (paquet `stockfish` de Chess.com, GPL-3),
  compilé en WebAssembly et exécuté dans un Web Worker. Deux fichiers (`.js` + `.wasm`, ~1,8 Mo)
  sont copiés tels quels dans `apps/web/public/stockfish/`, avec leur licence (`Copying.txt`).
  Les versions « multithread » exigent des en-têtes COOP/COEP et pèsent ~94 Mo : écartées.
- `packages/engine` ne connaît que le protocole **UCI**. Il définit `UciTransport` (envoyer une
  ligne, recevoir des lignes) et `Engine` ; `UciEngine` pilote n'importe quel moteur UCI. Un moteur
  natif (sidecar Tauri) ne demandera qu'un nouveau transport.
- Une seule analyse à la fois : une nouvelle demande envoie `stop`, attend le `bestmove` de la
  précédente puis lance la suivante ; les évaluations d'une analyse interrompue ne sont plus
  transmises.
- Les scores sont toujours donnés **du point de vue des blancs** ; la barre d'évaluation utilise la
  formule de gain de Lichess (PLAN.md §4).
- Le moteur est **chargé à la demande** (case « Évaluation en direct »), pour tenir le budget de
  démarrage.

## Conséquences

- Les fichiers du moteur sont hors lint, Prettier et vérification d'en-têtes (code tiers) et hors
  budget de bundle (comme le `.wasm` de SQLite) : ~1,8 Mo à télécharger à l'activation.
- Mettre à jour le moteur = remplacer ces deux fichiers et le nom dans `stockfish.ts`.
- Le Worker du moteur est lancé en script classique depuis `public/` ; la CSP Tauri existante
  (`worker-src 'self' blob:`, `wasm-unsafe-eval`) suffit.
- Version « lite » : plus faible que le Stockfish complet, mais très au-dessus de tout humain.
