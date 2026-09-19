import { XMLParser } from "fast-xml-parser";
import { cached } from "@/lib/cache";
import { envelope, failure, fetchText } from "@/lib/http";
import { extractProvinces } from "@/lib/geoparse";
import type { NewsItem } from "@/lib/types";

export const dynamic = "force-dynamic";

const FEEDS: { source: string; url: string }[] = [
  { source: "TRT Haber", url: "https://www.trthaber.com/sondakika.rss" },
  { source: "BBC Türkçe", url: "https://feeds.bbci.co.uk/turkce/rss.xml" },
  { source: "DW Türkçe", url: "https://rss.dw.com/rdf/rss-tur-all" },
  { source: "CNN Türk", url: "https://www.cnnturk.com/feed/rss/all/news" },
  { source: "Hürriyet", url: "https://www.hurriyet.com.tr/rss/anasayfa" },
  { source: "Sözcü", url: "https://www.sozcu.com.tr/feeds-rss-category-sozcu" },
  { source: "Habertürk", url: "https://www.haberturk.com/rss" },
];

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@",
  cdataPropName: false,
  processEntities: true,
  htmlEntities: true,
});

type Obj = Record<string, unknown>;

const asArray = <T,>(x: T | T[] | undefined): T[] => (x == null ? [] : Array.isArray(x) ? x : [x]);

function text(x: unknown): string {
  if (x == null) return "";
  if (typeof x === "string" || typeof x === "number") return String(x);
  if (typeof x === "object" && "#text" in (x as Obj)) return String((x as Obj)["#text"]);
  return "";
}

function stripHtml(s: string) {
  return s
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function pickImage(it: Obj): string | undefined {
  const enc = it.enclosure as Obj | undefined;
  if (enc && typeof enc["@url"] === "string" && String(enc["@type"] ?? "image").startsWith("image")) return enc["@url"] as string;
  const media = (it["media:content"] ?? it["media:thumbnail"]) as Obj | Obj[] | undefined;
  const m = asArray(media)[0];
  if (m && typeof m["@url"] === "string") return m["@url"] as string;
  if (typeof it.imageUrl === "string") return it.imageUrl;
  if (typeof it.image === "string") return it.image;
  return undefined;
}

function hash(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  return (h >>> 0).toString(36);
}

async function loadFeed(source: string, url: string): Promise<NewsItem[]> {
  const xml = await fetchText(url, { timeoutMs: 12000 });
  const doc = parser.parse(xml) as Obj;
  const rss = doc.rss as Obj | undefined;
  const rdf = doc["rdf:RDF"] as Obj | undefined;
  const atom = doc.feed as Obj | undefined;
  const items: Obj[] = asArray(
    ((rss?.channel as Obj | undefined)?.item ?? rdf?.item ?? atom?.entry) as Obj | Obj[] | undefined,
  );

  return items.slice(0, 60).flatMap((it) => {
    const title = stripHtml(text(it.title));
    const linkRaw = it.link;
    const link =
      typeof linkRaw === "string" ? linkRaw : text(linkRaw) || String((asArray(linkRaw as Obj[])[0] ?? {})["@href"] ?? "");
    if (!title || !link) return [];
    const summary = stripHtml(text(it.description ?? it.summary ?? it["content:encoded"])).slice(0, 400);
    const dateStr = text(it.pubDate ?? it["dc:date"] ?? it.published ?? it.updated);
    const d = dateStr ? new Date(dateStr) : new Date();
    return [
      {
        id: hash(link),
        source,
        title,
        summary: summary || undefined,
        link: link.trim(),
        image: pickImage(it),
        published: (isNaN(d.getTime()) ? new Date() : d).toISOString(),
        provinces: extractProvinces(`${title} ${summary}`),
      },
    ];
  });
}

export async function GET() {
  try {
    const c = await cached("news", 3 * 60_000, async () => {
      const results = await Promise.allSettled(FEEDS.map((f) => loadFeed(f.source, f.url)));
      const sources = FEEDS.map((f, i) => ({
        source: f.source,
        ok: results[i].status === "fulfilled",
        count: results[i].status === "fulfilled" ? (results[i] as PromiseFulfilledResult<NewsItem[]>).value.length : 0,
      }));
      const seen = new Set<string>();
      const items = results
        .flatMap((r) => (r.status === "fulfilled" ? r.value : []))
        .filter((n) => (seen.has(n.id) ? false : (seen.add(n.id), true)))
        .sort((a, b) => b.published.localeCompare(a.published));
      if (!items.length) throw new Error("Hiçbir haber kaynağına erişilemedi");
      return { sources, items };
    });
    return envelope(c);
  } catch (e) {
    return failure(e);
  }
}
