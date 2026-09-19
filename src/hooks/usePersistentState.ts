"use client";

import { useEffect, useState } from "react";

/**
 * Tarayıcıda (localStorage) hatırlanan durum. Depolama erişilemezse (gizli pencere vb.)
 * sessizce bellek içi duruma düşer. İlk render sunucuyla uyumlu olsun diye değer mount sonrası okunur;
 * kayıtlı değer uygulanmadan önce hiçbir şey yazılmaz (Strict Mode'daki çift efekt çalışmasına karşı).
 */
export function usePersistentState<T>(key: string, initial: T) {
  const [value, setValue] = useState<T>(initial);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(`fatih:${key}`);
      if (raw) {
        const saved = JSON.parse(raw) as T;
        setValue((v) => (typeof v === "object" && v && !Array.isArray(v) ? { ...v, ...saved } : saved));
      }
    } catch {
      /* depolama yok ya da bozuk kayıt */
    }
    setHydrated(true);
  }, [key]);

  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(`fatih:${key}`, JSON.stringify(value));
    } catch {
      /* depolama yok */
    }
  }, [key, value, hydrated]);

  return [value, setValue] as const;
}
