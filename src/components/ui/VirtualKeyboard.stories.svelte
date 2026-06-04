<script module>
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import VirtualKeyboard from './VirtualKeyboard.svelte';
  import { fingerLayoutASDF } from '@/data/layouts/finger-layout-asdf';
  import { physicalLayoutANSI } from '@/data/layouts/physical-layout-ansi';
  import { getSymbolLayout } from '@/data/layouts/layouts';
  import { createVirtualLayout } from '@/lib/virtual-layout';

  const symbolLayoutEn = getSymbolLayout('qwerty');
  const symbolLayoutJcuken = getSymbolLayout('йцукен');

  const virtualLayoutEn = createVirtualLayout({
    physicalLayout: physicalLayoutANSI,
    symbolLayout: symbolLayoutEn,
    fingerLayout: fingerLayoutASDF,
  });

  const virtualLayoutRu = createVirtualLayout({
    physicalLayout: physicalLayoutANSI,
    symbolLayout: symbolLayoutJcuken,
    fingerLayout: fingerLayoutASDF,
  });

  const { Story } = defineMeta({
    title: 'UI/VirtualKeyboard',
    component: VirtualKeyboard,
    args: {
      virtualLayout: virtualLayoutEn,
      physicalLayout: physicalLayoutANSI,
      symbolLayout: symbolLayoutEn,
    },
  });
</script>

<Story name="WholeKeyboard" />

<Story name="CyrillicKeyboard" args={{ virtualLayout: virtualLayoutRu, symbolLayout: symbolLayoutJcuken }} />
