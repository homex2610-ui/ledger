// src/lib/dashboard/dataSources/MockDashboardDataSource.js
/**
 * MockDashboardDataSource – provides mock dashboard data for development.
 * Implements the same interface as real data sources (e.g., SupabaseDashboardDataSource).
 */
import { mockDashboardData } from "../mockDashboardData";

export class MockDashboardDataSource {
  /**
   * Simulate an async fetch of dashboard data.
   * @param {string|null} userId - currently unused, kept for API compatibility.
   * @returns {Promise<import('../types').DashboardData>}
   */
  async getDashboardData(userId) {
    // Simulate network latency
    return new Promise((resolve) => {
      setTimeout(() => resolve(mockDashboardData), 300);
    });
  }

  /**
   * Placeholder for subscription API – not needed for mock.
   */
  subscribe(userId, callback) {
    // No real-time updates in the mock source.
    return () => {};
  }
}
