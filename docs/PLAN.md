# Plan de création — « Get Better at Chess »

Application d'entraînement aux échecs pour le grand public (≈ 700 Elo → 2000 FIDE).
Windows d'abord, puis web et mobile avec le même code.

> Statut : plan v2 (après entretien de cadrage). **La section « Décisions validées » ci-dessous prévaut sur tout le reste du document en cas de contradiction.**

## Décisions validées (entretien du 2026-10-08)

**Licence, dépôts, modèle économique**

- Client **public sous GPL-3** (ce dépôt, `get_better_at_chess`) : interface, plateau, Stockfish WASM, exercices, **coach et plan du jour inclus**. Fichier `LICENSE` et en-têtes de licence dès le premier commit.
- **Serveur privé** (comptes, synchronisation, stockage de la progression) : dépôt séparé créé en phase 5. Le client ne parle au serveur que par une API HTTP dont la description (OpenAPI) vit dans le dépôt public. Pas de bibliothèque AGPL côté serveur.
- **Gratuit, sans abonnement.** Financement : dons (GitHub Sponsors / Ko-fi, lien discret). Pubs envisagées **seulement sur la version web** et seulement si les dons ne couvrent pas le serveur 6 mois après le lancement public. Aucun SDK publicitaire ni traceur dans l'app Windows/mobile.
- Contributions acceptées sous GPL-3 avec **DCO** (pas de CLA) ; décision de fusion réservée au mainteneur. Les traductions sont le premier cas d'usage.
- Budget serveur : **≤ 20 €/mois** pendant la bêta, hébergement **Union européenne**.

**Moteur et architecture**

- **Stockfish WASM partout** (web, Windows, mobile) ; interface `Engine` prête pour un sidecar natif plus tard.
- Analyse et coach **dans l'application, hors-ligne**. Le serveur ne fait pas de calcul d'analyse.
- Tout est conçu pour une synchronisation ultérieure : identifiants **UUIDv7** créés sur l'appareil, journal de révisions **append-only**, stockage/sync derrière des ports, version de schéma à chaque migration.
- Qualité écrite et appliquée par la CI dans **`CONSTRAINTS.md`** : TypeScript strict sans `any` ni suppression de règles, couverture minimale sur `core`/`srs`/`analysis`, limites de taille de bundle, budgets (démarrage < 2 s, premier problème < 300 ms). Un seuil ne baisse pas.

**Comptes, données, vie privée**

