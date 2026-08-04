// src/lib/tasks/types.js
/**
 * Task Engine type definitions (JSDoc). These are used throughout the task modules.
 */

/**
 * @enum {string}
 */
export const TaskStatus = {
  PENDING: 'pending',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  POSTPONED: 'postponed',
};

/**
 * @enum {string}
 */
export const TaskPriority = {
  HIGH: 'high',
  MEDIUM: 'medium',
  LOW: 'low',
};

/**
 * @typedef {Object} Task
 * @property {string} id - Unique identifier (UUID or similar).
 * @property {string} subject - Subject name (e.g., "Math").
 * @property {string} chapter - Chapter name.
 * @property {string} topic - Specific topic within the chapter.
 * @property {string} type - Type of task (e.g., "exercise", "reading").
 * @property {TaskPriority} priority - Task priority.
 * @property {number} estimatedTime - Estimated time in minutes.
 * @property {number} actualTime - Actual time spent (minutes). 0 if not yet completed.
 * @property {string} difficulty - Difficulty label (e.g., "easy", "hard").
 * @property {string} dueDate - ISO string (YYYY-MM-DD) when the task is due.
 * @property {string} revisionStage - Revision stage identifier (for integration with revision engine).
 * @property {TaskStatus} status - Current status of the task.
 * @property {Array<string>} dependencies - Array of task ids this task depends on.
 * @property {Array<string>} tags - Free‑form tags for categorisation.
 * @property {string} createdAt - ISO timestamp when created.
 * @property {string} updatedAt - ISO timestamp when last updated.
 */

export {};
