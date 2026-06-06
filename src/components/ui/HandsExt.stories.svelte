<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import HandsExt from './HandsExt.svelte';
  import { getFingerLayout, getPhysicalLayout, getSymbolLayout } from '@/lib/layouts';

  const fingerLayoutASDF = getFingerLayout('asdf');
  const physicalLayoutANSI = getPhysicalLayout('ansi');
  import { VISIBILITY_STATES } from '@/interfaces/types';

  // Все фикстуры из hands-scene.test.ts — единый источник правды
  // для тестов и для визуальной проверки.
  import { idle } from '@/fixtures/hands-ext/idle';
  import { simple_t } from '@/fixtures/hands-ext/simple_t';
  import { simple_k } from '@/fixtures/hands-ext/simple_k';
  import { simple_6 } from '@/fixtures/hands-ext/simple_6';
  import { simple_space } from '@/fixtures/hands-ext/simple_space';
  import { shift_b } from '@/fixtures/hands-ext/shift_b';
  import { shift_f } from '@/fixtures/hands-ext/shift_f';
  import { shift_o } from '@/fixtures/hands-ext/shift_o';
  import { simple_k_error_simple_j } from '@/fixtures/hands-ext/simple_k_error_simple_j';
  import { simple_r_error_simple_f } from '@/fixtures/hands-ext/simple_r_error_simple_f';
  import { simple_e_error_simple_d } from '@/fixtures/hands-ext/simple_e_error_simple_d';
  import { simple_e_error_space } from '@/fixtures/hands-ext/simple_e_error_space';
  import { simple_e_error_shift_F } from '@/fixtures/hands-ext/simple_e_error_shift_F';
  import { shift_o_error_simple_o } from '@/fixtures/hands-ext/shift_o_error_simple_o';
  import { shift_t_error_shift_n } from '@/fixtures/hands-ext/shift_t_error_shift_n';

  const symbolLayout = getSymbolLayout('qwerty');

  const { Story } = defineMeta({
    title: 'UI/HandsExt',
    component: HandsExt,
    args: {
      viewModel: idle.expectedOutput,
      fingerLayout: fingerLayoutASDF,
      physicalLayout: physicalLayoutANSI,
      symbolLayout,
      centerPointVisibility: 'INVISIBLE',
    },
    argTypes: {
      viewModel: { control: false },
      fingerLayout: { control: false },
      physicalLayout: { control: false },
      symbolLayout: { control: false },
      centerPointVisibility: { options: VISIBILITY_STATES, control: 'inline-radio' },
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
<Story name="Type / Letter t" args={{ viewModel: simple_t.expectedOutput }} />
<Story name="Type / Letter k" args={{ viewModel: simple_k.expectedOutput }} />
<Story name="Type / Digit 6" args={{ viewModel: simple_6.expectedOutput }} />
<Story name="Type / Space" args={{ viewModel: simple_space.expectedOutput }} />

<!-- Shift: целевой заглавный символ (с Shift) -->
<Story name="Shift / Capital B" args={{ viewModel: shift_b.expectedOutput }} />
<Story name="Shift / Capital F" args={{ viewModel: shift_f.expectedOutput }} />
<Story name="Shift / Capital O" args={{ viewModel: shift_o.expectedOutput }} />

<!-- Error: целились в одно, нажали другое -->
<Story name="Error / Wanted k, pressed j" args={{ viewModel: simple_k_error_simple_j.expectedOutput }} />
<Story name="Error / Wanted r, pressed f" args={{ viewModel: simple_r_error_simple_f.expectedOutput }} />
<Story name="Error / Wanted e, pressed d" args={{ viewModel: simple_e_error_simple_d.expectedOutput }} />
<Story name="Error / Wanted e, pressed Space" args={{ viewModel: simple_e_error_space.expectedOutput }} />
<Story name="Error / Wanted e, pressed Shift+F" args={{ viewModel: simple_e_error_shift_F.expectedOutput }} />
<Story name="Error / Wanted O (Shift), pressed o" args={{ viewModel: shift_o_error_simple_o.expectedOutput }} />
<Story name="Error / Wanted T (Shift), pressed Shift+N" args={{ viewModel: shift_t_error_shift_n.expectedOutput }} />
