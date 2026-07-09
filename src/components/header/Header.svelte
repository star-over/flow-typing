<script lang="ts">
  import { resolve } from '$app/paths';
  import UserMenu from '@/components/auth/UserMenu.svelte';
  import Wordmark from '@/components/ui/Wordmark.svelte';
  import LanguageSwitcher from './LanguageSwitcher.svelte';

  interface Props {
    title: string;
    /** Остаток секунд сессии. null вне тренировки — счётчик не показывается. */
    timerSeconds?: number | null;
    /** Доступна ли пауза (true только в активном наборе). */
    canPause?: boolean;
    /** Текст кнопки паузы (локализован). */
    pauseLabel?: string;
    onPause?: () => void;
    /** Показывать ли переключатель языка (скрыт в активном наборе). */
    showLanguageSwitcher?: boolean;
  }

  const {
    title,
    timerSeconds = null,
    canPause = false,
    pauseLabel = '',
    onPause,
    showLanguageSwitcher = false,
  }: Props = $props();
</script>

<header class="header">
  <div class="bar">
    <a class="brand" href={resolve('/')} aria-label={title}><Wordmark /></a>
    <div class="right">
      {#if timerSeconds !== null}
        <span class="timer" role="timer">{timerSeconds}s</span>
      {/if}
      {#if canPause}
        <button type="button" class="pause" onclick={onPause}>{pauseLabel}</button>
      {/if}
      {#if showLanguageSwitcher}
        <LanguageSwitcher />
      {/if}
      <UserMenu />
    </div>
  </div>
</header>

<style>
  .header {
    width: 100%;
    border-bottom: var(--header-border);
  }

  /* Inner row ограничен по ширине, чтобы бренд и меню не разъезжались по краям
     широкого экрана; сама полоса и нижняя граница — во всю ширину окна. */
  .bar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--spacing-6);
    width: 100%;
    max-width: 64rem;
    margin: 0 auto;
    /* Вертикальный padding срезан (spacing-3 → spacing-1): шапка ниже по высоте,
       больше места сцене. Горизонтальный не трогаем. */
    padding: var(--spacing-1) var(--spacing-8);
  }

  /* Правая группа: тихий счётчик сессии + меню пользователя. */
  .right {
    display: flex;
    align-items: center;
    gap: var(--spacing-4);
  }

  /* Счётчик сессии на периферии — тихий моноширинный текст (примитивов темы
     достаточно, роль-токен не нужен, как и у прежнего .timer в сцене). Моно даёт
     фиксированную ширину цифр: число не дёргает соседей при тике. */
  .timer {
    font-family: var(--font-mono);
    font-size: 0.875rem;
    line-height: 1;
    opacity: 0.7;
  }

  /* Пауза — тихая ghost-кнопка в хроме: прозрачный фон, нейтральная рамка шапки
     (reuse существующего токена, без новой роли в темах), наведение — opacity
     (как у .btn.primary в футере). Семантический янтарь оставлен футеру; в
     нейтральном хроме он бы спорил с «правилом тихого хрома». */
  .pause {
    font-family: var(--font-sans);
    font-size: 0.875rem;
    font-weight: 500;
    line-height: 1;
    padding: var(--spacing-1) var(--spacing-3);
    border: var(--header-border);
    border-radius: var(--radius-2);
    background: transparent;
    color: inherit;
    cursor: pointer;
  }

  .pause:hover {
    opacity: 0.65;
  }

  .pause:focus-visible {
    outline: 2px solid currentColor;
    outline-offset: 2px;
  }

  .brand {
    display: inline-flex;
    font-size: 1.5rem;
    text-decoration: none;
    line-height: 1;
    border-radius: var(--radius-2);
  }

  .brand:focus-visible {
    outline: 2px solid currentColor;
    outline-offset: 4px;
  }
</style>
