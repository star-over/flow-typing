<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import Card from './Card.svelte';

  const { Story } = defineMeta({
    title: 'ui/Card',
    component: Card,
  });
</script>

<Story name="Padding md (default)">
  <Card><p>Card content.</p></Card>
</Story>
<Story name="Padding sm">
  <Card padding="sm"><p>Card content.</p></Card>
</Story>
<Story name="Padding none">
  <Card padding="none"><p style="padding: 1rem;">Self-padded content.</p></Card>
</Story>
<Story name="As section">
  <Card as="section" aria-label="Demo region"><p>Rendered as section.</p></Card>
</Story>
<Story name="Constrained width">
  <Card style="max-width: 20rem;"><p>Width limited via caller style.</p></Card>
</Story>
