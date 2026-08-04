// src/components/layout/ActivePage.jsx
import React from "react";
import PageTemplate from "./PageTemplate";

import Dashboard from "../dashboard/Dashboard";
const Placeholder = ({ name }) => <div>{name} page (under construction)</div>;

export default function ActivePage({ tab, setTab, ...restProps }) {
  const renderPage = () => {
    switch (tab) {
      case "dashboard":
        return <Dashboard {...restProps} />;
      case "analytics":
        return <Placeholder name="Analytics" />;
      case "subjects":
        return <Placeholder name="Subjects" />;
      case "tasks":
        return <Placeholder name="Tasks" />;
      case "revision":
        return <Placeholder name="Revision" />;
      case "community":
        return <Placeholder name="Community" />;
      case "settings":
        return <Placeholder name="Settings" />;
      default:
        return null;
    }
  };

  // Derive a simple title from the tab name
  const title = tab ? tab.charAt(0).toUpperCase() + tab.slice(1) : "";

  return (
    <PageTemplate title={title}>
      {renderPage()}
    </PageTemplate>
  );
}
