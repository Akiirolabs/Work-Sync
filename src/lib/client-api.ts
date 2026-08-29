"use client";

export class ApiError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
    this.name = "ApiError";
  }
}

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    ...init,
    headers: {
      "content-type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
  const data = await res.json();
  if (!res.ok) {
    const message = res.status === 401
      ? "Sign in to continue."
      : typeof data?.error === "string" ? data.error : res.statusText;
    throw new ApiError(message, res.status);
  }
  return data as T;
}

export { api };
