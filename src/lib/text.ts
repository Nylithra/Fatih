/** Türkçe metinleri aksan/büyük-küçük harf duyarsız karşılaştırmak için sadeleştirir. */
export function fold(s: string) {
  return s
    .toLocaleLowerCase("tr-TR")
    .replace(/ı/g, "i")
    .replace(/ğ/g, "g")
    .replace(/ü/g, "u")
    .replace(/ş/g, "s")
    .replace(/ö/g, "o")
    .replace(/ç/g, "c")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** Eşleşme puanı: tam eşleşme > önek > kelime başı > içerir. Eşleşmezse 0. */
export function matchScore(haystack: string, needle: string) {
  if (!needle) return 0;
  const h = fold(haystack);
  if (h === needle) return 100;
  if (h.startsWith(needle)) return 80;
  if (h.includes(" " + needle)) return 60;
  if (h.includes(needle)) return 40;
  return 0;
}
