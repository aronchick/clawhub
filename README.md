# ClawdHub

Minimal skill registry powered by TanStack Start + Convex.

## Quick start

```bash
bun install
cp .env.local.example .env.local
bun --bun run dev
```

In another terminal:

```bash
bunx convex dev
```

## Convex Auth setup

```bash
bunx auth --deployment-name <deployment> --web-server-url http://localhost:3000
```

This writes `JWT_PRIVATE_KEY` + `JWKS` to the deployment and prints the values for local `.env.local`.

## Environment

- `VITE_CONVEX_URL`: Convex deployment URL (`https://<deployment>.convex.cloud`).
- `VITE_CONVEX_SITE_URL`: Convex site URL (`https://<deployment>.convex.site`).
- `CONVEX_SITE_URL`: same as `VITE_CONVEX_SITE_URL` (auth + cookies).
- `SITE_URL`: App URL (local: `http://localhost:3000`).
- `AUTH_GITHUB_ID` / `AUTH_GITHUB_SECRET`: GitHub OAuth App.
- `JWT_PRIVATE_KEY` / `JWKS`: Convex Auth keys.
- `OPENAI_API_KEY`: embeddings.

## Scripts

```bash
bun run dev
bun run build
bun run test
bun run coverage
bun run lint
```
