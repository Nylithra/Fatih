import { XMLParser } from "fast-xml-parser";
import { cached } from "@/lib/cache";
import { envelope, failure, fetchText } from "@/lib/http";
import type { Rate } from "@/lib/types";

export const dynamic = "force-dynamic";

const WANTED = ["USD", "EUR", "GBP", "CHF", "JPY", "SAR", "RUB", "CNY"];

type TcmbCurrency = {
  "@Kod": string;
  Unit: number;
  Isim: string;
  ForexBuying?: number | string;
  ForexSelling?: number | string;
};

export async function GET() {
  try {
    const c = await cached("tcmb", 30 * 60_000, async () => {
      const xml = await fetchText("https://www.tcmb.gov.tr/kurlar/today.xml");
      const doc = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: "@" }).parse(xml);
      const root = doc.Tarih_Date;
      const list: TcmbCurrency[] = Array.isArray(root.Currency) ? root.Currency : [root.Currency];
      const num = (v: unknown, unit: number) => (v === "" || v == null ? null : Number(v) / (unit || 1));
      const rates: Rate[] = WANTED.flatMap((code) => {
        const cur = list.find((x) => x["@Kod"] === code);
        if (!cur) return [];
        return [{ code, name: cur.Isim, buy: num(cur.ForexBuying, cur.Unit), sell: num(cur.ForexSelling, cur.Unit) }];
      });
      return { date: root["@Tarih"] as string, bulletin: root["@Bulten_No"] as string, rates };
    });
    return envelope(c);
  } catch (e) {
    return failure(e);
  }
}
