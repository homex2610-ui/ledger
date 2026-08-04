// src/lib/sessions/types.js
/**
 * Session model definition (JSDoc/TS style).
 */

/**
 * @typedef {Object} Session
 * @property {string} id - Unique identifier.
 * @property {string} taskId - Associated task ID.
 * @property {string} subject - Subject name.
 * @property {string} chapter - Chapter name.
 * @property {number} plannedDuration - Planned duration in minutes.
 * @property {number} actualDuration - Actual duration in minutes.
 * @property {string} startTime - ISO timestamp when session started.
 * @property {string} endTime - ISO timestamp when session ended.
 * @property {Array<{start: string, end: string}>} pauses - List of pause intervals.
 * @property {number} interruptions - Count of interruptions.
 * @property {number} idleTime - Idle time in minutes.
 * @property {number} focusScore - Calculated focus score (0-100).
 * @property {number} productivityScore - Calculated productivity score (0-100).
 * @property {string} mood - Optional mood descriptor.
 * @property {string} notes - Free‑form notes.
 * @property {string} status - Current status (e.g., "in_progress", "paused", "completed", "cancelled").
 * @property {string} createdAt - ISO timestamp when created.
 * @property {string} updatedAt - ISO timestamp when updated.
 * @property {number} version - Incremental version for optimistic updates.
 */

export {};
