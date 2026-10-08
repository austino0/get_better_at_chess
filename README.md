# Get Better at Chess

Application gratuite et open source pour progresser aux échecs, du débutant (~700 Elo) à l'expert
(~2000 FIDE) : tactique, calcul, anti-gaffe, ouvertures, finales, analyse de ses propres parties,
répétition espacée (FSRS), gestion du temps et psychologie.

Windows d'abord (Tauri), puis web et mobile avec le même code.

- Plan complet et décisions : [docs/PLAN.md](docs/PLAN.md)
- Décisions d'architecture : [docs/adr/](docs/adr/)
- Barre de qualité : [CONSTRAINTS.md](CONSTRAINTS.md)
- Données collectées : [DATA.md](DATA.md)
- Contribuer : [CONTRIBUTING.md](CONTRIBUTING.md)

## Développement

Prérequis : Node.js 24+, pnpm, (Rust et les outils C++ de Visual Studio pour l'application Tauri).

```
pnpm install
pnpm check      # lint, formats, en-têtes de licence, types, tests + couverture
pnpm --filter @gbc/web dev        # version web sur http://localhost:5173
pnpm --filter @gbc/desktop dev    # application Windows (Tauri), lance aussi la version web
pnpm --filter @gbc/desktop build  # installeur Windows (apps/desktop/src-tauri/target/release/bundle/nsis)
```

## Licence

GPL-3.0-or-later. Voir [LICENSE](LICENSE).
