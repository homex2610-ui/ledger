import React from "react";
import { fmtMin } from "../../lib/utils";
import { PageHead } from "../ui/Panels";
import { CodeField } from "./CodeField";
import { CommunityTabs } from "./CommunityTabs";

export function CommunityHeader({ section, onSectionChange, profile, onCopy, focusMinutes }) {
  return (
    <div>
      <PageHead
        variant="hero"
        eyebrow="Community"
        title="Study with people who keep you moving."
        lead="Your Circle, study groups, shared focus and progress."
        num={fmtMin(focusMinutes)}
        numLabel="FOCUSED TODAY"
        numSub={focusMinutes > 0 ? "minutes of focus logged" : "start a session to light it up"}
      />
      <div className="lg-community-header-tools">
        <CodeField label="YOUR CODE" code={profile.code} onCopy={onCopy} compact />
        <CommunityTabs section={section} onChange={onSectionChange} />
      </div>
    </div>
  );
}
