import globals from "globals";
import tseslint from "typescript-eslint";
import pluginReact from "eslint-plugin-react";
import pluginNext from '@next/eslint-plugin-next';
import { defineConfig } from "eslint/config";

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
    ignores: [".next/**", "next-env.d.ts"],
  },

  // Базовые конфигурации (идут первыми)
  tseslint.configs.recommended,
  pluginReact.configs.flat.recommended,
  pluginReact.configs.flat['jsx-runtime'],

  // Кастомная конфигурация для Next.js (идет последней, переопределяя предыдущие)
  {
    name: 'Next.js custom config',
    files: ["**/*.{js,mjs,cjs,ts,mts,cts,jsx,tsx}"],
    plugins: {
      react: pluginReact,
      '@next/next': pluginNext,
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

  // Дополнительная конфигурация для тестовых файлов (если нужно)
  {
    files: ["**/*.test.{js,jsx,ts,tsx}", "**/__tests__/**/*.{js,jsx,ts,tsx}"],
    rules: {
      "@typescript-eslint/no-unused-vars": "off", // Отключаем для тестов
    },
  },
]);
