# Lorelia

Lorelia is a multilingual roleplay platform for discovering and chatting with story characters. Character canon, persona, scenarios, and conversation memory are assembled directly into prompts without embeddings.

## Local setup

1. Keep `.env` for local development, or copy `.env.example` and change every secret.
2. Set `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `BETTER_AUTH_SECRET`, and `CREDENTIAL_ENCRYPTION_KEY`. Add Google OAuth variables when needed.
3. Run `npm run db:up`, `npm run db:migrate`, then `npm run db:seed`.
4. Run `npm run dev` and open `http://localhost:3000` or `http://localhost:3000/en`.

Use `GET /api/health` to verify PostgreSQL. The seed creates the initial admin, plans, categories, Gemini model record, and an example character. Change the seeded admin password immediately.

AI keys are encrypted in PostgreSQL. A personal key takes priority and does not consume quota; otherwise the system key is used and one successful response consumes one monthly message. Configure the system key from `/vi/admin`.

Character and banner images are HTTPS URLs only. Lorelia has no upload endpoint and never downloads or copies remote files.

## Main areas

- `/vi` and `/en`: discovery, search, trending, most-viewed, and new characters.
- `/[locale]/characters/[slug]`: character profile and scenario selection.
- `/[locale]/creator`: structured persona/scenario editor with URL image previews.
- `/[locale]/settings`: quota and personal Gemini key.
- `/[locale]/admin`: review queue, metrics, and system Gemini key.

## Commands

- `npm run db:generate`: generate a migration after schema changes.
- `npm run db:migrate`: apply committed migrations.
- `npm run db:seed`: idempotently seed required data and admin.
- `npm test`: prompt and context behavior tests.
- `npm run lint` / `npm run build`: production verification.

## Adding an AI model

Add its metadata in `lib/ai/models.ts` and the database model catalog. For a new provider, implement `StreamingAiClient` and register the adapter in `lib/ai/index.ts`.
