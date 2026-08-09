import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import "./index.css";

class Boundary extends React.Component {
  state = { err: null };
  static getDerivedStateFromError(err) { return { err }; }
  render() {
    if (this.state.err) {
      return React.createElement(
        "pre",
        { style: { padding: 24, background: "#1b1020", color: "#ff8fa3", whiteSpace: "pre-wrap" } },
        String(this.state.err && (this.state.err.stack || this.state.err.message || this.state.err))
      );
    }
    return this.props.children;
  }
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <Boundary>
      <App />
    </Boundary>
  </React.StrictMode>
);