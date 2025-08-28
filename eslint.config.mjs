import js from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";
import pluginReact from "eslint-plugin-react";
import pluginNext from '@next/eslint-plugin-next';
import { defineConfig } from "eslint/config";


export default defineConfig([
  {
    name: 'ESLint Config - nextjs',
    files: ["**/*.{js,mjs,cjs,ts,mts,cts,jsx,tsx}"],
    plugins: {
      js,
      pluginReact,
      '@next/next': pluginNext,
    },
    languageOptions: {
      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },
        ecmaVersion: "latest",
        sourceType: "module",
      },
      globals: {
        ...globals.serviceworker,
        ...globals.browser,
      },
    },
    extends: ["js/recommended"],
    rules: {
      ...pluginNext.configs.recommended.rules,
      ...pluginNext.configs['core-web-vitals'].rules,
      ...pluginReact.configs.flat.recommended.rules,
      ...pluginReact.configs.flat['jsx-runtime'].rules,
      "no-unused-vars": "off",
      "@typescript-eslint/no-unused-vars": "off"

    },
    settings: {
      react: {
        version: "detect"
      }
    },
  },
  tseslint.configs.recommended,


]);
