# ADR-0006 — Problèmes de tactique

**Statut** : accepté (2026-10-08)

## Décision

- Source : le dump public des problèmes Lichess (**CC0**). Le script `scripts/build-puzzles.mjs`
  en extrait un sous-ensemble livré avec l'application : problèmes populaires (≥ 90), très joués
  (≥ 1 000 fois) et bien calibrés (incertitude ≤ 100), **800 par tranche de 100 points** de
  niveau entre 500 et 2 500, soit 16 000 problèmes (`apps/web/public/puzzles.csv`, ~2 Mo,
  ~0,8 Mo compressé). Sélection reproductible (tri par empreinte de l'identifiant).
- Au premier lancement, ce fichier est copié dans la table `puzzles` de la base locale
  (`ensurePuzzles`). Les tentatives vont dans `puzzle_attempts`, **journal en ajout seulement**
  avec identifiants UUIDv7 (prêt pour la synchronisation).
- Convention Lichess respectée : la position fournie est **avant** le premier coup, joué par
  l'adversaire ; la solution de l'utilisateur commence au deuxième coup.
- `PuzzleSession` (`packages/puzzles`) porte toutes les règles, sans dépendance à l'écran : un
  mauvais coup n'est pas joué et rend le problème « raté » ; un indice ou la solution montrée
  aussi ; **tout mat est accepté**, même autre que celui prévu (comme sur Lichess).
- Un problème est « réussi » (`success`) seulement s'il est résolu sans erreur ni aide.

## Conséquences

- Mettre à jour la sélection de problèmes ne met pas à jour les bases existantes (le chargement
  initial ne se refait pas si la table n'est pas vide) : prévoir une migration de données le
  jour où on change le fichier.
- Le fichier n'est pas dans le budget de bundle (téléchargé une fois, puis lu depuis la base).
- Un test rejoue la solution d'un problème sur vingt du fichier livré ; mettre `STRIDE = 1` dans
  `session.test.ts` pour tout vérifier (~10 s) après avoir régénéré le fichier.
- Les thèmes sont stockés tels que Lichess les nomme ; leur traduction française viendra avec le
  choix de thèmes.
