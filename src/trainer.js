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
