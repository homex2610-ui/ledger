// src/lib/tasks/TaskStore.js
/**
 * In‑memory store for Task objects with optional persistence to localStorage.
 */
import { TaskStatus } from "./types";

const STORAGE_KEY = 'ledger_tasks';

export class TaskStore {
  constructor() {
    // Load persisted tasks if any
    const persisted = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null;
    this.tasks = persisted ? new Map(JSON.parse(persisted)) : new Map();
  }

  /** Persist the current map to localStorage */
  _persist() {
    try {
      const serial = JSON.stringify(Array.from(this.tasks.entries()));
      if (typeof window !== 'undefined') {
        localStorage.setItem(STORAGE_KEY, serial);
      }
    } catch (e) {
      console.error('TaskStore persist error', e);
    }
  }

  /** Add a new task */
  add(task) {
    this.tasks.set(task.id, { ...task, status: TaskStatus.PENDING, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
    this._persist();
    return this.tasks.get(task.id);
  }

  /** Update an existing task */
  update(id, updates) {
    const existing = this.tasks.get(id);
    if (!existing) throw new Error(`Task with id ${id} not found`);
    const merged = { ...existing, ...updates, updatedAt: new Date().toISOString() };
    this.tasks.set(id, merged);
    this._persist();
    return merged;
  }

  /** Remove a task */
  delete(id) {
    const existed = this.tasks.delete(id);
    this._persist();
    return existed;
  }

  /** Get a task by id */
  get(id) {
    return this.tasks.get(id) || null;
  }

  /** Get all tasks as an array */
  getAll() {
    return Array.from(this.tasks.values());
  }
}
