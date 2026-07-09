# Спека — переключатель языка интерфейса в шапке

> Дата: 2026-07-09 · Статус: к реализации (дизайн одобрен на брейншторме)

## Контекст и мотивация

Настройка языка интерфейса (`interfaceLanguage`) сейчас живёт только на странице
`/settings` (контрол `Select` в `SettingsPage.svelte`). Путь до неё длинный: меню
юзера → Settings → поле языка. Хуже для **гостя**: в шапке у гостя только ссылка
«Войти» (`UserMenu` guest-состояние), ссылки на `/settings` нет — язык на лендинге
не сменить иначе как вручную набрав URL. При запуске EN-first (ADR 0021) это заметно:
русскоязычный посетитель на англоязычном лендинге не находит быстрый способ
переключиться.

Решение: компактный переключатель языка **прямо в шапке**, доступный с первого
экрана всем (гостю и авторизованному).

## Принятые решения (брейншторм 2026-07-09)

1. **Форма** — нативный `<select>` (доступность и меню из коробки), в **отдельном**
   компоненте `LanguageSwitcher.svelte`. `Select.svelte` и `/settings` не трогаем.
2. **Триггер** — монохромный глобус (inline-SVG, `currentColor`) + код языка
   (`EN`/`RU`) + шеврон. Стиль — ghost-хром: прозрачный фон, рамка `--header-border`,
   цвет `currentColor` — рифмуется с кнопкой «Пауза». **Новых токенов темы не нужно.**
3. **Место** — правая группа шапки, слева от `UserMenu` (session-контролы
   `таймер`/`пауза` — слева, chrome-контролы `язык`/`юзер` — справа).
4. **Видимость** — скрыт во время активного набора (то же условие, что показывает
   кнопку «Пауза», т.е. `canPause`). Виден во всех прочих состояниях: лендинг, меню,
   **пауза**, sessionComplete, `/stats`, `/settings`, `/signin`.
5. **Доступность для всех** — контрол виден и гостю, и авторизованному. Язык хранится
   в `localStorage`; у авторизованного смена уедет в cloud-sync тем же путём, что и
   сейчас из настроек (никакой новой синхросвязи не добавляем).
6. **`/settings`** — поле языка **убираем**; шапка становится единственным местом
   смены языка. На странице остаются имя (если авторизован) и тема.

## Компонент `LanguageSwitcher.svelte`

Расположение: `src/components/header/LanguageSwitcher.svelte` (рядом с `Header`).

**Ответственность:** отрисовать компактный переключатель языка и записать выбор.
Читает сторы напрямую — как это уже делают `UserMenu`/`SettingsPage` (дети шапки
подписываются на сторы сами, Header остаётся «глупым»):

- `import { settings, updateSettings } from '@/lib/settings'` — текущий
  `$settings.interfaceLanguage` и запись `updateSettings({ interfaceLanguage })`.
- `import { dictionary } from '@/lib/i18n'` — коды языков и `aria-label`.

**Разметка:** обёртка (по образцу `Select.svelte`: `appearance:none` + mask-стрелка)
с декоративным глобусом слева и нативным `<select>`:

- глобус — inline-`<svg>`, `aria-hidden="true"`, `stroke: currentColor`;
- `<select aria-label={…}>` с двумя `<option>` — значения `en`/`ru`, надписи —
  коды из словаря (см. i18n);
- закрытая надпись нативного select = текст выбранного `<option>` → показывает код
  (`EN`/`RU`); открытый список — нативный ОС-ный (осознанный trade-off выбора
  нативного select).

**Стиль (в `<style>` компонента, без новых контракт-токенов):** прозрачный фон,
`border: var(--header-border)`, `color: inherit`, компактные отступы и размер шрифта
как у `.pause`; `:focus-visible` — `outline: 2px solid currentColor` (паттерн из
Header). Стрелка-шеврон — mask-приём из `Select.svelte`, цвет `currentColor`.

**Доступность:** видимый текст — только код (`EN`), поэтому `<select>` получает
`aria-label` из словаря (`settings.interface_language_label` → «Interface language» /
«Язык интерфейса»). Глобус — `aria-hidden`.

## Проводка в шапке и layout

