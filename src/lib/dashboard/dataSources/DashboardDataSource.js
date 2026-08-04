// src/lib/dashboard/dataSources/DashboardDataSource.js
/**
 * Abstract base class for dashboard data sources.
 * Concrete implementations (Mock, Supabase, Demo, etc.) must extend this class
 * and implement the `getDashboardData` method. Optional `subscribe` can be
 * provided for real‑time updates.
 */
export class DashboardDataSource {
  /**
   * Retrieve the dashboard data.
   * @param {string|null} userId - Identifier of the user; may be null for demo.
   * @returns {Promise<any>} Dashboard data matching the DashboardData contract.
   */
  async getDashboardData(userId) {
    throw new Error('getDashboardData() not implemented');
  }

  /**
   * Optional subscription method for live updates.
   * @param {string|null} userId
   * @param {function} callback - Called with updated dashboard data.
   * @returns {function} Unsubscribe function.
   */
  subscribe(userId, callback) {
    // Default no‑op implementation.
    return () => {};
  }
}
