"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useState } from "react";
import { usePoll } from "@/hooks/usePoll";
import { useDatasets } from "@/hooks/useDatasets";
import { usePersistentState } from "@/hooks/usePersistentState";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { ChevronLeft } from "lucide-react";
import { DEFAULT_LAYERS, LAYERS, type Choropleth, type LayerId, type Selection } from "@/lib/layers";
import { buildAlerts } from "@/lib/alerts";
import { DATASETS, DATASET_BY_ID } from "@/catalog/meta";
import { CORE_FIELDS } from "@/lib/coreFields";
import { DEFAULT_STYLE, activeCount, applyFilters, objGetter, propGetter, type LayerSettings } from "@/lib/filters";
import type { Aircraft, Earthquake, FireEvent, NewsItem, ProvinceWeather, Rate, SpaceWeather } from "@/lib/types";
import TopBar from "./TopBar";
import LayerPanel from "./LayerPanel";
import SidePanel from "./SidePanel";
import DetailCard from "./DetailCard";
import StatusBar from "./StatusBar";
import Rail, { HelpCard } from "./Rail";
import SearchBox, { type Hit } from "./SearchBox";
import FilterPanel, { type FilterLayer } from "./FilterPanel";
import LineTrackerPanel, { useLineTrack, type LineTrack } from "./LineTracker";
import { CameraModal, CameraWall } from "./camera/CameraViewer";
import { CAMERA_BY_ID } from "./camera/cameras";

const MapView = dynamic(() => import("./MapView"), { ssr: false, loading: () => <div className="map map-loading">Harita yükleniyor…</div> });

export type Feeds = ReturnType<typeof useFeeds>;

function useFeeds(quakeDays: number) {
  const quakes = usePoll<{ provider: string; events: Earthquake[] }>(`/api/earthquakes?days=${quakeDays}`, 60_000);
  const flights = usePoll<{ provider: string; aircraft: Aircraft[] }>("/api/flights", 20_000);
  const news = usePoll<{ sources: { source: string; ok: boolean; count: number }[]; items: NewsItem[] }>("/api/news", 180_000);
  const fires = usePoll<{ firmsMode: "api-48h" | "public-24h"; events: FireEvent[] }>("/api/fires", 900_000);
  const weather = usePoll<ProvinceWeather[]>("/api/weather", 900_000);
  const markets = usePoll<{ date: string; rates: Rate[] }>("/api/markets", 1_800_000);
  const space = usePoll<SpaceWeather>("/api/space", 15_000);
  return { quakes, flights, news, fires, weather, markets, space };
}

const EMPTY: never[] = [];
const DEFAULT_DATASETS: Record<string, boolean> = { "transit-lines": true, cameras: true };
const CORE_TITLES: Record<keyof typeof CORE_FIELDS, string> = { quakes: "Depremler", flights: "Hava trafiği", fires: "Yangın sıcak noktaları", news: "Haberler" };
const CORE_COLORS: Record<keyof typeof CORE_FIELDS, string> = { quakes: "var(--c-quake)", flights: "var(--c-flight)", fires: "var(--c-fire)", news: "var(--c-news)" };

