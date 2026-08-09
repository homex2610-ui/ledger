import React, { useMemo } from "react";
import { AlertTriangle } from "lucide-react";
import { COLORS, FONTS, hexToRgba } from "../../lib/theme";

// Small local Card, identical to the one in App.jsx — duplicated rather than
// imported from App.jsx to avoid a circular import (App.jsx will import this
// file). If/when Card gets its own extraction (matching the Sidebar
// pattern), swap this for a shared import.
function Card({ title, right, children, style }) {
  return (
    <div className="lg-card" style={{ background: `linear-gradient(170deg, ${hexToRgba(COLORS.panel, 0.7)}, ${hexToRgba(COLORS.panel2, 0.54)})`, backdropFilter: `blur(${COLORS.glassBlur}) saturate(1.18)`, WebkitBackdropFilter: `blur(${COLORS.glassBlur}) saturate(1.18)`, border: `1px solid ${COLORS.border}`, borderRadius: 10, padding: "16px 18px", minWidth: 0, ...style }}>
      {(title || right) && (
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12, flexWrap: "wrap", gap: 8 }}>
          {title && <div style={{ fontSize: 11, letterSpacing: "0.08em", textTransform: "uppercase", color: COLORS.dim, fontWeight: 600 }}>{title}</div>}
          {right}
        </div>
      )}
      {children}
    </div>
  );
}

// Weak Areas — combines three signals you're already collecting into one
// ranked list, instead of leaving the student to mentally cross-reference
// three separate tabs:
//   1. Chapter-level PYQ accuracy (from Syllabus)
//   2. Subject-level mock average (from Mocks)
//   3. Error-type frequency by topic (from Mistake Ledger)
// Nothing here is predictive or AI-generated — it's the same "rule-based,
// not predictive" philosophy the existing consistencyAlert already uses.

function scoreChapter(chapter, subjectMockPct, errorCountForTopic) {
  // Lower score = weaker. Each signal contributes 0-100 scaled the same way
  // so they can be averaged meaningfully even though they come from very
  // different places (a slider value, a mock percentage, an error count).
  const pyqScore = chapter.pyq; // 0-100 already
  const moduleScore = chapter.module; // 0-100 already
  const mockScore = subjectMockPct != null ? subjectMockPct : 60; // neutral default if no mocks yet
  // Every logged error for this exact topic subtracts 15 points, floored at 0.
  const errorPenalty = Math.max(0, 100 - errorCountForTopic * 15);
  const weighted = (pyqScore * 0.35) + (moduleScore * 0.2) + (mockScore * 0.25) + (errorPenalty * 0.2);
  return Math.round(weighted);
}

export function computeWeakAreas({ syllabus, mocks, errors }) {
  const subjectMockPct = {};
  Object.keys(syllabus).forEach(subject => {
    // Both fields must be real numbers — a subject slot with a max but no
    // obtained score (or vice versa) must not count as 0% or NaN.
    const scores = mocks.map(m => (m.subjectScores || []).find(s => s.subject === subject))
      .filter(s => s && s.obtained !== "" && s.obtained != null && Number(s.obtained) > 0 && Number(s.max) > 0);
    subjectMockPct[subject] = scores.length
      ? Math.round(scores.reduce((a, s) => a + (Number(s.obtained) / Number(s.max)) * 100, 0) / scores.length)
      : null;
  });

  // Error topics are free-form ("Kinematics — rotation", "got confused in
  // NLM"), so exact-string equality against chapter names almost never
  // matches. Count an error against a chapter when either contains the
  // other, case-insensitively. This over-counts slightly on very short
  // names ("Atoms" matching "Atomic structure" is arguably a hit anyway),
  // but it makes the penalty signal real instead of dead.
  const countErrorsForChapter = (name) => {
    const lcName = name.trim().toLowerCase();
    if (!lcName) return 0;
    return errors.reduce((count, e) => {
      const lcTopic = (e.topic || "").trim().toLowerCase();
      if (!lcTopic) return count;
      return count + (lcTopic.includes(lcName) || lcName.includes(lcTopic) ? 1 : 0);
    }, 0);
  };

  const rows = [];
  Object.entries(syllabus).forEach(([subject, chapters]) => {
    chapters.forEach(c => {
      // Only chapters the student has actually engaged with (status beyond
      // "todo") — an untouched chapter isn't "weak", it's just not started,
      // and belongs on the Coverage Map / backlog view instead.
      if (c.status === "todo") return;
      const errorCount = countErrorsForChapter(c.name);
      const score = scoreChapter(c, subjectMockPct[subject], errorCount);
      rows.push({ subject, name: c.name, score, pyq: c.pyq, module: c.module, errorCount, mockPct: subjectMockPct[subject] });
    });
  });

  return rows.sort((a, b) => a.score - b.score).slice(0, 8);
}

export default function WeakAreas({ syllabus, mocks, errors, setTab }) {
  const weak = useMemo(() => computeWeakAreas({ syllabus, mocks, errors }), [syllabus, mocks, errors]);
  const hasAnyEngagement = Object.values(syllabus).flat().some(c => c.status !== "todo");

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <Card title="How this is scored">
        <div style={{ fontSize: 12, color: COLORS.dim, lineHeight: 1.6 }}>
          Each chapter you've started gets a score out of 100 combining PYQ accuracy, module completion,
          your mock average in that subject, and how many mistakes you've logged against that exact topic.
          Lower score = costing you more marks right now. This is arithmetic on data you've already
          entered — nothing here is predicted or AI-generated.
        </div>
      </Card>

      {!hasAnyEngagement ? (
        <Card>
          <div style={{ fontSize: 12, color: COLORS.faint }}>
            No chapters marked in-progress or done yet — start working through the Coverage Map and this
            view will populate once there's real signal to rank.
          </div>
        </Card>
      ) : (
        <Card title={`Weakest ${weak.length} chapters right now`}>
          {weak.map((w, i) => (
            <div key={`${w.subject}-${w.name}`} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 4px", borderBottom: `1px solid ${COLORS.border}` }}>
              <div style={{
                width: 32, height: 32, borderRadius: 8, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center",
                background: w.score < 40 ? `${COLORS.danger}22` : w.score < 65 ? `${COLORS.warn}22` : COLORS.panel2,
                border: `1px solid ${w.score < 40 ? COLORS.danger : w.score < 65 ? COLORS.warn : COLORS.border}55`,
              }}>
                {w.score < 40 && <AlertTriangle size={14} color={COLORS.danger} />}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, color: COLORS.text }}>{w.name}</div>
                <div style={{ fontSize: 10, color: COLORS.faint, marginTop: 2 }}>
                  {w.subject} · PYQ {w.pyq}% · module {w.module}%{w.mockPct != null ? ` · mock avg ${w.mockPct}%` : ""}{w.errorCount > 0 ? ` · ${w.errorCount} mistake${w.errorCount === 1 ? "" : "s"} logged` : ""}
                </div>
              </div>
              <div style={{ fontFamily: FONTS.mono, fontSize: 15, fontWeight: 600, color: w.score < 40 ? COLORS.danger : w.score < 65 ? COLORS.warn : COLORS.done, minWidth: 34, textAlign: "right" }}>
                {w.score}
              </div>
            </div>
          ))}
        </Card>
      )}
    </div>
  );
}
