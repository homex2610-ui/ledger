// src/components/dashboard/sections/ProgressSection.jsx
import React from "react";
import LoadingSkeleton from "../../ui/LoadingSkeleton";
import EmptyState from "../../ui/EmptyState";
import SectionHeader from "../../ui/SectionHeader";
import Surface from "../../ui/Surface";

/**
 * ProgressSection – displays progress overview (e.g., study streak, completion %).
 * Props:
 *   data – object with any progress metrics; for MVP we show a simple placeholder.
 */
export default function ProgressSection({ data = {} }) {
  // Loading state if data undefined/null
  if (!data) {
    return <LoadingSkeleton height="150px" />;
  }

  const hasData = Object.keys(data).length > 0;
  if (!hasData) {
    return (
      <EmptyState
        title="No progress data"
        description="Progress information will appear here when available."
      />
    );
  }

  return (
    <Surface elevation={1} padding="md">
      <SectionHeader title="Progress" />
      <ul style={{ marginTop: "var(--space-3)" }}>
        {Object.entries(data).map(([key, value]) => (
          <li key={key} style={{ marginBottom: "var(--space-2)" }}>
            <strong>{key}:</strong> {value}
          </li>
        ))}
      </ul>
    </Surface>
  );
}
