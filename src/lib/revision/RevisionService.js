// src/lib/revision/RevisionService.js
/**
 * RevisionService – business logic for managing revision cards.
 * Uses RevisionRepository for persistence, RevisionValidator for input checks,
 * IdGenerator for IDs, and emits events via EventBus.
 * All public methods return a Result object.
 */
import { RevisionRepository } from "./RevisionRepository.js";
import { validateRevisionPayload, validateRevisionUpdate } from "./RevisionValidator.js";
import Result from "../common/Result.js";
import eventBus from "../common/EventBus.js";
import { EventTypes } from "../events/EventTypes.js";
import { generateId } from "../common/IdGenerator.js";
import { SM2Engine } from "./algorithms/SM2Engine.js";
import { FSRSEngine } from "./algorithms/FSRSEngine.js";

export class RevisionService {
  constructor() {
    this.repo = new RevisionRepository();
  }

  /** Helper to pick engine based on revision.algorithm */
  _getEngine(name) {
    if (name === 'SM2') return SM2Engine;
    if (name === 'FSRS') return FSRSEngine;
    // default to SM2 if unknown
    return SM2Engine;
  }

  /** Create a new revision card */
  createRevision(payload) {
    const validation = validateRevisionPayload(payload);
    if (!validation.isSuccess) return validation;
    const id = payload.id || generateId();
    const now = new Date().toISOString();
    const revision = {
      ...payload,
      id,
      version: 1,
      createdAt: now,
      updatedAt: now,
      status: 'scheduled',
    };
    const saved = this.repo.createRevision(revision);
    eventBus.emit(EventTypes.REVISION_CREATED, saved);
    return Result.success(saved);
  }

  /** Record a review (quality 0-5) for a revision card */
  reviewCard(id, quality) {
    const rev = this.repo.getRevision(id);
    if (!rev) return Result.failure(`Revision ${id} not found`);
    const engine = this._getEngine(rev.algorithm);
    // engine.review returns updated fields (interval, ease, repetitions, dueDate, lastReview, nextReview)
    const updates = engine.review(rev, quality);
    const updated = this.repo.updateRevision(id, {
      ...updates,
      status: 'completed',
      updatedAt: new Date().toISOString(),
    });
    eventBus.emit(EventTypes.REVISION_COMPLETED, updated);
    return Result.success(updated);
  }

  /** Postpone a revision by a number of days */
  postpone(id, days) {
    const rev = this.repo.getRevision(id);
    if (!rev) return Result.failure(`Revision ${id} not found`);
    const newDue = new Date(rev.dueDate);
    newDue.setDate(newDue.getDate() + days);
    const updated = this.repo.updateRevision(id, {
      dueDate: newDue.toISOString().split('T')[0],
      status: 'postponed',
      updatedAt: new Date().toISOString(),
    });
    eventBus.emit(EventTypes.REVISION_POSTPONED, updated);
    return Result.success(updated);
  }

  /** Skip a revision (mark as completed without updating algorithm) */
  skip(id) {
    const rev = this.repo.getRevision(id);
    if (!rev) return Result.failure(`Revision ${id} not found`);
    const updated = this.repo.updateRevision(id, {
      status: 'skipped',
      updatedAt: new Date().toISOString(),
    });
    eventBus.emit(EventTypes.REVISION_SKIPPED, updated);
    return Result.success(updated);
  }

  /** Reschedule a revision manually */
  reschedule(id, newDueDate) {
    const rev = this.repo.getRevision(id);
    if (!rev) return Result.failure(`Revision ${id} not found`);
    if (isNaN(Date.parse(newDueDate))) return Result.failure('Invalid newDueDate');
    const updated = this.repo.updateRevision(id, {
      dueDate: newDueDate,
      status: 'scheduled',
      updatedAt: new Date().toISOString(),
    });
    eventBus.emit(EventTypes.REVISION_UPDATED, updated);
    return Result.success(updated);
  }

  /** Archive a revision (no longer scheduled) */
  archive(id) {
    const rev = this.repo.getRevision(id);
    if (!rev) return Result.failure(`Revision ${id} not found`);
    const updated = this.repo.updateRevision(id, {
      status: 'archived',
      updatedAt: new Date().toISOString(),
    });
    eventBus.emit(EventTypes.REVISION_UPDATED, updated);
    return Result.success(updated);
  }

  /** Delete a revision */
  delete(id) {
    const existed = this.repo.deleteRevision(id);
    if (existed) {
      eventBus.emit(EventTypes.REVISION_DELETED, { id });
      return Result.success(true);
    }
    return Result.failure(`Revision ${id} not found`);
  }

  /** Generate a revision card for a given task (simple stub) */
  generateRevisionForTask(task, algorithm = 'SM2') {
    const payload = {
      taskId: task.id,
      subject: task.subject,
      chapter: task.chapter,
      topic: task.topic,
      dueDate: new Date().toISOString().split('T')[0],
      algorithm,
      status: 'scheduled',
      // defaults for numeric fields
      interval: 0,
      repetitions: 0,
      lapses: 0,
      ease: 2.5,
      stability: 0,
      retrievability: 0,
      confidence: 0,
    };
    return this.createRevision(payload);
  }

  /** Generate the daily queue of revisions due today */
  generateDailyQueue() {
    const dueToday = this.repo.getDueToday();
    return Result.success(dueToday);
  }
}
