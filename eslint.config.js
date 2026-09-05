import tseslint from "typescript-eslint";

/**
 * Lint the TypeScript sources only. The Rust side is covered by `cargo fmt`
 * and `cargo clippy`, and the generated frontend bundle is not source.
 */
export default tseslint.config(
  {
    ignores: [
      "dist/**",
      "src/vendor/**",
      "src-tauri/**",
      "node_modules/**",
      "coverage/**",
      "eslint.config.js",
    ],
  },
  ...tseslint.configs.recommended,
  {
    files: ["**/*.ts"],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
    },
    rules: {
      "@typescript-eslint/consistent-type-imports": [
        "error",
        { fixStyle: "inline-type-imports" },
      ],
      "@typescript-eslint/explicit-function-return-type": [
        "error",
        { allowExpressions: true },
      ],
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_" },
      ],
      eqeqeq: ["error", "smart"],
      "no-console": ["error", { allow: ["warn", "error"] }],
    },
  },
);
