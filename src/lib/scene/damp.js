/**
 * Frame-rate independent exponential damping.
 *
 * The familiar `value += (goal - value) * 0.1` is not: it converges 2.4x faster
 * on a 144Hz display than on 60Hz, so the same scene feels different on
 * different monitors. This form depends on elapsed time instead of frame count.
 *
 * `lambda` is a rate, not a fraction. Higher is snappier.
 */
export function damp(current, goal, lambda, delta) {
  return goal + (current - goal) * Math.exp(-lambda * delta);
}
