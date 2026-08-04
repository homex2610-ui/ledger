// src/lib/sessions/FocusEngine.js
/**
 * FocusEngine – pure calculation utilities for study session metrics.
 * All methods are static; they operate on raw session objects without
 * side effects or repository access.
 */
export class FocusEngine {
  /**
   * Calculate a focus score for a single session.
   * Simple heuristic: ((actualDuration - idleTime - interruptions * 0.5) / plannedDuration) * 100
   * Clamped to [0, 100].
   */
  static calculateFocusScore(session) {
    if (!session || session.plannedDuration <= 0) return 0;
    const idle = Number(session.idleTime) || 0;
    const interruptions = Number(session.interruptions) || 0;
    const actual = Number(session.actualDuration) || 0;
    const penalty = idle + interruptions * 0.5;
    const raw = ((actual - penalty) / session.plannedDuration) * 100;
    return Math.max(0, Math.min(100, Math.round(raw)));
  }

  /** Calculate productivity score – ratio of actual vs planned duration */
  static calculateProductivityScore(session) {
    if (!session || session.plannedDuration <= 0) return 0;
    const actual = Number(session.actualDuration) || 0;
    const raw = (actual / session.plannedDuration) * 100;
    return Math.max(0, Math.min(100, Math.round(raw)));
  }

  /** Simple distraction score – based on interruptions per minute */
  static calculateDistractionScore(session) {
    if (!session) return 0;
    const duration = Number(session.actualDuration) || 0;
    if (duration === 0) return 0;
    const interruptions = Number(session.interruptions) || 0;
    const perMinute = interruptions / duration;
    // Higher interruptions => lower score
    const raw = Math.max(0, 100 - perMinute * 100);
    return Math.round(raw);
  }

  /** Consistency score – compares planned vs actual duration */
  static calculateConsistencyScore(session) {
    if (!session) return 0;
    const planned = Number(session.plannedDuration) || 0;
    const actual = Number(session.actualDuration) || 0;
    if (planned === 0) return 0;
    const diff = Math.abs(planned - actual);
    const raw = 100 - (diff / planned) * 100;
    return Math.max(0, Math.round(raw));
  }

  /** Efficiency – focusScore weighted by productivityScore */
  static calculateEfficiencyScore(session) {
    const focus = this.calculateFocusScore(session);
    const productivity = this.calculateProductivityScore(session);
    return Math.round((focus + productivity) / 2);
  }
}
