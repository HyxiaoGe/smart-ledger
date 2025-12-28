# Repository Guidelines

## Project Structure & Module Organization
- `app/` contains Next.js App Router pages and API routes (e.g., `app/api/transactions/`).
- `components/` holds shared UI and feature components (`components/ui/`, `components/features/`).
- `lib/` is core logic: services, domain models, infrastructure repositories, and helpers.
- `prisma/` includes the Prisma schema and migrations.
- `__tests__/unit/` contains Vitest unit tests organized by domain (cache, services, utils).

## Build, Test, and Development Commands
```bash
npm run dev       # Start Next.js dev server
npm run build     # Production build
npm run start     # Run production server
npm run lint      # ESLint checks
npm run format    # Prettier formatting
npm run test      # Vitest in watch mode
npm run test:run  # Single-run tests
npm run test:coverage # Coverage report
npm run commit    # Guided commit (Chinese messages)
```
Database helpers:
```bash
npx prisma generate
npx prisma migrate dev --name <migration_name>
```

## Coding Style & Naming Conventions
- TypeScript-first; function components with hooks.
- Prettier settings: 2-space tabs, single quotes, semicolons, 100-char line width.
- Server-only modules use `.server.ts` suffix; keep DB access in server code or API routes.
- Test files use `*.test.ts` and live under `__tests__/unit/`.

## Testing Guidelines
- Framework: Vitest with Testing Library and jsdom.
- Prefer small, isolated unit tests; mirror folder structure under `__tests__/unit/`.
- Name tests for behavior, not implementation (e.g., `TransactionSummaryService.test.ts`).

## Commit & Pull Request Guidelines
- Use `npm run commit` for standardized messages.
- Commit types: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`; message text in Chinese.
- PRs should include a short description, testing notes, and screenshots for UI changes.

## Configuration Notes
- Required env vars live in `.env.local`: `DATABASE_URL`, `DEEPSEEK_API_KEY`, `AI_PROVIDER`.
