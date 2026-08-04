// src/lib/tasks/validation/TaskValidator.js
/**
 * Pure validation functions for Task payloads.
 * Each function returns a Result (success with the validated task, or failure with message).
 */
import Result from "../../common/Result.js";
import { TaskStatus, TaskPriority } from "../types.js";

/** Validate required fields and enums for a task creation payload */
export function validateTaskPayload(payload) {
  const required = [
    "subject",
    "chapter",
    "topic",
    "type",
    "priority",
    "estimatedTime",
    "dueDate",
    "status",
  ];
  for (const field of required) {
    if (payload[field] === undefined || payload[field] === null) {
      return Result.failure(`Missing required field '${field}'`);
    }
  }

  if (!Object.values(TaskPriority).includes(payload.priority)) {
    return Result.failure(`Invalid priority '${payload.priority}'`);
  }
  if (!Object.values(TaskStatus).includes(payload.status)) {
    return Result.failure(`Invalid status '${payload.status}'`);
  }
  if (isNaN(Date.parse(payload.dueDate))) {
    return Result.failure(`Invalid dueDate '${payload.dueDate}'`);
  }
  // Additional optional validation can be added here
  return Result.success(payload);
}

/** Validate updates payload (partial). Only checks fields that are present. */
export function validateTaskUpdate(payload) {
  if (payload.priority && !Object.values(TaskPriority).includes(payload.priority)) {
    return Result.failure(`Invalid priority '${payload.priority}'`);
  }
  if (payload.status && !Object.values(TaskStatus).includes(payload.status)) {
    return Result.failure(`Invalid status '${payload.status}'`);
  }
  if (payload.dueDate && isNaN(Date.parse(payload.dueDate))) {
    return Result.failure(`Invalid dueDate '${payload.dueDate}'`);
  }
  return Result.success(payload);
}
