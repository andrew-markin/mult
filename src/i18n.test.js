import { describe, expect, it } from 'vitest'

import { resolveLocale } from '@/i18n'
import messages from '@/locales'

describe('resolveLocale', () => {
  it('falls back to English', () => {
    expect(resolveLocale([])).toEqual({ tag: 'en', key: 'en' })
    expect(resolveLocale(['xx-YY'])).toEqual({ tag: 'en', key: 'en' })
  })

  it('skips malformed tags', () => {
    expect(resolveLocale(['not a tag', 'ru'])).toEqual({ tag: 'ru', key: 'ru' })
  })

  it('takes the first preferred language with a translation', () => {
    expect(resolveLocale(['xx', 'ru-RU', 'en'])).toEqual({ tag: 'ru-RU', key: 'ru' })
  })

  it('picks regional and script variants', () => {
    expect(resolveLocale(['pt-BR']).key).toBe('pt')
    expect(resolveLocale(['pt-PT']).key).toBe('pt-PT')
    expect(resolveLocale(['zh-CN']).key).toBe('zh')
    expect(resolveLocale(['zh-TW']).key).toBe('zh-Hant')
    expect(resolveLocale(['zh-HK']).key).toBe('zh-Hant')
    expect(resolveLocale(['sr']).key).toBe('sr')
    expect(resolveLocale(['sr-Latn-RS']).key).toBe('sr-Latn')
  })

  it('understands deprecated and macro language codes', () => {
    expect(resolveLocale(['no']).key).toBe('nb')
    expect(resolveLocale(['iw']).key).toBe('he')
    expect(resolveLocale(['tl']).key).toBe('fil')
  })

  it('keeps the full tag for formatting numbers', () => {
    expect(resolveLocale(['en-IN']).tag).toBe('en-IN')
  })
})

describe('translations', () => {
  const keys = Object.keys(messages.en).sort()

  it.each(Object.keys(messages))('%s translates every string', (locale) => {
    expect(Object.keys(messages[locale]).sort()).toEqual(keys)
    for (const text of Object.values(messages[locale])) expect(text.trim()).not.toBe('')
  })

  it.each(Object.keys(messages))('%s is a valid locale', (locale) => {
    expect(Intl.getCanonicalLocales(locale)).toEqual([locale])
  })
})
