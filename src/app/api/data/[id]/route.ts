import { loadDataset } from "@/catalog/loaders";
import { envelope, failure } from "@/lib/http";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, ctx: RouteContext<"/api/data/[id]">) {
  const { id } = await ctx.params;
  const p = loadDataset(id);
  if (!p) return failure(new Error(`Bilinmeyen veri seti: ${id}`), 404);
  try {
    return envelope(await p);
  } catch (e) {
    return failure(e);
  }
}
