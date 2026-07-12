# UI entry points (роуты)

Клиентский auth и layout-оркестрация settings-sync — `src/lib/CLAUDE.md`.

- Четыре роута: `/` (лендинг-placeholder с CTA на `/train`), `/train` (auth-барьер ADR 0012: гостю — приглашение войти, авторизованному — хост FSM-views `MenuScreen` / тренировка / `sessionComplete`), `/settings` (приложение: язык UI + тема + имя), `/stats` (журнал сеансов `sessionSummaries` + прогресс ступени; гостю — приглашение войти). Плюс `/signin` для auth UI.
- `src/routes/+layout.svelte` — размещает `appActor`, keyboard listener (`<svelte:window>` onkeydown/up/blur → `KEY_DOWN`/`KEY_UP`/`PAUSE`), theme effects и `Header` (nav-chrome с ссылками на `/settings` и `/stats`). При sibling-навигации layout не размонтируется — FSM состояние переживает навигацию.
- `src/routes/+page.svelte` — лендинг с CTA «Начать тренировку» (`href="/train"`). Inline-placeholder, контракт темы не выделен (tech-debt note inline; запись в `docs/backlog.md`).
- `src/routes/train/+page.svelte` → `src/components/app/App.svelte` — содержимое `/train`; рендерит `MainContent` (выбор по `state.matches(...)`) + `FooterActions` (process-controls, скрыт на `menu`).
- `Space` в `training` блокируется (`preventDefault`), чтобы не прокручивать.
- `TrainingScene.svelte` получает `sessionActor` (`state.children.sessionService`), подписывается на него для таймера и строит вложенный `trainingActor` (`sessionState.children.training`); передаёт `viewModel` в `HandsScene.svelte`; `FlowLine` показывает поток символов с курсором.
