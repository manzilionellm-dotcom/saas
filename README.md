This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Fonctionnalités

- **Profils Papa / Maman** (`/`) : chaque profil voit la grille de chaînes à sa
  façon (favoris, chaînes masquées, ordre des catégories). Le choix est
  mémorisé côté serveur dans un cookie et la vue est recalculée au rendu.
- **Restream vers la maison** (`/restream`) : génère 10 à 20 liens de relais
  indépendants à partir d'**une source que vous êtes autorisé à rediffuser**,
  un lien par appareil du foyer. Chaque lien affiche son statut, se copie en un
  clic, et le jeu de liens peut être régénéré / vérifié.

### Configurer la source de restream

Le restream est un **relais** : tous les liens lisent la même source autorisée,
il ne multiplie pas la capacité au-delà de ce que la source permet. Définissez la
source via des variables d'environnement (fichier `.env.local`) :

```bash
# URL M3U/M3U8 (ou flux direct) que vous êtes autorisé à rediffuser
RESTREAM_SOURCE_URL="https://exemple.tld/ma-source.m3u8"
# Nom affiché dans l'interface (optionnel)
RESTREAM_SOURCE_NAME="Ma box perso"
```

Sans `RESTREAM_SOURCE_URL`, les endpoints restent hors ligne et aucun flux
n'est récupéré. N'utilisez que des sources dont vous détenez les droits de
rediffusion.

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
