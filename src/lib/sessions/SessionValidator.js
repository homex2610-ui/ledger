// src/lib/sessions/SessionValidator.js
/**
 * Validation utilities for Session payloads.
 * Returns a Result object (success with the payload, failure with an error string).
 */
import Result from "../common/Result.js";

/** Validate a new session payload (before ID generation). */
export function validateSessionPayload(payload) {
  const required = [
    "taskId",
    "subject",
    "chapter",
    "plannedDuration",
    "startTime",
    "status",
  ];
  for (const field of required) {
    if (payload[field] === undefined || payload[field] === null) {
      return Result.failure(`Missing required field '${field}'`);
    }
  }
  if (isNaN(Number(payload.plannedDuration)) || payload.plannedDuration <= 0) {
    return Result.failure('plannedDuration must be a positive number');
  }
  if (isNaN(Date.parse(payload.startTime))) {
    return Result.failure('Invalid startTime');
  }
  // Optional numeric fields
  if (payload.actualDuration !== undefined && (isNaN(Number(payload.actualDuration)) || payload.actualDuration < 0)) {
    return Result.failure('actualDuration must be non‑negative');
  }
  if (payload.interruptions !== undefined && (isNaN(Number(payload.interruptions)) || payload.interruptions < 0)) {
    return Result.failure('interruptions must be non‑negative');
  }
  if (payload.idleTime !== undefined && (isNaN(Number(payload.idleTime)) || payload.idleTime < 0)) {
    return Result.failure('idleTime must be non‑negative');
  }
  return Result.success(payload);
}

/** Validate updates (partial). Checks only provided fields. */
export function validateSessionUpdate(payload) {
  if (payload.plannedDuration !== undefined && (isNaN(Number(payload.plannedDuration)) || payload.plannedDuration <= 0)) {
    return Result.failure('plannedDuration must be a positive number');
  }
  if (payload.startTime !== undefined && isNaN(Date.parse(payload.startTime))) {
    return Result.failure('Invalid startTime');
  }
  if (payload.endTime !== undefined && isNaN(Date.parse(payload.endTime))) {
    return Result.failure('Invalid endTime');
  }
  return Result.success(payload);
}
