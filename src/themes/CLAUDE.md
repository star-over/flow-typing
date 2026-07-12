# Темы и компонентные контракты

Покрывает также `*.contract.ts` рядом с компонентами. Полный гид и алгоритм добавления компонента — `docs/06-component-contracts-and-themes.md`.

Каждый компонент с темизируемыми элементами имеет рядом `*.contract.ts` — массив имён CSS-токенов, которые компонент использует через `var()`. Имена — это **визуальные роли** (`--keycap-l2-background`, `--footer-actions-btn-success-border`, `--keycap-home-ring`), не цвет; значение каждого токена — **полное** CSS-свойство (`1px solid oklch(…)`, `0 0 0 0.25rem oklch(…)`), не только цвет.

Все 17 контрактов агрегируются в `src/themes/contract.ts → THEME_CONTRACT` (115 токенов). Контракт-тест `src/themes/contract.test.ts` enforce-ит, что каждая тема (`src/themes/<id>.css`) и `_template.css` декларируют каждый токен; значения свободны.

Темы в `src/themes/`:
- `light` / `sepia` (colorScheme=light), `dark` / `nord` (colorScheme=dark). Каталог — `THEMES` в `src/themes/registry.ts`.
- Внутри темы свободна структура: ссылки на свою внутреннюю палитру (legacy `--color-*`), формулы `oklch(from var(--key) …)`, литералы — любая смесь.
- `_template.css` — скелет для новой темы: каждый токен задан как `unset`, нужно только заполнить.
- Bootstrap синхронный — inline-script в `src/app.html` выставляет `data-theme` до первой отрисовки сцены. View Transitions API даёт crossfade при смене темы (`src/themes/registry.ts → setTheme`).
