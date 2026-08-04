// src/lib/dashboard/DashboardService.js
import { useState, useEffect } from "react";
import DashboardRepository from "./repositories/DashboardRepository";

/**
 * useDashboard – Hook that abstracts dashboard data fetching via the DashboardRepository.
 * It hides caching, data source selection, and refresh logic from the UI.
 */
export function useDashboard(userId = null) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const repository = DashboardRepository.getInstance();

  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    repository
      .getDashboardData(userId)
      .then((result) => {
        if (isMounted) {
          setData(result);
          setLoading(false);
        }
      })
      .catch((e) => {
        if (isMounted) {
          setError(e);
          setLoading(false);
        }
      });

    const unsubscribe = repository.subscribe(userId, (updated) => {
      if (isMounted) setData(updated);
    });

    return () => {
      isMounted = false;
      if (typeof unsubscribe === "function") unsubscribe();
    };
  }, [userId, repository]);

  return { data, loading, error };
}
