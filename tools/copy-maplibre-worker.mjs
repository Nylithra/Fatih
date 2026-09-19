// MapLibre GL v6 web worker'ını ayrı bir ES modülü olarak yükler.
// Paketleyici bu dosyaları taşımadığı için public/ altına kopyalanır ve
// istemcide setWorkerUrl("/vendor/maplibre/maplibre-gl-worker.mjs") ile gösterilir.
import { copyFileSync, mkdirSync } from "node:fs";

const src = new URL("../node_modules/maplibre-gl/dist/", import.meta.url);
const dst = new URL("../public/vendor/maplibre/", import.meta.url);
mkdirSync(dst, { recursive: true });
for (const f of ["maplibre-gl-worker.mjs", "maplibre-gl-shared.mjs"]) copyFileSync(new URL(f, src), new URL(f, dst));
console.log("MapLibre worker kopyalandı → public/vendor/maplibre/");
