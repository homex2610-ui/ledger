// src/lib/sessions/SessionStore.js
/**
 * In‑memory store for Session objects with optional persistence to localStorage.
 */
import { generateId } from "../common/IdGenerator.js"; // just to ensure import exists; not used directly here

const STORAGE_KEY = 'ledger_sessions';

export class SessionStore {
  constructor() {
    const persisted = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null;
    this.sessions = persisted ? new Map(JSON.parse(persisted)) : new Map();
  }

  _persist() {
    try {
      const serial = JSON.stringify(Array.from(this.sessions.entries()));
      if (typeof window !== 'undefined') {
        localStorage.setItem(STORAGE_KEY, serial);
      }
    } catch (e) {
      console.error('SessionStore persist error', e);
    }
  }

  add(session) {
    this.sessions.set(session.id, session);
    this._persist();
    return session;
  }

  update(id, updates) {
    const existing = this.sessions.get(id);
    if (!existing) throw new Error(`Session ${id} not found`);
    const merged = { ...existing, ...updates, updatedAt: new Date().toISOString() };
    this.sessions.set(id, merged);
    this._persist();
    return merged;
  }

  delete(id) {
    const result = this.sessions.delete(id);
    this._persist();
    return result;
  }

  get(id) {
    return this.sessions.get(id) || null;
  }

  getAll() {
    return Array.from(this.sessions.values());
  }
}