- `Header.svelte` получает новый проп `showLanguageSwitcher: boolean` (по умолчанию
  `false`, как у прочих опциональных пропов) и рендерит внутри `.right`, **перед**
  `<UserMenu />`:
  ```svelte
  {#if showLanguageSwitcher}
    <LanguageSwitcher />
  {/if}
  ```
- `+layout.svelte` вычисляет видимость из уже доступного сигнала и передаёт в Header:
  ```svelte
  <Header … showLanguageSwitcher={!canPause} />
  ```
  `canPause` в layout уже есть (`appState.can({ type: 'PAUSE' })`) и равен `true`
  ровно в активном наборе — значит `!canPause` даёт «скрыт во время набора, виден
  везде остальном», что и требуется.

## Изменения i18n (ADR 0022 — все UI-строки в словаре)

В `dictionaries/{en,ru}.json`:

- добавить коды языков в секцию `options`:
  ```json
  "interfaceLanguageCodes": { "en": "EN", "ru": "RU" }
  ```
  Значения **одинаковы** в обоих словарях (коды язык-нейтральны) — случай ADR 0022
  «непереводимое живёт в i18n с совпадающим значением».
- `aria-label` контрола — переиспользуем существующий
  `settings.interface_language_label` (не заводим новый ключ).

Ключ `settings.interface_language_description` (подсказка поля на /settings) после
удаления поля станет неиспользуемым. **Оставляем** его на месте — прореживание
мёртвых i18n-ключей ведётся отдельным бэклог-пунктом («Прореживание неиспользуемых
i18n-ключей»), не смешиваем.

## Изменение `/settings`

В `SettingsPage.svelte`:

- удалить блок `<label class="field">` с полем языка (`interface_language_label` +
  `Select` по `interfaceLanguage`);
- удалить ставший ненужным `$derived` `interfaceLanguages` (строится только для этого
  поля);
- удалить импорт типа `UserSettings` — он используется единственный раз, в приведении
  `v as UserSettings['interfaceLanguage']` этого поля (проверено: `SettingsPage.svelte:63`),
  после удаления поля осиротеет (иначе eslint/`svelte-check` ругнётся).

Остальные поля (имя, тема, кнопка «Назад») — без изменений.

## Темы

Новых контракт-токенов **нет** (как у кнопки паузы): переключатель переиспользует
`--header-border` + `currentColor` + примитивы. Значит `THEME_CONTRACT`,
`contract.test.ts` и файлы тем **не трогаем**. `Header.contract.ts` не меняется.

## Вне scope / отложено

- **Вариант A** (фирменный попап-дропдаун 🌐+код в стиле `UserMenu`, свои токены
  темы) — записан в `docs/backlog.md` («Переключатель языка в шапке — заменить
  нативный select на фирменный дропдаун»); замена по драйверу (3-й язык или
  визуальный дискомфорт от нативного меню).
- Прореживание мёртвого ключа `interface_language_description` — существующий
  бэклог-пункт, отдельно.

## Проверка

- `make check-dev` (eslint + svelte-check + vitest) — зелёный.
- Живьём: en↔ru прямо из шапки на **лендинге гостем** и в приложении авторизованным;
  убедиться, что во время активного набора контрол исчезает и возвращается на паузе;
  что `/settings` больше не содержит поля языка.
- `make spell` перед коммитом (новых русских строк в словарь не добавляем — коды
  `EN`/`RU` латиницей; проверить прозой спеку/бэклог через `/fix-spell`).
- Storybook-story для `LanguageSwitcher` — опционально, для консистентности с
  `UserMenu`/`SignInScreen` (по желанию владельца).

## Затрагиваемые файлы

- `src/components/header/LanguageSwitcher.svelte` — **новый**.
- `src/components/header/Header.svelte` — проп `showLanguageSwitcher` + условный
  рендер `LanguageSwitcher` перед `UserMenu`.
- `src/routes/+layout.svelte` — передать `showLanguageSwitcher={!canPause}` в Header.
- `src/components/ui/SettingsPage.svelte` — убрать поле языка + осиротевший `$derived`.
- `dictionaries/en.json`, `dictionaries/ru.json` — `options.interfaceLanguageCodes`.
- `docs/backlog.md` — уже записан пункт про вариант A (сделано на брейншторме).
