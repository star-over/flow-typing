<script module>
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import VirtualKeyboard from './VirtualKeyboard.svelte';
  import { fingerLayoutASDF } from '@/data/layouts/finger-layout-asdf';
  import { keyboardLayoutANSI } from '@/data/layouts/keyboard-layout-ansi';
  import { getSymbolLayout } from '@/data/layouts/layouts';
  import { createVirtualLayout } from '@/lib/virtual-layout';

  const symbolLayoutEn = getSymbolLayout('qwerty');
  const symbolLayoutRu = getSymbolLayout('йцукен');

  const virtualLayoutEn = createVirtualLayout({
    keyboardLayout: keyboardLayoutANSI,
    symbolLayout: symbolLayoutEn,
    fingerLayout: fingerLayoutASDF,
  });

  const virtualLayoutRu = createVirtualLayout({
    keyboardLayout: keyboardLayoutANSI,
    symbolLayout: symbolLayoutRu,
    fingerLayout: fingerLayoutASDF,
  });

  const { Story } = defineMeta({
    title: 'UI/VirtualKeyboard',
    component: VirtualKeyboard,
    args: {
      virtualLayout: virtualLayoutEn,
      keyboardLayout: keyboardLayoutANSI,
      symbolLayout: symbolLayoutEn,
    },
  });
</script>

<Story name="WholeKeyboard" />

<Story name="CyrillicKeyboard" args={{ virtualLayout: virtualLayoutRu, symbolLayout: symbolLayoutRu }} />
