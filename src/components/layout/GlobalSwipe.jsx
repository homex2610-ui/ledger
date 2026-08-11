import React, { useEffect, useRef } from "react";

// Workspace-to-workspace swipe navigation, scoped to the main content area.
// The page itself is ONE continuous scroll — this only pages between tabs.
//
// Three inputs, one contract:
//   touch          — pointer events + `touch-action: pan-y`, so vertical
//                    panning stays native and only horizontal pans reach us
//   trackpad       — horizontal wheel (deltaX) accumulates to a threshold
//   mouse drag     — fallback, axis-locked like touch
//
// Guards: never starts on interactive elements (buttons, inputs, sliders,
// links…), never starts while text is selected, and a horizontal-dominant
// axis lock keeps vertical scrolling and text selection untouched. The
// reduced-motion setting doesn't disable navigation — it removes the motion:
// tab switching remounts the page whose transitions are already disabled by
// `.lg-motion-off` / the prefers-reduced-motion media query.

const SWIPE_CHAIN = ["dashboard", "timer", "syllabus", "cards", "mocks", "errors", "community"];
const AXIS_GRACE = 10;        // px of movement before committing to an axis
const SWIPE_DISTANCE = 90;    // px of horizontal travel required to page
const WHEEL_THRESHOLD = 80;   // accumulated deltaX before paging
const CLICK_SUPPRESS_MS = 400;

const INTERACTIVE = "button, input, select, textarea, a, [contenteditable='true'], [role='slider'], [role='button']";

export default function GlobalSwipe({ tab, onNav, className, style, children }) {
  const ref = useRef(null);
  const gestureRef = useRef(null);
  const wheelAccRef = useRef(0);
  const suppressClickUntilRef = useRef(0);
  const tabRef = useRef(tab);
  const onNavRef = useRef(onNav);
  tabRef.current = tab;
  onNavRef.current = onNav;

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const navBy = (dir) => {
      const i = SWIPE_CHAIN.indexOf(tabRef.current);
      if (i === -1) return;
      const next = SWIPE_CHAIN[i + dir];
      if (next && next !== tabRef.current) onNavRef.current(next);
    };

    const isInsideHorizontalScroller = (target) =>
      target && target.closest && target.closest(".lg-feed-line");

    const onPointerDown = (e) => {
      const t = e.target;
      if (t && t.closest && t.closest(INTERACTIVE)) return;
      if (isInsideHorizontalScroller(t)) return;
      if (window.getSelection && window.getSelection().toString().length > 0) return;
      gestureRef.current = {
        startX: e.clientX, startY: e.clientY,
        claimed: false, ptr: e.pointerId,
      };
    };

    const onPointerMove = (e) => {
      const g = gestureRef.current;
      if (!g || e.pointerId !== g.ptr) return;
      const dx = e.clientX - g.startX;
      const dy = e.clientY - g.startY;
      if (!g.claimed) {
        if (Math.abs(dx) < AXIS_GRACE && Math.abs(dy) < AXIS_GRACE) return;
        if (Math.abs(dy) >= Math.abs(dx)) { gestureRef.current = null; return; } // vertical — stay native
        g.claimed = true;
        suppressClickUntilRef.current = Date.now() + CLICK_SUPPRESS_MS;
        try { el.setPointerCapture(e.pointerId); } catch (err) { /* synthetic pointer */ }
      }
      if (e.cancelable) e.preventDefault(); // stops text selection while dragging
      if (Math.abs(dx) >= SWIPE_DISTANCE) {
        navBy(dx < 0 ? 1 : -1);
        gestureRef.current = null;
      }
    };

    const endGesture = () => { gestureRef.current = null; };

    const onClick = (e) => {
      if (Date.now() < suppressClickUntilRef.current) {
        e.preventDefault();
        e.stopPropagation();
      }
    };

    const onWheel = (e) => {
      if (Math.abs(e.deltaX) < 2) { wheelAccRef.current = 0; return; }
      if (isInsideHorizontalScroller(e.target)) return;
      wheelAccRef.current += e.deltaX;
      if (Math.abs(wheelAccRef.current) >= WHEEL_THRESHOLD) {
        const dir = wheelAccRef.current < 0 ? 1 : -1;
        wheelAccRef.current = 0;
        navBy(dir);
      }
    };

    el.addEventListener("pointerdown", onPointerDown);
    el.addEventListener("pointermove", onPointerMove);
    el.addEventListener("pointerup", endGesture);
    el.addEventListener("pointercancel", endGesture);
    el.addEventListener("click", onClick, true);
    el.addEventListener("wheel", onWheel, { passive: true });
    return () => {
      el.removeEventListener("pointerdown", onPointerDown);
      el.removeEventListener("pointermove", onPointerMove);
      el.removeEventListener("pointerup", endGesture);
      el.removeEventListener("pointercancel", endGesture);
      el.removeEventListener("click", onClick, true);
      el.removeEventListener("wheel", onWheel);
    };
  }, []);

  return (
    <div ref={ref} className={className} style={{ touchAction: "pan-y", ...style }}>
      {children}
    </div>
  );
}
