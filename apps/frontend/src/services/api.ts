import type { ApiEnvelope } from "@utbk/shared/api";

import { appEnv } from "../lib/env";

export async function apiFetch<TData>(input: string, init?: RequestInit) {
  const response = await fetch(`${appEnv.VITE_API_BASE_PATH}${input}`, {
    credentials: "include",
    ...init,
    headers: {
      "content-type": "application/json",
      ...(init?.headers ?? {}),
    },
  });

  const payload = (await response.json()) as ApiEnvelope<TData>;

  if (!response.ok) {
    throw new Error(payload.message ?? "Request failed.");
  }

  return payload;
}
