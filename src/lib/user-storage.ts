"use client";

export const ACTIVE_STORAGE_USER_KEY = "work-sync:active-user";

const TRANSIENT_KEYS = new Set([
  "work-sync:ao-table-command",
  "work-sync:ao-todo-command",
  "work-sync:ao-workspace-text",
  "work-sync:ao-workspace-open",
]);

let syncTimer: ReturnType<typeof setTimeout> | null = null;
let lastUploaded = "";
let lastUploadedUser = "";

export function collectUserStorage(userId: string): Record<string, string> {
  const suffix = `:user:${userId}`;
  const entries: Record<string, string> = {};
  for (let index = 0; index < localStorage.length; index += 1) {
    const key = localStorage.key(index);
    if (!key?.endsWith(suffix)) continue;
    const baseKey = key.slice(0, -suffix.length);
    if (TRANSIENT_KEYS.has(baseKey)) continue;
    const value = localStorage.getItem(key);
    if (value !== null) entries[baseKey] = value;
  }
  return entries;
}

function applyUserStorage(userId: string, entries: Record<string, string>): void {
  const suffix = `:user:${userId}`;
  for (let index = localStorage.length - 1; index >= 0; index -= 1) {
    const key = localStorage.key(index);
    if (!key?.endsWith(suffix)) continue;
    const baseKey = key.slice(0, -suffix.length);
    if (!TRANSIENT_KEYS.has(baseKey)) localStorage.removeItem(key);
  }
  for (const [baseKey, value] of Object.entries(entries)) {
    if (!TRANSIENT_KEYS.has(baseKey)) localStorage.setItem(`${baseKey}${suffix}`, value);
  }
}

async function uploadUserStorage(userId: string): Promise<boolean> {
  const entries = collectUserStorage(userId);
  const serialized = JSON.stringify(entries);
  if (userId === lastUploadedUser && serialized === lastUploaded) return true;
  try {
    const response = await fetch("/api/v1/user-state", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ entries }),
      keepalive: true,
    });
    if (!response.ok) return false;
    lastUploadedUser = userId;
    lastUploaded = serialized;
    return true;
  } catch {
    // The development server can briefly disappear during a rebuild. Keep the
    // local state and retry quietly instead of producing an unhandled rejection.
    return false;
  }
}

export async function hydrateUserStorage(userId: string, preserveLocalOnly = false): Promise<boolean> {
  const response = await fetch("/api/v1/user-state", { cache: "no-store" });
  if (!response.ok) return false;
  const payload = await response.json() as { entries?: Record<string, string>; updatedAt?: string | null };
  const remote = payload.entries && typeof payload.entries === "object" ? payload.entries : {};
  if (payload.updatedAt || Object.keys(remote).length) {
    const local = collectUserStorage(userId);
    const before = JSON.stringify(local);
    applyUserStorage(userId, preserveLocalOnly ? { ...local, ...remote } : remote);
    const hydrated = JSON.stringify(collectUserStorage(userId));
    if (preserveLocalOnly && hydrated !== JSON.stringify(remote)) {
      lastUploadedUser = "";
      await uploadUserStorage(userId);
    } else {
      lastUploadedUser = userId;
      lastUploaded = hydrated;
    }
    return before !== hydrated;
  } else {
    await uploadUserStorage(userId);
    return false;
  }
}

export function startUserStorageSync(userId: string): () => void {
  let stopped = false;
  let retryDelay = 1_500;
  const schedule = (delay = retryDelay) => {
    if (stopped) return;
    if (syncTimer) clearTimeout(syncTimer);
    syncTimer = setTimeout(() => {
      void uploadUserStorage(userId).then((uploaded) => {
        retryDelay = uploaded ? 1_500 : Math.min(retryDelay * 2, 30_000);
        schedule();
      });
    }, delay);
  };
  schedule();
  const flush = () => { void uploadUserStorage(userId); };
  const refresh = () => { void hydrateUserStorage(userId).then((changed) => { if (changed) window.dispatchEvent(new Event("work-sync:user-state-updated")); }); };
  const refreshTimer = window.setInterval(refresh, 2_000);
  const onVisibility = () => { if (document.visibilityState === "visible") refresh(); };
  window.addEventListener("pagehide", flush);
  document.addEventListener("visibilitychange", onVisibility);
  return () => {
    stopped = true;
    if (syncTimer) clearTimeout(syncTimer);
    window.clearInterval(refreshTimer);
    window.removeEventListener("pagehide", flush);
    document.removeEventListener("visibilitychange", onVisibility);
  };
}

export function setActiveStorageUser(userId: string | null): boolean {
  const previous = localStorage.getItem(ACTIVE_STORAGE_USER_KEY);
  if (userId && previous !== userId) {
    const signedOutSuffix = ":user:signed-out";
    for (let index = localStorage.length - 1; index >= 0; index -= 1) {
      const key = localStorage.key(index);
      if (!key?.endsWith(signedOutSuffix)) continue;
      const target = `${key.slice(0, -signedOutSuffix.length)}:user:${userId}`;
      if (localStorage.getItem(target) === null) localStorage.setItem(target, localStorage.getItem(key) ?? "");
      localStorage.removeItem(key);
    }
  }
  if (userId) localStorage.setItem(ACTIVE_STORAGE_USER_KEY, userId);
  else localStorage.removeItem(ACTIVE_STORAGE_USER_KEY);
  return previous !== userId;
}

export function userStorageKey(baseKey: string): string {
  const userId = localStorage.getItem(ACTIVE_STORAGE_USER_KEY);
  const scoped = `${baseKey}:user:${userId ?? "signed-out"}`;

  // Preserve pre-account data in the current scope. A later login transfers a
  // signed-out scope to that user, without exposing another user's namespace.
  const legacy = localStorage.getItem(baseKey);
  if (legacy !== null) {
    localStorage.setItem(scoped, legacy);
    localStorage.removeItem(baseKey);
  }

  return scoped;
}
