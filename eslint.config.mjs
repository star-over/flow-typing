import js from '@eslint/js';
import ts from 'typescript-eslint';
import svelte from 'eslint-plugin-svelte';
import sonarjs from 'eslint-plugin-sonarjs';
import globals from 'globals';
import svelteConfig from './svelte.config.js';

// Очищенная копия svelteConfig для parserOptions: убираем несериализуемые поля
// (`preprocess`/`kit.adapter` содержат функции), чтобы работал `eslint --cache`.
// Парсеру по факту нужен только `kit.alias` для резолва импортов.
const eslintSvelteConfig = {
  ...svelteConfig,
  preprocess: undefined,
  kit: svelteConfig.kit && {
    ...svelteConfig.kit,
    adapter: undefined,
    typescript: undefined,
  },
};

/** @type {import('eslint').Linter.Config[]} */
export default [
  js.configs.recommended,
  ...ts.configs.strict,
  ...ts.configs.stylistic,
  ...svelte.configs.recommended,
  {
    languageOptions: {
      globals: {
        ...globals.browser,
      },
      parserOptions: {
        projectService: {
          allowDefaultProject: [
            '*.config.ts',
            '*.config.mjs',
            '*.config.js',
            'vitest.shims.d.ts',
            '.storybook/*.ts',
            'scripts/*.ts',
            'convex/*.test.ts',
            'convex/lib/*.test.ts',
          ],
          // Кап default-project у typescript-eslint по умолчанию 8, а под
          // allowDefaultProject подпадает 11 файлов (configs + .storybook +
          // scripts + convex-тесты) → иначе линт падает «Too many files (>8)».
          maximumDefaultProjectFileMatchCount_THIS_WILL_SLOW_DOWN_LINTING: 25,
        },
        extraFileExtensions: ['.svelte'],
      },
    },
    rules: {
      // Неблокирующие: мертвый код, стилистика, производительность, best-practice
      '@typescript-eslint/no-unused-vars': [
        'warn',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
          destructuredArrayIgnorePattern: '^_',
        },
      ],
      '@typescript-eslint/no-unused-expressions': 'warn',
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-non-null-assertion': 'warn',
      '@typescript-eslint/no-empty-function': 'warn',
      '@typescript-eslint/consistent-type-imports': [
        'warn',
        { prefer: 'type-imports', fixStyle: 'inline-type-imports' },
      ],
      '@typescript-eslint/no-import-type-side-effects': 'warn',

      // Стилистика (из stylistic-пресета) — даунгрейд до warn по соглашению проекта
      '@typescript-eslint/array-type': 'warn',
      '@typescript-eslint/consistent-type-definitions': 'warn',
      '@typescript-eslint/consistent-indexed-object-style': 'warn',

      // Typed-linting (точечно — без полного recommendedTypeChecked)
      '@typescript-eslint/no-deprecated': 'warn',
      '@typescript-eslint/no-unnecessary-condition': 'warn',
      '@typescript-eslint/no-unnecessary-type-assertion': 'warn',
      '@typescript-eslint/no-redundant-type-constituents': 'warn',

      // Convention CLAUDE.md → 2+ параметров принимаем одним object literal.
      // Селекторы только на объявления функций в нашем коде; коллбэки HOF
      // (CallExpression > ArrowFunctionExpression) и xstate actions/guards
      // (Property > ArrowFunctionExpression) под правило не попадают.
      'no-restricted-syntax': [
        'warn',
        {
          selector: 'FunctionDeclaration[params.length>=2]',
          message: 'Функции с 2+ параметрами — принимать одним object literal с деструктуризацией.',
        },
        {
          selector: 'VariableDeclarator > ArrowFunctionExpression[params.length>=2]',
          message: 'Функции с 2+ параметрами — принимать одним object literal с деструктуризацией.',
        },
        {
          selector: 'VariableDeclarator > FunctionExpression[params.length>=2]',
          message: 'Функции с 2+ параметрами — принимать одним object literal с деструктуризацией.',
        },
      ],

      // destructuring: 'all' — не ругаться на let-деструктуризацию, если хотя бы
      // одна переменная действительно требует let (например, `$bindable()` в Svelte 5).
      'prefer-const': ['warn', { destructuring: 'all' }],

      'svelte/require-each-key': 'warn',
      'svelte/prefer-svelte-reactivity': 'warn',
      'svelte/no-navigation-without-resolve': 'warn',
      'svelte/no-at-html-tags': 'warn',
      'svelte/no-immutable-reactive-statements': 'warn',
      'svelte/no-add-event-listener': 'warn',
      'svelte/no-unused-svelte-ignore': 'warn',
      'svelte/button-has-type': 'warn',
      'svelte/no-useless-mustaches': 'warn',
      'svelte/valid-compile': 'warn',
      'svelte/prefer-const': [
        'warn',
        {
          destructuring: 'all',
          excludedRunes: ['$props', '$derived', '$state'],
        },
      ],
    },
  },
  {
    files: ['**/*.ts', '**/*.tsx', '**/*.svelte', '**/*.svelte.js', '**/*.svelte.ts'],
    plugins: { sonarjs },
    rules: {
      // AI-агенты часто оставляют отладочный console.log.
      'no-console': ['warn', { allow: ['warn', 'error'] }],

      // Async guardrails — критично для Convex-вызовов и Svelte-сторов.
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/no-misused-promises': 'error',
      '@typescript-eslint/await-thenable': 'error',

      // XState и discriminated unions.
      '@typescript-eslint/switch-exhaustiveness-check': 'error',

      // Не даём агенту "заткнуть" ошибку ts-игнором.
      '@typescript-eslint/ban-ts-comment': [
        'error',
        {
          'ts-expect-error': 'allow-with-description',
          'ts-ignore': true,
          'ts-nocheck': true,
          'ts-check': false,
          minimumDescriptionLength: 5,
        },
      ],

      // Подмножество sonarjs: только правила, которые ловят реальные проблемы
      // и не шумят на Svelte/TypeScript-идиомах проекта.
      // Порог 20 выбран потому, что текущий код имеет функции со сложностью 17–19;
      // после рефакторинга рекомендуется опустить до 15.
      'sonarjs/cognitive-complexity': ['warn', 20],
      'sonarjs/no-identical-functions': 'warn',
      'sonarjs/no-identical-expressions': 'warn',
      'sonarjs/no-all-duplicated-branches': 'warn',
      'sonarjs/no-gratuitous-expressions': 'warn',
      'sonarjs/no-inverted-boolean-check': 'warn',
      'sonarjs/no-redundant-jump': 'warn',
      'sonarjs/prefer-immediate-return': 'warn',
      'sonarjs/no-collection-size-mischeck': 'warn',
      'sonarjs/no-element-overwrite': 'warn',
      'sonarjs/non-existent-operator': 'warn',
      'sonarjs/no-extra-arguments': 'warn',
    },
  },
  {
    // В скриптах и dev-хелперах console.log — норма.
    files: [
      'src/scripts/**/*.ts',
      'scripts/**/*.ts',
      'src/lib/dev/**/*.ts',
      'auto-flow/scripts/**/*.ts',
    ],
    rules: {
      'no-console': 'off',
    },
  },
  {
    files: ['*.config.*', 'vite.config.ts', 'svelte.config.js', '*.js', 'scripts/**/*.js', 'scripts/**/*.ts', 'auto-flow/scripts/**/*.ts'],
    languageOptions: {
      globals: {
        ...globals.node,
      },
    },
  },
  {
    files: ['**/*.svelte', '**/*.svelte.js', '**/*.svelte.ts'],
    languageOptions: {
      parserOptions: {
        parser: ts.parser,
        svelteConfig: eslintSvelteConfig,
        projectService: {
          allowDefaultProject: [
            '*.config.ts',
            '*.config.mjs',
            '*.config.js',
            'vitest.shims.d.ts',
            '.storybook/*.ts',
            'scripts/*.ts',
            'convex/*.test.ts',
            'convex/lib/*.test.ts',
          ],
          // Кап default-project у typescript-eslint по умолчанию 8, а под
          // allowDefaultProject подпадает 11 файлов (configs + .storybook +
          // scripts + convex-тесты) → иначе линт падает «Too many files (>8)».
          maximumDefaultProjectFileMatchCount_THIS_WILL_SLOW_DOWN_LINTING: 25,
        },
        extraFileExtensions: ['.svelte'],
      },
    },
  },
  {
    files: ['**/*.test.ts', '**/*.stories.svelte'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      // В тестах и storybook-фикстурах indexed access с `!` — контролируемая среда,
      // фикстуры детерминированы. Подавляем шум после noUncheckedIndexedAccess.
      '@typescript-eslint/no-non-null-assertion': 'off',
      // `mockImplementation(() => {})` — стандартный идиом для suppressing console
      // во время теста; пустая функция здесь намеренная.
      '@typescript-eslint/no-empty-function': 'off',
      // Локальные test-/story-хелперы с позиционными аргументами — норма;
      // boilerplate из object-literal параметров здесь только мешает читать.
      'no-restricted-syntax': 'off',
    },
  },
  {
    // XState v5 идиомы: `types: {} as { events: ... }` и `(event as { type, payload }).payload`
    // — это способ нарouwing'а event-типа в action'ах. ESLint считает их избыточными и при
    // --fix снимает, ломая типизацию. Отключаем оба правила для machine-файлов и их тестов.
    files: ['**/*.machine.ts', '**/*.machine.test.ts'],
    rules: {
      '@typescript-eslint/no-unnecessary-type-assertion': 'off',
      '@typescript-eslint/no-non-null-assertion': 'off',
    },
  },
  {
    files: ['**/*.{js,mjs,cjs}'],
    ...ts.configs.disableTypeChecked,
  },
  {
    ignores: [
      '.svelte-kit/',
      'dist/',
      'node_modules/',
      'storybook-static/',
      'build/',
      'tmp/',
      'coverage/',
      'convex/_generated/',
      // AI-обвязка инструментов (impeccable skill под разные CLI) — не код проекта
      '.agents/',
      '.codex/',
      '.kiro/',
      '.opencode/',
      '.claude/',
      '.impeccable/',
    ],
  },
];
