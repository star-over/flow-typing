<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import Button from './Button.svelte';
  import KeyHint from './KeyHint.svelte';

  const { Story } = defineMeta({
    title: 'ui/Button',
    component: Button,
  });
</script>

<Story name="Neutral">
  <Button variant="neutral">Neutral</Button>
</Story>
<Story name="Primary">
  <Button variant="primary">Primary</Button>
</Story>
<Story name="Success">
  <Button variant="success">Success</Button>
</Story>
<Story name="Danger">
  <Button variant="danger">Danger</Button>
</Story>
<Story name="Ghost">
  <Button variant="ghost">Ghost</Button>
</Story>
<Story name="Accent (large, link)">
  <Button variant="accent" size="lg" href="#">Начать тренировку</Button>
</Story>

<Story name="Size md vs lg">
  <div style="display:flex; gap:1rem; align-items:center;">
    <Button variant="primary" size="md">md</Button>
    <Button variant="primary" size="lg">lg</Button>
  </div>
</Story>

<Story name="Disabled">
  <Button variant="primary" disabled>Disabled</Button>
</Story>

<Story name="As link (href)">
  <Button variant="neutral" href="#">Navigates</Button>
</Story>

<Story name="With KeyHint (accent)">
  <Button variant="accent" size="lg" href="#">
    Начать тренировку
    <KeyHint code="Enter" />
  </Button>
</Story>

<Story name="With KeyHint (primary)">
  <Button variant="primary">
    Пауза
    <KeyHint code="Escape" />
  </Button>
</Story>
