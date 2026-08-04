// src/components/layout/PageTemplate.jsx
import React from "react";
import Header from "./Header";

export default function PageTemplate({ title, children }) {
  return (
    <div className="page">
      <Header />
      <main className="container stack gap-4">
        {title && <h1 className="section-title">{title}</h1>}
        {children}
      </main>
    </div>
  );
}
