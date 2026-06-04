<script module>
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import HandsExt from './HandsExt.svelte';
  import { fingerLayoutASDF } from '@/data/layouts/finger-layout-asdf';
  import { keyboardLayoutANSI } from '@/data/layouts/keyboard-layout-ansi';
  import { getSymbolLayout } from '@/data/layouts/layouts';
  import { idle } from '@/fixtures/hands-ext/idle';
  import { simple_space } from '@/fixtures/hands-ext/simple_space';
  import { simple_e_error_simple_d } from '@/fixtures/hands-ext/simple_e_error_simple_d';
  import { shift_t_error_shift_n } from '@/fixtures/hands-ext/shift_t_error_shift_n';

  const symbolLayout = getSymbolLayout('qwerty');

  const { Story } = defineMeta({
    title: 'UI/HandsExt',
    component: HandsExt,
    args: {
      viewModel: idle.expectedOutput,
      fingerLayout: fingerLayoutASDF,
      keyboardLayout: keyboardLayoutANSI,
      symbolLayout,
      centerPointVisibility: 'INVISIBLE',
    },
    parameters: {
      layout: 'fullscreen',
    },
  });
</script>

<Story name="Idle" />

<Story name="IdleWithCenterPoints" args={{ centerPointVisibility: 'VISIBLE' }} />

<Story name="SimpleSpace" args={{ viewModel: simple_space.expectedOutput }} />

<Story name="SimpleEErrorSimpleD" args={{ viewModel: simple_e_error_simple_d.expectedOutput }} />

<Story name="ShiftTErrorShiftN" args={{ viewModel: shift_t_error_shift_n.expectedOutput }} />

<!-- TODO: more variants (shift_o, simple_k, simple_r_error_simple_f, etc.) -->
