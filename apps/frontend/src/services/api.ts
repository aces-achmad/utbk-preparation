import type { ApiEnvelope } from "@utbk/shared/api";

import { appEnv } from "../lib/env";

export async function apiFetch<TData>(input: string, init?: RequestInit) {
  const isFormData = init?.body instanceof FormData;
  const response = await fetch(`${appEnv.VITE_API_BASE_PATH}${input}`, {
    credentials: "include",
    ...init,
    headers: isFormData
      ? init?.headers
      : {
          "content-type": "application/json",
          ...(init?.headers ?? {}),
        },
  });

  const payload = (await parseApiPayload<TData>(response)) as ApiEnvelope<TData> | null;

  if (!response.ok) {
    throw new Error(payload?.message ?? `Request failed with status ${response.status}.`);
  }

  if (!payload) {
    throw new Error("Response payload is empty.");
  }

  return payload;
}

async function parseApiPayload<TData>(response: Response) {
  const contentType = response.headers.get("content-type") ?? "";

  if (contentType.includes("application/json")) {
    return (await response.json()) as ApiEnvelope<TData>;
  }

  const text = await response.text();

  if (!text.trim()) {
    return null;
  }

  try {
    return JSON.parse(text) as ApiEnvelope<TData>;
  } catch {
    return {
      success: false,
      message: text.slice(0, 240),
      data: null as TData,
    } satisfies ApiEnvelope<TData>;
  }
}
