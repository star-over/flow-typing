/**
 * Theme contract for RhythmChannel.svelte.
 *
 * Контракт-тест в `src/themes/contract.test.ts` проверяет, что каждая тема
 * декларирует токены из этого списка.
 *
 * RhythmChannel — «канал ритма»: горизонтальная полоса со статичной зелёной зоной
 * по центру и маркером-кромкой, который прыгает на нажатии и оседает под
 * гравитацией. Зелёный/янтарь/оранжевый здесь — семантические токены ИСХОДОВ (в
 * темпе / частишь / тормозишь), а не палитра-украшение: цвет несёт смысл «куда
 * нажал относительно своего темпа». Правило «тихого хрома» не нарушается —
 * насыщенность отдана визуализации, как у пути и пальцев.
 *
 * Форма значения у каждого токена помечена в комментарии: цвет (для `background`)
 * либо полное значение `border`.
 */
export const RHYTHM_CHANNEL_CONTRACT = [
  '--rhythm-channel-track-background', // фон полосы (цвет)
  '--rhythm-channel-track-border',     // рамка всей полосы (1px solid …)
  '--rhythm-channel-zone-fill',        // заливка зелёной зоны (цвет, мягкий)
  '--rhythm-channel-zone-edge',        // цвет кромок зоны (цвет, насыщеннее)
  '--rhythm-channel-marker-in',        // маркер: тап в зоне — держишь темп (цвет)
  '--rhythm-channel-marker-above',     // маркер: тап выше зоны — частишь (цвет)
  '--rhythm-channel-marker-below',     // маркер: тап ниже зоны — тормозишь (цвет)
] as const satisfies readonly `--${string}`[];

export type RhythmChannelContractToken = (typeof RHYTHM_CHANNEL_CONTRACT)[number];
