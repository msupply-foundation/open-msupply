// Inclusive random integer in [min, max].
export function randInt(min, max) {
  return Math.floor(min + Math.random() * (max - min + 1));
}
