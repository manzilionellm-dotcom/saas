# À compléter (non lisible sur le site — rien n'a été inventé)

## Valeurs laissées à null dans aio.config.json

- Résolution maximale : `tech.maxResolution` = null
- Appareils (matrice pour toute la suite) : `tech.devices` = null
- Délai d'activation : `tech.activationMinutes` = null
- Débits / bitrates / bande passante minimale : `tech.bitrate` = null
- Nombre de chaînes : `tech.channelCount` = null
- Contact (e-mail, téléphone, WhatsApp) : `contact` = null — aucun contact publié sur la page d'accueil

## Non généré

- HowTo : aucun tutoriel d'installation (Firestick, Android TV, Apple TV, etc.). `/guide/chine` est un guide d'achat (usine, livraison, prix, pièges), pas une procédure HowTo. `/tools/m3u` est un formulaire de clonage, pas un tutoriel.
- Images : aucune balise `<img>` dans les pages. Les fichiers `public/*.svg` ne sont pas affichés. `og:image` pointe vers `/globe.svg` sans texte alternatif dans le corps. Rien à réécrire.
- Vidéos : aucune `<video>` ni iframe YouTube/Vimeo. Le mot « YouTube » apparaît seulement dans la fiche Global Video Factory. Pas de transcription à injecter.
- Product : pas d'image produit, pas d'avis, pas d'`aggregateRating`. Non inventés. Les offres reprennent le prix mensuel visible, sans statut de stock (les fiches « Bientôt » ne sont pas des liens, mais la page ne dit pas « rupture »).

## Incohérences signalées (JSON-LD / contenu visible) — non corrigées dans les blocs existants

- Le `<title>` dit « 30 outils ». La meta description dit « Catalogue de 30 outils SaaS ». Le h1, le FAQPage et le pied de page utilisent le nombre réel du catalogue (56). Organization, Open Graph et Twitter disent « plus de 50 ».
- Organization, WebSite, ItemList et `og:image` utilisent `https://saas-suite.example.com`. Le déploiement indiqué pour ce sprint est `https://saas-black-nu.vercel.app`. Les `Offer.url` ajoutés pointent vers ce déploiement. Les URL des JSON-LD existants ne sont pas réécrites.
- ItemList annonce `numberOfItems` = 56 mais `itemListElement` ne contient que les 12 premiers outils. Les URL `/products/{slug}` n'ont pas de route dans l'application.
- Le README du dépôt décrit un stub archivé et liste d'autres sites IPTV comme canoniques. Le HTML déployé est le catalogue SaaS.
- Des caractéristiques présentes seulement dans `features` de `app/lib/products.ts` ne sont pas rendues (exemple : « Inclus gratuitement » sur Keystone, ingestion RTMP/SRT sur StreamCast Server). Elles ne sont pas reprises dans les réponses.