- **Alpha** (usage personnel) : 100 % locale, sans serveur. **Compte obligatoire à partir de la bêta fermée**, derrière un interrupteur de configuration dès le début.
- Connexion **sans mot de passe** : lien magique par e-mail + « Se connecter avec Lichess » (OAuth). **Import de parties par pseudo** Lichess/Chess.com possible sans compte ; le **suivi dans l'app exige un compte et un accord explicite**.
- **Âge minimum 15 ans** (année de naissance demandée à l'inscription ; parcours parental plus tard si besoin).
- Session valable **60 jours hors-ligne**, synchronisation en arrière-plan ; l'entraînement n'est jamais bloqué par le réseau.
- Collecte à **deux niveaux**, détaillée dans un `DATA.md` public :
  - **Niveau A (nécessaire au coaching, envoyé automatiquement après création du compte)** : progression, cartes/révisions, parties importées et analyses, temps de réflexion par coup, erreurs, sessions, réglages.
  - **Niveau B (consentement séparé, explicite, retirable)** : journal psychologique, humeurs, rythme de jeu détaillé (heures, enchaînements de défaites), signaux fins de comportement. Refuser le niveau B ne bloque pas l'app.

**Rythme et priorités**

- Un développeur, environ **10 h/semaine**, avec IA ; leçons rédigées par vous (textes originaux, champ « sources » obligatoire) ; experts consultés si le projet devient sérieux.
- **Micro-livraisons de 1 à 2 semaines**, chacune utilisable, structure propre :
  1. Fondations (LICENSE, monorepo, CI, i18n, ADR) · 2. Plateau jouable web + Tauri · 3. SQLite local + migrations + UUIDv7 · 4. Stockfish WASM, évaluation en direct · 5. Import de problèmes Lichess, premier problème résolu · 6. Tactique adaptative · 7. Cartes FSRS + file de révision · 8. Import PGN + visionneuse · 9. Analyse complète d'une partie · puis liaison Lichess, liaison Chess.com, erreurs → exercices.
- **Ordre des modules** : anti-gaffe → tactique et calcul → ouvertures → finales → gestion du temps → visualisation → stratégie → psychologie. Les phases 3 et 4 ci-dessous sont à relire dans cet ordre.
- **Plan du jour** : repoussé. En attendant l'utilisateur choisit librement son entraînement.
- Interface en **français d'abord**, textes dans des fichiers de traduction, anglais et autres langues ajoutables (traductions communautaires).
- Thèmes de tactique/calcul : **étiquettes Lichess** comme clés (≈ 60), regroupées en une douzaine de familles, libellés français en i18n, déblocage par bande de niveau.
- Notation : **Glicko-2** global sur l'échelle des problèmes Lichess + un rating par famille de thèmes, présentés comme « niveau de tactique » (pas un Elo de partie).
- **Évaluation initiale** : l'utilisateur renseigne d'abord la **cadence qu'il veut améliorer** (bullet, blitz, rapide, classique) et son **Elo actuel dans cette cadence** (pré-rempli si un compte Lichess/Chess.com est lié). Cet Elo sert de rating de départ avec une forte incertitude (Glicko-2, RD élevé) ; des problèmes **chronométrés adaptés à la cadence et au niveau** sont ensuite proposés et resserrent un **niveau de tactique/calcul**. Les temps de référence par niveau seront calibrés sur les données de tentatives Lichess. Changer de cadence cible ouvre une nouvelle évaluation, sans effacer les précédentes.

---

## 1. Vision et principes

**Promesse** : « Un coach qui connaît VOS parties et vous fait travailler exactement ce qui vous fait perdre des points. »

**Ce qui différencie le produit** (les outils isolés existent tous ailleurs : Lichess, Chessable, Chesstempo, Aimchess…) :

1. **Boucle complète** : jouer → importer → analyser → détecter ses faiblesses → créer des exercices et cartes de mémorisation depuis SES erreurs → réviser en répétition espacée.
2. **Un seul endroit** pour tactique, calcul, ouvertures, finales, stratégie, temps, psychologie.
3. **Local-first** : tout marche hors-ligne ; compte obligatoire à partir de la bêta, avec synchronisation automatique du niveau A (voir « Décisions validées »).
4. **Un coach** : l'utilisateur choisit librement son entraînement ; un **plan du jour** suggéré viendra plus tard (moteur de coaching, §8).

**Principes pédagogiques** (guident les choix de conception) :

- Pratique délibérée : exercices ciblés sur les faiblesses, avec retour immédiat.
- Répétition espacée (FSRS) pour tout ce qui se mémorise (lignes d'ouverture, positions de finale, motifs, erreurs perso).
- Difficulté désirable : viser ≈ 80–85 % de réussite sur les problèmes (ni ennui, ni frustration).
- Entrelacement des thèmes (ne pas faire 50 fourchettes d'affilée : en partie on ne sait pas que c'est une fourchette).
- Processus > résultat : récompenser la routine de vérification, pas seulement le coup juste.
- Ni gamification manipulatrice, ni série quotidienne culpabilisante (cohérent avec le module psychologie).

**Niveaux** : trois bandes servent à étiqueter tout le contenu et à régler la difficulté.

| Bande         | Elo approx. | Objectifs dominants                                                                          |
| ------------- | ----------- | -------------------------------------------------------------------------------------------- |
| Fondations    | 700–1100    | Ne plus laisser de pièce en prise, tactiques d'1–2 coups, mats de base, finales élémentaires |
| Intermédiaire | 1100–1600   | Calcul 3–4 coups, répertoire d'ouvertures, structures de pions, finales de tours             |
| Avancé        | 1600–2000+  | Prophylaxie, plans de milieu de jeu, finales techniques, gestion du temps, préparation       |

---

## 2. Périmètre fonctionnel par module

### 2.1 Tactique

- Base de problèmes Lichess (CC0), filtrée par thème, niveau, ouverture.
- Modes : entraînement adaptatif, thème ciblé, « rafale » chronométrée, séries sans erreur.
- **Problèmes issus de MES parties** (erreurs détectées par l'analyse) – le plus rentable.
- Un problème raté entre en répétition espacée ; un problème réussi n'est pas répété (on ajuste seulement le rating de compétence).
- Cours courts par motif (fourchette, clouage, enfilade, attaque à la découverte, rayons X, déviation, attraction, surcharge, mat du couloir…) avec exercices progressifs.

### 2.2 Calcul

- « Trouve toute la variante » : l'utilisateur joue ses coups ET les réponses adverses (arbre de variantes), validé par le moteur.
- Méthode des **coups candidats** (Kotov) : saisir 2–3 candidats avant de jouer ; feedback sur ceux oubliés.
- Coups forcés d'abord : exercices « liste tous les échecs / captures / menaces ».
- Mode **calcul à l'aveugle** : plateau masqué après N secondes, il faut jouer la ligne de tête.
- Profondeur progressive (2 → 3 → 5 coups) selon la réussite.

### 2.3 Visualisation

- Coordonnées (cases, couleurs, diagonales), trajet du cavalier, cases attaquées par une pièce.
- Plateau sans pièces / pièces invisibles, jeu à l'aveugle partiel, lecture de notation sans plateau.
- Exercices « quelle case est en prise ? », « combien de pièces défendent X ? ».

### 2.4 Processus anti-gaffe

- **Routine de vérification** (checklist guidée, désactivable avec le niveau) : « Qu'est-ce que l'adversaire vient de changer ? Quelle est sa menace ? Mes pièces sont-elles défendues ? Échecs / captures / menaces ? Mon coup laisse-t-il quelque chose en prise ? »
- Mode **partie contre bot avec pause** : confirmation optionnelle avant de jouer (« as-tu vérifié ? ») + détecteur de gaffe avant validation (option « annuler le coup » réservée à l'entraînement).
- **Classification de MES gaffes** : pièce en prise, menace adverse manquée, tactique manquée, mauvaise évaluation de fin de calcul, gaffe en zeitnot… (heuristiques sur positions + moteur).
- Entraînement ciblé : positions de mes propres gaffes, drills « pièces en prise » à vitesse croissante.
- Tableau de bord : taux de gaffes / 100 coups, par phase, par type, par contrôle de temps.

### 2.5 Ouvertures

- Constructeur de **répertoire** (arbre blancs/noirs), import PGN / étude Lichess exportée.
- Explorateur : statistiques Lichess (parties de maîtres + joueurs) filtrées par niveau.
- **Entraînement de répertoire en FSRS** : une carte = (position, coup attendu) ; enfants débloqués après le parent ; enterrement des cartes sœurs.
- Détection de **déviation** dans mes parties : « tu sors de ton répertoire au coup 7 contre 1.d4 d5 2.c4 e6 3.Cf3 Cf6 … ».
- Rapport : ouvertures jouées, score, précision moyenne, coup où je perds de l'évaluation.
- Notions de plans, structures de pions typiques et parties modèles par ouverture (contenu éditorial, §9).
- Noms d'ouvertures : table ECO (lichess-org/chess-openings, CC0).

### 2.6 Stratégie de milieu de jeu

- Leçons interactives : structures de pions (isolé, pendu, chaîne, Carlsbad…), cases faibles, activité des pièces, colonnes ouvertes, échange de pièces, paire de fous, roque opposés, prophylaxie.
- Exercices : « évalue la position » (qui est mieux ? de combien ?), « choisis le plan » (QCM validé par évaluation moteur + explication rédigée), « quelle pièce échanger ? ».
- Bibliothèque de positions types tirées de parties réelles, étiquetées (thème, bande de niveau).

### 2.7 Finales

- Parcours : mats de base → opposition / cases clés / règle du carré → finales de pions → Lucena / Philidor → tours → fous & cavaliers.
- Positions jouées **contre la table de finales** (Syzygy) : l'adversaire joue parfaitement, l'app dit si le résultat théorique est conservé.
- Cartes FSRS pour les positions-clés (Lucena, Philidor, Vancura, etc.).

### 2.8 Analyse de partie

- Import (Lichess, Chess.com, PGN, collage), analyse Stockfish locale.
- Précision (%), classification coup par coup, moments critiques, courbe d'évaluation, résumé par phase.
- Mode **« devine le coup »** (type Lichess) sur mes propres parties.
- Bouton « transformer en exercices / cartes » sur chaque erreur.
- Annotations manuelles, export PGN.

### 2.9 Mémorisation

- Moteur unique de cartes FSRS (§7) partagé par tous les modules.
- Types de carte : coup d'ouverture, position de finale, problème raté, gaffe perso, motif, carte libre texte+position.
- File quotidienne avec plafond (nouvelles cartes/jour, révisions max), statistiques de rétention, optimisation des paramètres FSRS personnels.

### 2.10 Gestion du temps

- Import des horloges (`[%clk]` dans les PGN) → temps par coup, par phase, par complexité.
- Détection : temps passé sur des coups évidents, coups critiques joués trop vite, zeitnot récurrent.
- Entraînements : budget de temps par partie (« 20 % sur le coup 10–20 »), mode « décision rapide » sur positions simples, parties contre bot avec cadence réelle.
- Conseils personnalisés basés sur les données.

### 2.11 Psychologie

- Rituel avant partie (respiration 60 s, intention de partie) et après partie (journal : émotion, cause de la défaite, une leçon).
- Détection du **tilt** : défaites enchaînées, parties de plus en plus rapides, chute d'Elo en session → suggestion de pause (jamais bloquante).
- Corrélations : heure de la journée, durée de session, Elo avant/après une défaite.
- Contenu : mentalité de croissance, gestion de l'échec, « résultat ≠ qualité du processus », préparation à l'adversaire plus fort.

### 2.12 Transverse

- **Évaluation initiale** (placement) : mini-test de problèmes + import de parties → niveau estimé + profil de faiblesses.
- **Plan du jour** (coach, §8).
- **Jouer contre un bot** (Stockfish niveau réglable ; bots « humains » type Maia en phase ultérieure).
- Tableau de bord progression, objectifs, historique.
- i18n dès le départ (fr + en).

---

## 3. Choix techniques

### 3.1 Décision de plateforme

| Option                           | Windows             | Web                                 | Mobile                       | Écosystème échecs                                     | Verdict                          |
| -------------------------------- | ------------------- | ----------------------------------- | ---------------------------- | ----------------------------------------------------- | -------------------------------- |
| **TypeScript + React + Tauri 2** | ✅ léger (WebView2) | ✅ même code                        | ✅ Tauri mobile ou Capacitor | ✅✅ (chessground, chessops, stockfish.wasm, ts-fsrs) | **Retenu**                       |
| Electron                         | ✅ lourd (~150 Mo)  | ✅                                  | ❌                           | ✅✅                                                  | Plan B si WebView2 pose problème |
| Flutter                          | ✅                  | ⚠️ lourd, mauvais SEO/accessibilité | ✅✅                         | ❌ tout à réécrire                                    | Écarté                           |
| .NET MAUI / WinUI                | ✅✅                | ❌                                  | ⚠️                           | ❌                                                    | Écarté (pas de web)              |
| React Native + RN Windows        | ⚠️                  | ⚠️                                  | ✅✅                         | ⚠️                                                    | Écarté                           |

**Pourquoi** : tout l'écosystème échecs de qualité est en TypeScript/JS ; une seule base UI pour Windows, web et mobile ; Tauri 2 produit un installeur Windows de quelques Mo, accède au système de fichiers, au trousseau, aux deep links, et sait lancer des binaires natifs (Stockfish).
**Risque assumé** : Tauri mobile est moins mature que React Native. Mitigation : toute la logique est dans des packages TS indépendants du shell ; au moment du mobile (phase 6) on choisit **Tauri mobile ou Capacitor** sans réécrire l'UI.

### 3.2 Stack

| Couche             | Choix                                                                                                                                                       |
| ------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Langage            | TypeScript strict partout (Rust seulement pour les commandes Tauri natives si nécessaire)                                                                   |
| UI                 | React 19 + Vite, Tailwind, composants accessibles (Radix UI), thème clair/sombre                                                                            |
| État               | Zustand (UI) + TanStack Query (données asynchrones)                                                                                                         |
| Plateau            | **@lichess-org/chessground** (celui de Lichess ; l'ancien paquet `chessground` est déprécié)                                                                |
| Règles / PGN / FEN | **chessops** (parsing PGN avec commentaires/NAG/%clk, SAN, UCI, variantes)                                                                                  |
| Moteur             | **Stockfish WASM** en Web Worker partout (version « lite » monothread, sans en-têtes COOP/COEP) ; interface `Engine` prête pour un sidecar natif plus tard  |
| Répétition espacée | **ts-fsrs** (FSRS-6) ; optimiseur de paramètres WASM (fsrs-rs)                                                                                              |
| Base locale        | **SQLite** : `sqlite-wasm` + OPFS (web, et WebView2 desktop) ; même schéma et même code partout. Migrations versionnées. Accès via Kysely (requêtes typées) |
| Graphiques         | visx ou Recharts (courbes d'éval, temps, progression)                                                                                                       |
| i18n               | i18next (fr, en)                                                                                                                                            |
| Monorepo           | pnpm workspaces (Turborepo ajouté plus tard, voir ADR-0002)                                                                                                 |
| Tests              | Vitest (unitaires), Playwright (E2E web), tests de propriétés sur la logique de chess, tests de non-régression de l'algo FSRS                               |
| CI/CD              | GitHub Actions : lint, typecheck, tests, build Tauri Windows, signature, release                                                                            |
| Backend (phase 5)  | Postgres managé (Supabase) ou service léger maison : auth, sync d'événements. **Optionnel** pour l'usage de base                                            |

### 3.3 Architecture

```
┌────────────────────────── apps ──────────────────────────┐
│  desktop (Tauri 2, Windows)   web (Vite PWA)   mobile    │
│        └───────────── même UI React ─────────────┘       │
└───────────────────────────┬──────────────────────────────┘
                            │
┌────────────── packages (TypeScript pur, testés) ─────────┐
│ core        règles, FEN/PGN/UCI, hash de position        │
│ engine      interface UCI ; backends : sidecar | WASM    │
│ srs         FSRS, files de révision, enterrement         │
│ importers   Lichess, Chess.com, PGN, CSV puzzles, ECO    │
│ analysis    pipeline d'analyse, précision, classification│
│ coach       modèle de compétence, plan du jour, détecteurs│
│ content     schémas + chargeur de leçons/exercices       │
│ db          schéma SQLite, migrations, dépôts            │
│ sync        journal d'événements, résolution de conflits │
│ ui          composants (plateau, graphiques, cartes)     │
└──────────────────────────┬───────────────────────────────┘
                           │ interfaces (ports)
┌─────────── adaptateurs par plateforme ────────────────────┐
│ Storage  : OPFS (web/WebView2) | fichier natif (option)   │
│ Secrets  : trousseau Windows (desktop) | WebCrypto (web)  │
│ HTTP     : plugin-http Tauri (hors CORS) | fetch          │
│ Engine   : sidecar | WASM                                 │
│ OAuth    : deep link / loopback | redirection web         │
└───────────────────────────────────────────────────────────┘
```

Règle clé : **les packages ne connaissent pas la plateforme**, ils reçoivent des « ports » injectés. C'est ce qui rend web et mobile quasi gratuits.

### 3.4 Licences (décision à prendre tôt — ADR-001)

Stockfish (GPL-3) et chessground (GPL-3) imposent de **distribuer le code source** de l'application distribuée (copyleft). Options :

- **A. Application open source GPL-3**, monétisation par services (sync cloud, contenu premium, mise à jour confort). Recommandé : cohérent avec l'écosystème, zéro friction légale.
- B. Code fermé : il faut alors remplacer chessground et ne pas embarquer Stockfish (moteur lancé à part, bots serveurs…) — coûteux et fragile.

Vérifier aussi : licences des jeux de pièces et sons, conditions d'utilisation de l'API Chess.com pour un usage commercial, et ne pas utiliser les marques « Lichess »/« Chess.com » comme nom ou logo.

---

## 4. Formats de données et outillage

| Format                          | Usage                                                                                                                                                                                                                                          | Outil                  |
| ------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------- |
| **FEN**                         | Position (stockage, puzzles, exercices)                                                                                                                                                                                                        | chessops               |
| **PGN**                         | Parties, répertoires, leçons annotées. Tags, commentaires `{}`, NAG `$n`, variantes `()`, horloges `[%clk h:mm:ss]`, évals `[%eval 0.35]`, flèches `[%cal Gd2d4]`                                                                              | chessops `parsePgn`    |
| **SAN / LAN / UCI**             | Notation des coups ; UCI pour le moteur et le stockage compact                                                                                                                                                                                 | chessops               |
| **EPD**                         | Positions + opérations (suites de tests, bases de positions)                                                                                                                                                                                   | parseur dédié (simple) |
| **Lichess puzzle CSV**          | `PuzzleId,FEN,Moves,Rating,RatingDeviation,Popularity,NbPlays,Themes,GameUrl,OpeningTags`. **Attention** : le FEN est la position AVANT le coup de l'adversaire ; le 1er coup de `Moves` est celui de l'adversaire, la solution commence au 2ᵉ | script d'import        |
| **ECO TSV**                     | `eco, name, pgn` (lichess-org/chess-openings, fichiers a–e.tsv) → noms d'ouvertures par position                                                                                                                                               | script d'import        |
| **Syzygy** (tablebases)         | Finales ≤ 7 pièces : API `tablebase.lichess.ovh` (en ligne), fichiers locaux optionnels pour les ≤ 5 pièces                                                                                                                                    | client HTTP            |
| **Polyglot `.bin`** (optionnel) | Livres d'ouvertures binaires, import de répertoire tiers                                                                                                                                                                                       | lecteur simple         |
| **Format de contenu maison**    | Leçons / exercices : Markdown + blocs `chess` (PGN/FEN), métadonnées YAML (thème, bande, objectifs). Validé par schéma (zod)                                                                                                                   | package `content`      |
| **Hash de position**            | Zobrist 64 bits sur FEN normalisé (sans compteurs) → identifier une même position entre parties, répertoire, cartes                                                                                                                            | package `core`         |

**Base de problèmes** : le dump Lichess contient plusieurs millions de problèmes. Stratégie : livrer avec l'app un **sous-ensemble curé (~100 000)** équilibré par thème et par rating (700–2400), compressé (~15–20 Mo) ; télécharger le reste à la demande. Rejeter les problèmes à popularité faible ou RD élevé.

**Précision et classification** (formules Lichess, reproductibles) :

- Win% = 50 + 50 × (2 / (1 + e^(−0,00368208 × cp)) − 1)
- Précision d'un coup = 103,1668 × e^(−0,04354 × (Win%avant − Win%après)) − 3,1669
- Erreur : inexactitude / erreur / gaffe quand la perte de Win% ≥ 10 / 20 / 30 points.

---

## 5. Intégrations Lichess et Chess.com

### 5.1 Lichess

- **Liaison de compte** : OAuth 2 + **PKCE** (client public : pas de secret ni d'enregistrement préalable). Sur desktop : redirection par deep link (`tauri-plugin-deep-link`) ou serveur loopback ; sur web : redirection classique. Scopes minimaux (aucun pour les parties publiques ; `puzzle:read` si on lit l'activité de problèmes). Jeton stocké dans le **trousseau Windows**, jamais en base ni en clair.
- **Import des parties** : `GET /api/games/user/{username}` en `application/x-ndjson`, paramètres `since`, `until`, `max`, `pgnInJson`, `clocks`, `evals`, `opening`, `accuracy`. Lecture en flux, un enregistrement par ligne.
- **Sync incrémentale** : mémoriser `lastCreatedAt` et relancer avec `since`. Une seule requête à la fois ; sur HTTP 429, attendre 60 s.
- **Autres endpoints utiles** : `/api/user/{u}` (profil, ratings), `/api/user/{u}/rating-history`, activité/historique de problèmes, explorateur d'ouvertures (accès désormais avec jeton — à vérifier à l'implémentation), cloud eval, tablebase.
- Côté Lichess, les évaluations déjà calculées (`evals=true`) peuvent éviter une analyse locale.

### 5.2 Chess.com

- API publique (PubAPI), **lecture seule, sans OAuth** : la « liaison » = saisie du pseudo (validation par `GET /pub/player/{u}`).
- Preuve de propriété (optionnelle) : demander de placer un code aléatoire dans le champ lieu/bio du profil, puis le relire.
- **Import** : `GET /pub/player/{u}/games/archives` → liste d'URL mensuelles → `GET /pub/player/{u}/games/{YYYY}/{MM}` (contient le PGN, `time_control`, `rules`, `accuracies` quand disponibles, horloges dans le PGN).
- Respecter : `User-Agent` explicite avec contact, requêtes **séquentielles**, cache via `ETag`/`If-None-Match`, backoff sur 429, ne rafraîchir que le mois courant.
- Autres : `/pub/player/{u}/stats` (ratings), problèmes via API publique limités → ne pas dépendre de Chess.com pour les exercices.
- Vérifier CORS depuis le navigateur ; sur desktop on passe par `plugin-http` donc pas de problème.

### 5.3 Pipeline d'import commun

```
source ─▶ normalisation PGN ─▶ dédup (source+id, hash des coups)
      ─▶ stockage brut ─▶ file d'analyse (arrière-plan, priorité récentes)
      ─▶ détection d'erreurs ─▶ génération de problèmes/cartes ─▶ stats
```

Aussi : glisser-déposer de fichiers `.pgn`, collage presse-papiers (PGN/FEN), import d'une URL de partie.

---

## 6. Modèle de données (SQLite, local-first)

Tables principales (le détail sera dans `packages/db`, migrations numérotées) :

- `profile` — niveau estimé, préférences, langue, contrôle de temps préféré.
- `accounts` — plateforme, pseudo, date de dernière sync (les **jetons ne sont pas ici**).
- `games` — source, id source, PGN, joueurs, résultat, cadence, couleur de l'utilisateur, Elo, date, ECO, hash de la partie.
- `game_plies` — partie, ply, hash de position, coup, éval (cp/mat), meilleur coup, Win%, classification, temps passé, type d'erreur.
- `positions` — hash, FEN normalisé (dédupliqué).
- `puzzles` — id, FEN, coups, rating, thèmes, ouverture, source (lichess / perso / éditorial).
- `puzzle_attempts` — problème, résultat, durée, indices utilisés, date.
- `skill_ratings` — dimension (thème, phase, module), rating Glicko-2, RD, volatilité.
- `cards` — id, type, charge utile (JSON), deck, **état FSRS** (due, stability, difficulty, state, reps, lapses, last_review).
- `review_logs` — **journal append-only** (carte, note, durée, état avant/après). Source de vérité de la sync.
- `repertoires`, `repertoire_nodes` — arbre de coups, couleur, annotations, lien vers cartes.
- `lessons_progress` — leçons/exercices vus et validés.
- `journal`, `mood_checkins` — psychologie.
- `sessions` — sessions d'entraînement (durée, modules, résultats) pour le tilt et les stats.
- `sync_events` — file d'événements à envoyer.

Principes : horodatage UTC, identifiants UUIDv7, `deleted_at` (suppression logique), migrations versionnées et testées sur bases d'exemple, sauvegarde/export complet en un fichier.

---

## 7. Répétition espacée (FSRS)

- **Bibliothèque** : `ts-fsrs` (FSRS-6, 21 paramètres, rétention cible par défaut 0,90 ; réglable 0,80–0,95).
- **Carte** = unité testable unique : (position → coup attendu) ; pour une ligne d'ouverture chaque coup de l'utilisateur est une carte.
- **Notation** (4 boutons FSRS mappés automatiquement) :
  | Résultat                                   | Note  |
  | ------------------------------------------ | ----- |
  | Faux                                       | Again |
  | Juste après indice ou lentement            | Hard  |
  | Juste dans le temps normal                 | Good  |
  | Juste très vite, avec confiance            | Easy  |
  | (Pour les cartes libres, boutons manuels.) |
- **File quotidienne** : plafonds de nouvelles cartes et de révisions, tri par retard puis par module, entrelacement des modules.
- **Enterrement des sœurs** : pas deux cartes de la même ligne/du même thème dans la même séquence immédiate.
- **Déblocage hiérarchique** : un coup d'ouverture n'est « nouveau » que si son parent est appris (stabilité minimale).
- **Optimisation personnalisée** des paramètres après ≥ 1 000 révisions (fsrs-rs en WASM), en tâche de fond.
- **Journal d'événements immuable** (`review_logs`) : permet de recalculer l'état d'une carte après changement de paramètres et rend la sync sans conflit (on fusionne des journaux, on rejoue).
- **Séparation** : les problèmes tactiques normaux ne passent pas par FSRS (ils utilisent `skill_ratings`) ; seuls les échecs et les contenus à mémoriser y entrent.

---

## 8. Moteur de coaching (le liant du produit)

1. **Modèle de compétence** : un rating Glicko-2 par thème tactique, phase de jeu, type de finale, ouverture, + indicateurs (vitesse, taux de gaffe, rétention FSRS).
2. **Diagnostic** : à partir des parties importées → taux d'erreurs par catégorie (tactique manquée, pièce en prise, zeitnot, ouverture, finale perdue/nulle ratée…) classées par **points d'Elo potentiels récupérables**.
3. **Plan du jour** (15 / 30 / 60 min) : mix pondéré — révisions FSRS dues (priorité), tactique ciblée sur le thème le plus faible, 1 exercice de calcul, 1 élément de contenu (leçon / finale / ouverture), 1 partie ou analyse de partie récente. Toujours expliquer **pourquoi** cet exercice (« 5 de tes 8 dernières défaites viennent de pièces laissées en prise »).
4. **Détecteurs** (fonctions pures testables) : pièce en prise, fourchette manquée, clouage ignoré, mat manqué, mauvais échange, perte de temps, sortie de répertoire.
5. **Adaptation** : difficulté ajustée pour viser ≈ 80–85 % de réussite ; allègement si fatigue/tilt détecté.
6. **Transparence** : l'utilisateur peut tout désactiver et choisir librement son entraînement (le plan est une suggestion).

---

## 9. Contenu (le vrai goulot d'étranglement)

| Contenu                                      | Source                                       | Licence        | Travail             |
| -------------------------------------------- | -------------------------------------------- | -------------- | ------------------- |
| Problèmes tactiques                          | Dump Lichess                                 | CC0            | Filtrage + curation |
| Parties pour exemples / stats                | Base Lichess                                 | CC0            | Échantillonnage     |
| Noms d'ouvertures                            | lichess-org/chess-openings                   | CC0            | Import              |
| Stats d'ouvertures                           | API Lichess explorer                         | conditions API | Cache               |
| Finales (positions-types)                    | Écrites à la main + vérifiées tablebase      | à nous         | Création            |
| Leçons de stratégie, calcul, psychologie     | **À écrire** (ou co-écrire avec un coach/MI) | à nous         | Gros chantier       |
| Répertoires d'ouverture « prêts à l'emploi » | À écrire (lignes simples, plans expliqués)   | à nous         | Gros chantier       |

Pipeline de validation automatique : chaque exercice est contrôlé par Stockfish (MultiPV) → la solution est-elle unique/claire ? la position est-elle légale ? les coups sont-ils valides ? Les leçons passent un linter (schéma, FEN valides, pas de lien mort). **Un relecteur humain (coach) est vivement conseillé** pour les explications.

---

## 10. Plan de réalisation (phases et jalons)

Les tailles : S ≈ 1–2 sem., M ≈ 3–5 sem., L ≈ 6–10 sem. (1 développeur à plein temps ; à ajuster.)

### Phase 0 — Fondations (M)

- ADR : licence, plateforme, stockage, moteur, nom, positionnement.
- Monorepo, lint/format/typecheck, CI, conventions, design system minimal.
- Packages `core` (règles/FEN/PGN) et `db` (SQLite WASM + migrations) avec tests.
- Plateau chessground intégré, jouer des coups légaux, thème.
- Shell Tauri Windows qui s'ouvre, installeur de test.
- **Sortie** : un plateau jouable dans l'app Windows ET dans le navigateur, base locale persistante.

### Phase 1 — Noyau d'entraînement (L) → **Alpha interne**

- Interface moteur (UCI) + Stockfish WASM (web, Windows, mobile).
- Import du sous-ensemble de problèmes + entraîneur tactique (thèmes, rating, séries).
- Moteur de cartes FSRS + file de révision + échecs de problèmes → cartes.
- Import PGN (fichier / collage) + visionneuse de partie.
- **Sortie** : on peut s'entraîner chaque jour en tactique avec révisions espacées, hors-ligne.

### Phase 2 — Parties réelles & analyse (L) → **Bêta fermée**

- Liaison Lichess (OAuth PKCE) + import NDJSON + sync incrémentale.
- Import Chess.com (pseudo, archives mensuelles).
- Pipeline d'analyse en arrière-plan, précision, classification, courbe d'éval, moments critiques.
- « Transformer en exercice/carte » sur une erreur ; problèmes issus de mes parties.
- Rapport temps (horloges) v1.
- **Sortie** : l'utilisateur lie son compte, voit son analyse et s'entraîne sur ses propres erreurs.

### Phase 3 — Anti-gaffe + Ouvertures + Finales (L)

- Classification des gaffes, tableau de bord, routine de vérification, drills « pièces en prise », bot avec pause.
- Répertoire : éditeur, import PGN, explorateur, entraînement FSRS, détection de déviation, rapport.
- Finales : parcours, positions contre tablebase, cartes de positions-clés.
- **Sortie** : les trois grandes causes de perte de points (gaffes, ouverture, finales) sont couvertes.

### Phase 4 — Calcul, visualisation, stratégie, temps, psychologie + Coach (L)

- Modules calcul (arbre de variantes, candidats, aveugle) et visualisation.
- Leçons de stratégie + exercices « évalue / choisis le plan ».
- Gestion du temps : entraînements + conseils ; module psychologie (rituels, journal, tilt).
- Évaluation de placement + **plan du jour** + tableau de bord progression.
- **Sortie** : le produit tient la promesse « coach complet ».

### Phase 5 — Web + comptes + synchronisation (M–L)

- PWA publiée (hors-ligne via service worker, installable).
- Backend : authentification, sync des événements (`review_logs`, parties, répertoires, réglages), chiffrement en transit, export/suppression RGPD.
- Résolution de conflits (journal fusionné, dernier-écrit-gagne pour les réglages).
- **Sortie** : même compte sur Windows et navigateur.

### Phase 6 — Mobile (M–L)

- Choix Tauri mobile vs Capacitor (spike de 1–2 semaines au début de la phase).
- UI adaptative tactile (plateau, glisser/tap, taille de police), notifications de révisions, mode hors-ligne.
- Moteur WASM lite ; éventuellement natif plus tard.
- Publication Play Store / App Store (comptes développeurs, revue, politique de confidentialité).

### Phase 7 — Lancement public (M)

- Microsoft Store (MSIX) + installeur direct signé (Azure Trusted Signing ou certificat), mise à jour automatique (`tauri-plugin-updater`).
- Modèle économique, page web, onboarding, support, analytics respectueux (opt-in).
- Performance, accessibilité (clavier, lecteur d'écran, daltonisme), traduction.

> **Web plus tôt** : comme le code est partagé, on peut publier une version web « démo » dès la fin de phase 1 pour recueillir des retours, sans attendre la sync.

---

## 11. Qualité, sécurité, vie privée

- **Tests** : règles/PGN (jeux d'essai + perft du moteur utilisé), FSRS (vecteurs de référence), détecteurs d'erreurs (positions étiquetées), importers (fixtures réelles Lichess/Chess.com), migrations DB, E2E (Playwright sur la version web, WebDriver sur Tauri).
- **Performance** : analyse en Web Worker/sidecar sans bloquer l'UI ; indexation SQLite sur `(hash)`, `(due)` ; cible : ouverture de l'app < 2 s, premier problème affiché < 300 ms.
- **Sécurité** : jetons dans le trousseau, CSP stricte dans la WebView, permissions Tauri minimales (liste blanche de commandes et de domaines), validation de tout PGN/FEN importé, binaire Stockfish vérifié par hash, dépendances auditées (`pnpm audit`, Dependabot), signature du code.
- **RGPD** : données locales par défaut, consentement explicite pour la sync et les statistiques, export JSON complet, suppression du compte et des données serveur, pas de revente.
- **Accessibilité** : navigation clavier complète (saisie de coups au clavier), contraste, sons optionnels, taille ajustable.

---

## 12. Risques et parades

| Risque                                               | Gravité | Parade                                                                                                        |
| ---------------------------------------------------- | ------- | ------------------------------------------------------------------------------------------------------------- |
| Volume de contenu pédagogique de qualité             | 🔴      | Commencer par données CC0 + contenu minimal viable ; recruter un coach ; schémas stricts pour industrialiser  |
| Licence GPL vs ambition commerciale                  | 🟠      | Trancher en ADR-001 dès la phase 0                                                                            |
| Tauri mobile immature                                | 🟠      | Logique indépendante du shell ; Capacitor en plan B ; spike avant la phase 6                                  |
| Limites/CGU des API (Chess.com, explorateur Lichess) | 🟠      | Cache agressif, import incrémental, dégradation gracieuse, relecture des CGU avant commercialisation          |
| Analyse lente sur machines modestes                  | 🟠      | Profondeur adaptative, file en arrière-plan, réutiliser les évals Lichess, mode « analyse légère »            |
| Surcharge fonctionnelle (11 modules)                 | 🟠      | Livrer par phases, chaque module a une définition de « fini » minimale ; le plan du jour masque la complexité |
| Dérive pédagogique (exercices ambigus)               | 🟡      | Validation moteur automatique + retours utilisateurs (« signaler »)                                           |
| WebView2 absent / ancien                             | 🟡      | Runtime embarqué par l'installeur (bootstrapper)                                                              |
| Motivation/rétention                                 | 🟡      | Plan du jour court, objectifs réalistes, pas de culpabilisation                                               |

---

## 13. Indicateurs de succès

- Activation : % d'utilisateurs qui terminent l'évaluation de placement et une première session.
- Rétention J1 / J7 / J30, sessions par semaine.
- Engagement utile : cartes révisées/jour, taux de rétention FSRS réel vs cible, % de plans du jour terminés.
- Efficacité : progression d'Elo (Lichess/Chess.com liés) sur 3 mois, baisse du taux de gaffes/100 coups.
- Qualité : crash-free sessions, temps de réponse, avis stores.

---

## 14. Hypothèses initiales (remplacées par « Décisions validées » en cas de conflit)

1. **Langue** : français en premier, anglais prévu dès l'architecture.
2. **Équipe** : développeur principal solo, assisté par IA ; contenu pédagogique à écrire ou à faire relire.
3. **Licence** : option A (open source GPL-3) tant que non décidé autrement.
4. **Internet** : l'app fonctionne hors-ligne ; internet requis seulement pour imports, sync et explorateur.
5. **Modèle économique** : indéterminé (gratuit + premium probable) ; n'impacte pas les phases 0–4.
6. **Bots** : Stockfish bridé au départ ; bots « humains » (Maia/Leela) reportés.
7. **Hors périmètre v1** : jeu en ligne entre utilisateurs, vidéo/cours filmés, variantes (Chess960 sera possible via chessops plus tard), reconnaissance de plateau par photo.

---

## 15. Prochaines actions concrètes (1, 2 et 4 faites en livraisons 1 et 2 ; 3 : `core` fait, `db` reste)

1. Valider/ajuster la section 14 et rédiger ADR-001 (licence) et ADR-002 (stack).
2. Initialiser le monorepo pnpm + Turborepo, TypeScript strict, ESLint/Prettier, Vitest, CI GitHub Actions.
3. Créer `packages/core` (chessops, hash de position) + `packages/db` (sqlite-wasm + 1ʳᵉ migration).
4. Créer `apps/web` (Vite + React + chessground) avec un plateau jouable, puis `apps/desktop` (Tauri 2) qui l'embarque.
5. Script `tools/import-puzzles` : CSV Lichess → SQLite (sous-ensemble curé) avec tests sur échantillon.
6. Spike Stockfish : lancer le Worker WASM derrière l'interface `Engine`.
