<script lang="ts">
  import type { Actor, StateFrom } from 'xstate';
  import type { appMachine } from '@/machines/app.machine';
  import type { sessionMachine } from '@/machines/session.machine';
  import type { Dictionary } from '@/interfaces/types';
  import { getContext } from 'svelte';
  import { getFingerLayout, getPhysicalLayout } from '@/lib/layouts';
  import { settings } from '@/lib/settings';

  const fingerLayout = $derived(getFingerLayout($settings.fingerLayoutId));
  const physicalLayoutANSI = getPhysicalLayout('ansi');

  import { inState } from '@/lib/state-utils';
  import { accuracyPercent, sessionStatsFromSummary } from '@/lib/stats-calculator';
  import { deltaToBaseline, historyWithoutCurrent } from '@/lib/session-baseline';
  import { topConfusionForDisplay } from '@/lib/confusion-display';
  import { getSymbolLayout } from '@/lib/layouts';

  import TrainingScene from '@/components/train/TrainingScene.svelte';
  import SessionStatsDisplay from '@/components/train/SessionStatsDisplay.svelte';
  import RepertoireProgress from '@/components/train/RepertoireProgress.svelte';
  import SurveyPrompt from '@/components/train/SurveyPrompt.svelte';
  import type { RepertoireStore } from '@/lib/repertoire/repertoire-store.svelte';
  import type { AuthStore } from '@/lib/auth/auth-store.svelte';
  import type { SessionsStore } from '@/lib/session-history/sessions-store.svelte';
  import type { SurveyStore } from '@/lib/survey/survey-store.svelte';
  import { shouldShowMicroSurvey } from '@/lib/survey/micro-survey';
  import { api, convex } from '@/lib/convex';
  import type { SurveyAnswer } from '@/interfaces/survey';

  const repertoire = getContext<RepertoireStore>('repertoire');
  const auth = getContext<AuthStore>('auth');
  const sessions = getContext<SessionsStore>('sessions');
  const survey = getContext<SurveyStore>('survey');
  const showSurvey = $derived(
    shouldShowMicroSurvey({ sessionCount: sessions.list.length, hasResponded: survey.hasResponded }),
  );

  function recordSurvey(answer: SurveyAnswer) {
    // fire-and-forget, at-most-once (ADR 0015) — как sessionSummary. Сбой (rate-limit/
    // офлайн) гасим: опрос не критичен, при не-записи hasResponded не станет true и в
    // следующей сессии вопрос всплывёт снова.
    void convex
      .mutation(api.surveys.record, { answer })
      .catch((err) => console.warn('surveyRecord пропущен (офлайн, at-most-once — ADR 0015)', err));
  }

  interface Props {
    state: StateFrom<typeof appMachine>;
    dictionary: Dictionary;
    sessionActor: Actor<typeof sessionMachine> | undefined;
  }

  const { state, dictionary, sessionActor }: Props = $props();

  // null, когда нечего показывать (нет завершённой сессии или ни одного предъявления).
  // Тогда экран sessionComplete пуст — допустимое degenerate-состояние, решение
  // принимает родитель, не сам SessionStatsDisplay. Источник — каноническая сводка
  // сессии (те же числа, что строка /stats), а не «настенное» время по attempts.
  const summary = $derived(state.context.lastSessionSummary);
  const sessionStats = $derived.by(() => {
    if (!summary || summary.exposures === 0) return null;
    return sessionStatsFromSummary(summary);
  });

  /** Сколько прошлых сессий несёт траектория. Больше — линия превращается в шум. */
  const TREND_LIMIT = 8;

  // Прошлые сессии БЕЗ текущей: журнал — живая подписка, и строка только что
  // законченной сессии прилетает в неё уже после показа экрана (fire-and-forget,
  // ADR 0015). Не снять её — точка-сегодня раздвоится на глазах.
  const history = $derived(
    summary ? historyWithoutCurrent({ journal: sessions.list, current: summary }) : [],
  );

  const trend = $derived(
    history.slice(-TREND_LIMIT).map((row) => ({
      accuracy: accuracyPercent({ exposures: row.exposures, clean: row.clean }),
    })),
  );

  // Точность к прошлой сессии: величина устойчивая, одного замера хватает.
  const accuracyDelta = $derived.by(() => {
    const previous = history.at(-1);
    if (!previous || !sessionStats) return undefined;
    return sessionStats.accuracy - accuracyPercent({ exposures: previous.exposures, clean: previous.clean });
  });

  // Ритм — к своей недавней норме, не к прошлой сессии: ADR 0004 по итогам
  // валидации на реальных прохождениях зафиксировал его шумным, и дельта к
  // одному замеру хлопала бы случайно. Сессии без ритма в базу не берём.
  const rhythmDelta = $derived.by(() => {
    const current = sessionStats?.rhythm;
    if (current === undefined) return undefined;
    const rhythms = history.flatMap((row) => (row.rhythm == null ? [] : [row.rhythm]));
    return deltaToBaseline({ current, history: rhythms });
  });

  // Единственное на экране, что можно унести и применить. `pressed` в журнале —
  // KeyCapId; в символ его переводит показ, через выбранную раскладку.
  const confusion = $derived.by(() => {
    if (!summary) return undefined;
    return topConfusionForDisplay({
      confusions: summary.confusions,
      symbolLayout: getSymbolLayout($settings.symbolLayoutId),
    });
  });
