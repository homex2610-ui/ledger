export function fmtTotal(min) {
  if (!min || min <= 0) return "0m";
  const h = Math.floor(min / 60);
  const m = Math.round(min % 60);
  return h ? `${h}h ${m}m` : `${m}m`;
}

export function computeRingSegments(entries, colors = []) {
  const total = entries.reduce((sum, e) => sum + (e.minutes || 0), 0);
  if (total <= 0) return { segments: [], isEmpty: true, total: 0 };

  const segColors = colors.length ? colors : ["#A89BFF", "#7FC8E8", "#FFA860"];
  let offset = 0;
  const circumference = 2 * Math.PI * 40;

  const segments = entries.map((entry, i) => {
    const fraction = entry.minutes / total;
    const dashLength = fraction * circumference;
    const color = segColors[i % segColors.length];
    const seg = {
      key: entry.subject,
      subject: entry.subject,
      minutes: entry.minutes,
      fraction,
      color,
      dashLength,
      dashOffset: offset,
      dashArray: `${dashLength} ${circumference}`,
    };
    offset += dashLength;
    return seg;
  });

  return { segments, isEmpty: false, total };
}