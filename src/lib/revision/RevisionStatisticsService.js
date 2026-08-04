// src/lib/revision/RevisionStatisticsService.js
/**
 * Provides simple statistical calculations for revisions.
 * All methods return plain values; callers may wrap them in Result if needed.
 */
import { RevisionRepository } from "./RevisionRepository.js";

export class RevisionStatisticsService {
  constructor() {
    this.repo = new RevisionRepository();
  }

  /** Total number of revision cards */
  totalCount() {
    return this.repo.getAllRevisions().length;
  }

  /** Number of completed revisions */
  completedCount() {
    return this.repo.getAllRevisions().filter((r) => r.status === 'completed').length;
  }

  /** Completion rate as a fraction (0‑1) */
  completionRate() {
    const total = this.totalCount();
    if (total === 0) return 0;
    return this.completedCount() / total;
  }

  /** Average interval (in days) of all revisions */
  averageInterval() {
    const all = this.repo.getAllRevisions();
    if (all.length === 0) return 0;
    const sum = all.reduce((acc, r) => acc + (r.interval || 0), 0);
    return sum / all.length;
  }

  /** Get revisions due today */
  dueToday() {
    return this.repo.getDueToday();
  }

  /** Get overdue revisions */
  overdue() {
    return this.repo.getOverdue();
  }
}
