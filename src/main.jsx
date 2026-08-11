import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import "./index.css";

class Boundary extends React.Component {
  state = { err: null };
  static getDerivedStateFromError(err) { return { err }; }
  componentDidCatch(err) {
    // Raw detail (stack, file paths, component internals) is a dev-only
    // diagnostic. Production logs a sanitized marker so a fatal render
    // error stays observable without leaking internals into the console.
    if (import.meta.env.DEV) {
      console.error("[ledger] fatal render error:", err);
    } else {
      console.error("[ledger] fatal render error (details suppressed in production)");
    }
  }
  render() {
    const { err } = this.state;
    if (!err) return this.props.children;
    const stack = String(err && (err.stack || err.message || err));
    const dev = import.meta.env.DEV;
    return React.createElement(
      "div",
      { role: "alert", style: { minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 24, background: "var(--color-bg)", color: "var(--color-text)", fontFamily: "system-ui, sans-serif" } },
      React.createElement(
        "div",
        { style: { width: "min(480px, 100%)", background: "var(--color-panel)", border: "1px solid var(--color-border)", borderRadius: 14, padding: 28 } },
        React.createElement("div", { style: { fontSize: 20, fontWeight: 800, letterSpacing: "-0.01em", marginBottom: 8 } }, "Ledger hit an unexpected error"),
        React.createElement("p", { style: { fontSize: 13.5, lineHeight: 1.6, opacity: 0.85, margin: "0 0 18px" } }, "Something went wrong while rendering this view. Reload to continue — your study data stays in your account."),
        dev && React.createElement("pre", { "data-dev-only": "stack", style: { whiteSpace: "pre-wrap", overflow: "auto", maxHeight: 220, padding: 12, background: "var(--color-panel2)", border: "1px solid var(--color-border)", borderRadius: 10, fontSize: 11, lineHeight: 1.5, margin: "0 0 18px" } }, stack),
        React.createElement("button", { type: "button", onClick: () => window.location.reload(), style: { padding: "10px 18px", border: 0, borderRadius: 10, background: "var(--color-accent)", color: "#081018", fontWeight: 800, fontSize: 13, cursor: "pointer" } }, "Reload Ledger")
      )
    );
  }
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <Boundary>
      <App />
    </Boundary>
  </React.StrictMode>
);