<template>
  <div
    v-ripple
    class="relative-position cursor-pointer q-hoverable text-uppercase text-accent q-pa-lg"
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
