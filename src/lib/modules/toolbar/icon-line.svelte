<script lang="ts">
  let { class: className = '' }: { class?: string } = $props()
</script>

<svg
  xmlns="http://www.w3.org/2000/svg"
  viewBox="0 0 24 24"
  fill="none"
  stroke="currentColor"
  stroke-width="2"
  stroke-linecap="round"
  stroke-linejoin="round"
  class={className}
>
  <line x1="5" y1="5" x2="19" y2="19" />
  <circle cx="5" cy="5" r="2.5" />
  <circle cx="19" cy="19" r="2.5" />
</svg>