</script>

{#if inState({ snapshot: state, value: { training: 'running' } }) && sessionActor}
  <TrainingScene
    {sessionActor}
    {fingerLayout}
    physicalLayout={physicalLayoutANSI}
    cursorType={$settings.cursorType}
    rhythmChannelEnabled={$settings.rhythmChannelEnabled}
    rhythmAriaLabel={dictionary.app.rhythm_channel_aria}
    loadingLabel={dictionary.app.loading}
  />

{:else if inState({ snapshot: state, value: 'sessionComplete' }) && sessionStats}
  <!-- Опрос — НАД статистикой: заметность важнее (замер гипотезы, P1). -->
  {#if showSurvey}
    <SurveyPrompt {dictionary} onAnswer={recordSurvey} />
  {/if}
  <SessionStatsDisplay
    stats={sessionStats}
    {trend}
    {accuracyDelta}
    {rhythmDelta}
    {confusion}
    {dictionary}
  />
  <RepertoireProgress
    snapshot={repertoire.snapshot}
    grew={repertoire.grew}
    isGuest={auth.state.status === 'guest'}
    {dictionary}
  />

{:else if inState({ snapshot: state, value: 'sessionComplete' })}
  <!-- Вырожденное завершение: сессия окончилась без единого предъявления
       (sessionStats===null при exposures===0) — раньше экран был пуст. Сообщаем,
       а не оставляем белое поле. Кнопка «Начать заново» — в FooterActions. -->
  {#if showSurvey}
    <SurveyPrompt {dictionary} onAnswer={recordSurvey} />
  {/if}
  <p class="screen-note">{dictionary.app.session_empty}</p>

{:else if inState({ snapshot: state, value: 'sessionError' })}
  <!-- Сетевой сбой старта сессии (sessionMachine.error → SESSION.ERROR): видимая
       деградация вместо тихого пустого завершения. Кнопка «Повторить» —
       в FooterActions. -->
  <div class="session-error">
    <h2 class="screen-title">{dictionary.app.error_title}</h2>
    <p class="screen-note">{dictionary.app.error_network}</p>
  </div>

{:else if inState({ snapshot: state, value: { training: 'paused' } })}
  <h2 class="screen-title pause">{dictionary.app.pause}</h2>
{/if}
<!-- Ветки под `idle` нет: /train автоматически запускает (ADR 0025), меню-экран упразднён. -->


<style>
  .screen-title {
    font-size: var(--font-size-2xl);
    font-weight: var(--font-weight-bold);
  }

  .pause {
    color: var(--color-text-secondary);
  }

  .session-error {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--spacing-3);
    max-width: 28rem;
    text-align: center;
  }

  .screen-note {
    color: var(--color-text-secondary);
  }
</style>
