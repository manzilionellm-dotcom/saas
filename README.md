This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

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

## Authentication API

Server-side auth lives in `lib/` and `app/api/auth/`:

- `POST /api/auth/register` — create an account (`{ email, password }`)
- `POST /api/auth/login` — returns `{ token, refreshToken, expiresAt, user }`
- `POST /api/auth/refresh` — rotates tokens (`{ refreshToken }`)
- `POST /api/auth/logout` — revokes the current session only (Bearer token)
- `GET /api/auth/me` — current user/session (Bearer token)
- `GET /api/auth/sessions` — the user's active sessions (Bearer token)

### Simultaneous-login detection

Controlled by the `SIMULTANEOUS_LOGIN_DETECTION_ENABLED` environment variable
(see `.env.example`):

- **Default (unset or `false`): disabled.** Any number of sessions per user
  coexist; a new login never blocks, warns, disconnects, or invalidates
  existing sessions.
- **`true`: single-session enforcement.** A successful login revokes the
  user's other active sessions.

Run the auth test suite with:

```bash
npm test
```

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
