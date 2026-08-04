// src/lib/dashboard/repositories/DashboardRepository.js
/**
 * DashboardRepository – separates data‑access concerns from the service.
 * It works with a DataSource (e.g., MockDashboardDataSource) and provides
 * caching, prefetching, and update helpers. The UI never talks to stores
 * directly; it only uses the DashboardService which, in turn, calls this
 * repository.
 */
import { MockDashboardDataSource } from "../dataSources/MockDashboardDataSource";

class DashboardRepository {
  constructor() {
    // Default to mock data source – can be swapped later (e.g., Supabase)
    this.dataSource = new MockDashboardDataSource();
    this.cache = null; // In‑memory cache of the latest DashboardData
  }

  /** Singleton accessor */
  static getInstance() {
    if (!DashboardRepository.instance) {
      DashboardRepository.instance = new DashboardRepository();
    }
    return DashboardRepository.instance;
  }

  /**
   * Fetch dashboard data, using cache when possible.
   * @param {string|null} userId
   * @returns {Promise<any>} DashboardData
   */
  async getDashboardData(userId = null) {
    if (this.cache) {
      return this.cache;
    }
    const data = await this.dataSource.getDashboardData(userId);
    this.cache = data;
    return data;
  }

  /** Subscribe for live updates – forwards to the underlying data source */
  subscribe(userId, callback) {
    return this.dataSource.subscribe(userId, (update) => {
      // Update cache on each push
      this.cache = update;
      callback(update);
    });
  }

  /** Invalidate the in‑memory cache */
  invalidate() {
    this.cache = null;
  }

  /** Prefetch data without waiting for the result */
  prefetch(userId = null) {
    // Fire‑and‑forget – errors are logged silently for now
    this.getDashboardData(userId).catch((e) => console.error('Dashboard prefetch error:', e));
  }

  /** Force a refresh, bypassing cache */
  async refresh(userId = null) {
    this.invalidate();
    return this.getDashboardData(userId);
  }

  /** Update a single section in the cached data */
  updateSection(sectionId, newSectionData) {
    if (this.cache && this.cache[sectionId] !== undefined) {
      this.cache[sectionId] = newSectionData;
    }
    return this.cache;
  }

  /** Get the current cached dashboard data */
  getCached() {
    return this.cache;
  }

  /** Set the cache manually – useful for tests or demo injection */
  setCached(data) {
    this.cache = data;
    return this.cache;
  }
}

export default DashboardRepository;
