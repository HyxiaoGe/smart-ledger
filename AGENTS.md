# Repository Guidelines

## Project Structure & Module Organization
- Use a simple, predictable layout:
  - `src/` — application code (packages, modules, CLI).
  - `tests/` — unit and integration tests; mirrors `src/` paths.
  - `docs/` — design notes, ADRs, and user-facing docs.
  - `scripts/` — one-off tools and dev utilities.
  - `assets/` — static files (schemas, images, samples).
  - `config/` — config templates (e.g., `dev.yaml`, `.env.example`).
- Prefer small, cohesive modules; avoid cyclic imports. Public APIs live in package `__init__`/index files.

## Build, Test, and Development Commands
- Use Makefile-style wrappers when available:
  - `make setup` — install toolchains and project deps.
  - `make test` — run the full test suite.
  - `make lint` / `make fmt` — lint and auto-format.
  - `make run` — start the app locally.
- If no Makefile exists, use ecosystem defaults, for example:
  - Python: `python -m pytest`, `ruff check .`, `black .`.
  - Node: `npm ci`, `npm test`, `npm run build`, `npm run dev`.

## Coding Style & Naming Conventions
- Indentation: 4 spaces; max line length: 100.
- Names: `snake_case` for files/functions, `PascalCase` for classes, `kebab-case` for CLI commands.
- Keep modules focused (<500 lines). Prefer pure functions and small objects.
- Use a formatter and linter (e.g., Black + Ruff, or Prettier + ESLint). No manual style bikeshedding.

## Testing Guidelines
- Place tests under `tests/` mirroring `src/` (e.g., `src/ledger/core.py` → `tests/ledger/test_core.py`).
- Strive for fast unit tests; isolate IO with fakes.
- Target ≥80% line coverage for changed code.
- Name tests descriptively; one assertion concept per test.

## Commit & Pull Request Guidelines
- Follow Conventional Commits: `feat:`, `fix:`, `docs:`, `chore:`, `refactor:`, `test:`.
- Commits should be small and atomic; include rationale in body when non-obvious.
- PRs: clear description, linked issues, steps to validate locally, and test evidence (logs or screenshots if UI).

## Security & Configuration
- Never commit secrets. Add placeholders to `.env.example` and document required variables in `docs/`.
- Validate inputs at module boundaries; prefer explicit schemas for request/response and config.
