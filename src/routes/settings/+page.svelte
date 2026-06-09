<script lang="ts">
  import SettingsPage from '@/components/ui/SettingsPage.svelte';
  import { dictionary } from '@/lib/i18n';
  import { goto } from '$app/navigation';
  import { resolve } from '$app/paths';
</script>

<SettingsPage
  dictionary={$dictionary}
  onBack={() => goto(resolve('/'))}
/>
