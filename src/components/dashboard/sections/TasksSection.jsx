// src/components/dashboard/sections/TasksSection.jsx
import React from "react";
import LoadingSkeleton from "../../ui/LoadingSkeleton";
import EmptyState from "../../ui/EmptyState";
import SectionHeader from "../../ui/SectionHeader";
import Surface from "../../ui/Surface";

/**
 * TasksSection – renders a list of tasks for the dashboard.
 * Props:
 *   tasks – array of task objects (must include `text`, `subject`, `date`, `done`).
 *   onToggle – optional callback when a task is toggled/completed.
 */
export default function TasksSection({ tasks = [], onToggle }) {
  // Loading state if tasks not yet provided
  if (!tasks) {
    return <LoadingSkeleton height="200px" />;
  }

  // Empty state when there are no tasks
  if (tasks.length === 0) {
    return (
      <EmptyState
        title="No tasks"
        description="Add tasks to see them here."
      />
    );
  }

  return (
    <Surface elevation={1} padding="md">
      <SectionHeader title="Today's Tasks" />
      <ul className="task-list" style={{ marginTop: "var(--space-3)" }}>
        {tasks.map((task) => (
          <li key={task.id} className="task-item" style={{ marginBottom: "var(--space-2)" }}>
            <label style={{ display: "flex", alignItems: "center", cursor: onToggle ? "pointer" : "default" }}>
              <input
                type="checkbox"
                checked={!!task.done}
                onChange={() => onToggle && onToggle(task.id)}
                style={{ marginRight: "var(--space-2)" }}
                disabled={!onToggle}
              />
              <span>{task.text || "Untitled Task"}</span>
            </label>
            {task.subject && <p style={{ margin: 0, fontSize: "0.9em", color: "var(--color-muted)" }}>{task.subject}</p>}
          </li>
        ))}
      </ul>
    </Surface>
  );
}
