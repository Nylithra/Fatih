/**
 * Basit bellek içi TTL önbelleği.
 * Aynı anahtar için eşzamanlı istekler tek bir upstream çağrısında birleştirilir,
 * upstream hata verirse (varsa) son başarılı veri "bayat" olarak döndürülür.
 */

type Entry<T> = { value: T; expires: number; fetchedAt: number };

const store = new Map<string, Entry<unknown>>();
const inflight = new Map<string, Promise<unknown>>();

export type Cached<T> = { data: T; fetchedAt: number; stale: boolean };

export async function cached<T>(key: string, ttlMs: number, loader: () => Promise<T>): Promise<Cached<T>> {
  const now = Date.now();
  const hit = store.get(key) as Entry<T> | undefined;
  if (hit && hit.expires > now) return { data: hit.value, fetchedAt: hit.fetchedAt, stale: false };

  let p = inflight.get(key) as Promise<T> | undefined;
  if (!p) {
    p = loader();
    inflight.set(key, p);
  }
  try {
    const value = await p;
    const entry: Entry<T> = { value, expires: Date.now() + ttlMs, fetchedAt: Date.now() };
    store.set(key, entry);
    return { data: value, fetchedAt: entry.fetchedAt, stale: false };
  } catch (err) {
    if (hit) return { data: hit.value, fetchedAt: hit.fetchedAt, stale: true };
    throw err;
  } finally {
    inflight.delete(key);
  }
}
