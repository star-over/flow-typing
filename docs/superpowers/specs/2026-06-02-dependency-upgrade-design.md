# Dependency upgrade plan (June 2026)

**Date:** 2026-06-02
**Scope:** Upgrade all packages flagged by `ncu` (29 deps in `package.json`) to their latest published versions, including the risky majors (TypeScript 6, Vite 8 + vite-plugin-svelte 7, ESLint 10).
**Project context:** SvelteKit SPA (static adapter), npm + `package-lock.json`, 14 vitest test files, ESLint flat config, TypeScript strict, no CI workflows. Local Node `v24.9.0`.

## Goals

- Bring every dependency in `package.json` to the latest version reported by `ncu`.
- Keep changes mechanical and reviewable: one thematic commit per phase, no opportunistic refactors.
- Preserve the green state of `make check-all` between phases so any regression is easy to bisect.

## Non-goals

- No refactor of application code beyond what each upgrade strictly requires.
- No introduction of new tooling, scripts, or CI workflows.
- No upgrade of packages not on the `ncu` list, **except** when a peer-dependency constraint forces it (e.g. an ESLint plugin without v10 support — that swap is explicitly part of Phase 3 and documented below).

## Risk map (compiled from official upgrade guides)

| Package | Risk | Notes from research |
|---|---|---|
| storybook 10.2 → 10.4 | 🟢 | Aligns with `@storybook/*@10.4.1` already installed. |
| vitest + @vitest/coverage-v8 4.0.18 → 4.1.8 | 🟢 | Patch within minor. Vitest 4.1.8 peer: `vite ^6.0.0 \|\| ^7.0.0 \|\| ^8.0.0`. |
| postcss 8.5.6 → 8.5.15 | 🟢 | Patch. |
| globals 17.3 → 17.6 | 🟢 | Minor. |
| xstate 5.26 → 5.32 | 🟢 | Minor, semver. |
| zod 4.3 → 4.4 | 🟢 | Minor, semver. |
| convex 1.31 → 1.40 | 🟡 | 9 minor versions accumulated. Only one consumer in the codebase: `src/lib/convex.ts` uses `ConvexClient` from `convex/browser`. |
| ESLint 10 + @eslint/js 10 | 🟡 | Node ≥ 20.19 / 22.13 / 24 required (local 24.9 — OK). Old `.eslintrc` format removed (we already use flat config). `eslint:recommended` adds three new rules: `no-unassigned-vars`, `no-useless-assignment`, `preserve-caught-error`. **`eslint-plugin-vitest@^0.5.4` peers cap at ESLint 9 — must migrate to `@vitest/eslint-plugin@^1.6.19` (its successor under the `@vitest/` namespace).** |
| TypeScript 6 | 🟡 | `typescript-eslint` peer `typescript: >=4.8.4 <6.1.0` — TS 6.0.x fits. `svelte-check` peer `typescript: >=5.0.0` — OK. `@sveltejs/kit@2.61.1` peer `typescript: ^5.3.3 \|\| ^6.0.0` — OK. `preserveValueImports` removed (we don't use it). Other deprecated tsconfig options (`baseUrl`, `target=ES5`, `module=AMD`, `moduleResolution=classic/node10`, `outFile`) — not used in `tsconfig.json`. Generated `.svelte-kit/tsconfig.json` is produced by SvelteKit itself, so peer-compatible by construction. |
| Vite 8 + @sveltejs/vite-plugin-svelte 7 | 🟡 | Inseparable: `@sveltejs/vite-plugin-svelte@7.x` peer `vite: ^8.0.0-beta.7 \|\| ^8.0.0`. **`@sveltejs/kit@2.61.1` already declares peer `vite: … \|\| ^8.0.0` and `@sveltejs/vite-plugin-svelte: … \|\| ^7.0.0` — no SvelteKit upgrade required.** Vite 8 removed legacy SCSS API (we have no SCSS). |

## Phases

Each phase is one commit. Commits follow the existing `chore:` / `feat:` lowercase style observed in `git log`.

### Phase 1 — Low-risk batch

Bump together:
- `storybook` → `^10.4.1`
- `vitest` → `^4.1.8`
- `@vitest/coverage-v8` → `^4.1.8`
- `postcss` → `^8.5.15`
- `globals` → `^17.6.0`
- `xstate` → `^5.32.0`
- `zod` → `^4.4.3`

Verify: `make check-all` and `make storybook-build`.
Commit message: `chore: bump low-risk dependencies`

### Phase 2 — convex 1.31 → 1.40

Single bump: `convex` → `^1.40.0`.
Verify: `make check` (compilation may catch type drift in `ConvexClient`) and `make test`. Manually re-read `src/lib/convex.ts` for any deprecated import.
Commit message: `chore: bump convex to 1.40`

### Phase 3 — ESLint 10 + vitest-plugin migration

1. Remove `eslint-plugin-vitest@^0.5.4`. Add `@vitest/eslint-plugin@^1.6.19`.
2. Update `eslint.config.js`:
   - Replace the import (`import vitest from 'eslint-plugin-vitest'` → equivalent from `@vitest/eslint-plugin`).
   - Adjust the plugin key in the config block. The successor exposes the same rule set under a renamed plugin key — the exact name comes from the package's README and goes into the config as-is.
3. Bump `eslint` → `^10.4.1`, `@eslint/js` → `^10.0.1`.
4. Run `make lint`. Three new `eslint:recommended` rules may surface findings (`no-unassigned-vars`, `no-useless-assignment`, `preserve-caught-error`). Fix the call-sites if the fix is mechanical (≤ 3 lines per file). If a rule fires broadly, disable it in `eslint.config.js` with a single override block and note the reason — defer broad cleanup to a separate change.

Verify: `make lint` and `make check`.
Commit message: `chore: bump eslint to v10 and migrate to @vitest/eslint-plugin`

### Phase 4 — TypeScript 6

Bump `typescript` → `^6.0.2`.
Verify: `make check`.
- Our own `tsconfig.json` uses `target: ESNext`, `module: ESNext`, `moduleResolution: bundler` — none of the TS 6 deprecated options.
- If deprecation diagnostics surface from the inherited `.svelte-kit/tsconfig.json`, the SvelteKit kit version (2.61.1) already declares TS 6 as a peer — they should be silent. If not, add `"ignoreDeprecations": "6.0"` to our `tsconfig.json` as a temporary escape hatch and note in the commit message.

Commit message: `chore: bump typescript to 6`

### Phase 5 — vite 8 + vite-plugin-svelte 7

Bump together (peer-coupled):
- `vite` → `^8.0.14`
- `@sveltejs/vite-plugin-svelte` → `^7.1.2`

Verify in this order:
1. `make build` — production build.
2. `make storybook-build` — Storybook respects the same Vite version.
3. `make dev` — smoke test the dev server boots and a page renders (manual stop after confirmation).
4. `make preview` — verify the static build is servable.

Commit message: `chore: bump vite to 8 and vite-plugin-svelte to 7`

## Cross-phase rules

- **Pre-flight per phase:** `git status` clean, `make check-all` green. If `check-all` is red on entry, stop and report.
- **One commit per phase**, even if the phase changes multiple files; `package.json` and `package-lock.json` always travel together.
- **On failure:** prefer minimal local fixes (single-file edits). If fixes balloon (> ~10 changed lines outside config files), revert the phase, document the blocker in the commit message of the revert, and continue with the next independent phase. Phases 1–4 are independent; Phase 5 is independent of 1–4 but its peers must already be aligned (they are, because no plugin in Phases 1–4 depends on a specific vite major within the supported range).
- **No `npm overrides` shortcut.** If a peer ever blocks, surface it and decide explicitly instead of hiding it.

## Verification checklist (final, after Phase 5)

- `make check-all` — green.
- `make storybook-build` — green.
- `make dev` — manual visual smoke: app loads, no console errors.
- `git log --oneline -6` — five new commits, each conforming to the messages above.
- `npx ncu` — empty / no remaining bumps from the original list.

## Open assumptions

- `@vitest/eslint-plugin` is treated as the canonical successor to `eslint-plugin-vitest`. If the README contradicts (e.g. a different rule-set name), follow the README — that's the source of truth at exec time.
- `make storybook-build` exists in the Makefile. If it does not, substitute the equivalent script (`storybook build`).
- No deprecated `tsconfig` option is being introduced via the inherited SvelteKit-generated config at the time of Phase 4. If it is, the escape hatch is `"ignoreDeprecations": "6.0"`.
