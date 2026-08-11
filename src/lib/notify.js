// Notification delivery. No service worker and no server: notifications can
// only fire while the app is open. When the browser Notification API is off
// (unsupported, unpermitted, or thrown), every call reports "inapp" so the
// app can surface the same message through its own quiet toast channel.

export function notifyCapable() {
  return typeof window !== "undefined" && "Notification" in window;
}

export function notifyPermission() {
  if (!notifyCapable()) return "unsupported";
  return Notification.permission;
}

export async function requestNotifyPermission() {
  if (!notifyCapable()) return "unsupported";
  if (Notification.permission === "default") {
    try { return await Notification.requestPermission(); } catch { return "denied"; }
  }
  return Notification.permission;
}

// Returns "native" when a real desktop notification was shown, "inapp" when
// the caller should fall back to the in-app toast.
export function sendNotification(title, body, tag) {
  if (!notifyCapable() || Notification.permission !== "granted") return "inapp";
  try {
    const n = new Notification(title, { body, tag: `ledger-${tag}`, silent: true });
    if (typeof n.close === "function") setTimeout(() => n.close(), 10000);
    return "native";
  } catch {
    return "inapp";
  }
}