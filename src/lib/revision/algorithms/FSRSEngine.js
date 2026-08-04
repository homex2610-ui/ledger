// src/lib/revision/algorithms/FSRSEngine.js
/**
 * Placeholder implementation of the FSRS (Free Spaced Repetition Scheduler) algorithm.
 * For demonstration purposes this provides a very simplified version.
 * In a production system you would replace this with a full FSRS implementation.
 *
 * The `review` method receives the current revision and a quality rating (0‑5).
 * It returns an object with the fields that should be updated on the revision
 * record: interval, stability, retrievability, dueDate, lastReview, etc.
 */
export const FSRSEngine = {
  /**
   * Simplified FSRS review calculation.
   * @param {Object} revision - Existing revision data.
   * @param {number} quality - Review quality rating (0‑5).
   * @returns {Object} updates to apply to the revision.
   */
  review(revision, quality) {
    const q = Number(quality);
    const now = new Date();
    let { repetitions = 0, stability = 0, retrievability = 0 } = revision;

    // Very naive stability update: increase with good recall, decrease otherwise
    if (q >= 3) {
      repetitions += 1;
      stability = Math.min(1, stability + 0.1 * q);
    } else {
      repetitions = 0;
      stability = Math.max(0, stability - 0.2);
    }

    // Compute interval based on stability (simplified exponential back‑off)
    const interval = Math.round(Math.max(1, stability * 10));
    const nextDate = new Date();
    nextDate.setDate(now.getDate() + interval);
    const dueDate = nextDate.toISOString().split('T')[0];

    // Retrievability as a simple function of stability and quality
    const retrievability = Math.min(1, stability * (q / 5));

    return {
      repetitions,
      stability,
      retrievability,
      interval,
      dueDate,
      lastReview: now.toISOString(),
    };
  },
};
