// src/lib/dashboard/types.js
/**
 * Dashboard data contract interfaces.
 * These are JSDoc type definitions for use in JavaScript.
 */

/** @typedef {Object} HeroData
 * @property {string} title
 * @property {string} subtitle
 * @property {number} estimatedMinutes
 * @property {number} progress - 0..1
 * @property {string} priority
 * @property {string} cta - label for primary call‑to‑action button
 * @property {function} action - callback when CTA is clicked
 */

/** @typedef {Object} Stat
 * @property {string} id
 * @property {string} title
 * @property {number|string} value
 * @property {string} unit
 * @property {string} trend - e.g., "up", "down", "stable"
 * @property {string} icon - optional icon name
 * @property {string} color - optional color token
 */

/** @typedef {Object} TaskCard
 * @property {string} id
 * @property {string} subject
 * @property {string} chapter
 * @property {number} duration - minutes
 * @property {string} difficulty
 * @property {string} priority
 * @property {number} progress - 0..1
 * @property {function} resumeAction
 */

/** @typedef {Object} RevisionCard
 * @property {string} subject
 * @property {string} chapter
 * @property {number} confidence - 0..100
 * @property {string} urgency - e.g., "high", "medium", "low"
 * @property {number} daysRemaining
 */

/** @typedef {Object} ProgressChart
 * @property {Array<string>} labels
 * @property {Array<Object>} datasets - each dataset follows Chart.js format
 * @property {string} summary
 */

/** @typedef {Object} WeeklySummary
 * @property {number} studyHours
 * @property {number} tasksCompleted
 * @property {number} revisionDue
 */

/** @typedef {Object} StreakData
 * @property {number} currentStreak
 * @property {number} longestStreak
 */

/** @typedef {Object} DashboardData
 * @property {HeroData} hero
 * @property {Array<Stat>} stats
 * @property {Array<TaskCard>} tasks
 * @property {Array<RevisionCard>} revision
 * @property {ProgressChart} progress
 * @property {WeeklySummary} weekly
 * @property {StreakData} streak
 */

export {};
