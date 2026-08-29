"use client";

export const ACTIVE_STORAGE_USER_KEY = "work-sync:active-user";

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
