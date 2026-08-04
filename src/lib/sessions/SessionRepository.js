// src/lib/sessions/SessionRepository.js
/**
 * Repository abstraction over SessionStore.
 * Provides higher‑level queries for the SessionService and Statistics.
 */
import { SessionStore } from "./SessionStore.js";

export class SessionRepository {
  constructor() {
    this.store = new SessionStore();
  }

  /** Create a new session */
  createSession(session) {
    return this.store.add(session);
  }

  /** Update an existing session */
  updateSession(id, updates) {
    return this.store.update(id, updates);
  }

  /** Delete a session */
  deleteSession(id) {
    return this.store.delete(id);
  }

  /** Get a session by id */
  getSession(id) {
    return this.store.get(id);
  }

  /** Get all sessions */
  getAllSessions() {
    return this.store.getAll();
  }

  /** Find sessions for a specific task */
  findByTaskId(taskId) {
    return this.store.getAll().filter((s) => s.taskId === taskId);
  }

  /** Find sessions within a date range (ISO date strings) */
  findInRange(startDate, endDate) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    return this.store.getAll().filter((s) => {
      const sStart = new Date(s.startTime);
      return sStart >= start && sStart <= end;
    });
  }
}
