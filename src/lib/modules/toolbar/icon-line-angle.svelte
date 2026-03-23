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
  <!-- Line 1: top-left to bottom-right -->
  <line x1="4" y1="5" x2="20" y2="19" />
  <circle cx="4" cy="5" r="1.8" />
  <circle cx="20" cy="19" r="1.8" />
  <!-- Line 2: top-right to bottom-left -->
  <line x1="18" y1="4" x2="6" y2="20" />
  <circle cx="18" cy="4" r="1.8" />
  <circle cx="6" cy="20" r="1.8" />
  <!-- Angle arc at intersection -->
  <path d="M 10.2 8.5 A 3.5 3.5 0 0 1 13.5 8" fill="none" />
</svg>
