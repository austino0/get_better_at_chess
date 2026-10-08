# ADR-0008 — Révision espacée (FSRS)

**Statut** : accepté (2026-10-08)

## Décision

- Planification par **FSRS** via `ts-fsrs` (MIT), derrière `packages/srs` qui n'expose que des types
  simples (`SrsCard`, `SrsLog`, dates ISO) : le reste de l'application ne dépend pas de la
  bibliothèque.
- **Un problème qui n'est pas réussi proprement entre en révision** : erreur, indice, solution
  montrée ou abandon. Une réussite sans aide n'y entre pas (PLAN.md §2.1).
  La carte est créée dans la même transaction que la tentative.
- Table `cards` (une carte par `(type, ref)`, `ref` = identifiant du problème) et journal
  **`review_logs` en ajout seulement**, qui garde l'état de la carte AVANT chaque note : de quoi
  rejouer l'historique si on change les paramètres FSRS ou pour la synchronisation.
- Une révision rejoue le problème. Note : erreur ou solution montrée → _encore_ ; indice →
  _difficile_ ; sans aide → _bien_, ou _facile_ en moins de 5 s.
- Intervalles **en jours** (`enable_short_term: false`) : un problème raté revient le lendemain,
  pas dix minutes plus tard. Rétention cible par défaut de ts-fsrs (0,90).
- Réviser une carte ne modifie pas le niveau de tactique (Glicko-2) : seuls les problèmes
  nouveaux le font.

## Pas encore fait

- Plafonds quotidiens, enterrement des cartes sœurs, entrelacement des modules, optimisation des
  paramètres personnels après 1 000 révisions (PLAN.md §7).
- Cartes d'autres types (ouvertures, finales) : la table le permet via `type`.
- Quitter une révision sans la finir ne change rien : la carte reste due.
