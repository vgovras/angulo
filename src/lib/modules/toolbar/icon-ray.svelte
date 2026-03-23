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
  <!-- Line from origin point to arrow -->
  <line x1="4" y1="18" x2="20" y2="6" />
  <!-- Origin point (circle) -->
  <circle cx="4" cy="18" r="2.5" />
  <!-- Arrow head -->
  <polyline points="14,5 20,6 19,12" fill="none" />
</svg>
