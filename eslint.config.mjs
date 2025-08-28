import globals from "globals";
import tseslint from "typescript-eslint";
import pluginReact from "eslint-plugin-react";
import pluginNext from '@next/eslint-plugin-next';
import { defineConfig } from "eslint/config";

export default defineConfig([
  tseslint.configs.recommended,
  pluginReact.configs.flat.recommended,
  pluginReact.configs.flat['jsx-runtime'],
  {
    name: 'ESLint nextjs',
    files: ["**/*.{js,mjs,cjs,ts,mts,cts,jsx,tsx}"],
    plugins: {
      react: pluginReact,
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
    rules: {
      ...pluginNext.configs.recommended.rules,
      ...pluginNext.configs['core-web-vitals'].rules,
      "no-unused-vars": "off",
      "@typescript-eslint/no-unused-vars": [
        "warn", // Используйте "warn" вместо "error" для менее строгого поведения
        {
          "varsIgnorePattern": "^_", // Игнорирует переменные, начинающиеся с _
          "argsIgnorePattern": "^_", // Игнорирует аргументы, начинающиеся с _
          "ignoreExports": true // ✅ Важно: игнорирует все экспорты
        }
      ],
    },
    settings: {
      react: {
        version: "detect"
      }
    },
  },
]);
