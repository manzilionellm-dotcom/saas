# ARCHITECTURE & REVUE TECHNIQUE

Document destiné à une revue d'ingénierie. Honnête sur les forces, les compromis
et la dette technique.

## 1. Localisation

- **Repo** : `manzilionellm-dotcom/saas`
- **Branche** : `claude/sass-30-products-5w2deo`
- **Cloner & lancer** :
  ```bash
  git clone <repo> && cd saas
  git checkout claude/sass-30-products-5w2deo
  npm install
  cp .env.example .env.local   # renseigner ANTHROPIC_API_KEY (optionnel)
  npm run dev                  # http://localhost:3000
  npm run build && npm run lint # doivent passer (verts)
  ```

## 2. Stack

- **Next.js 16** (App Router) + **React 19** + **TypeScript** (strict)
- **Tailwind CSS v4**
- **@anthropic-ai/sdk** pour Claude
- Persistance : **abstraction `Repository`** — implémentation actuelle = **store fichier JSON**
  (`.data/viral-ai-os.json`). `prisma/schema.prisma` fourni pour le chemin de production.

## 3. Deux couches

### A. Vitrine marketing (statique)
Catalogue de ~55 produits SaaS de démonstration + pages produits interactives :
Versailles (poste de commandement), SilkRoute (sourcing), Réunion d'équipe IA,
Mémoire, Keystone (résilience), Guide Chine, outil M3U.

### B. Moteur réel — « Viral AI OS » (`/studio`)
Outil mono-utilisateur, local-first, construit par phases (voir §7).

## 4. Cartographie des dossiers

```
app/
  page.tsx                     # catalogue (vitrine)
  layout.tsx / error.tsx / global-error.tsx / not-found.tsx   # Keystone (résilience)
  lib/
    db/
      types.ts                 # modèles du domaine
      repo.ts                  # interface Repository + JsonRepository (singleton)
      seed.ts                  # données de démo + versions de prompts
    llm/
      provider.ts              # interface LLMProvider
      claude.ts                # ClaudeProvider
      local.ts                 # LocalProvider (repli sans clé, contenu déterministe)
      index.ts                 # getProvider() + runLLM() (logs structurés)
    prompts.ts                 # templates versionnés (Content Factory)
    genome.ts                  # agrégation résultats -> Business Genome
    brain.ts                   # Brief / Decision Engine (ancrés données, seuil de confiance)
    cost.ts                    # estimation tokens -> coût
    products.ts, sourcing.ts, monitor.ts, memory.ts, seo-audit.ts, advisors.ts, m3u.ts
  studio/                      # UI du moteur (Business, Content Factory, Genome, Coach, Prompt Studio)
  api/studio/                  # routes: business, generate, results, brief, decision, coach, prompts, export, test-llm
  audit/, api/audit/, api/fix/ # analyseur SEO/AEO réel (+ rédaction via Claude)
  versailles/, api/monitor/, api/cron/check/   # surveillance (cron quotidien)
prisma/schema.prisma           # schéma canonique (chemin Prisma/Postgres)
```

## 5. Abstractions clés (points de revue)

