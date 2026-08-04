// src/lib/common/Result.js
/**
 * Simple Result type for functional error handling.
 * Usage: Result.success(value) or Result.failure(error)
 */
class Result {
  /** @type {boolean} */
  isSuccess;
  /** @type {*} */
  value;
  /** @type {*} */
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

  /** @returns {Result} */
  static success(value) {
    return new Result(true, value, undefined);
  }

  /** @returns {Result} */
  static failure(error) {
    return new Result(false, undefined, error);
  }
}

export default Result;
