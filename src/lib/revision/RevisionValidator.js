// src/lib/revision/RevisionValidator.js
/**
 * Validation utilities for Revision payloads.
 * Returns a Result object (success with payload or failure with error string).
 */
import Result from "../common/Result.js";

/** Validate required fields for creating a Revision */
export function validateRevisionPayload(payload) {
  const required = [
    "taskId",
    "subject",
    "chapter",
    "topic",
    "dueDate",
    "algorithm",
    "status",
  ];
  for (const field of required) {
    if (payload[field] === undefined || payload[field] === null) {
      return Result.failure(`Missing required field '${field}'`);
    }
  }
  // Validate dates
  if (isNaN(Date.parse(payload.dueDate))) {
    return Result.failure('Invalid dueDate');
  }
  if (payload.lastReview && isNaN(Date.parse(payload.lastReview))) {
    return Result.failure('Invalid lastReview date');
  }
  // Validate numbers
  const numericFields = ["interval", "repetitions", "lapses", "ease", "stability", "retrievability", "confidence"];
  for (const f of numericFields) {
    if (payload[f] !== undefined && (isNaN(Number(payload[f])) || Number(payload[f]) < 0)) {
      return Result.failure(`Invalid numeric field '${f}'`);
    }
  }
  // Validate algorithm name
  const allowed = ["SM2", "FSRS"];
  if (!allowed.includes(payload.algorithm)) {
    return Result.failure(`Unsupported algorithm '${payload.algorithm}'. Allowed: ${allowed.join(', ')}`);
  }
  return Result.success(payload);
}

/** Validate partial updates for a Revision */
export function validateRevisionUpdate(payload) {
  // Only validate fields that are present
  if (payload.dueDate && isNaN(Date.parse(payload.dueDate))) {
    return Result.failure('Invalid dueDate');
  }
  if (payload.lastReview && isNaN(Date.parse(payload.lastReview))) {
    return Result.failure('Invalid lastReview');
  }
  const numericFields = ["interval", "repetitions", "lapses", "ease", "stability", "retrievability", "confidence"];
  for (const f of numericFields) {
    if (payload[f] !== undefined && (isNaN(Number(payload[f])) || Number(payload[f]) < 0)) {
      return Result.failure(`Invalid numeric field '${f}'`);
    }
  }
  if (payload.algorithm) {
    const allowed = ["SM2", "FSRS"];
    if (!allowed.includes(payload.algorithm)) {
      return Result.failure(`Unsupported algorithm '${payload.algorithm}'`);
    }
  }
  return Result.success(payload);
}
