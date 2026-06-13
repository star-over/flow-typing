<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import Avatar from './Avatar.svelte';

  const { Story } = defineMeta({
    title: 'ui/Avatar',
    component: Avatar,
  });

  // Offline-safe sample portrait (inline SVG data-URI) so "With image" renders without network.
  const SAMPLE_IMAGE =
    'data:image/svg+xml;utf8,' +
    encodeURIComponent(
      '<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96">' +
        '<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">' +
        '<stop offset="0" stop-color="#5b8def"/><stop offset="1" stop-color="#c46bd6"/>' +
        '</linearGradient></defs>' +
        '<rect width="96" height="96" fill="url(#g)"/>' +
        '<circle cx="48" cy="40" r="16" fill="#fff" opacity="0.92"/>' +
        '<circle cx="48" cy="92" r="28" fill="#fff" opacity="0.92"/></svg>',
    );
</script>

<Story name="With image" args={{ src: SAMPLE_IMAGE, name: 'Demo User' }} />
<Story name="Initials from name" args={{ name: 'Demo User' }} />
<Story name="Initials from email" args={{ email: 'john.doe@example.com' }} />
<Story name="Single name" args={{ name: 'Alice' }} />
<Story name="Broken image falls back" args={{ src: '/missing-avatar.png', name: 'Demo User' }} />
<Story name="Large" args={{ name: 'Demo User', size: '4rem' }} />
<Story name="No data" args={{}} />
