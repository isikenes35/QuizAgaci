// Game scoring constants
export const GRACE_WINDOW_SECONDS = 10;
export const MAX_BASE_SCORE = 2000;
export const MIN_BASE_SCORE = 1000;

/**
 * Calculate current potential score based on elapsed time
 */
export function calculateCurrentScore(
  timeRemaining: number,
  timeLimit: number
): number {
  const totalLimit = timeLimit || 30;
  const elapsedSeconds = Math.max(0, totalLimit - timeRemaining);
  const graceSeconds = Math.min(GRACE_WINDOW_SECONDS, Math.max(0, totalLimit - GRACE_WINDOW_SECONDS));
  const decayWindow = Math.max(totalLimit - graceSeconds, 1);

  if (elapsedSeconds <= graceSeconds) {
    return MAX_BASE_SCORE;
  }

  const elapsedDecay = elapsedSeconds - graceSeconds;
  const multiplier = Math.max(0, (decayWindow - elapsedDecay) / decayWindow);
  return Math.round(MIN_BASE_SCORE + (MAX_BASE_SCORE - MIN_BASE_SCORE) * multiplier);
}