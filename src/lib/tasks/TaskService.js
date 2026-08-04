// src/lib/tasks/TaskService.js
/**
 * TaskService – business logic layer for tasks.
 * It validates inputs, enforces rules (e.g., dependency completion),
 * and provides helper methods such as statistics.
 */
import { TaskRepository } from "./TaskRepository";
import { TaskStatus, TaskPriority } from "./types";

export class TaskService {
  constructor() {
    this.repo = new TaskRepository();
  }

  /** Validate a task object before creation or update */
  _validateTask(task, isUpdate = false) {
    const required = ["subject", "chapter", "topic", "type", "priority", "estimatedTime", "dueDate", "status"]; // status required for updates
    if (!isUpdate) {
      // id will be generated later, createdAt/updatedAt handled by store
      required.push("estimatedTime");
    }
    for (const field of required) {
      if (task[field] === undefined || task[field] === null) {
        throw new Error(`Task validation error: missing required field '${field}'`);
      }
    }
    // Validate enums
    if (!Object.values(TaskPriority).includes(task.priority)) {
      throw new Error(`Task validation error: invalid priority '${task.priority}'`);
    }
    if (!Object.values(TaskStatus).includes(task.status)) {
      throw new Error(`Task validation error: invalid status '${task.status}'`);
    }
    // dueDate format
    if (isNaN(Date.parse(task.dueDate))) {
      throw new Error(`Task validation error: invalid dueDate '${task.dueDate}'`);
    }
    // dependencies must reference existing tasks (if any)
    if (task.dependencies && task.dependencies.length) {
      for (const depId of task.dependencies) {
        if (!this.repo.getTask(depId)) {
          throw new Error(`Task validation error: dependency id '${depId}' does not exist`);
        }
      }
    }
  }

  /** Create a new task */
  createTask(task) {
    // Generate an ID if not provided
    const id = task.id || (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`);
    const newTask = { ...task, id, status: TaskStatus.PENDING };
    this._validateTask(newTask);
    return this.repo.createTask(newTask);
  }

  /** Update an existing task */
  updateTask(id, updates) {
    const existing = this.repo.getTask(id);
    if (!existing) throw new Error(`Task with id ${id} not found`);
    const merged = { ...existing, ...updates };
    this._validateTask(merged, true);
    return this.repo.updateTask(id, updates);
  }

  /** Mark a task as completed, ensuring dependencies are satisfied */
  completeTask(id) {
    const task = this.repo.getTask(id);
    if (!task) throw new Error(`Task ${id} not found`);
    // Check dependencies
    if (task.dependencies && task.dependencies.length) {
      const unfinished = task.dependencies.filter((depId) => {
        const dep = this.repo.getTask(depId);
        return dep && dep.status !== TaskStatus.COMPLETED;
      });
      if (unfinished.length) {
        throw new Error(`Cannot complete task ${id}: dependencies ${unfinished.join(', ')} are not completed`);
      }
    }
    return this.repo.updateTask(id, { status: TaskStatus.COMPLETED, actualTime: task.actualTime || task.estimatedTime });
  }

  /** Postpone a task by a number of days */
  postponeTask(id, days) {
    const task = this.repo.getTask(id);
    if (!task) throw new Error(`Task ${id} not found`);
    const due = new Date(task.dueDate);
    due.setDate(due.getDate() + days);
    return this.repo.updateTask(id, { dueDate: due.toISOString().split('T')[0] });
  }

  /** Get simple statistics */
  getStats() {
    const all = this.repo.listTasks();
    const byStatus = all.reduce((acc, t) => {
      acc[t.status] = (acc[t.status] || 0) + 1;
      return acc;
    }, {});
    const totalEstimated = all.reduce((sum, t) => sum + (t.estimatedTime || 0), 0);
    const totalActual = all.reduce((sum, t) => sum + (t.actualTime || 0), 0);
    return {
      totalTasks: all.length,
      byStatus,
      totalEstimatedTime: totalEstimated,
      totalActualTime: totalActual,
    };
  }
}
