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
  <line x1="7" y1="3" x2="19" y2="12" />
  <line x1="5" y1="21" x2="19" y2="12" />
  <circle cx="7" cy="3" r="2" />
  <circle cx="19" cy="12" r="2" />
  <circle cx="5" cy="21" r="2" />
</svg>
