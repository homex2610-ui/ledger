import React from "react";

export function lgComButton({ children, variant = "primary", size = "default", disabled, onClick, ...props }) {
  const base = "lg-community-button";
  const variants = {
    primary: "is-primary",
    secondary: "is-secondary",
    quiet: "is-quiet",
  };
  return (
    <button
      className={`${base} ${variants[variant]}`}
      disabled={disabled}
      onClick={onClick}
      {...props}
    >
      {children}
    </button>
  );
}