export default function Dashboard() {
  const [layers, setLayers] = usePersistentState<Record<LayerId, boolean>>("layers", DEFAULT_LAYERS);
  const [datasetsOn, setDatasetsOn] = usePersistentState<Record<string, boolean>>("datasets", DEFAULT_DATASETS);
  const [settings, setSettings] = usePersistentState<Record<string, LayerSettings>>("settings", {});
  const [choropleth, setChoropleth] = useState<Choropleth>("none");
  const [quakeDays, setQuakeDays] = useState(2);
  const [selection, setSelection] = useState<Selection>(null);
  const [focus, setFocus] = useState<{ lon: number; lat: number; zoom?: number; seq: number } | null>(null);
  const [cursor, setCursor] = useState<{ lon: number; lat: number; zoom: number } | null>(null);
  const [leftOpen, setLeftOpen] = useState(true);
  const [leftTab, setLeftTab] = useState<"layers" | "filters">("layers");
  const [rightOpen, setRightOpen] = useState(true);
  const [helpOpen, setHelpOpen] = useState(false);
  const [fitSeq, setFitSeq] = useState(0);
  const isMobile = useMediaQuery("(max-width: 820px)");
  const [minMag, setMinMag] = useState(0);
  const [track, setTrack] = useState<LineTrack | null>(null);
  const [pin, setPin] = useState<{ lon: number; lat: number; label: string } | null>(null);
  const [camera, setCamera] = useState<string | null>(null);
  const [wall, setWall] = usePersistentState<string[]>("wall", []);
  const [wallOpen, setWallOpen] = useState(false);

  const feeds = useFeeds(quakeDays);
  const datasetState = useDatasets(datasetsOn);
  const lineState = useLineTrack(track);

  // ---- Çekirdek katmanlar + filtreler ----
  const allQuakes = feeds.quakes.data?.events ?? EMPTY;
  const allFlights = feeds.flights.data?.aircraft ?? EMPTY;
  const allNews = feeds.news.data?.items ?? EMPTY;
  const allFires = feeds.fires.data?.events ?? EMPTY;
  const weather = feeds.weather.data ?? EMPTY;

  const quakes = useMemo(
    () => applyFilters(minMag > 0 ? allQuakes.filter((q) => q.mag >= minMag) : allQuakes, CORE_FIELDS.quakes, settings.quakes, objGetter),
    [allQuakes, minMag, settings.quakes],
  );
  const flights = useMemo(() => applyFilters(allFlights, CORE_FIELDS.flights, settings.flights, objGetter), [allFlights, settings.flights]);
  const news = useMemo(() => applyFilters(allNews, CORE_FIELDS.news, settings.news, objGetter), [allNews, settings.news]);
  const fires = useMemo(() => applyFilters(allFires, CORE_FIELDS.fires, settings.fires, objGetter), [allFires, settings.fires]);

  // ---- Katalog veri setleri + filtreler ----
  const datasets = useMemo(() => {
    const out: Record<string, GeoJSON.FeatureCollection | undefined> = {};
    for (const d of DATASETS) {
      const fc = datasetState[d.id]?.fc;
      if (!fc) continue;
      const s = settings[d.id];
      out[d.id] = s && activeCount(s) ? { type: "FeatureCollection", features: applyFilters(fc.features, d.fields, s, propGetter) } : fc;
    }
    return out;
  }, [datasetState, settings]);

  const styles = useMemo(() => Object.fromEntries(Object.entries(settings).map(([k, v]) => [k, v.style])), [settings]);

  const alerts = useMemo(
    () => buildAlerts({ quakes: allQuakes, flights: allFlights, fires: allFires, weather, space: feeds.space.data }),
    [allQuakes, allFlights, allFires, weather, feeds.space.data],
  );

  // ---- Eylemler ----
  const flyTo = useCallback((lon: number, lat: number, zoom?: number) => {
    setFocus((f) => ({ lon, lat, zoom, seq: (f?.seq ?? 0) + 1 }));
  }, []);

  const select = useCallback(
    (s: Selection, fly = false) => {
      setSelection(s);
      if (fly && s && "item" in s) flyTo(s.item.lon, s.item.lat, 8);
    },
    [flyTo],
  );

  const toggleDataset = useCallback((id: string) => setDatasetsOn((m) => ({ ...m, [id]: !m[id] })), [setDatasetsOn]);
  const updateSettings = useCallback(
    (key: string, fn: (s: LayerSettings) => LayerSettings) =>
      setSettings((all) => ({ ...all, [key]: fn(all[key] ?? { filters: {}, style: { ...DEFAULT_STYLE } }) })),
    [setSettings],
  );
  const resetSettings = useCallback(
    (key?: string) =>
      setSettings((all) => {
        if (!key) return Object.fromEntries(Object.entries(all).map(([k, v]) => [k, { ...v, filters: {} }]));
        return { ...all, [key]: { ...(all[key] ?? { style: { ...DEFAULT_STYLE } }), filters: {} } };
      }),
    [setSettings],
  );

  const startTrack = useCallback((t: LineTrack) => {
    setTrack(t);
    setPin(null);
  }, []);

  const onPick = useCallback(
    (h: Hit) => {
      switch (h.kind) {
        case "province":
          setSelection({ kind: "province", plate: h.ref as number });
          setPin(null);
          if (h.lat != null && h.lon != null) flyTo(h.lon, h.lat, 7.5);
          return;
        case "line":
          if ("city" in h && h.city && h.code) startTrack({ city: h.city, code: h.code });
          return;
        case "camera":
          setCamera(h.id);
          if (h.lat != null && h.lon != null) flyTo(h.lon, h.lat, 14);
          return;
        case "flight":
          select({ kind: "flight", item: h.ref as Aircraft }, true);
          return;
        case "quake":
          select({ kind: "quake", item: h.ref as Earthquake }, true);
          return;
        case "news":
          window.open((h.ref as NewsItem).link, "_blank", "noopener,noreferrer");
          return;
        default:
          if ("dataset" in h && h.dataset) setDatasetsOn((m) => ({ ...m, [h.dataset!]: true }));
          if (h.lat != null && h.lon != null) {
            setPin({ lon: h.lon, lat: h.lat, label: h.title });
            flyTo(h.lon, h.lat, h.kind === "district" ? 11 : 16);
          }
      }
    },
    [flyTo, select, startTrack, setDatasetsOn],
  );

  // Mobilde çekmeceler alt sayfa olarak açılır; başlangıçta kapalı ve aynı anda yalnızca biri açık
  useEffect(() => {
    if (isMobile) {
      setLeftOpen(false);
      setRightOpen(false);
    }
  }, [isMobile]);

  const openLeft = useCallback(
    (tab: "layers" | "filters") => {
      setLeftOpen((open) => !(open && leftTab === tab));
      setLeftTab(tab);
      if (isMobile) setRightOpen(false);
    },
    [leftTab, isMobile],
  );
  const toggleRight = useCallback(() => {
    setRightOpen((v) => !v);
    if (isMobile) setLeftOpen(false);
  }, [isMobile]);

  // Klavye kısayolları
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLSelectElement || e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === "Escape") {
        setSelection(null);
        setPin(null);
        return;
      }
      const def = LAYERS.find((l) => l.key && l.key.toLowerCase() === e.key.toLocaleLowerCase("tr-TR"));
      if (def) setLayers((L) => ({ ...L, [def.id]: !L[def.id] }));
      if (e.key.toLocaleLowerCase("tr-TR") === "k") toggleDataset("cameras");
      if (e.key.toLocaleLowerCase("tr-TR") === "o") toggleDataset("iett-buses");
      if (e.key.toLocaleLowerCase("tr-TR") === "r") toggleDataset("transit-lines");
      if (e.key === "[") setLeftOpen((v) => !v);
      if (e.key === "]") setRightOpen((v) => !v);
      if (e.key === "?") setHelpOpen((v) => !v);
      if (e.key === "0") setFitSeq((n) => n + 1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [setLayers, toggleDataset]);

  // ---- Filtre paneli katman listesi ----
  const filterLayers: FilterLayer[] = useMemo(() => {
    const core = (Object.keys(CORE_FIELDS) as (keyof typeof CORE_FIELDS)[]).map<FilterLayer>((k) => {
      const items = { quakes: allQuakes, flights: allFlights, fires: allFires, news: allNews }[k] as unknown[];
      const shown = { quakes: quakes.length, flights: flights.length, fires: fires.length, news: news.length }[k];
      return {
        key: k,
        title: CORE_TITLES[k],
        group: "Canlı katmanlar",
        color: CORE_COLORS[k],
        fields: CORE_FIELDS[k],
        items,
        get: objGetter,
        shown,
        visible: layers[k],
        setVisible: (v) => setLayers((L) => ({ ...L, [k]: v })),
      };
    });
    const cat = DATASETS.map<FilterLayer>((d) => ({
      key: d.id,
      title: d.title,
      group: `${d.category}`,
      color: d.color,
      fields: d.fields,
      items: (datasetState[d.id]?.fc?.features ?? EMPTY) as unknown[],
      get: propGetter as (i: unknown, k: string) => unknown,
      shown: datasets[d.id]?.features.length ?? 0,
      visible: Boolean(datasetsOn[d.id]),
      setVisible: (v) => setDatasetsOn((m) => ({ ...m, [d.id]: v })),
    }));
    return [...core, ...cat];
  }, [allQuakes, allFlights, allFires, allNews, quakes, flights, fires, news, layers, setLayers, datasetState, datasets, datasetsOn, setDatasetsOn]);

  const filterCount = Object.values(settings).reduce((n, s) => n + activeCount(s), 0);
  const datasetShown = Object.fromEntries(Object.entries(datasets).map(([k, v]) => [k, v?.features.length ?? 0]));

  const counts: Partial<Record<LayerId, number>> = {
    quakes: quakes.length,
    flights: flights.length,
    news: news.filter((n) => n.provinces.length).length,
    fires: fires.length,
    weather: weather.length,
  };

  const cam = camera ? CAMERA_BY_ID.get(camera) : undefined;
  const addToWall = (id: string) => setWall((w) => (w.includes(id) ? w : [...w, id]));

  const layerPanel = (
    <LayerPanel
      layers={layers}
      setLayers={setLayers}
      counts={counts}
      choropleth={choropleth}
      setChoropleth={setChoropleth}
      quakeDays={quakeDays}
      setQuakeDays={setQuakeDays}
      minMag={minMag}
      setMinMag={setMinMag}
      feeds={feeds}
      datasetsOn={datasetsOn}
      toggleDataset={toggleDataset}
      datasetState={datasetState}
      datasetShown={datasetShown}
    />
  );

  return (
    <div className="app">
      <TopBar
        feeds={feeds}
        alertCount={alerts.filter((a) => a.level !== "info").length}
        onAlerts={() => {
          setRightOpen(true);
          if (isMobile) setLeftOpen(false);
        }}
        search={<SearchBox flights={allFlights} quakes={allQuakes} news={allNews} onPick={onPick} />}
      />
      <main className={`shell ${leftOpen ? "left-open" : ""} ${rightOpen ? "right-open" : ""}`}>
        <Rail
          leftOpen={leftOpen}
          leftTab={leftTab}
          rightOpen={rightOpen}
          filterCount={filterCount}
          wallCount={wall.length}
          onLeft={openLeft}
          onRight={toggleRight}
          onWall={() => setWallOpen(true)}
          onFit={() => setFitSeq((n) => n + 1)}
          onHelp={() => setHelpOpen((v) => !v)}
        />

        {leftOpen && (
          <aside className="drawer drawer-left" aria-label={leftTab === "layers" ? "Katmanlar" : "Filtreler"}>
            <div className="drawer-head">
              <div className="seg drawer-switch" role="tablist">
                <button role="tab" aria-selected={leftTab === "layers"} className={leftTab === "layers" ? "on" : ""} onClick={() => setLeftTab("layers")}>
                  Katmanlar
                </button>
                <button role="tab" aria-selected={leftTab === "filters"} className={leftTab === "filters" ? "on" : ""} onClick={() => setLeftTab("filters")}>
                  Filtreler {filterCount > 0 && <span className="badge">{filterCount}</span>}
                </button>
              </div>
              <button className="icon-btn" onClick={() => setLeftOpen(false)} title="Paneli gizle ( [ )" aria-label="Paneli gizle">
                <ChevronLeft size={16} />
              </button>
            </div>
            <div className="drawer-body">
              {leftTab === "layers" ? (
                layerPanel
              ) : (
                <FilterPanel layers={filterLayers} settings={settings} update={updateSettings} reset={resetSettings} />
              )}
            </div>
          </aside>
        )}

        <section className="map-area">
          <MapView
            layers={layers}
            choropleth={choropleth}
            quakes={quakes}
            flights={flights}
            news={news}
            fires={fires}
            weather={weather}
            space={feeds.space.data}
            selection={selection}
            focus={focus}
            fitSeq={fitSeq}
            datasetsOn={datasetsOn}
            datasets={datasets}
            styles={styles}
            track={track ? lineState.data : null}
            pin={pin}
            onCamera={setCamera}
            onSelect={setSelection}
            onCursor={setCursor}
          />
          {(track || selection) && (
            <div className="card-stack">
              {track && <LineTrackerPanel track={track} state={lineState} onClose={() => setTrack(null)} onFly={flyTo} />}
              {selection && (
                <DetailCard
                  selection={selection}
                  feeds={feeds}
                  onClose={() => setSelection(null)}
                  onSelect={select}
                  onFly={flyTo}
                  onTrack={startTrack}
                  datasetMeta={selection.kind === "feature" ? DATASET_BY_ID.get(selection.dataset) : undefined}
                />
              )}
            </div>
          )}
          {helpOpen && <HelpCard onClose={() => setHelpOpen(false)} />}
        </section>

        {rightOpen && (
          <aside className="drawer drawer-right" aria-label="Bilgi paneli">
            <SidePanel
              onToggleOpen={() => setRightOpen(false)}
              feeds={feeds}
              quakes={quakes}
              alerts={alerts}
              onSelect={select}
              onFly={flyTo}
              wall={wall}
              onCamera={setCamera}
              onAddToWall={addToWall}
              onOpenWall={() => setWallOpen(true)}
            />
          </aside>
        )}
      </main>
      <StatusBar cursor={cursor} feeds={feeds} />
      {cam && <CameraModal camera={cam} onClose={() => setCamera(null)} onAddToWall={addToWall} inWall={wall.includes(cam.id)} />}
      {wallOpen && (
        <CameraWall ids={wall} onAdd={addToWall} onRemove={(id) => setWall((w) => w.filter((x) => x !== id))} onClose={() => setWallOpen(false)} />
      )}
    </div>
  );
}
