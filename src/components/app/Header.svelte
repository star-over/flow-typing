<script lang="ts">
  interface Props {
    title: string;
    appStateLabel: string;
    appStateValue: string;
  }

  const { title, appStateLabel, appStateValue }: Props = $props();
</script>

<header class="header">
  <h1 class="title">{title}</h1>
  <div class="debug">
    <span class="label">{appStateLabel}:</span>
    <code class="value">{appStateValue}</code>
  </div>
</header>

<style>
  .header {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--spacing-2);
    width: 100%;
    padding: var(--spacing-4) 0;
  }

  .title {
    font-size: 1.5rem;
    font-weight: 700;
    color: var(--header-title-color);
  }

  .debug {
    font-size: 0.75rem;
    color: var(--header-debug-color);
    font-family: var(--font-mono);
  }

  .label {
    margin-right: var(--spacing-1);
  }

  .value {
    background: var(--header-debug-background);
    padding: var(--spacing-1) var(--spacing-2);
    border-radius: var(--radius-2);
  }
</style>
