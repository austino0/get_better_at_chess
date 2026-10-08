# ADR-0007 — Tactique adaptative et notation Glicko-2

**Statut** : accepté (2026-10-08)

## Décision

- Le **niveau de tactique** est une note **Glicko-2** (`packages/rating`, vérifiée sur l'exemple
  chiffré de l'article de Glickman) sur l'échelle des problèmes Lichess. Ce n'est pas un Elo de
  partie ; l'interface l'appelle « niveau de tactique ».
- Au premier accès, l'utilisateur déclare son niveau approximatif (Elo, 400-2600). Il devient la
  note de départ avec l'**incertitude maximale** (RD 350) : les premiers problèmes déplacent
  beaucoup la note, puis elle se stabilise.
- Chaque problème est un « adversaire » dont la note et l'incertitude viennent de Lichess. Le
  résultat est une réussite (`success` : résolu sans erreur ni aide) ou un échec ; abandonner un
  problème (« Problème suivant » avant la fin) compte comme un échec.
- Le **problème suivant** vise une réussite d'environ **82 %** (milieu des 80-85 % du plan) :
  niveau du joueur − 263 points, dans une tranche de ±100 qui s'élargit si elle est vide. Les
  problèmes jamais tentés sont préférés.
- La tentative et la nouvelle note sont écrites **dans la même transaction** (`recordAttemptAndRate`).
  La table `skill_ratings` (une ligne par dimension, ici `tactics`) est l'état courant ; le journal
  `puzzle_attempts` reste la source de vérité et permettrait de recalculer la note.

## Pas encore fait

- Une note **par famille de thèmes** (fourchette, clouage…) et le déblocage par bande de niveau.
- Le choix de la **cadence** à améliorer (bullet, blitz…) et les problèmes chronométrés : le temps
  de réflexion est enregistré (`duration_ms`) mais n'influence pas encore la note.
- Représenter à nouveau les problèmes échoués (livraison 7, cartes FSRS).
