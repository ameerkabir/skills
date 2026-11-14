// @ts-check
import eslint from "@eslint/js";
import tseslint from "typescript-eslint";
import eslintPluginAstro from "eslint-plugin-astro";

export default tseslint.config(
  {
    ignores: [
      "dist/**",
      ".astro/**",
      ".wrangler/**",
      "node_modules/**",
      "emdash-env.d.ts",
      "worker-configuration.d.ts",
    ],
  },
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  ...eslintPluginAstro.configs["flat/recommended"],
  {
    rules: {
      // Every `if` (including one-line early returns) must use braces.
      curly: ["error", "all"],
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      // Several EmDash entry shapes are deliberately left as `any` at CMS
      // query boundaries (documented inline) — not in scope for this pass.
      "@typescript-eslint/no-explicit-any": "off",
    },
  },
  {
    // Astro frontmatter/script blocks are checked by type-aware TS rules
    // less reliably than plain .ts files — keep this rule set light there.
    files: ["**/*.astro"],
    rules: {
      "@typescript-eslint/no-unused-vars": "off",
    },
  },
  {
    files: ["*.config.{js,mjs,ts}", "scripts/**/*.{js,mjs,ts}"],
    languageOptions: {
      globals: { process: "readonly", console: "readonly", URL: "readonly", fetch: "readonly" },
    },
  },
);
