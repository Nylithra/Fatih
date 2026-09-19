import { PROVINCES } from "@/data/provinces";

/**
 * Haber başlık/özetlerinden il adı çıkarımı (basit coğrafi ayrıştırma).
 * Türkçe ekleri ('da, 'nın, 'ya...) destekler. Genel anlamı da olan il adları
 * (Ordu = ordu, Ağrı = ağrı, Van, Muş, Batman) yalnızca kesme işaretiyle ya da
 * "ili/valiliği/belediyesi" gibi bir niteleyiciyle birlikte geçtiğinde eşleşir.
 */

const AMBIGUOUS = new Set([52, 4, 65, 49, 72]);
const QUALIFIER = "(?:\\s+(?:il|ili|ilinde|ilçesi|ilçesinde|valiliği|valisi|belediyesi|merkez|merkezde|kırsalında))";

const ALIASES: Record<number, string[]> = {
  3: ["Afyon"],
  27: ["Antep"],
  33: ["İçel"],
  46: ["Maraş"],
  63: ["Urfa"],
};

type Matcher = { plate: number; re: RegExp };

function esc(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

const MATCHERS: Matcher[] = PROVINCES.flatMap((p) => {
  const names = [p.name, ...(ALIASES[p.plate] ?? [])];
  return names.flatMap((n) => {
    const upper = n.toLocaleUpperCase("tr-TR");
    const forms = `(?:${esc(n)}|${esc(upper)})`;
    const tail = AMBIGUOUS.has(p.plate)
      ? `(?:['’]\\p{L}+|${QUALIFIER})`
      : `(?:['’]\\p{L}*)?(?![\\p{L}])`;
    return [{ plate: p.plate, re: new RegExp(`(?<![\\p{L}])${forms}${tail}`, "u") }];
  });
});

export function extractProvinces(text: string): number[] {
  const found = new Set<number>();
  for (const m of MATCHERS) if (m.re.test(text)) found.add(m.plate);
  return [...found];
}
