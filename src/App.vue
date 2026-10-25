<template>
  <div class="container column no-wrap">
    <div class="col column no-wrap" :class="{ display: !mobileScreen }">
      <div class="col relative-position text-accent">
        <q-badge
          v-touch-hold:1000.mouse="drop"
          rounded
          :color="scoreColor"
          :label="formatPercent(score)"
          :title="t.holdToReset"
          class="text-h5 q-ma-sm q-px-md cursor-pointer"
          :class="dir === 'rtl' ? 'absolute-top-left' : 'absolute-top-right'"
        />
        <!-- Arithmetic reads left to right in right to left languages too -->
        <div
          dir="ltr"
          class="absolute-full flex flex-center text-h1 text-weight-medium no-pointer-events"
        >
          {{ question }}
        </div>
      </div>
      <div class="text-h6 row no-wrap q-pa-none text-center text-button">
        <template v-if="revealed">
          <simple-button class="col-6 bg-negative" :label="t.didntKnow" @click="grade(false)" />
          <simple-button class="col-6 bg-positive" :label="t.knew" @click="grade(true)" />
        </template>
        <simple-button v-else class="col-12 bg-info" :label="t.reveal" @click="reveal()" />
      </div>
      <div class="col relative-position text-accent">
        <div
          dir="ltr"
          class="absolute-full flex flex-center text-h1 text-weight-medium no-pointer-events"
        >
          <template v-if="revealed">{{ answer }}</template>
          <template v-else>? ? ?</template>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { debounce, useQuasar } from 'quasar'
import { computed, onMounted, onUnmounted, ref } from 'vue'

import SimpleButton from '@/components/SimpleButton.vue'
import { useI18n } from '@/i18n'
import { createFacts, getProbability, isAskable } from '@/trainer'
import { selectRandomly } from '@/utils'

const $q = useQuasar()
const mobileScreen = computed(() => $q.screen.width < 800)
const { dir, t, formatNumber, formatPercent } = useI18n()

function loadState() {
  try {
    const state = JSON.parse(localStorage.getItem('state'))
    return state && typeof state === 'object' ? state : {}
  } catch {
    return {}
  }
}

const savedState = loadState()

const iteration = ref(savedState?.iteration || 1)

const options = ref([])
const option = ref()

for (const fact of createFacts()) {
  const optionState = savedState[fact.key]
  const asked = optionState?.asked || 0
  const confirms = optionState?.confirms || 0
  options.value.push({ ...fact, asked, confirms })
}

const revealed = ref(true)

function reset() {
  revealed.value = false
  option.value = selectRandomly(
    options.value
      .filter((option) => isAskable(option, iteration.value))
      .map((option) => [option, getProbability(option, iteration.value)])
  )
}

function flush() {
  const state = { iteration: iteration.value }
  for (const { key, asked, confirms } of options.value) {
    state[key] = { asked, confirms }
  }
  try {
    localStorage.setItem('state', JSON.stringify(state))
  } catch {
    // Storage is unavailable or full, keep progress in memory only
  }
}

function drop() {
  iteration.value = 1
  for (const option of options.value) {
    option.asked = 0
    option.confirms = 0
  }
  flush()
}

const question = computed(() => {
  if (!option.value) return undefined
  const { left, operator, right } = option.value
  return `${formatNumber(left)} ${operator} ${formatNumber(right)}`
})
const answer = computed(() => option.value && formatNumber(option.value.answer))

const score = computed(() => {
  if (!options.value?.length) return 0
  const success = options.value.reduce((acc, option) => acc + (option.confirms ? 1 : 0), 0)
  return (success * 100) / options.value.length
})

const scoreColor = computed(() => {
  if (score.value < 50) return 'negative'
  if (score.value < 100) return 'warning'
  return 'positive'
})

// Act immediately, but ignore any further action until taps settle down,
// so a double tap on "Reveal the answer" doesn't also grade the answer
const act = debounce((action) => action(), 300, true)

function reveal() {
  act(() => {
    revealed.value = true
  })
}

function grade(success) {
  act(() => {
    if (!option.value) return
    option.value.asked = iteration.value++
    if (success) option.value.confirms++
    else option.value.confirms = 0
    flush()
    reset()
  })
}

function onKeydown(event) {
  if (event.repeat || event.ctrlKey || event.altKey || event.metaKey) return
  if (!revealed.value && [' ', 'Enter'].includes(event.key)) reveal()
  // Arrows point at the buttons, which swap places in right to left languages
  else if (revealed.value && event.key === 'ArrowLeft') grade(dir.value === 'rtl')
  else if (revealed.value && event.key === 'ArrowRight') grade(dir.value !== 'rtl')
  else return
  event.preventDefault()
}

onMounted(() => window.addEventListener('keydown', onKeydown))
onUnmounted(() => window.removeEventListener('keydown', onKeydown))

reset()
</script>

<style scoped lang="scss">
.container {
  position: absolute;
  top: 0;
  bottom: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 100%;
}
.display {
  border: 1px solid $blue-grey-5;
  border-top: none;
  border-bottom: none;
}
// Answers are short enough for a line on common phones, scale them down to fit narrower ones
@media (max-width: 359px) {
  .text-button {
    font-size: 1rem;
    line-height: 1.5rem;
  }
}
@media (min-width: 550px) {
  .container {
    width: 500px;
  }
}
</style>
