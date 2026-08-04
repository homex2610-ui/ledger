// src/components/dashboard/sections/HeroSection.jsx
import React from "react";
import LoadingSkeleton from "../../ui/LoadingSkeleton";
import EmptyState from "../../ui/EmptyState";
import SectionHeader from "../../ui/SectionHeader";
import Surface from "../../ui/Surface";

/**
 * HeroSection – shows the highest‑priority pending task as "Today's Focus".
 * Props:
 *   tasks – array of task objects (must include `date`, `done`, `priority`)
 *   onResume – callback when the primary CTA is clicked
 */
export default function HeroSection({ tasks = [], onResume }) {
  // Determine today’s pending tasks
  const todayStr = new Date().toISOString().split("T")[0];
  const pending = tasks.filter((t) => t.date === todayStr && !t.done);

  if (!tasks) {
    return <LoadingSkeleton height="120px" />;
  }

  if (pending.length === 0) {
    return (
      <EmptyState
        title="No tasks for today"
        description="Add a task to get started."
      />
    );
  }

  // Simple priority ranking – higher string means higher priority; you can replace with real logic later
  const priorityOrder = { high: 3, medium: 2, low: 1 };
  const topTask = pending.sort((a, b) => (priorityOrder[b.priority] || 0) - (priorityOrder[a.priority] || 0))[0];

  return (
    <Surface elevation={1} padding="lg">
      <SectionHeader title="Today's Focus" />
      <div style={{ marginTop: "var(--space-3)" }}>
        <h3 style={{ margin: 0 }}>{topTask.text || "Untitled Task"}</h3>
        {topTask.subject && <p style={{ margin: "4px 0" }}>{topTask.subject}</p>}
        <button
          onClick={onResume}
          style={{
            marginTop: "var(--space-3)",
            padding: "8px 16px",
            background: "var(--color-primary)",
            color: "white",
            border: "none",
            borderRadius: "var(--radius-md)",
            cursor: "pointer",
          }}
        >
          Resume Study
        </button>
      </div>
    </Surface>
  );
}
