<script lang="ts">
  import type { KeyCapNavigationArrow } from '@/interfaces/types';

  interface Props {
    direction: KeyCapNavigationArrow;
  }

  const { direction }: Props = $props();

  const uid = $props.id();
  const gradientId = `nav-arrow-grad-${uid}`;
  const maskId = `nav-arrow-mask-${uid}`;
</script>

{#if direction !== 'NONE'}
  <span class="nav-arrow {direction}" aria-hidden="true">
    <svg viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
      <mask id={maskId} fill="white">
        <path fill-rule="evenodd" clip-rule="evenodd" d="M27 21L13.5 0L0 21H5.70578V28H20.9231V21H27Z" />
      </mask>
      <path class="fill" fill-rule="evenodd" clip-rule="evenodd" d="M27 21L13.5 0L0 21H5.70578V28H20.9231V21H27Z" fill-opacity="0.7" />
      <path fill-rule="evenodd" clip-rule="evenodd" d="M27 21L13.5 0L0 21H5.70578V28H20.9231V21H27Z" fill="url(#{gradientId})" fill-opacity="0.8" />
      <path class="stroke" d="M13.5 0L14.3412 -0.540758L13.5 -1.84926L12.6588 -0.540758L13.5 0ZM27 21V22H28.8317L27.8412 20.4592L27 21ZM0 21L-0.841178 20.4592L-1.83167 22H0V21ZM5.70578 21H6.70578V20H5.70578V21ZM5.70578 28H4.70578V29H5.70578V28ZM20.9231 28V29H21.9231V28H20.9231ZM20.9231 21V20H19.9231V21H20.9231ZM12.6588 0.540758L26.1588 21.5408L27.8412 20.4592L14.3412 -0.540758L12.6588 0.540758ZM0.841178 21.5408L14.3412 0.540758L12.6588 -0.540758L-0.841178 20.4592L0.841178 21.5408ZM5.70578 20H0V22H5.70578V20ZM6.70578 28V21H4.70578V28H6.70578ZM20.9231 27H5.70578V29H20.9231V27ZM19.9231 21V28H21.9231V21H19.9231ZM27 20H20.9231V22H27V20Z" fill-opacity="0.2" mask="url(#{maskId})" />
      <defs>
        <linearGradient id={gradientId} x1="13.5" y1="0" x2="13.5" y2="28" gradientUnits="userSpaceOnUse">
          <stop class="gradient-start" />
          <stop offset="1" stop-color="white" stop-opacity="0" />
        </linearGradient>
      </defs>
    </svg>
  </span>
{/if}

<style>
  /* Positioned absolutely relative to the nearest positioned ancestor (e.g. a KeyCap).
     The parent must be position: relative for placement to make sense. */
  .nav-arrow {
    position: absolute;
    line-height: 0;
    pointer-events: none;
    z-index: 10;
  }

  .nav-arrow svg {
    width: 1.625em;
  }

  .nav-arrow.UP {
    top: -50%;
    left: 50%;
    transform: translateX(-50%) rotate(0deg);
  }

  .nav-arrow.DOWN {
    bottom: -50%;
    left: 50%;
    transform: translateX(-50%) rotate(180deg);
  }

  .nav-arrow.LEFT {
    top: 50%;
    left: -50%;
    transform: translateY(-50%) rotate(-90deg);
  }

  .nav-arrow.RIGHT {
    top: 50%;
    right: -50%;
    transform: translateY(-50%) rotate(90deg);
  }

  .fill { fill: var(--color-arrow-fill); }
  .stroke { fill: var(--color-arrow-stroke); }
  .gradient-start { stop-color: var(--color-arrow-gradient); }
</style>
