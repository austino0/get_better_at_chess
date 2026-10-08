# ADR-0003 — Comptes, données et consentement

**Statut** : accepté (2026-10-08)

## Décision

- **Alpha 100 % locale**. **Compte obligatoire à partir de la bêta fermée**, derrière un
  interrupteur de configuration dès le début.
- Connexion **sans mot de passe** : lien magique par e-mail + Lichess OAuth (PKCE). Import de
  parties par pseudo (Lichess, Chess.com) possible sans compte ; le suivi dans l'application exige
  un compte et un accord explicite.
- Âge minimum **15 ans**, année de naissance demandée à l'inscription.
- Session valable 60 jours hors-ligne ; l'entraînement n'est jamais bloqué par le réseau.
- Collecte à deux niveaux (A : nécessaire au coaching, B : consentement séparé), détaillée dans
  `DATA.md`. Refuser B ne bloque aucune fonction.
- Hébergement dans l'Union européenne, budget ≤ 20 €/mois pendant la bêta.

## Pourquoi deux niveaux

Un consentement ne peut pas être imposé comme condition d'accès pour des données non nécessaires au
service. Le niveau A (progression, parties, temps de réflexion) suffit à cerner un joueur ; le
niveau B (journal d'émotions, rythme détaillé) reste possible pour ceux qui l'acceptent.

## Conséquences

Identifiants UUIDv7 créés sur l'appareil, journal de révisions en ajout seulement, stockage et
synchronisation derrière des ports : le serveur peut arriver plus tard sans toucher à la logique.
