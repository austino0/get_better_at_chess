# ADR-0001 — Licence GPL-3 et deux dépôts

**Statut** : accepté (2026-10-08)

## Contexte

Stockfish et chessground sont sous GPL-3. L'application est gratuite, sans abonnement, financée par
des dons. Un petit serveur (comptes, synchronisation) sera nécessaire à partir de la bêta.

## Décision

- Le **client** (ce dépôt) est entièrement public sous **GPL-3.0-or-later**, coach compris.
- Le **serveur** est un dépôt privé séparé, créé en phase 5. Le GPL-3 (contrairement à l'AGPL)
  n'oblige pas à publier un service qui n'est pas distribué ; on n'y utilisera tout de même aucune
  bibliothèque AGPL.
- Le client et le serveur communiquent uniquement par une API HTTP dont la description (OpenAPI)
  est dans ce dépôt.
- Contributions externes : GPL-3 + DCO, sans CLA.

## Conséquences

- Tout ce qui est dans le client est copiable : la valeur durable est la qualité, la mise à jour
  continue et la synchronisation, pas le verrouillage.
- Pubs : jamais dans l'application Windows/mobile ; envisageables sur le web seulement si les dons
  ne couvrent pas le serveur 6 mois après le lancement public.
