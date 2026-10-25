<template>
  <div
    v-ripple
    role="button"
    tabindex="0"
    class="relative-position cursor-pointer q-hoverable text-uppercase text-accent q-pa-lg"
    @keydown.enter.space.prevent.stop="$event.currentTarget.click()"
  >
    <span class="q-focus-helper"></span>
    {{ label }}
  </div>
</template>

<script setup>
defineProps({
  label: { type: String, default: '' }
})
</script>
