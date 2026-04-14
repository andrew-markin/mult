<template>
  <div class="container column no-wrap">
    <div class="col column no-wrap" :class="{ display: !mobileScreen }">
      <div class="col relative-position text-accent">
        <q-badge
          rounded
          :color="scoreColor"
          :label="`${score}%`"
          class="text-h5 absolute-top-right q-ma-sm q-px-md"
          @click="drop()"
        />
        <div class="absolute-full flex flex-center text-h1 text-weight-medium no-pointer-events">
          {{ question }}
        </div>
      </div>
      <div class="text-h6 row no-wrap q-pa-none text-center text-button">
        <template v-if="revealed">
          <simple-button class="col-6 bg-negative" label="I didn't know" @click="grade(false)" />
          <simple-button class="col-6 bg-positive" label="I knew" @click="grade(true)" />
        </template>
        <simple-button v-else class="col-12 bg-info" label="Reveal the answer" @click="reveal()" />
      </div>
      <div class="col relative-position text-accent">
        <div class="absolute-full flex flex-center text-h1 text-weight-medium no-pointer-events">
          <template v-if="revealed">{{ answer }}</template>
          <template v-else>? ? ?</template>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { debounce, useQuasar } from 'quasar'
import { computed, ref } from 'vue'

import SimpleButton from '@/components/SimpleButton.vue'
import { selectRandomly } from '@/utils'

const $q = useQuasar()
const mobileScreen = computed(() => $q.screen.width < 800)

const savedState = JSON.parse(localStorage.getItem('state')) || {}

const iteration = ref(savedState?.iteration || 1)

const options = ref([])
const option = ref()

for (let a = 2; a <= 9; a++) {
  for (let b = 2; b <= 9; b++) {
    const question = `${a} × ${b}`
    const answer = String(a * b)
    const optionState = savedState[question]
    const asked = optionState?.asked || 0
    const confirms = optionState?.confirms || 0
    options.value.push({ question, answer, asked, confirms })
  }
}

const revealed = ref(true)

function reset() {
  revealed.value = false
  option.value = selectRandomly(
    options.value
      // Keep only options asked more than 5 iterations ago, or not asked at all
      .filter((option) => !option.asked || iteration.value - option.asked > 5)
      .map((option) => {
        let probability = 100 // Essential tendency to ask
        if (option.asked) {
          // Strong tendency to ask again if you make a mistake
          if (option.confirms <= 0) probability = 50
          // Tendency not to ask again for 20 iterations after correct answer
          else if (iteration.value - option.asked < 20) probability = 1
          // Weak and fading tendency to confirm correct answer
          else probability = 30 - Math.max(option.confirms, 9) * 3
        }
        return [option, probability]
      })
  )
}

function flush() {
  const state = { iteration: iteration.value }
  for (const { question, asked, confirms } of options.value) {
    state[question] = { asked, confirms }
  }
  localStorage.setItem('state', JSON.stringify(state))
}

function drop() {
  iteration.value = 1
  for (const option of options.value) {
    option.asked = 0
    option.confirms = 0
  }
  flush()
}

const question = computed(() => option.value?.question)
const answer = computed(() => option.value?.answer)

const score = computed(() => {
  if (!options.value?.length) return 0
  const success = options.value.reduce((acc, option) => acc + (option.confirms ? 1 : 0), 0)
  return ((success * 100) / options.value.length).toFixed(1)
})

const scoreColor = computed(() => {
  if (score.value < 50) return 'negative'
  if (score.value < 100) return 'warning'
  return 'positive'
})

const reveal = debounce(() => {
  revealed.value = true
}, 300)

const grade = debounce((success) => {
  if (!option.value) return
  option.value.asked = iteration.value++
  if (success) option.value.confirms++
  else option.value.confirms = 0
  flush()
  reset()
}, 300)

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
@media (min-width: 550px) {
  .container {
    width: 500px;
  }
}
</style>
