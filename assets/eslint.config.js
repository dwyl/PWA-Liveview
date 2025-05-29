import solid from "eslint-plugin-solid";
import js from "@eslint/js";

export default [
  {
    files: ["**/*.js", "**/*.jsx", "**/*.ts", "**/*.tsx"],
    ...js.configs.recommended,
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },
      },
      globals: {
        // Browser globals
        window: "readonly",
        document: "readonly",
        console: "readonly",
        // Node globals for config files
        process: "readonly",
        __dirname: "readonly",
        __filename: "readonly",
      },
    },
    plugins: {
      solid,
    },
    rules: {
      ...solid.configs.recommended.rules,

      // General JS/JSX rules
      "no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
        },
      ],
      "no-console": "off",
      "prefer-const": "error",

      // SolidJS specific adjustments
      "solid/reactivity": "error",
      "solid/no-destructure": "error",

      // Custom rules for Valtio patterns
      "no-direct-mutation-imports": "off", // Valtio uses proxies

      // Yjs specific considerations
      "no-unused-expressions": [
        "error",
        {
          allowShortCircuit: true, // Yjs often uses short-circuit evaluation
          allowTernary: true,
        },
      ],
    },
  },

  // Separate config for config files
  {
    files: ["*.config.js", "*.config.ts", "eslint.config.js"],
    languageOptions: {
      globals: {
        process: "readonly",
        __dirname: "readonly",
        __filename: "readonly",
      },
    },
    rules: {
      "no-console": ["warn", { allow: ["log"] }],
    },
  },

  // Ignore patterns
  {
    ignores: ["node_modules/**", "*.min.js", "coverage/**"],
  },
];
