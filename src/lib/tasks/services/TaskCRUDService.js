// src/lib/tasks/services/TaskCRUDService.js
/**
 * CRUD Service for Tasks. Uses TaskRepository for persistence and TaskValidator for input validation.
 * Returns Result objects and emits typed events via EventBus.
 */
import { TaskRepository } from "../TaskRepository.js";
import { validateTaskPayload, validateTaskUpdate } from "../validation/TaskValidator.js";
import Result from "../../common/Result.js";
import eventBus from "../../common/EventBus.js";
import { TaskStatus } from "../types.js";
import { EventTypes } from "../../events/EventTypes.js";
import { generateId } from "../../common/IdGenerator.js";

export class TaskCRUDService {
  constructor() {
    this.repo = new TaskRepository();
  }

  /** Create a new task. Payload should not contain id/createdAt/updatedAt.
   * Returns Result.success(task) or Result.failure(message)
   */
  createTask(payload) {
    const validation = validateTaskPayload(payload);
    if (!validation.isSuccess) return validation;
    const id = payload.id || generateId();
    const now = new Date().toISOString();
    const task = {
      ...payload,
      id,
      version: 1,
      createdAt: now,
      updatedAt: now,
      status: TaskStatus.PENDING,
    };
    const saved = this.repo.createTask(task);
    eventBus.emit(EventTypes.TASK_CREATED, saved);
    return Result.success(saved);
  }

  /** Update an existing task (partial). */
  updateTask(id, updates) {
    const existing = this.repo.getTask(id);
    if (!existing) return Result.failure(`Task ${id} not found`);
    const validation = validateTaskUpdate(updates);
    if (!validation.isSuccess) return validation;
    const merged = {
      ...existing,
      ...updates,
      updatedAt: new Date().toISOString(),
      version: (existing.version || 1) + 1,
    };
    const saved = this.repo.updateTask(id, merged);
    eventBus.emit(EventTypes.TASK_UPDATED, saved);
    return Result.success(saved);
  }

  /** Delete a task */
  deleteTask(id) {
    const existed = this.repo.deleteTask(id);
    if (existed) {
      eventBus.emit(EventTypes.TASK_DELETED, { id });
      return Result.success(true);
    }
    return Result.failure(`Task ${id} not found`);
  }

  /** Archive a task – sets a custom status value. */
  archiveTask(id) {
    const existing = this.repo.getTask(id);
    if (!existing) return Result.failure(`Task ${id} not found`);
    const saved = this.repo.updateTask(id, {
      status: 'archived',
      updatedAt: new Date().toISOString(),
      version: (existing.version || 1) + 1,
    });
    eventBus.emit(EventTypes.TASK_UPDATED, saved);
    return Result.success(saved);
  }
}
