// src/components/ui/GridItem.jsx
import React from "react";

/**
 * GridItem – wrapper for items inside a CSS grid layout.
 * Props:
 *   span?: number – number of columns to span on the default (desktop) breakpoint.
 *   desktop?: number – explicit span for desktop width.
 *   tablet?: number – span for tablet breakpoint.
 *   mobile?: number – span for mobile breakpoint.
 *   className?: string – additional classes.
 *   style?: object – extra inline styles.
 */
export default function GridItem({
  span,
  desktop,
  tablet,
  mobile,
  className = "",
  style = {},
  children,
}) {
  // Determine spans for each breakpoint, falling back to the generic `span`
  const desktopSpan = desktop || span || 1;
  const tabletSpan = tablet || desktopSpan;
  const mobileSpan = mobile || tabletSpan;

  const baseStyle = {
    gridColumn: `span ${desktopSpan}`,
    // Use CSS custom properties for responsive spans – these will be set via media queries elsewhere.
    // For now we apply inline styles for tablet/mobile via media queries using CSS variables.
  };

  const combinedStyle = { ...baseStyle, ...style };

  // Add data attributes for potential responsive handling.
  return (
    <div
      className={`grid-item ${className}`}
      style={combinedStyle}
      data-desktop-span={desktopSpan}
      data-tablet-span={tabletSpan}
      data-mobile-span={mobileSpan}
    >
      {children}
    </div>
  );
}
