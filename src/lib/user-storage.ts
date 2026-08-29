"use client";

export const ACTIVE_STORAGE_USER_KEY = "work-sync:active-user";

export function setActiveStorageUser(userId: string | null): boolean {
  const previous = localStorage.getItem(ACTIVE_STORAGE_USER_KEY);
  if (userId) localStorage.setItem(ACTIVE_STORAGE_USER_KEY, userId);
  else localStorage.removeItem(ACTIVE_STORAGE_USER_KEY);
  return previous !== userId;
}

export function userStorageKey(baseKey: string): string {
  const userId = localStorage.getItem(ACTIVE_STORAGE_USER_KEY);
  const scoped = `${baseKey}:user:${userId ?? "signed-out"}`;

  // Preserve pre-account data by assigning it once to the first signed-in user.
  if (userId && localStorage.getItem(scoped) === null) {
    const legacy = localStorage.getItem(baseKey);
    if (legacy !== null) {
      localStorage.setItem(scoped, legacy);
      localStorage.removeItem(baseKey);
    }
  }

  return scoped;
}
