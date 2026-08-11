import React from "react";
import { Search } from "lucide-react";
import { CodeField } from "./CodeField";
import { CommunityTabs } from "./CommunityTabs";

export function CommunityHeader({ section, onSectionChange, profile, onCopy }) {
  return (
    <header className="lg-community-header">
      <div>
        <div className="lg-community-kicker">COMMUNITY</div>
        <h1>Study with people who keep you moving.</h1>
        <p>Your Circle, study groups, shared focus and progress.</p>
      </div>
      <div className="lg-community-header-tools">
        <CodeField label="YOUR CODE" code={profile.code} onCopy={onCopy} compact />
        <CommunityTabs section={section} onChange={onSectionChange} />
      </div>
    </header>
  );
}