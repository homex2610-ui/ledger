// src/components/dashboard/sections/RevisionSection.jsx
import React from "react";
import LoadingSkeleton from "../../ui/LoadingSkeleton";
import EmptyState from "../../ui/EmptyState";
import SectionHeader from "../../ui/SectionHeader";
import Surface from "../../ui/Surface";

/**
 * RevisionSection – displays a list of revision cards.
 * Props:
 *   revisions – array of revision objects (must include `title`, `subject`).
 */
export default function RevisionSection({ revisions = [] }) {
  // Loading state
  if (!revisions) {
    return <LoadingSkeleton height="200px" />;
  }
  // Empty state
  if (revisions.length === 0) {
    return (
      <EmptyState
        title="No revision cards"
        description="Create revision cards to review material."
      />
    );
  }
  return (
    <Surface elevation={1} padding="md">
      <SectionHeader title="Revision Cards" />
      <ul style={{ marginTop: "var(--space-3)" }}>
        {revisions.map((rev) => (
          <li key={rev.id} style={{ marginBottom: "var(--space-2)" }}>
            <strong>{rev.title || "Untitled"}</strong>
            {rev.subject && <p style={{ margin: 0 }}>{rev.subject}</p>}
          </li>
        ))}
      </ul>
    </Surface>
  );
}
