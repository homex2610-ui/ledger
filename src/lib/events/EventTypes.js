// src/lib/events/EventTypes.js
/**
 * Centralized list of event types used throughout the application.
 * Using constants helps avoid typos and makes discovery easier.
 */
export const EventTypes = Object.freeze({
  // Task events
  TASK_CREATED: 'taskCreated',
  TASK_UPDATED: 'taskUpdated',
  TASK_DELETED: 'taskDeleted',
  TASK_COMPLETED: 'taskCompleted',

  // Session events
  SESSION_STARTED: 'sessionStarted',
  SESSION_PAUSED: 'sessionPaused',
  SESSION_RESUMED: 'sessionResumed',
  SESSION_ENDED: 'sessionEnded',

  // Revision events
  REVISION_SCHEDULED: 'revisionScheduled',
  REVISION_COMPLETED: 'revisionCompleted',
  REVISION_CREATED: 'revisionCreated',
  REVISION_UPDATED: 'revisionUpdated',
  REVISION_POSTPONED: 'revisionPostponed',
  REVISION_SKIPPED: 'revisionSkipped',
  REVISION_DELETED: 'revisionDeleted',

  // Dashboard events
  DASHBOARD_REFRESH: 'dashboardRefresh',
});
