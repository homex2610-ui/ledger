import React from "react";
import { fmtMin } from "../../lib/utils";

export function ActivityTimeline({ activity, title = "RECENT ACTIVITY" }) {
  return (
    <section className="lg-community-activity" aria-label={title}>
      <div className="lg-community-label">{title}</div>
      {activity.length === 0 ? (
        <p className="lg-community-muted">Activity appears here after people publish focus.</p>
      ) : (
        <div className="lg-activity-list">
          {activity.slice(0, 6).map((event, index) => (
            <div className="lg-activity-item" key={`${event.user_id || event.code}-${event.day || index}`}>
              <time>{event.day || "TODAY"}</time>
              <span>
                <strong>{event.name || "A Circle member"}</strong> logged {fmtMin(event.minutes || 0)} of focus.
              </span>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}