// src/lib/revision/algorithms/SM2Engine.js
/**
 * Simple SM-2 spaced repetition algorithm implementation.
 * Provides a static `review` method that takes the current revision and a quality rating (0‑5).
 * Returns an object with the fields that should be updated in the revision record.
 */
export const SM2Engine = {
  /**
   * Calculate next interval and ease based on review quality.
   * @param {Object} revision - Existing revision data.
   * @param {number} quality - Review quality rating (0‑5).
   * @returns {Object} updates to apply to the revision.
   */
  review(revision, quality) {
    // Ensure numeric quality
    const q = Number(quality);
    const now = new Date();
    let { repetitions = 0, interval = 0, ease = 2.5 } = revision;

    if (q < 3) {
      // Repeat the item later (reset repetitions)
      repetitions = 0;
      interval = 1;
    } else {
      // Successful recall – increase repetitions
      repetitions += 1;
      if (repetitions === 1) {
        interval = 1;
      } else if (repetitions === 2) {
        interval = 6;
      } else {
        interval = Math.round(interval * ease);
      }
    }

    // Update ease factor
    ease = Math.max(1.3, ease + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02)));

    // Compute next due date
    const nextDate = new Date();
    nextDate.setDate(now.getDate() + interval);
    const dueDate = nextDate.toISOString().split('T')[0];

    return {
      repetitions,
      interval,
      ease,
      dueDate,
      lastReview: now.toISOString(),
    };
  },
};
