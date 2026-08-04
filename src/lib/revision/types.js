// src/lib/revision/types.js
/**
 * Revision model definition (JSDoc/TS style).
 */
/**
 * @typedef {Object} Revision
 * @property {string} id - Unique identifier.
 * @property {string} taskId - Associated task ID.
 * @property {string} subject - Subject name.
 * @property {string} chapter - Chapter name.
 * @property {string} topic - Topic name.
 * @property {string} dueDate - ISO date string for next review.
 * @property {string} lastReview - ISO date string of last review.
 * @property {string} nextReview - Alias for dueDate (kept for compatibility).
 * @property {number} interval - Spaced repetition interval in days.
 * @property {number} repetitions - Number of successful repetitions.
 * @property {number} lapses - Number of failed repetitions.
 * @property {number} ease - Ease factor (SM-2) or similar.
 * @property {number} stability - Stability metric (FSRS).
 * @property {number} retrievability - Retrieval probability (FSRS).
 * @property {number} confidence - User confidence rating.
 * @property {string} algorithm - Name of scheduling algorithm ('SM2' | 'FSRS').
 * @property {string} status - Current status ('scheduled', 'completed', 'archived').
 * @property {string} createdAt - ISO timestamp when created.
 * @property {string} updatedAt - ISO timestamp when updated.
 * @property {number} version - Incremental version for optimistic updates.
 */
export {};
