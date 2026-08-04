// src/lib/sessions/SessionService.js
/**
 * Core service orchestrating session lifecycle.
 * Uses SessionRepository for persistence, SessionValidator for input checks,
 * generates IDs via IdGenerator, and emits typed events via EventBus.
 */
import { SessionRepository } from "./SessionRepository.js";
import { validateSessionPayload, validateSessionUpdate } from "./SessionValidator.js";
import Result from "../common/Result.js";
import eventBus from "../common/EventBus.js";
import { EventTypes } from "../events/EventTypes.js";
import { generateId } from "../common/IdGenerator.js";

export class SessionService {
  constructor() {
    this.repo = new SessionRepository();
  }

  /** Start a new session */
  startSession(payload) {
    const validation = validateSessionPayload(payload);
    if (!validation.isSuccess) return validation;
    const id = payload.id || generateId();
    const now = new Date().toISOString();
    const session = {
      ...payload,
      id,
      version: 1,
      createdAt: now,
      updatedAt: now,
      status: 'in_progress',
      actualDuration: 0,
      pauses: [],
      interruptions: 0,
      idleTime: 0,
      focusScore: 0,
      productivityScore: 0,
    };
    const saved = this.repo.createSession(session);
    eventBus.emit(EventTypes.SESSION_STARTED, saved);
    return Result.success(saved);
  }

  /** Pause an ongoing session */
  pauseSession(id) {
    const session = this.repo.getSession(id);
    if (!session) return Result.failure(`Session ${id} not found`);
    if (session.status !== 'in_progress') return Result.failure('Can only pause an in_progress session');
    const pauseStart = new Date().toISOString();
    const updated = this.repo.updateSession(id, {
      status: 'paused',
      pauses: [...session.pauses, { start: pauseStart, end: null }],
      updatedAt: new Date().toISOString(),
    });
    eventBus.emit(EventTypes.SESSION_PAUSED, updated);
    return Result.success(updated);
  }

  /** Resume a paused session */
  resumeSession(id) {
    const session = this.repo.getSession(id);
    if (!session) return Result.failure(`Session ${id} not found`);
    if (session.status !== 'paused') return Result.failure('Can only resume a paused session');
    const lastPause = session.pauses[session.pauses.length - 1];
    if (!lastPause || lastPause.end) return Result.failure('No active pause to resume');
    const pauseEnd = new Date().toISOString();
    const updatedPauses = session.pauses.slice(0, -1).concat({ start: lastPause.start, end: pauseEnd });
    const updated = this.repo.updateSession(id, {
      status: 'in_progress',
      pauses: updatedPauses,
      updatedAt: new Date().toISOString(),
    });
    eventBus.emit(EventTypes.SESSION_RESUMED, updated);
    return Result.success(updated);
  }

  /** End a session, calculating final metrics */
  endSession(id, { actualDuration, interruptions, idleTime, notes, mood, focusScore, productivityScore } = {}) {
    const session = this.repo.getSession(id);
    if (!session) return Result.failure(`Session ${id} not found`);
    if (session.status === 'completed') return Result.failure('Session already completed');
    const now = new Date().toISOString();
    const updates = {
      status: 'completed',
      endTime: now,
      updatedAt: now,
    };
    if (actualDuration !== undefined) updates.actualDuration = actualDuration;
    if (interruptions !== undefined) updates.interruptions = interruptions;
    if (idleTime !== undefined) updates.idleTime = idleTime;
    if (notes !== undefined) updates.notes = notes;
    if (mood !== undefined) updates.mood = mood;
    if (focusScore !== undefined) updates.focusScore = focusScore;
    if (productivityScore !== undefined) updates.productivityScore = productivityScore;
    const saved = this.repo.updateSession(id, updates);
    eventBus.emit(EventTypes.SESSION_ENDED, saved);
    return Result.success(saved);
  }

  /** Cancel a session without recording results */
  cancelSession(id) {
    const session = this.repo.getSession(id);
    if (!session) return Result.failure(`Session ${id} not found`);
    const updated = this.repo.updateSession(id, { status: 'cancelled', updatedAt: new Date().toISOString() });
    eventBus.emit(EventTypes.SESSION_ENDED, updated);
    return Result.success(updated);
  }

  /** Extend the planned duration of an ongoing session */
  extendSession(id, extraMinutes) {
    const session = this.repo.getSession(id);
    if (!session) return Result.failure(`Session ${id} not found`);
    if (session.status !== 'in_progress' && session.status !== 'paused') {
      return Result.failure('Can only extend a session that is in progress or paused');
    }
    const newPlanned = (session.plannedDuration || 0) + extraMinutes;
    const saved = this.repo.updateSession(id, { plannedDuration: newPlanned, updatedAt: new Date().toISOString() });
    return Result.success(saved);
  }

  /** Merge two completed sessions into a single record (simplified) */
  mergeSessions(sourceId, targetId) {
    const source = this.repo.getSession(sourceId);
    const target = this.repo.getSession(targetId);
    if (!source || !target) return Result.failure('Both sessions must exist');
    if (source.status !== 'completed' || target.status !== 'completed') {
      return Result.failure('Can only merge completed sessions');
    }
    // Simple additive merge of numeric fields and concatenate notes
    const merged = {
      ...target,
      plannedDuration: (target.plannedDuration || 0) + (source.plannedDuration || 0),
      actualDuration: (target.actualDuration || 0) + (source.actualDuration || 0),
      interruptions: (target.interruptions || 0) + (source.interruptions || 0),
      idleTime: (target.idleTime || 0) + (source.idleTime || 0),
      focusScore: Math.max(target.focusScore || 0, source.focusScore || 0),
      productivityScore: Math.max(target.productivityScore || 0, source.productivityScore || 0),
      notes: [target.notes, source.notes].filter(Boolean).join('\n'),
      pauses: [...(target.pauses || []), ...(source.pauses || [])],
      updatedAt: new Date().toISOString(),
    };
    this.repo.updateSession(targetId, merged);
    this.repo.deleteSession(sourceId);
    eventBus.emit(EventTypes.SESSION_ENDED, merged); // treat as a new completed session
    return Result.success(merged);
  }
}
