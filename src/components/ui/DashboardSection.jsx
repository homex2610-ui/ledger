// src/components/ui/DashboardSection.jsx
import React from "react";
import LoadingSkeleton from "./LoadingSkeleton";
import EmptyState from "./EmptyState";

/**
 * DashboardSection – reusable wrapper for a dashboard area.
 * Props:
 *   title: string – section title (optional)
 *   subtitle: string – smaller subtitle (optional)
 *   actions: ReactNode – optional action elements (e.g., buttons)
 *   loading: boolean – shows a loading skeleton when true
 *   empty: boolean – shows an empty state when true
 *   children: ReactNode – content when not loading/empty
 */
export default function DashboardSection({
  title,
  subtitle,
  actions,
  loading = false,
  empty = false,
  children,
}) {
  return (
    <section className="surface stack gap-3">
      {(title || subtitle || actions) && (
        <header className="stack gap-1">
          {title && <h2 className="section-title">{title}</h2>}
          {subtitle && <p className="section-subtitle">{subtitle}</p>}
          {actions && <div className="section-actions">{actions}</div>}
        </header>
      )}
      {loading && <LoadingSkeleton />}
      {empty && <EmptyState />}
      {!loading && !empty && children}
    </section>
  );
}
