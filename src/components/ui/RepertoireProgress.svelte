<script lang="ts">
  import type { RepertoireSnapshot } from '@/lib/repertoire/repertoire-store.svelte';
  import type { Dictionary } from '@/interfaces/types';

  interface Props {
    snapshot: RepertoireSnapshot;
    grew: boolean;
    isGuest: boolean;
    dictionary: Dictionary;
  }

  const { snapshot, grew, isGuest, dictionary }: Props = $props();

  const t = $derived(dictionary.repertoire_progress);

  function fill({ template, values }: { template: string; values: Record<string, string | number> }): string {
    return Object.entries(values).reduce(
      (s, [key, val]) => s.replace(`{${key}}`, String(val)),
      template,
    );
  }

  const readyPct = $derived(
    snapshot && snapshot.totalOnStep > 0
      ? Math.round((snapshot.readyCount / snapshot.totalOnStep) * 100)
      : 0,
  );

  const fillScale = $derived(readyPct / 100);
</script>

{#if isGuest}
  <div class="repertoire-progress guest">
    <p class="guest-invite">{t.guest_invite}</p>
  </div>
{:else if snapshot !== null}
  <div class="repertoire-progress">
    <h3 class="title">{t.title}</h3>

    <div class="meta">
      <span class="label">{fill({ template: t.step, values: { current: snapshot.openedSteps, max: snapshot.totalSteps } })}</span>
      <span class="value">{fill({ template: t.ready, values: { ready: snapshot.readyCount, total: snapshot.totalOnStep } })}</span>
    </div>

    <div
      class="bar-track"
      role="progressbar"
      aria-valuenow={readyPct}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={t.title}
    >
      <div class="bar-fill" style="transform: scaleX({fillScale})"></div>
    </div>

    <div class="status">
      {#if grew}
        <p class="status-accent">{t.new_step}</p>
      {:else if snapshot.maturingNeeded === 0}
        <p class="status-ready">{t.ready_to_advance}</p>
      {:else}
        <p class="status-maturing">{fill({ template: t.maturing, values: { count: snapshot.maturingNeeded } })}</p>
        {#if snapshot.blockers.exposure > 0 || snapshot.blockers.accuracy > 0 || snapshot.blockers.latency > 0}
          <ul class="blockers">
            {#if snapshot.blockers.exposure > 0}
              <li>{t.blockers_practice}</li>
            {/if}
            {#if snapshot.blockers.accuracy > 0}
              <li>{t.blockers_accuracy}</li>
            {/if}
            {#if snapshot.blockers.latency > 0}
              <li>{t.blockers_speed}</li>
            {/if}
          </ul>
        {/if}
      {/if}
    </div>
  </div>
{/if}

<style>
  .repertoire-progress {
    width: 100%;
    max-width: 640px;
    padding: var(--spacing-6);
    background: var(--repertoire-progress-background);
    border: var(--repertoire-progress-border);
    border-radius: var(--radius-4);
  }

  .title {
    font-size: 1rem;
    font-weight: 700;
    color: var(--repertoire-progress-value-color);
    margin-bottom: var(--spacing-3);
  }

  .meta {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    margin-bottom: var(--spacing-2);
  }

  .label {
    font-size: 0.875rem;
    color: var(--repertoire-progress-label-color);
  }

  .value {
    font-size: 0.875rem;
    font-weight: 600;
    color: var(--repertoire-progress-value-color);
  }

  .bar-track {
    width: 100%;
    height: 0.5rem;
    background: var(--repertoire-progress-bar-track);
    border-radius: var(--radius-2);
    overflow: hidden;
    margin-bottom: var(--spacing-3);
  }

  .bar-fill {
    width: 100%;
    height: 100%;
    background: var(--repertoire-progress-bar-fill);
    border-radius: var(--radius-2);
    transform-origin: left;
    transition: transform 0.3s ease;
  }

  .status {
    font-size: 0.875rem;
    color: var(--repertoire-progress-label-color);
  }

  .status-accent {
    color: var(--repertoire-progress-accent-color);
    font-weight: 600;
  }

  .status-ready {
    color: var(--repertoire-progress-accent-color);
  }

  .status-maturing {
    margin-bottom: var(--spacing-1);
  }

  .blockers {
    margin: 0;
    padding-left: var(--spacing-4);
    list-style: disc;
  }

  .blockers li {
    line-height: 1.6;
  }

  .guest-invite {
    font-size: 0.875rem;
    color: var(--repertoire-progress-label-color);
    text-align: center;
  }
</style>
