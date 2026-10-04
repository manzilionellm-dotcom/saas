# AIO (Sprint) — source unique : aio.config.json

Ce dépôt est un catalogue SaaS (SaaS Suite), pas une offre d'abonnement IPTV.

- `npm run aio:llms` régénère `public/llms.txt` depuis `aio.config.json`.
- `npm run build && npm start` puis `node scripts/aio-check.mjs http://localhost:3000/` : preuve sur HTML brut (Citation Hooks 40–60 mots, JSON-LD parsable, alt, transcription vidéo, /llms.txt).
- Les h3 de la FAQ et le paragraphe qui suit sont rendus en HTML côté serveur dans `app/page.tsx` (pas d'accordéon, pas de masquage).
- JSON-LD déjà en place, conservé : Organization, WebSite (`app/layout.tsx`), ItemList et un seul FAQPage (`app/page.tsx`). Le FAQPage existant est complété avec les mêmes questions que les Citation Hooks. Aucun second FAQPage.
- Ajout : un graphe `Product` / `Offer` pour chaque fiche dont le prix mensuel est affiché. Pas de HowTo : aucun tutoriel d'installation pas à pas sur le site.
- `html lang` passe de `en` à `fr`, langue du contenu visible.
