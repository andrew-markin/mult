import { describe, expect, it } from 'vitest'

import { resolveLocale, textDirection } from '@/i18n'
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

describe('textDirection', () => {
  it('is right to left for Arabic, Persian, Hebrew and Urdu', () => {
    for (const key of ['ar', 'fa', 'he', 'ur']) expect(textDirection(key)).toBe('rtl')
    for (const key of ['en', 'ru', 'zh-Hant', 'pt-PT']) expect(textDirection(key)).toBe('ltr')
  })
})

describe('translations', () => {
  const optional = ['times', 'divide']
  const required = Object.keys(messages.en).filter((key) => !optional.includes(key))

  it.each(Object.keys(messages))('%s translates every string', (locale) => {
    for (const key of required) expect(messages[locale]).toHaveProperty(key)
    for (const key of Object.keys(messages[locale])) expect(messages.en).toHaveProperty(key)
    for (const text of Object.values(messages[locale])) expect(text.trim()).not.toBe('')
  })

  it.each(Object.keys(messages))('%s is a valid locale', (locale) => {
    expect(Intl.getCanonicalLocales(locale)).toEqual([locale])
  })
})
