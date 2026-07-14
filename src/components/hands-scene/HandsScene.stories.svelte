<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import HandsScene from './HandsScene.svelte';
  import { getFingerLayout, getPhysicalLayout, getSymbolLayout } from '@/lib/layouts';

  const fingerLayoutASDF = getFingerLayout('asdf');
  const physicalLayoutANSI = getPhysicalLayout('ansi');
  import { VISIBILITY_STATES } from '@/interfaces/types';

  // Все фикстуры из hands-scene.test.ts — единый источник правды
  // для тестов и для визуальной проверки.
  import { idle } from '@/fixtures/hands-scene/idle';
  import { simple_t } from '@/fixtures/hands-scene/simple_t';
  import { simple_k } from '@/fixtures/hands-scene/simple_k';
  import { simple_6 } from '@/fixtures/hands-scene/simple_6';
  import { simple_space } from '@/fixtures/hands-scene/simple_space';
  import { shift_b } from '@/fixtures/hands-scene/shift_b';
  import { shift_f } from '@/fixtures/hands-scene/shift_f';
  import { shift_o } from '@/fixtures/hands-scene/shift_o';
  import { simple_k_error_simple_j } from '@/fixtures/hands-scene/simple_k_error_simple_j';
  import { simple_r_error_simple_f } from '@/fixtures/hands-scene/simple_r_error_simple_f';
  import { simple_e_error_simple_d } from '@/fixtures/hands-scene/simple_e_error_simple_d';
  import { simple_e_error_space } from '@/fixtures/hands-scene/simple_e_error_space';
  import { simple_e_error_shift_f } from '@/fixtures/hands-scene/simple_e_error_shift_f';
  import { shift_o_error_simple_o } from '@/fixtures/hands-scene/shift_o_error_simple_o';
  import { shift_t_error_shift_n } from '@/fixtures/hands-scene/shift_t_error_shift_n';

  const symbolLayout = getSymbolLayout('qwerty');

  const { Story } = defineMeta({
    title: 'UI/HandsScene',
    component: HandsScene,
    args: {
      handsScene: idle.expectedOutput,
      fingerLayout: fingerLayoutASDF,
      physicalLayout: physicalLayoutANSI,
      symbolLayout,
      centerPointVisibility: 'INVISIBLE',
      advanceKey: 0,
    },
    argTypes: {
      handsScene: { table: { disable: true } },
      fingerLayout: { table: { disable: true } },
      physicalLayout: { table: { disable: true } },
      symbolLayout: { table: { disable: true } },
      centerPointVisibility: { options: VISIBILITY_STATES, control: 'inline-radio' },
      // Меняй это число в панели Controls, чтобы увидеть fade кластера (появление/
      // исчезновение) — в т.ч. «повтор буквы»: тот же кластер, но с обратной связью.
      advanceKey: { control: 'number' },
    },
    parameters: {
      layout: 'fullscreen',
    },
  });
</script>

<!-- Idle: руки в покое, ничего не нажимается -->
<Story name="Idle / Default" />
<Story name="Idle / With center points" args={{ centerPointVisibility: 'VISIBLE' }} />

<!-- Type: целевой символ без модификатора -->
<Story name="Type / Letter t" args={{ handsScene: simple_t.expectedOutput }} />
<Story name="Type / Letter k" args={{ handsScene: simple_k.expectedOutput }} />
<Story name="Type / Digit 6" args={{ handsScene: simple_6.expectedOutput }} />
<Story name="Type / Space" args={{ handsScene: simple_space.expectedOutput }} />

<!-- Shift: целевой заглавный символ (с Shift) -->
<Story name="Shift / Capital B" args={{ handsScene: shift_b.expectedOutput }} />
<Story name="Shift / Capital F" args={{ handsScene: shift_f.expectedOutput }} />
<Story name="Shift / Capital O" args={{ handsScene: shift_o.expectedOutput }} />

<!-- Error: целились в одно, нажали другое -->
<Story name="Error / Wanted k, pressed j" args={{ handsScene: simple_k_error_simple_j.expectedOutput }} />
<Story name="Error / Wanted r, pressed f" args={{ handsScene: simple_r_error_simple_f.expectedOutput }} />
<Story name="Error / Wanted e, pressed d" args={{ handsScene: simple_e_error_simple_d.expectedOutput }} />
<Story name="Error / Wanted e, pressed Space" args={{ handsScene: simple_e_error_space.expectedOutput }} />
<Story name="Error / Wanted e, pressed Shift+F" args={{ handsScene: simple_e_error_shift_f.expectedOutput }} />
<Story name="Error / Wanted O (Shift), pressed o" args={{ handsScene: shift_o_error_simple_o.expectedOutput }} />
<Story name="Error / Wanted T (Shift), pressed Shift+N" args={{ handsScene: shift_t_error_shift_n.expectedOutput }} />
