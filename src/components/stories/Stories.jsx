import React, { useEffect, useMemo, useState } from "react";
import QRCode from "qrcode";
import { Download, ExternalLink, Share2, X } from "lucide-react";
import { COLORS, FONTS, RADIUS, elev, hexToRgba } from "../../lib/theme";
import { buildStoryData, getStoryShareUrl } from "../../lib/stories";
import { DiscordIcon } from "../ui/DiscordIcon";
import { discordInviteUrl, hasDiscordInvite, DISCORD_CTA_LABEL } from "../../lib/discord";
import { StorySvg, svgToPng } from "./StoryRenderer";

const MODES = [
  ["today", "Today", "Your day in one frame"],
  ["week", "7 Days", "Your week in one frame"],
  ["month", "Month", "Your month in one frame"],
];

export default function Stories({ sessions, dpp, mocks, profile, initialMode = "today", onClose }) {
  const [mode, setMode] = useState(initialMode);
  const [template, setTemplate] = useState("glass");
  const [qrSrc, setQrSrc] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [fileShareAvailable, setFileShareAvailable] = useState(false);
  const shareUrl = getStoryShareUrl();
  const data = useMemo(() => buildStoryData({ mode, sessions, dpp, mocks, profile }), [mode, sessions, dpp, mocks, profile]);

  useEffect(() => { QRCode.toDataURL(shareUrl, { margin: 2, width: 420, errorCorrectionLevel: "M", color: { dark: "#10131B", light: "#FFFFFF" } }).then(setQrSrc).catch(() => setQrSrc("")); }, [shareUrl]);
  useEffect(() => {
    if (typeof navigator === "undefined" || typeof navigator.share !== "function" || typeof navigator.canShare !== "function") return;
    try { setFileShareAvailable(navigator.canShare({ files: [new File([""], "ledger-story.png", { type: "image/png" })] })); } catch { setFileShareAvailable(false); }
  }, []);

  const exportStory = async () => {
    setBusy(true); setNotice("");
    try {
      const blob = await svgToPng({ data, template, qrSrc, shareUrl });
      const file = new File([blob], `ledger-story-${mode}.png`, { type: "image/png" });
      const canShareFile = fileShareAvailable && navigator.canShare({ files: [file] });
      if (canShareFile) {
        await navigator.share({ files: [file], title: "Ledger", text: "My progress in Ledger" });
      } else {
        const href = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = href; a.download = file.name; a.click(); URL.revokeObjectURL(href);
        if (fileShareAvailable) setNotice("File sharing is unavailable here. Story downloaded instead.");
      }
    } catch (error) { if (error?.name !== "AbortError") setNotice("Could not create the Story. Please retry."); }
    finally { setBusy(false); }
  };

  return <div role="dialog" aria-modal="true" aria-labelledby="ledger-stories-title" style={{ position: "fixed", inset: 0, zIndex: 200, background: "rgba(0,0,0,0.78)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20, overflow: "auto" }}>
    <div style={{ width: "min(1120px, 100%)", maxHeight: "96vh", overflow: "auto", background: COLORS.bg1, border: `1px solid ${COLORS.border}`, borderRadius: RADIUS.modal, boxShadow: elev("e4"), padding: 22 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
        <div><div id="ledger-stories-title" style={{ color: COLORS.text, fontFamily: FONTS.display, fontWeight: 800, fontSize: 24 }}>Ledger Stories</div><div style={{ color: COLORS.faint, fontSize: 12, marginTop: 3 }}>Turn the work into something worth sharing.</div></div>
        <button aria-label="Close Ledger Stories" onClick={onClose} style={{ color: COLORS.faint, background: "transparent", border: 0, cursor: "pointer" }}><X size={20} /></button>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "minmax(220px, 0.8fr) minmax(300px, 1fr)", gap: 24, alignItems: "start" }}>
        <div>
          <div style={{ color: COLORS.faint, fontFamily: FONTS.mono, fontSize: 10, letterSpacing: "0.16em", marginBottom: 8 }}>SELECT RECAP</div>
          <div style={{ display: "grid", gap: 8, marginBottom: 20 }}>{MODES.map(([id, label, sub]) => <button key={id} onClick={() => setMode(id)} aria-pressed={mode === id} style={{ textAlign: "left", padding: "13px 14px", borderRadius: 10, border: `1px solid ${mode === id ? COLORS.accentFocus : COLORS.border}`, background: mode === id ? hexToRgba(COLORS.accentFocus, 0.1) : COLORS.panel, color: COLORS.text, cursor: "pointer" }}><div style={{ fontWeight: 700 }}>{label}</div><div style={{ color: COLORS.faint, fontSize: 11, marginTop: 3 }}>{sub}</div></button>)}</div>
          <div style={{ color: COLORS.faint, fontFamily: FONTS.mono, fontSize: 10, letterSpacing: "0.16em", marginBottom: 8 }}>SELECT TEMPLATE</div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>{[["glass", "Glass"], ["minimal", "Minimal"], ["data", "Data"], ["dark", "Dark"], ["aurora", "Aurora"], ["academic", "Academic"]].map(([id, label]) => <button key={id} disabled={!['glass', 'minimal'].includes(id)} onClick={() => setTemplate(id)} aria-pressed={template === id} style={{ padding: "9px 12px", borderRadius: 8, border: `1px solid ${template === id ? COLORS.accentFocus : COLORS.border}`, background: template === id ? hexToRgba(COLORS.accentFocus, 0.1) : COLORS.panel, color: ['glass', 'minimal'].includes(id) ? COLORS.text : COLORS.faint, cursor: ['glass', 'minimal'].includes(id) ? "pointer" : "not-allowed", fontSize: 12 }}>{label}{!['glass', 'minimal'].includes(id) && <span style={{ display: "block", fontSize: 9, marginTop: 2 }}>Coming soon</span>}</button>)}</div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 24 }}><button disabled={busy} onClick={exportStory} aria-label={fileShareAvailable ? "Share Ledger Story" : "Download Ledger Story"} style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "11px 14px", borderRadius: 9, border: 0, background: COLORS.accentFocus, color: COLORS.bg, fontWeight: 800, cursor: busy ? "wait" : "pointer" }}>{busy ? <span aria-hidden="true" style={{ width: 14, height: 14, border: `2px solid ${hexToRgba(COLORS.bg, 0.32)}`, borderTopColor: COLORS.bg, borderRadius: "50%" }} /> : fileShareAvailable ? <Share2 size={15} /> : <Download size={15} />} {busy ? "Creating..." : fileShareAvailable ? "Share" : "Download"}</button></div>
          {notice && <div role="status" style={{ color: COLORS.faint, fontSize: 11, lineHeight: 1.5, marginTop: 12 }}>{notice}</div>}
          <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
            <a href={shareUrl} target="_blank" rel="noreferrer" style={{ display: "inline-flex", alignItems: "center", gap: 5, color: COLORS.accentFocus, fontSize: 11, marginTop: 18 }}>Visit Ledger <ExternalLink size={12} /></a>
            {hasDiscordInvite && (
              <a href={discordInviteUrl} target="_blank" rel="noopener noreferrer" aria-label={DISCORD_CTA_LABEL}
                style={{ display: "inline-flex", alignItems: "center", gap: 5, color: COLORS.accentFocus, fontSize: 11, marginTop: 18 }}>
                Join Ledger Discord <DiscordIcon size={11} />
              </a>
            )}
          </div>
        </div>
        <div style={{ display: "flex", justifyContent: "center", background: "#08090D", borderRadius: 14, padding: "18px 12px" }}><div style={{ width: "min(100%, 390px)", aspectRatio: "9 / 16", overflow: "hidden", borderRadius: 7, boxShadow: "0 20px 50px rgba(0,0,0,0.42)" }}><StorySvg data={data} template={template} qrSrc={qrSrc} shareUrl={shareUrl} /></div></div>
      </div>
    </div>
  </div>;
}
