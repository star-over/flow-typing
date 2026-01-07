import pluginNext from '@next/eslint-plugin-next';
import { defineConfig } from "eslint/config";
// --- НОВЫЕ ИМПОРТЫ ---
import jsxA11y from "eslint-plugin-jsx-a11y";
import pluginReact from "eslint-plugin-react";
import reactHooks from "eslint-plugin-react-hooks";
import simpleImportSort from "eslint-plugin-simple-import-sort";
import vitestPlugin from "eslint-plugin-vitest";
import globals from "globals";
import tseslint from "typescript-eslint";


// Создаем общие настройки для парсера, которые можно переиспользовать
const commonParserOptions = {
  ecmaFeatures: {
    jsx: true,
  },
  ecmaVersion: "latest",
  sourceType: "module",
};

// Создаем общие настройки для глобальных переменных
const commonGlobals = {
  ...globals.serviceworker,
  ...globals.browser,
};

export default defineConfig([
  // Игнорируемые файлы и директории
  {
    ignores: [".next/**", "next-env.d.ts", "storybook-static/**"],
  },

  // Базовые конфигурации (идут первыми)
  tseslint.configs.recommended,
  pluginReact.configs.flat.recommended,
  pluginReact.configs.flat['jsx-runtime'],
  jsxA11y.flatConfigs.recommended, // <-- Добавляем плагин A11y

  // Кастомная конфигурация для Next.js, React Hooks и сортировки в JS/TS файлах
  {
    name: 'Next.js, Hooks, and Sorting',
    files: ["**/*.{js,mjs,cjs,ts,mts,cts,jsx,tsx}"],
    plugins: {
      react: pluginReact,
      '@next/next': pluginNext,
      'react-hooks': reactHooks, // <-- Добавляем плагин Hooks
      'simple-import-sort': simpleImportSort, // <-- Добавляем плагин сортировки
    },
    languageOptions: {
      parserOptions: commonParserOptions,
      globals: commonGlobals,
    },
    rules: {
      // Правила Next.js
      ...pluginNext.configs.recommended.rules,
      ...pluginNext.configs['core-web-vitals'].rules,

      // Отключаем базовые правила для неиспользуемых переменных
      "no-unused-vars": "off",

      // Настраиваем TypeScript правило для неиспользуемых переменных
      "@typescript-eslint/no-unused-vars": [
        "warn",
        {
          "varsIgnorePattern": "^_",
          "argsIgnorePattern": "^_",
          "caughtErrorsIgnorePattern": "^_"
        }
      ],

      // Дополнительные рекомендуемые правила
       "react/react-in-jsx-scope": "off", // Не требуется в новых версиях React
      "react/prop-types": "off", // TypeScript предоставляет проверку типов

      // --- НОВЫЕ ПРАВИЛА ---
      // Правила для React Hooks
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',

      // Правила для сортировки импортов
      'simple-import-sort/imports': 'warn',
      'simple-import-sort/exports': 'warn',
    },
    settings: {
      react: {
        version: "detect"
      },
      // Добавляем настройки для резольвера, если нужно
      "import/resolver": {
        typescript: {
          alwaysTryTypes: true,
        },
      },
    },
  },

  // Дополнительная конфигурация для тестовых файлов
  {
    files: ["**/*.test.{js,jsx,ts,tsx}", "**/__tests__/**/*.{js,jsx,ts,tsx}"],
    plugins: {
      vitest: vitestPlugin, // <-- Добавляем плагин Vitest
    },
    rules: {
      "@typescript-eslint/no-unused-vars": "off", // Отключаем для тестов
      ...vitestPlugin.configs.recommended.rules, // <-- Добавляем рекомендованные правила Vitest
    },
  },
]);
