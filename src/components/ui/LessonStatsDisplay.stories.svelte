<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import LessonStatsDisplay from './LessonStatsDisplay.svelte';
  import type { TypingStream } from '$interfaces/types';

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
    { targetSymbol: 'q', targetKeyCaps: ['KeyQ'], attempts: [{ startAt: 1000, endAt: 1240, pressedKeyCups: ['KeyQ'] }] },
    { targetSymbol: 'u', targetKeyCaps: ['KeyU'], attempts: [{ startAt: 1240, endAt: 1480, pressedKeyCups: ['KeyU'] }] },
    { targetSymbol: 'i', targetKeyCaps: ['KeyI'], attempts: [{ startAt: 1480, endAt: 1720, pressedKeyCups: ['KeyI'] }] },
    { targetSymbol: 'c', targetKeyCaps: ['KeyC'], attempts: [{ startAt: 1720, endAt: 1960, pressedKeyCups: ['KeyC'] }] },
    { targetSymbol: 'k', targetKeyCaps: ['KeyK'], attempts: [{ startAt: 1960, endAt: 2200, pressedKeyCups: ['KeyK'] }] },
    { targetSymbol: ' ', targetKeyCaps: ['Space'], attempts: [{ startAt: 2200, endAt: 2440, pressedKeyCups: ['Space'] }] },
    { targetSymbol: 'b', targetKeyCaps: ['KeyB'], attempts: [{ startAt: 2440, endAt: 2680, pressedKeyCups: ['KeyB'] }] },
    { targetSymbol: 'r', targetKeyCaps: ['KeyR'], attempts: [{ startAt: 2680, endAt: 2920, pressedKeyCups: ['KeyR'] }] },
    { targetSymbol: 'o', targetKeyCaps: ['KeyO'], attempts: [{ startAt: 2920, endAt: 3160, pressedKeyCups: ['KeyO'] }] },
    { targetSymbol: 'w', targetKeyCaps: ['KeyW'], attempts: [{ startAt: 3160, endAt: 3400, pressedKeyCups: ['KeyW'] }] },
    { targetSymbol: 'n', targetKeyCaps: ['KeyN'], attempts: [{ startAt: 3400, endAt: 3640, pressedKeyCups: ['KeyN'] }] },
    { targetSymbol: ' ', targetKeyCaps: ['Space'], attempts: [{ startAt: 3640, endAt: 3880, pressedKeyCups: ['Space'] }] },
    { targetSymbol: 'f', targetKeyCaps: ['KeyF'], attempts: [{ startAt: 3880, endAt: 4120, pressedKeyCups: ['KeyF'] }] },
    { targetSymbol: 'o', targetKeyCaps: ['KeyO'], attempts: [{ startAt: 4120, endAt: 4360, pressedKeyCups: ['KeyO'] }] },
    { targetSymbol: 'x', targetKeyCaps: ['KeyX'], attempts: [{ startAt: 4360, endAt: 4600, pressedKeyCups: ['KeyX'] }] },
  ];

  // Average Performance: ~150 CPM, ~83% accuracy with some errors
  const averagePerformanceStream: TypingStream = [
    { targetSymbol: 't', targetKeyCaps: ['KeyT'], attempts: [{ startAt: 5000, endAt: 5250, pressedKeyCups: ['KeyT'] }] },
    { targetSymbol: 'h', targetKeyCaps: ['KeyH'], attempts: [{ startAt: 5250, endAt: 5500, pressedKeyCups: ['KeyH'] }] },
    { targetSymbol: 'e', targetKeyCaps: ['KeyE'], attempts: [
      { startAt: 5500, endAt: 5800, pressedKeyCups: ['KeyR'] },
      { startAt: 5850, endAt: 6100, pressedKeyCups: ['KeyE'] },
    ] },
    { targetSymbol: ' ', targetKeyCaps: ['Space'], attempts: [{ startAt: 6100, endAt: 6350, pressedKeyCups: ['Space'] }] },
    { targetSymbol: 'c', targetKeyCaps: ['KeyC'], attempts: [{ startAt: 6350, endAt: 6600, pressedKeyCups: ['KeyC'] }] },
    { targetSymbol: 'a', targetKeyCaps: ['KeyA'], attempts: [{ startAt: 6600, endAt: 6850, pressedKeyCups: ['KeyA'] }] },
    { targetSymbol: 't', targetKeyCaps: ['KeyT'], attempts: [
      { startAt: 6850, endAt: 7100, pressedKeyCups: ['KeyG'] },
      { startAt: 7150, endAt: 7500, pressedKeyCups: ['KeyT'] },
    ] },
    { targetSymbol: ' ', targetKeyCaps: ['Space'], attempts: [{ startAt: 7500, endAt: 7800, pressedKeyCups: ['Space'] }] },
    { targetSymbol: 'r', targetKeyCaps: ['KeyR'], attempts: [{ startAt: 7800, endAt: 8300, pressedKeyCups: ['KeyR'] }] },
    { targetSymbol: 'n', targetKeyCaps: ['KeyN'], attempts: [{ startAt: 8300, endAt: 9000, pressedKeyCups: ['KeyN'] }] },
  ];

  const { Story } = defineMeta({
    title: 'UI/LessonStatsDisplay',
    component: LessonStatsDisplay,
    args: {
      stream: goodPerformanceStream,
      dictionary: mockDictionary,
    },
  });
</script>

<Story name="GoodPerformance" />

<Story name="AveragePerformance" args={{ stream: averagePerformanceStream }} />

<Story name="EmptyStream" args={{ stream: [] }} />
