import data from "@/data/cameras.json";

export type Camera = {
  id: string;
  city: string;
  plate: number;
  name: string;
  provider: string;
  /** hls: Gökberk içinde oynatılır · embed: belediyenin resmî oynatıcısı gömülür · page: yalnızca resmî sayfaya bağlantı */
  kind: "hls" | "embed" | "page";
  stream: string | null;
  embed?: string | null;
  category?: string;
  approx?: boolean;
  /** Ör. yayının geçici olarak kapatıldığına dair belediye açıklaması */
  note?: string;
  page: string;
  lat: number | null;
  lon: number | null;
};

export const CAMERAS = data as Camera[];
export const isWatchable = (c: Camera) => (c.kind === "hls" && !!c.stream) || (c.kind === "embed" && !!c.embed);

export const CAMERA_BY_ID = new Map(CAMERAS.map((c) => [c.id, c]));
