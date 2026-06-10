<script lang="ts">
  import { setContext } from 'svelte';
  import type { Snippet } from 'svelte';
  import type { AuthState } from '@/lib/auth/auth.types';

  const { state, children }: { state: AuthState; children: Snippet } = $props();

  setContext('auth', {
    get state() {
      return state;
    },
    signIn: (_provider: string) => Promise.resolve(),
    signOut: () => {
      console.log('mock signOut');
      return Promise.resolve();
    },
  });
</script>

{@render children()}