- **`Repository`** (`app/lib/db/repo.ts`) — toute la logique métier passe par cette
  interface. Le stockage (JSON aujourd'hui) est remplaçable par `PrismaRepository`
  sans toucher aux routes. Singleton via `globalThis` (évite le rechargement en dev).
- **`LLMProvider`** (`app/lib/llm/`) — aucun appel direct à l'API dans la logique
  métier ; `runLLM()` sélectionne Claude ou le repli local et **journalise** chaque
  appel (input/output/tokens/latence/erreur) dans `LLMLog`.

## 6. Modèle de données

`Business`, `Generation`, `Result`, `DailyBrief`, `Competitor`, `LLMLog`,
`BusinessGenome`, `Decision`, `Conversation`, `PromptVersion`.
Voir `app/lib/db/types.ts` (runtime) et `prisma/schema.prisma` (production).

## 7. État des phases (Viral AI OS)

| Phase | Sujet | État |
|------|-------|------|
| 1 | Fondations + Business + LLMProvider + logs + seed | ✅ réel, testé |
| 2 | Content Factory (7 plateformes × 6 livrables × N langues, coût/version, export JSON/CSV) | ✅ réel, testé |
| 3 | Results loop + Daily Brief | ✅ réel, testé |
| 5 | AI Coach (contexte Genome) | ✅ réel, testé |
| 7 | Business Genome + Decision Engine (seuil de confiance) | ✅ réel, testé |
| 8 | Prompt Studio (perf par version, volume affiché) | ✅ réel, testé |
| 6 | GEO/AEO Agent | 🟡 base réelle (`/audit` + `/api/fix`) ; agent multi-requêtes nécessite clé Claude |
| 4 | Competitor Watch | ⏸️ nécessite l'API Meta Ad Library |
| 9 | Signal Layer | ⏸️ nécessite Google Search Console / Reddit |

## 8. Variables d'environnement

- `ANTHROPIC_API_KEY` — active Claude ; sinon repli local déterministe.
- `DATABASE_URL` — chemin Prisma (non utilisé par le store JSON).
- `APP_PASSWORD` — prévu par le brief, **non encore implémenté** (voir dette).

## 9. Limitations connues & dette technique (à challenger)

1. **Prisma non installé** : la politique réseau du bac à sable bloque le
   téléchargement des binaires moteur. D'où le store JSON. Le `schema.prisma`
   et l'abstraction `Repository` rendent la migration directe, mais
   `PrismaRepository` **reste à écrire**.
2. **Store JSON = mono-processus** : pas de verrou d'écriture (OK pour usage
   mono-utilisateur local ; à ne pas déployer tel quel en concurrentiel). Sur
   serverless (Vercel), le FS est éphémère → repli mémoire, non persistant.
3. **Sécurité `/api/audit` (SSRF)** : accepte toute URL http(s), y compris
   internes. À durcir (blocage IP privées/métadonnées cloud) avant exposition.
4. **Pas d'authentification** sur `/studio` et `/api/studio/*` : `APP_PASSWORD`
   + middleware à implémenter (prévu dans le brief).
5. **Brief/Decision déterministes** (pas LLM) : choix assumé pour éviter
   l'hallucination et fonctionner sans clé ; l'enrichissement LLM reste à brancher.
6. **`vercel.json` cron `*/5`** refusé en plan Hobby (min. quotidien) — ajuster
   selon le plan.
7. **Provider local** : contenu d'exemple, pas de vraie génération sans clé.
8. Tests : validés manuellement (curl + Playwright). **Pas de suite de tests
   automatisée** (Jest/Vitest/Playwright CI) — à ajouter.

## 10. Sécurité

- Secrets uniquement en `.env.local` (git-ignoré via `.env*`, avec `!.env.example`).
- Clé LLM utilisée **côté serveur** exclusivement (jamais `NEXT_PUBLIC_`).
- Voir §9.3 et §9.4 pour les durcissements requis avant production publique.

## 11. Tests effectués (manuels)

- Build + lint + `tsc --noEmit` : verts.
- CRUD Business, appel LLM + log structuré, génération multi-langue, export JSON/CSV.
- Boucle intelligence : 6 résultats → Genome → Décisions justifiées → Coach citant les chiffres.
- Analyseur SEO réel : page démo 31 → 92 → **100/100**.
- Keystone : 404, sauvegarde/restauration mémoire.

## 12. Chemin de production

1. Écrire `PrismaRepository` (implémente `Repository`) + `npx prisma migrate deploy`.
2. `DATABASE_URL` → PostgreSQL (Neon/Supabase) pour la persistance serverless.
3. `ANTHROPIC_API_KEY` en variable d'environnement d'hébergement.
4. Implémenter `APP_PASSWORD` middleware + durcir `/api/audit`.
5. Ajouter une suite de tests + CI.
