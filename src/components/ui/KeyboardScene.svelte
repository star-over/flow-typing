<script lang="ts">
  import type { PhysicalLayout, SymbolLayout, KeyboardSceneViewModel } from '@/interfaces/types';
  import { getLabel } from '@/lib/symbol-utils';
  import KeyCap from './KeyCap.svelte';

  interface Props {
    keyboardScene: KeyboardSceneViewModel;
    physicalLayout: PhysicalLayout;
    symbolLayout: SymbolLayout;
  }

  const { keyboardScene, physicalLayout, symbolLayout }: Props = $props();
</script>

<div class="keyboard">
  {#each keyboardScene as row, rowIndex (rowIndex)}
    <div class="row">
      {#each row as sceneKey (sceneKey.keyCapId)}
        <KeyCap
          keyCapId={sceneKey.keyCapId}
          symbol={getLabel({ keyCapId: sceneKey.keyCapId, symbolLayout, physicalLayout })}
          pressResult={sceneKey.pressResult ?? 'NONE'}
          visibility={sceneKey.visibility ?? 'VISIBLE'}
          fingerId={sceneKey.fingerId}
          unitWidth={sceneKey.unitWidth}
          symbolSize={sceneKey.symbolSize}
          homeKeyMarker={sceneKey.homeKeyMarker}
          home={sceneKey.home}
          navigationRole={sceneKey.navigationRole}
          navigationArrow={sceneKey.navigationArrow}
        />
      {/each}
    </div>
  {/each}
</div>

<style>
  .keyboard {
    display: flex;
    flex-direction: column;
    width: fit-content;
    gap: var(--spacing-2);
    background-color: transparent;
  }

  .row {
    display: flex;
    flex-wrap: nowrap;
    gap: var(--spacing-3);
  }
</style>
