# Признак окружения деплоя — явная `DEPLOY_ENV`, трактуемая fail-closed

> Статус: принят · 2026-07-09 · поправлен [ADR 0024](0024-dev-login-vite-dev-gating.md) (снят второй предохранитель Password) · Реализация: в коде (`convex/lib/env.ts`; правит план запуска [`docs/plans/2026-07-05-mvp-launch.md`](../plans/2026-07-05-mvp-launch.md) §2 P0-3, §4)

Dev-инструменты (ADR 0012) — Password-провайдер входа и мутации «чистого листа»
(`resetMyProfile`) / прыжка по ступеням (`setMyLadderStep`) — на боевом deployment опасны:
`setMyLadderStep` = дыра целостности (любой авторизованный юзер прыгает на произвольную
ступень), Password даёт вход по паролю в обход OAuth. До этого решения единственным
барьером была env-дисциплина: Password включался одной переменной `AUTH_DEV_LOGIN_ENABLED`
без проверки «это dev», а dev-мутации были public и жили на любом deployment. Мандат P0-3 —
**не полагаться только на дисциплину env**, добавить code-guard, требующий признак не-prod.

Проблема: у Convex **нет встроенного `isProduction`**. Env-переменные задаются
per-deployment, а набор вызываемых функций фиксируется на deployment — выбирать тип функции
по env запрещено (`export const f = env ? mutation() : internalMutation()` — рантайм-ошибка,
docs.convex.dev/production/environment-variables). Значит, перевод dev-мутаций в
`internalMutation` невозможен (их зовёт клиент через `window.__*`, ADR 0012), а гейт обязан
жить **внутри handler'а через `throw`**, тип функции остаётся `mutation`.

Решение: держим **явный** per-deployment маркер `DEPLOY_ENV` и единый чистый helper
`convex/lib/env.ts` → `isProduction()` / `assertNonProd()`, трактуемый **fail-closed**:
prod-предохранители снимает ТОЛЬКО явное `DEPLOY_ENV=development`; отсутствие или любое
другое значение = production (закрыто). Helper используется в обоих гардах: dev-мутации
зовут `assertNonProd()` в обёртке (чистые handler'ы не трогаются, остаются тестируемыми),
Password регистрируется при `devLoginEnabled && !isProduction()` (двойной независимый
предохранитель).

## Considered options

- **`internalMutation` для dev-мутаций** (исходная формулировка плана) — отвергнут: их
  вызывает клиент (`window.__resetProfile` / `__setLadderStep` через `convex.mutation`),
  `internalMutation` с клиента недоступна → dev-инструментарий агентов ломается. «Условный тип по
  env» как спасение невозможен (Convex запрещает).
- **Детект по авто-переменным Convex** (`CONVEX_CLOUD_URL` / имя деплоя `wandering-ocelot-9`) —
  отвергнут: хрупко, завязано на конкретное имя, ломается на новом deployment/preview.
- **Переиспользовать `AUTH_DEV_LOGIN_ENABLED` как «это dev»** — отвергнут: семантически это
  «включён ли dev-вход», не «это prod»; один флаг на оба гарда убивает defense-in-depth
  (ошибочный set открывает всё сразу).
- **Fail-open** (`isProduction = DEPLOY_ENV === 'production'`) — отвергнут: защита prod сама
  держится на «вспомнить выставить `=production`» в чек-листе P0-2 — то есть снова упирается
  в дисциплину env, ровно чего мандат велит избегать. Проще операционно (dev-deployment и тесты
  не трогаем), но забытая переменная на prod = двери открыты.
- **Явная `DEPLOY_ENV`, fail-closed (выбран)** — prod безопасен по умолчанию; забытая
  переменная на prod оставляет двери закрытыми, забытая на dev ломает dev-инструмент громко
  и безопасно (сразу заметно). Цена — `DEPLOY_ENV=development` нужно задать на dev-deployment и
  в тестовом окружении.

## Consequences

- **Failure-mode перенесён на безопасную сторону**: на боевом deployment ничего задавать не
  обязательно — он закрыт по умолчанию; забыть можно только на dev, где это шумно и
  безвредно.
- **Dev-deployment обязан нести `DEPLOY_ENV=development`.** Задано на `wandering-ocelot-9`;
  любой новый dev/preview-deployment без него будет вести себя как prod (dev-вход и dev-мутации
  выключены). Это цена fail-closed.
- **Тесты эмулируют dev-deployment**: convex-проект vitest выставляет `DEPLOY_ENV=development`
  (`vitest.config.ts`), иначе fail-closed счёл бы окружение prod и заблокировал мутационные
  тесты. Прод-поведение проверяется точечным `vi.stubEnv`.
- **Preview-deployments Convex трактуются как prod** (нет явного `development`) → dev-инструменты
  на них выключены. Если под staging потребуется dev-вход — выставить там
  `DEPLOY_ENV=development` осознанно.
- **`isProduction()` — общий seam**: будущие бэкенд-гарды (rate-limiting P0-10,
  прочие dev-only функции) берут тот же helper, а не заводят новый признак.
- **Password теперь за двумя независимыми предохранителями** (`AUTH_DEV_LOGIN_ENABLED` **и**
  `!isProduction()`): ошибочно выставленный на prod флаг провайдер не поднимет.
- **Env-матрица запуска дополнена** (план §4): prod — `DEPLOY_ENV` не задавать (или
  `production`) и `AUTH_DEV_LOGIN_ENABLED` не ставить; dev — `DEPLOY_ENV=development`.
- _(2026-07-11, [ADR 0024](0024-dev-login-vite-dev-gating.md))_ **Второй предохранитель
  Password снят.** `AUTH_DEV_LOGIN_ENABLED` больше не читается; Password за одним
  `!isProduction()`, в один ряд с dev-мутациями. Следствия выше про «два независимых
  предохранителя» и prod-строку «`AUTH_DEV_LOGIN_ENABLED` не ставить» относятся к
  исходному решению; актуальный механизм и разбор цены — в 0024.

<!--
Написано в момент решения (сессия 2026-07-09), владельцем выбрана fail-closed-семантика.
Тело принятого ADR не переписывать: смена курса = новый ADR со ссылками в обе стороны
(политика — README.md «Жизненный цикл»).
-->
