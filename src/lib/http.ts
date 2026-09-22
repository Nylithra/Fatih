import { NextResponse } from "next/server";
import type { Cached } from "./cache";

const UA = "Mozilla/5.0 (compatible; GOKBERK-OSINT/0.1; +https://github.com/)";

export async function fetchWithTimeout(url: string, init: RequestInit & { timeoutMs?: number } = {}) {
  const { timeoutMs = 15000, headers, ...rest } = init;
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      ...rest,
      headers: { "User-Agent": UA, ...(headers ?? {}) },
      signal: ctrl.signal,
      cache: "no-store",
    });
    if (!res.ok) throw new Error(`${res.status} ${res.statusText} — ${url}`);
    return res;
  } finally {
    clearTimeout(t);
  }
}

export async function fetchJson<T = unknown>(url: string, init?: RequestInit & { timeoutMs?: number }): Promise<T> {
  const res = await fetchWithTimeout(url, init);
  return (await res.json()) as T;
}

export async function fetchText(url: string, init?: RequestInit & { timeoutMs?: number }): Promise<string> {
  const res = await fetchWithTimeout(url, init);
  return res.text();
}

/** Önbellekli sonucu standart zarf ile döndürür. */
export function envelope<T>(c: Cached<T>, extra: Record<string, unknown> = {}) {
  return NextResponse.json(
    { ok: true, fetchedAt: c.fetchedAt, stale: c.stale, ...extra, data: c.data },
    { headers: { "Cache-Control": "no-store" } },
  );
}

export function failure(err: unknown, status = 502) {
  const message = err instanceof Error ? err.message : String(err);
  return NextResponse.json({ ok: false, error: message }, { status });
}
