export function getRandomInt(min, max) {
  min = Math.ceil(min)
  max = Math.floor(max)
  return Math.floor(Math.random() * (max - min + 1)) + min
}

export function getRandomArbitrary(min, max) {
  return Math.random() * (max - min) + min
}

export function selectRandomly(options) {
  if (!Array.isArray(options)) return undefined

  const map = []
  let stake = 0

  for (const [value, probability] of options) {
    stake += probability
    map.push({ stake, value })
  }

  const nonce = getRandomArbitrary(0, stake)

  let left = 0
  let right = map.length - 1

  while (left < right) {
    const middle = Math.floor((left + right) / 2)
    if (map[middle].stake < nonce) left = middle + 1
    else right = middle
  }

  return map[left].value
}
