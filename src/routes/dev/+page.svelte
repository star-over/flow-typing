<script lang="ts">
  import { dev } from '$app/environment';
  import { api, convex } from '@/lib/convex';

  let pingResult: string | null = $state(null);
  let tickResult: string | null = $state(null);
  let error: string | null = $state(null);

  async function handlePing() {
    error = null;
    try {
      pingResult = await convex.query(api.health.ping, {});
    } catch (e) {
      error = e instanceof Error ? e.message : String(e);
    }
  }

  async function handleTick() {
    error = null;
    try {
      const id = await convex.mutation(api.health.tick, {});
      tickResult = id;
    } catch (e) {
      error = e instanceof Error ? e.message : String(e);
    }
  }
</script>

{#if dev}
  <h1>Convex health check</h1>
  <p>This page is dev-only diagnostic for Convex connection. Deleted in Phase 3.</p>

  <button type="button" onclick={handlePing}>Ping</button>
  <p>Ping result: {pingResult ?? '(not called yet)'}</p>

  <button type="button" onclick={handleTick}>Tick</button>
  <p>Tick result: {tickResult ?? '(not called yet)'}</p>

  {#if error}
    <pre style='color: red;'>Error: {error}</pre>
  {/if}
{:else}
  <p>Not available in production.</p>
{/if}
