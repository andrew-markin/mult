import { describe, expect, it } from 'vitest'

import { createFacts, getProbability, isAskable } from '@/trainer'

const option = (asked, confirms) => ({ asked, confirms })

describe('createFacts', () => {
  const facts = createFacts()

  it('covers the multiplication table from 2 to 9', () => {
    const products = facts.filter((fact) => fact.operator === '×')
    expect(products).toHaveLength(64)
    for (const { left, right, answer } of products) expect(answer).toBe(left * right)
  })

  it('keeps multiplication keys progress is stored by', () => {
    expect(facts.find((fact) => fact.key === '6 × 7')).toMatchObject({ left: 6, right: 7 })
  })

  it('gives every fact a unique key', () => {
    expect(new Set(facts.map((fact) => fact.key)).size).toBe(facts.length)
  })
})

describe('isAskable', () => {
  it('allows options never asked', () => {
    expect(isAskable(option(0, 0), 3)).toBe(true)
  })

  it('skips options asked within the last 5 iterations', () => {
    expect(isAskable(option(10, 0), 15)).toBe(false)
    expect(isAskable(option(10, 0), 16)).toBe(true)
  })
})

describe('getProbability', () => {
  it('prefers new options', () => {
    expect(getProbability(option(0, 0), 100)).toBe(100)
  })

  it('tends to ask again after a mistake, yet less than new options', () => {
    expect(getProbability(option(90, 0), 100)).toBe(50)
  })

  it('rarely asks again within 20 iterations after a correct answer', () => {
    expect(getProbability(option(90, 3), 100)).toBe(1)
  })

  it('fades with every confirmation but never goes below the floor', () => {
    const probabilities = []
    for (let confirms = 1; confirms <= 20; confirms++) {
      probabilities.push(getProbability(option(50, confirms), 100))
    }
    expect(probabilities[0]).toBe(27)
    expect(probabilities.at(-1)).toBe(3)
    expect(Math.min(...probabilities)).toBeGreaterThan(0)
    for (let i = 1; i < probabilities.length; i++) {
      expect(probabilities[i]).toBeLessThanOrEqual(probabilities[i - 1])
    }
  })
})
