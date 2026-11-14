---
name: code-quality-standards
description: Coding standards for this repo -- curly braces on every if/for, where business logic belongs (src/utils/*.ts vs. inline in pages/routes), when to factor out a shared util, and the "every util gets a test" convention. Load before writing or refactoring page frontmatter, plugin routes, or anything in src/utils/.
---

# Code Quality Standards

CI (`.github/workflows/ci.yml`) gates every push on `pnpm lint && pnpm typecheck && pnpm test`. New code passes all three without loosening the config.

## 1. Curly braces, always

`curly: ["error", "all"]` applies repo-wide, `.astro` frontmatter included. Every `if`/`for`/`while` body gets multi-line `{ }`, one-line early returns too:

```ts
if (!slug) {
	return Astro.rewrite("/404");
}
```

## 2. Logic lives in `src/utils/*.ts` (or the plugin's `src/`), not in pages

A page's frontmatter reads as: gather input → call a util → render. A `.map()`/`.filter()` chain, a coercion, or real branching belongs in a util. Check `src/utils/` before adding a helper; add a new file rather than growing an unrelated one.

Extract on the **second** occurrence: factor shared logic out when you're about to paste it into a second file, never pre-emptively for a single caller.

## 3. Every util gets a colocated test

`src/utils/foo.ts` has `src/utils/foo.test.ts` beside it; plugin logic is tested the same way under `plugins/*/src/`. Update the test in the same change as the util.

- **Pure functions**: test directly.
- **Functions that call `emdash`**: mock the module, then import after the mock:
  ```ts
  const getEmDashCollection = vi.fn();
  vi.mock("emdash", () => ({ getEmDashCollection: (...args: unknown[]) => getEmDashCollection(...args) }));
  const { getUiStrings } = await import("./ui-strings");
  ```
- **Functions that call `fetch`**: `vi.stubGlobal("fetch", vi.fn()...)`, `vi.unstubAllGlobals()` in `afterEach`.

These are unit tests of logic with the CMS boundary mocked; no Miniflare.

## 4. Done means verified like CI

```bash
pnpm lint && pnpm typecheck && pnpm test
```

For a page or form change, also exercise the real flow against `pnpm dev`.
