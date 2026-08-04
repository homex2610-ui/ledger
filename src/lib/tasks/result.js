// src/lib/tasks/result.js
// Simple Result type for functional error handling

/**
 * @template T, E
 */
class Result {
  /** @type {boolean} */
  isSuccess;
  /** @type {T|undefined} */
  value;
  /** @type {E|undefined} */
  error;

  /** @private */
  constructor(isSuccess, value, error) {
    this.isSuccess = isSuccess;
    if (isSuccess) {
      this.value = value;
      this.error = undefined;
    } else {
      this.value = undefined;
      this.error = error;
    }
    Object.freeze(this);
  }

  /** @returns {Result<T,E>} */
  static success(value) {
    return new Result(true, value, undefined);
  }

  /** @returns {Result<T,E>} */
  static failure(error) {
    return new Result(false, undefined, error);
  }
}

export default Result;
