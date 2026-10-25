// Multiplication table facts from 2 × 2 to 9 × 9 and the division facts they turn
// into, keyed the way progress is stored
export function createFacts() {
  const facts = []
  for (let a = 2; a <= 9; a++) {
    for (let b = 2; b <= 9; b++) {
      const product = a * b
      facts.push({ key: `${a} × ${b}`, left: a, operator: '×', right: b, answer: product })
      facts.push({ key: `${product} ÷ ${b}`, left: product, operator: '÷', right: b, answer: a })
    }
  }
  return facts
}

// Keep only options asked more than 5 iterations ago, or not asked at all
export function isAskable(option, iteration) {
  return !option.asked || iteration - option.asked > 5
}

export function getProbability(option, iteration) {
  let probability = 100 // Essential tendency to ask
  if (option.asked) {
    // Strong tendency to ask again after a mistake, yet weaker than for new options
    if (option.confirms <= 0) probability = 50
    // Tendency not to ask again for 20 iterations after correct answer
    else if (iteration - option.asked < 20) probability = 1
    // Weak and fading tendency to confirm correct answer
    else probability = 30 - Math.min(option.confirms, 9) * 3
  }
  return probability
}
