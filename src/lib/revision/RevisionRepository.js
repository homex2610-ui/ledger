// src/lib/revision/RevisionRepository.js
/**
 * Repository abstraction over RevisionStore.
 * Provides domain‑specific queries and simple persistence helpers.
 */
import { RevisionStore } from "./RevisionStore.js";

export class RevisionRepository {
  constructor() {
    this.store = new RevisionStore();
  }

  // Basic CRUD
  createRevision(revision) {
    return this.store.add(revision);
  }

  updateRevision(id, updates) {
    return this.store.update(id, updates);
  }

  deleteRevision(id) {
    return this.store.delete(id);
  }

  getRevision(id) {
    return this.store.get(id);
  }

  getAllRevisions() {
    return this.store.getAll();
  }

  // Query helpers
  getDueToday() {
    const today = new Date().toISOString().split('T')[0];
    return this.store.getAll().filter((r) => r.dueDate && r.dueDate.startsWith(today) && r.status !== 'archived');
  }

  getUpcoming(days = 7) {
    const now = new Date();
    const limit = new Date();
    limit.setDate(now.getDate() + days);
    const nowStr = now.toISOString();
    const limitStr = limit.toISOString();
    return this.store.getAll().filter((r) => r.dueDate && r.dueDate >= nowStr && r.dueDate <= limitStr && r.status !== 'archived');
  }

  getOverdue() {
    const now = new Date().toISOString();
    return this.store.getAll().filter((r) => r.dueDate && r.dueDate < now && r.status !== 'completed' && r.status !== 'archived');
  }

  getBySubject(subject) {
    return this.store.getAll().filter((r) => r.subject === subject);
  }

  getByChapter(chapter) {
    return this.store.getAll().filter((r) => r.chapter === chapter);
  }

  getByTask(taskId) {
    return this.store.getAll().filter((r) => r.taskId === taskId);
  }

  // Save a review result (used by service)
  saveReview(id, updates) {
    return this.store.update(id, updates);
  }

  // Refresh/recalculate a revision (placeholder for future logic)
  refresh(id, updates) {
    return this.store.update(id, updates);
  }
}
