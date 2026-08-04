// src/components/dashboard/sections/StatsSection.jsx
import React from "react";
import LoadingSkeleton from "../../ui/LoadingSkeleton";
import EmptyState from "../../ui/EmptyState";
import SectionHeader from "../../ui/SectionHeader";
import Surface from "../../ui/Surface";

/**
 * StatsSection – placeholder for dashboard statistics.
 * Props can include any stats object; for MVP we just display a static message.
 */
export default function StatsSection({ stats = {} }) {
  // If stats not provided, show loading
  if (!stats) {
    return <LoadingSkeleton height="150px" />;
  }
  // If empty, show empty state
  const hasData = Object.keys(stats).length > 0;
  if (!hasData) {
    return (
      <EmptyState
        title="No stats"
        description="Statistics will appear here when available."
      />
    );
  }
  // Simple rendering of key/value pairs
  return (
    <Surface elevation={1} padding="md">
      <SectionHeader title="Statistics" />
      <ul style={{ marginTop: "var(--space-3)" }}>
        {Object.entries(stats).map(([key, value]) => (
          <li key={key} style={{ marginBottom: "var(--space-2)" }}>
            <strong>{key}:</strong> {value}
          </li>
        ))}
      </ul>
    </Surface>
  );
}
