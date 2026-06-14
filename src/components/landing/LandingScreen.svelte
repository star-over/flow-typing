<script lang="ts">
  import { resolve } from '$app/paths';
  import type { Dictionary } from '@/interfaces/types';

  interface Props {
    dictionary: Dictionary;
  }

  const { dictionary }: Props = $props();
</script>

<section class="landing">
  <h2 class="hero-title">{dictionary.landing.hero_title}</h2>
  <p class="tagline">{dictionary.landing.tagline}</p>
  <a class="cta" href={resolve('/train')}>{dictionary.app.start_training}</a>
</section>

<style>
  .landing {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--spacing-6);
    text-align: center;
    max-width: 36rem;
    padding: var(--spacing-8) 0;
  }

  .hero-title {
    font-size: 2.25rem;
    font-weight: 700;
    line-height: 1.15;
  }

  .tagline {
    font-size: 1.125rem;
    line-height: 1.5;
    opacity: 0.85;
  }

  /* Primary-CTA: бренд-янтарь (под «T» в Wordmark), тёмный текст. */
  .cta {
    display: inline-flex;
    align-items: center;
    padding: var(--spacing-3) var(--spacing-6);
    border-radius: var(--radius-3);
    background: var(--landing-cta-background);
    color: var(--landing-cta-color);
    border: var(--landing-cta-border);
    font-size: 1rem;
    font-weight: 600;
    text-decoration: none;
    margin-top: var(--spacing-4);
  }

  .cta:hover {
    background: var(--landing-cta-hover-background);
  }

  .cta:focus-visible {
    outline: 2px solid var(--landing-cta-background);
    outline-offset: 3px;
  }
</style>
