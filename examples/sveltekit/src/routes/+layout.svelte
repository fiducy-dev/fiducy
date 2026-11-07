<script lang="ts">
import '#lib/example-kit/styles.css';

const { children } = $props();
</script>

<svelte:head>
  <title>Fiducy with SvelteKit</title>
</svelte:head>

{@render children()}
