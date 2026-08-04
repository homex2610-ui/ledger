// src/lib/tasks/TaskRepository.js
/**
 * TaskRepository – abstraction over TaskStore that provides higher‑level query
 * methods used by services and the engine. It does not contain business rules;
 * those belong in TaskService.
 */
import { TaskStore } from "./TaskStore";
import { TaskStatus, TaskPriority } from "./types";

export class TaskRepository {
  constructor() {
    this.store = new TaskStore();
  }

  /** Create a new task (store will assign timestamps) */
  createTask(task) {
    return this.store.add(task);
  }

  /** Update an existing task */
  updateTask(id, updates) {
    return this.store.update(id, updates);
  }

  /** Delete a task */
  deleteTask(id) {
    return this.store.delete(id);
  }

  /** Retrieve a single task */
  getTask(id) {
    return this.store.get(id);
  }

  /** Retrieve all tasks */
  listTasks() {
    return this.store.getAll();
  }

  /** Find tasks due today (by dueDate) */
  findDueToday() {
    const today = new Date().toISOString().split('T')[0];
    return this.store.getAll().filter((t) => t.dueDate === today && t.status !== TaskStatus.COMPLETED);
  }

  /** Find overdue tasks (dueDate before today and not completed) */
  findOverdue() {
    const today = new Date().toISOString().split('T')[0];
    return this.store.getAll().filter((t) => t.dueDate < today && t.status !== TaskStatus.COMPLETED);
  }

  /** Find tasks by priority */
  findByPriority(priority) {
    return this.store.getAll().filter((t) => t.priority === priority);
  }

  /** Placeholder for recurring task scheduling – can be expanded later */
  scheduleRecurring(taskId, recurrenceRule) {
    // For now just store the rule on the task; real scheduling logic to be added later.
    const task = this.getTask(taskId);
    if (!task) throw new Error(`Task ${taskId} not found`);
    return this.updateTask(taskId, { recurrenceRule });
  }
}
