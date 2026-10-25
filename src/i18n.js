import { computed, ref, watchEffect } from 'vue'

import messages from '@/locales'

// Deprecated and macro language codes mapped to the ones translations are keyed by
const ALIASES = { in: 'id', iw: 'he', mo: 'ro', no: 'nb', tl: 'fil' }

// Picks the first of the user's preferred languages there is a translation for.
// Translations are keyed by language, optionally refined by region or script,
// like pt-PT or zh-Hant, so zh-TW resolves to zh-Hant and pt-BR to pt.
export function resolveLocale(languages) {
  for (const tag of languages) {
    let locale
    try {
      locale = new Intl.Locale(tag)
    } catch {
      continue
    }
    const language = ALIASES[locale.language] || locale.language
    const { script, region } = locale.maximize()
    for (const key of [`${language}-${region}`, `${language}-${script}`, language]) {
      if (key in messages) return { tag: locale.toString(), key }
    }
  }
  return { tag: 'en', key: 'en' }
}

let i18n

export function useI18n() {
  if (i18n) return i18n

  const preferred = () => navigator.languages ?? [navigator.language]
  const current = ref(resolveLocale(preferred()))
  window.addEventListener('languagechange', () => {
    current.value = resolveLocale(preferred())
  })

  const locale = computed(() => current.value.tag)
  watchEffect(() => {
    document.documentElement.lang = locale.value
  })

  const numberFormat = computed(() => new Intl.NumberFormat(locale.value))
  const percentFormat = computed(
    () =>
      new Intl.NumberFormat(locale.value, {
        style: 'percent',
        minimumFractionDigits: 1,
        maximumFractionDigits: 1
      })
  )

  i18n = {
    locale,
    t: computed(() => ({ ...messages.en, ...messages[current.value.key] })),
    formatNumber: (value) => numberFormat.value.format(value),
    formatPercent: (value) => percentFormat.value.format(value / 100)
  }
  return i18n
}
