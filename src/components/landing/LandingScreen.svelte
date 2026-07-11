<script lang="ts">
  import { resolve } from '$app/paths';
  import { env } from '$env/dynamic/public';
  import type { Dictionary } from '@/interfaces/types';
  import LandingHandsDemo from './LandingHandsDemo.svelte';

  interface Props {
    dictionary: Dictionary;
  }

  const { dictionary }: Props = $props();
  const l = $derived(dictionary.landing);

  // Feedback-канал (P0-7): ссылка появляется, только если владелец задал контакт
  // (PUBLIC_FEEDBACK_URL — Telegram/email). Не задан → футера нет.
  const feedbackUrl = env.PUBLIC_FEEDBACK_URL;

  // Мотивы трёх принципов — крошечные SVG из визуального языка тренажёра
  // (дуга пути · home-засечка · ровный ритм). По индексу принципа.
  const motifs = ['path', 'home', 'rhythm'] as const;
</script>

<div class="landing">
  <!-- HERO -->
  <section class="hero">
    <div class="hero-copy">
      <h1 class="hero-title">{l.hero_title}</h1>
      <p class="tagline">{l.tagline}</p>
      <a class="cta" href={resolve('/train')}>{dictionary.app.start_training}</a>
    </div>
    <div class="hero-demo">
      <LandingHandsDemo label={l.demo_aria} />
    </div>
  </section>

  <!-- HOW IT WORKS -->
  <section class="how">
    <h2 class="section-title">{l.how_title}</h2>
    <ol class="principles">
      {#each l.principles as p, i (p.title)}
        <li class="principle">
          <span class="motif" aria-hidden="true">
            {#if motifs[i] === 'path'}
              <svg viewBox="0 0 32 32"><path d="M6 24 Q16 4 26 24" /><circle cx="26" cy="24" r="3" /></svg>
            {:else if motifs[i] === 'home'}
              <svg viewBox="0 0 32 32"><rect x="5" y="7" width="22" height="18" rx="3" /><line x1="13" y1="22" x2="19" y2="22" /></svg>
            {:else}
              <svg viewBox="0 0 32 32"><line x1="7" y1="22" x2="7" y2="10" /><line x1="16" y1="24" x2="16" y2="8" /><line x1="25" y1="22" x2="25" y2="10" /></svg>
            {/if}
          </span>
          <div class="principle-text">
            <h3 class="principle-title">{p.title}</h3>
            <p class="principle-body">{p.body}</p>
          </div>
        </li>
      {/each}
    </ol>
  </section>

  <!-- PHILOSOPHY -->
  <section class="philosophy">
    <h2 class="section-title">{l.philosophy_title}</h2>
    <p class="lead">{l.philosophy_lead}</p>
    <div class="contrast">
      <div class="side side-old">
        <span class="side-label">{l.philosophy_old_label}</span>
        <p class="side-text">{l.philosophy_old_text}</p>
      </div>
      <div class="side side-new">
        <span class="side-label">{l.philosophy_new_label}</span>
        <p class="side-text">{l.philosophy_new_text}</p>
      </div>
    </div>
  </section>

  <!-- CLOSING -->
  <section class="closing">
    <h2 class="closing-title">{l.closing_title}</h2>
    <p class="tagline">{l.closing_text}</p>
    <a class="cta" href={resolve('/train')}>{dictionary.app.start_training}</a>
  </section>

  {#if feedbackUrl}
    <footer class="site-footer">
      <!-- feedbackUrl — ВНЕШНИЙ адрес (PUBLIC_FEEDBACK_URL: Telegram/mailto), не
           маршрут SvelteKit; resolve() применим только к внутренним путям. -->
      <!-- eslint-disable-next-line svelte/no-navigation-without-resolve -->
      <a class="feedback-link" href={feedbackUrl}>{l.feedback_label}</a>
    </footer>
  {/if}
</div>

<style>
  .landing {
    width: 100%;
    max-width: 64rem;
    margin: 0 auto;
    display: flex;
    flex-direction: column;
    gap: clamp(var(--spacing-8), 12vh, 8rem);
    padding-block: var(--spacing-6) var(--spacing-8);
  }

  /* --- HERO --- */
  .hero {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: center;
    gap: var(--spacing-8) clamp(var(--spacing-6), 6vw, var(--spacing-8));
  }

  .hero-copy {
    flex: 1 1 20rem;
    max-width: 30rem;
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: var(--spacing-4);
  }

  .hero-demo {
    flex: 1 1 22rem;
    min-width: 0;
    display: flex;
    justify-content: center;
  }

  .hero-title {
    font-size: clamp(2rem, 1.4rem + 2.4vw, 3.25rem);
    font-weight: 700;
    line-height: 1.08;
    letter-spacing: -0.02em;
    text-wrap: balance;
  }

  .tagline {
    font-size: var(--font-size-lg);
    line-height: var(--line-height-normal);
    color: var(--landing-muted-color);
    text-wrap: pretty;
    max-width: 34ch;
  }

  /* Primary-CTA: фирменный янтарь (как «T» в Wordmark), тёмный текст. */
  .cta {
    display: inline-flex;
    align-items: center;
    padding: var(--spacing-3) var(--spacing-6);
    border-radius: var(--radius-3);
    background: var(--landing-cta-background);
    color: var(--landing-cta-color);
    border: var(--landing-cta-border);
    font-size: var(--font-size-md);
    font-weight: var(--font-weight-semibold);
    text-decoration: none;
    transition: background-color var(--motion-duration-fast) var(--motion-ease-standard),
      transform var(--motion-duration-fast) var(--motion-ease-standard);
  }

  .cta:hover {
    background: var(--landing-cta-hover-background);
  }

  .cta:active {
    transform: translateY(1px);
  }

  .cta:focus-visible {
    outline: 2px solid var(--landing-cta-background);
    outline-offset: 3px;
  }

  /* --- Shared section headings --- */
  .section-title {
    font-size: clamp(1.5rem, 1.2rem + 1.2vw, 2rem);
    font-weight: var(--font-weight-semibold);
    line-height: var(--line-height-tight);
    letter-spacing: -0.01em;
    text-wrap: balance;
  }

  /* --- HOW IT WORKS --- */
  .how {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-6);
  }

  .principles {
    list-style: none;
    display: flex;
    flex-direction: column;
    gap: var(--spacing-2);
  }

  .principle {
    display: flex;
    align-items: flex-start;
    gap: var(--spacing-6);
    padding: var(--spacing-6) 0;
    border-top: var(--landing-rule);
  }

  .principle:last-child {
    border-bottom: var(--landing-rule);
  }

  .motif {
    flex-shrink: 0;
    width: 2.5rem;
    height: 2.5rem;
    color: var(--landing-demo-path);
  }

  .motif svg {
    width: 100%;
    height: 100%;
    fill: none;
    stroke: currentColor;
    stroke-width: 2;
    stroke-linecap: round;
    stroke-linejoin: round;
  }

  .motif circle {
    fill: currentColor;
    stroke: none;
  }

  .principle-text {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-2);
  }

  .principle-title {
    font-size: var(--font-size-xl);
    font-weight: var(--font-weight-semibold);
    line-height: var(--line-height-tight);
  }

  .principle-body {
    font-size: var(--font-size-md);
    line-height: var(--line-height-normal);
    color: var(--landing-muted-color);
    text-wrap: pretty;
    max-width: 60ch;
  }

  /* --- PHILOSOPHY --- */
  .philosophy {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-6);
  }

  .lead {
    font-size: clamp(1.125rem, 1rem + 0.8vw, 1.5rem);
    line-height: 1.4;
    font-weight: var(--font-weight-regular);
    text-wrap: balance;
    max-width: 40ch;
  }

  .contrast {
    display: flex;
    flex-wrap: wrap;
    gap: var(--spacing-6);
  }

  .side {
    flex: 1 1 16rem;
    display: flex;
    flex-direction: column;
    gap: var(--spacing-2);
    padding-top: var(--spacing-4);
    border-top: var(--landing-rule);
  }

  .side-label {
    font-size: var(--font-size-sm);
    font-weight: var(--font-weight-semibold);
    letter-spacing: 0.01em;
  }

  /* «Обычный тренажёр» — приглушён; «FlowTyping» — янтарная подпись-якорь. */
  .side-old {
    color: var(--landing-muted-color);
  }

  .side-new {
    border-top-color: var(--landing-cta-background);
  }

  .side-new .side-label {
    color: var(--landing-cta-background);
  }

  .side-text {
    font-size: var(--font-size-md);
    line-height: var(--line-height-normal);
    text-wrap: pretty;
  }

  /* --- CLOSING --- */
  .closing {
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
    gap: var(--spacing-4);
    padding-block: var(--spacing-6);
  }

  .closing-title {
    font-size: clamp(1.5rem, 1.2rem + 1.4vw, 2.25rem);
    font-weight: var(--font-weight-bold);
    line-height: var(--line-height-tight);
    letter-spacing: -0.01em;
    text-wrap: balance;
  }

  .closing .tagline {
    text-align: center;
    max-width: 38ch;
  }

  /* --- Motion: спокойный вход героя; секции-принципы settle при прокрутке.
     База всегда видима (opacity не зависит от класса или scroll-анимации). --- */
  @media (prefers-reduced-motion: no-preference) {
    .hero-copy > *,
    .hero-demo {
      animation: rise var(--motion-duration-slow) var(--motion-ease-decelerate) backwards;
    }
    .hero-copy > *:nth-child(1) { animation-delay: 40ms; }
    .hero-copy > *:nth-child(2) { animation-delay: 120ms; }
    .hero-copy > *:nth-child(3) { animation-delay: 200ms; }
    .hero-demo { animation-delay: 160ms; }

    @supports (animation-timeline: view()) {
      .principle {
        animation: settle linear both;
        animation-timeline: view();
        animation-range: entry 5% entry 45%;
      }
    }
  }

  @keyframes rise {
    from { opacity: 0; transform: translateY(0.75rem); }
    to { opacity: 1; transform: none; }
  }

  /* opacity-пол 0.45 — секция никогда не «пустая», даже до появления на экране. */
  @keyframes settle {
    from { opacity: 0.45; transform: translateY(1rem); }
    to { opacity: 1; transform: none; }
  }

  /* --- FOOTER: тихая feedback-ссылка (primitives + существующие landing-токены,
     новой роли темы не нужно). --- */
  .site-footer {
    display: flex;
    justify-content: center;
    padding-top: var(--spacing-6);
    border-top: var(--landing-rule);
  }

  .feedback-link {
    font-size: var(--font-size-sm);
    color: var(--landing-muted-color);
    text-decoration: none;
  }

  .feedback-link:hover {
    text-decoration: underline;
  }

  .feedback-link:focus-visible {
    outline: 2px solid currentColor;
    outline-offset: 2px;
    border-radius: var(--radius-2);
  }
</style>
