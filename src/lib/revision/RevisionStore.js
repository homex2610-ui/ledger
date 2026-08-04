// src/lib/revision/RevisionStore.js
/**
 * In‑memory store for Revision objects with optional persistence to localStorage.
 */
const STORAGE_KEY = 'ledger_revisions';

export class RevisionStore {
  constructor() {
    const persisted = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null;
    this.revisions = persisted ? new Map(JSON.parse(persisted)) : new Map();
  }

  _persist() {
    try {
      const serial = JSON.stringify(Array.from(this.revisions.entries()));
      if (typeof window !== 'undefined') {
        localStorage.setItem(STORAGE_KEY, serial);
      }
    } catch (e) {
      console.error('RevisionStore persist error', e);
    }
  }

  /** Add a new revision */
  add(revision) {
    this.revisions.set(revision.id, revision);
    this._persist();
    return revision;
  }

  /** Update an existing revision */
  update(id, updates) {
    const existing = this.revisions.get(id);
    if (!existing) throw new Error(`Revision ${id} not found`);
    const merged = { ...existing, ...updates, updatedAt: new Date().toISOString() };
    this.revisions.set(id, merged);
    this._persist();
    return merged;
  }

  /** Delete a revision */
  delete(id) {
    const result = this.revisions.delete(id);
    this._persist();
    return result;
  }

  /** Get a revision by id */
  get(id) {
    return this.revisions.get(id) || null;
  }

  /** Get all revisions */
  getAll() {
    return Array.from(this.revisions.values());
  }

  /** Clear all revisions (for testing) */
  clear() {
    this.revisions.clear();
    this._persist();
  }
}
