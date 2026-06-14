<script lang="ts">
  import LandingScreen from '@/components/landing/LandingScreen.svelte';
  import { dictionary } from '@/lib/i18n';
</script>

<LandingScreen dictionary={$dictionary} />
