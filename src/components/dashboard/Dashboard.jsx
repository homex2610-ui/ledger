// src/components/dashboard/Dashboard.jsx
import React from "react";
import { dashboardSections } from "./dashboardConfig";
import GridItem from "../ui/GridItem";
import HeroSection from "./sections/HeroSection";
import StatsSection from "./sections/StatsSection";
import TasksSection from "./sections/TasksSection";
import RevisionSection from "./sections/RevisionSection";
import ProgressSection from "./sections/ProgressSection";
import { useDashboard } from "../../lib/dashboard/DashboardService";

/**
 * Dashboard – top‑level page that renders sections based on the dashboard
 * configuration and data provided by the DashboardService abstraction.
 */
export default function Dashboard() {
  const { data, loading, error } = useDashboard();

  if (loading) {
    return <div className="dashboard-loading">Loading dashboard…</div>;
  }
  if (error) {
    return <div className="dashboard-error">Failed to load dashboard data.</div>;
  }

  const renderSection = (id) => {
    switch (id) {
      case "hero":
        return <HeroSection {...data.hero} />;
      case "stats":
        return <StatsSection stats={data.stats} />;
      case "tasks":
        return <TasksSection tasks={data.tasks} />;
      case "revision":
        return <RevisionSection revisions={data.revision} />;
      case "progress":
        return <ProgressSection data={data.progress} />;
      default:
        return null;
    }
  };

  const visibleSections = dashboardSections
    .filter((s) => s.enabled)
    .sort((a, b) => b.priority - a.priority);

  return (
    <div className="dashboard-grid" style={{ gap: "var(--space-4)" }}>
      {visibleSections.map((section) => (
        <GridItem key={section.id} span={12}>
          {renderSection(section.id)}
        </GridItem>
      ))}
    </div>
  );
}
