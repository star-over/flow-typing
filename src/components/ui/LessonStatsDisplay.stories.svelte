<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import LessonStatsDisplay from './LessonStatsDisplay.svelte';
  import type { TypingStream } from '@/interfaces/types';

  const mockDictionary = {
    stats_card: {
      title: 'Lesson Results',
      cpm: 'Speed',
      wpm: 'WPM',
      accuracy: 'Accuracy',
      duration: 'Duration',
      units: {
        cpm: 'CPM',
        wpm: 'WPM',
        accuracy: '%',
        duration: 's',
      },
    },
  };

  // Good Performance: ~250 CPM, ~100% accuracy
  const goodPerformanceStream: TypingStream = [
    { targetSymbol: 'q', targetKeyCaps: ['KeyQ'], attempts: [{ startAt: 1000, endAt: 1240, pressedKeyCaps: ['KeyQ'] }] },
    { targetSymbol: 'u', targetKeyCaps: ['KeyU'], attempts: [{ startAt: 1240, endAt: 1480, pressedKeyCaps: ['KeyU'] }] },
    { targetSymbol: 'i', targetKeyCaps: ['KeyI'], attempts: [{ startAt: 1480, endAt: 1720, pressedKeyCaps: ['KeyI'] }] },
    { targetSymbol: 'c', targetKeyCaps: ['KeyC'], attempts: [{ startAt: 1720, endAt: 1960, pressedKeyCaps: ['KeyC'] }] },
    { targetSymbol: 'k', targetKeyCaps: ['KeyK'], attempts: [{ startAt: 1960, endAt: 2200, pressedKeyCaps: ['KeyK'] }] },
    { targetSymbol: ' ', targetKeyCaps: ['Space'], attempts: [{ startAt: 2200, endAt: 2440, pressedKeyCaps: ['Space'] }] },
    { targetSymbol: 'b', targetKeyCaps: ['KeyB'], attempts: [{ startAt: 2440, endAt: 2680, pressedKeyCaps: ['KeyB'] }] },
    { targetSymbol: 'r', targetKeyCaps: ['KeyR'], attempts: [{ startAt: 2680, endAt: 2920, pressedKeyCaps: ['KeyR'] }] },
    { targetSymbol: 'o', targetKeyCaps: ['KeyO'], attempts: [{ startAt: 2920, endAt: 3160, pressedKeyCaps: ['KeyO'] }] },
    { targetSymbol: 'w', targetKeyCaps: ['KeyW'], attempts: [{ startAt: 3160, endAt: 3400, pressedKeyCaps: ['KeyW'] }] },
    { targetSymbol: 'n', targetKeyCaps: ['KeyN'], attempts: [{ startAt: 3400, endAt: 3640, pressedKeyCaps: ['KeyN'] }] },
    { targetSymbol: ' ', targetKeyCaps: ['Space'], attempts: [{ startAt: 3640, endAt: 3880, pressedKeyCaps: ['Space'] }] },
    { targetSymbol: 'f', targetKeyCaps: ['KeyF'], attempts: [{ startAt: 3880, endAt: 4120, pressedKeyCaps: ['KeyF'] }] },
    { targetSymbol: 'o', targetKeyCaps: ['KeyO'], attempts: [{ startAt: 4120, endAt: 4360, pressedKeyCaps: ['KeyO'] }] },
    { targetSymbol: 'x', targetKeyCaps: ['KeyX'], attempts: [{ startAt: 4360, endAt: 4600, pressedKeyCaps: ['KeyX'] }] },
  ];

  // Average Performance: ~150 CPM, ~83% accuracy with some errors
  const averagePerformanceStream: TypingStream = [
    { targetSymbol: 't', targetKeyCaps: ['KeyT'], attempts: [{ startAt: 5000, endAt: 5250, pressedKeyCaps: ['KeyT'] }] },
    { targetSymbol: 'h', targetKeyCaps: ['KeyH'], attempts: [{ startAt: 5250, endAt: 5500, pressedKeyCaps: ['KeyH'] }] },
    { targetSymbol: 'e', targetKeyCaps: ['KeyE'], attempts: [
      { startAt: 5500, endAt: 5800, pressedKeyCaps: ['KeyR'] },
      { startAt: 5850, endAt: 6100, pressedKeyCaps: ['KeyE'] },
    ] },
    { targetSymbol: ' ', targetKeyCaps: ['Space'], attempts: [{ startAt: 6100, endAt: 6350, pressedKeyCaps: ['Space'] }] },
    { targetSymbol: 'c', targetKeyCaps: ['KeyC'], attempts: [{ startAt: 6350, endAt: 6600, pressedKeyCaps: ['KeyC'] }] },
    { targetSymbol: 'a', targetKeyCaps: ['KeyA'], attempts: [{ startAt: 6600, endAt: 6850, pressedKeyCaps: ['KeyA'] }] },
    { targetSymbol: 't', targetKeyCaps: ['KeyT'], attempts: [
      { startAt: 6850, endAt: 7100, pressedKeyCaps: ['KeyG'] },
      { startAt: 7150, endAt: 7500, pressedKeyCaps: ['KeyT'] },
    ] },
    { targetSymbol: ' ', targetKeyCaps: ['Space'], attempts: [{ startAt: 7500, endAt: 7800, pressedKeyCaps: ['Space'] }] },
    { targetSymbol: 'r', targetKeyCaps: ['KeyR'], attempts: [{ startAt: 7800, endAt: 8300, pressedKeyCaps: ['KeyR'] }] },
    { targetSymbol: 'n', targetKeyCaps: ['KeyN'], attempts: [{ startAt: 8300, endAt: 9000, pressedKeyCaps: ['KeyN'] }] },
  ];

  const { Story } = defineMeta({
    title: 'UI/LessonStatsDisplay',
    component: LessonStatsDisplay,
    argTypes: {
      stream: { table: { disable: true } },
      dictionary: { table: { disable: true } },
    },
    args: {
      stream: goodPerformanceStream,
      dictionary: mockDictionary,
    },
  });
</script>

<Story name="GoodPerformance" />

<Story name="AveragePerformance" args={{ stream: averagePerformanceStream }} />

<Story name="EmptyStream" args={{ stream: [] }} />
