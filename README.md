# FATİH — Türkiye Durum Farkındalığı Paneli

Türkiye geneli için gerçek zamanlı, açık kaynak istihbarat (OSINT) paneli.
[OSIRIS](https://github.com/kvnloo/osiris)'in dünya ölçeğinde yaptığını Türkiye'nin 81 iline odaklanarak yapar:
depremler, hava trafiği, haber akışı, uydu yangın tespitleri, hava durumu, hava kalitesi ve kritik altyapı tek bir harita üzerinde.

Tüm temel katmanlar **API anahtarı gerektirmeden** çalışır.

## Hızlı başlangıç

```bash
npm install
npm run dev
```

Tarayıcıda <http://localhost:3000> adresini açın.

Docker ile:

```bash
docker compose up --build
```

## Katmanlar ve veri kaynakları

| Katman | Kaynak | Yenileme | Not |
|---|---|---|---|
| Depremler | AFAD (birincil) → Kandilli → USGS | 60 sn | Son 1/2/7/30 gün, büyüklük filtresi, il ataması |
| Hava trafiği | adsb.lol + OpenSky Network (birleştirilmiş) | 20 sn | Askerî bayrak, acil squawk (7500/7600/7700) tespiti |
| Haber yoğunluğu | TRT Haber, BBC Türkçe, DW Türkçe, CNN Türk, Hürriyet, Sözcü, Habertürk (RSS) | 3 dk | Başlıklardan il adı çıkarımı (Türkçe ek desteği) |
| Yangınlar | NASA FIRMS VIIRS (S-NPP + NOAA-20) + NASA EONET | 15 dk | Yalnızca Türkiye sınırı içi, il ataması |
| Hava durumu | Open-Meteo (81 il) | 15 dk | Sıcaklık, rüzgâr, nem, WMO durum kodu |
| Hava kalitesi | Open-Meteo Air Quality (CAMS) | 15 dk | Avrupa AQI, PM2.5, PM10 |
| Döviz | TCMB `today.xml` | 30 dk | USD, EUR, GBP, CHF, JPY… |
| Uzay | NOAA SWPC Kp indeksi, ISS konumu | 15 sn | Jeomanyetik fırtına uyarısı |
| Altyapı | Sabit açık kaynak listesi | — | Havalimanları, limanlar, boğazlar, enerji tesisleri, barajlar |
| Fay zonları | Şematik KAF / DAF izleri | — | Gerçek geometri için MTA Diri Fay Haritası kullanılmalı |
| İl sınırları | geoBoundaries (OSM, CC BY-SA) | — | `npm run geo:build` ile yeniden üretilir |

### Veri kataloğu (şehir ve ulaşım verileri)

Sol paneldeki **Katmanlar** sekmesinden açılır; hepsi **Filtreler** sekmesinden alan bazında süzülebilir.

| Veri seti | Şehir | Kaynak | Yenileme |
|---|---|---|---|
| Raylı sistem, tren ve vapur hatları (metro, hafif raylı, tramvay, füniküler, teleferik) | Türkiye | OpenStreetMap (ODbL) — `npm run data:transit` | statik |
| İstasyon, durak ve iskeleler | Türkiye | OpenStreetMap | statik |
| İETT otobüsleri — anlık GPS konumu, hız, plaka (~7.000 araç) | İstanbul | İBB · İETT SOAP servisleri | 20 sn |
| İETT durakları (~15.000) | İstanbul | İBB · İETT | günlük |
| ESHOT durakları (~11.800) | İzmir | İzmir BB açık veri — `npm run data:izmir` | statik |
| İSPARK otoparkları — anlık doluluk | İstanbul | İBB açık veri API | 2 dk |
| Akıllı otoparklar — anlık doluluk | İzmir | İzmir BB · İZUM | 2 dk |
| Belediye canlı kameraları (203 kamera, 12 il) | İstanbul, Kahramanmaraş, Nevşehir (FATİH içinde canlı) · Kocaeli, Kayseri, Erzurum, Trabzon, Rize, Alanya (resmî sayfaya bağlantı) · Bursa, Tekirdağ, Balıkesir (KVKK nedeniyle geçici kapalı) | Belediyelerin resmî yayınları — `npm run data:cameras` | statik liste |
| Afet ve acil durum toplanma alanları | İzmir | İzmir BB | günlük |
| Hastaneler (~1.550) — tür, branş, acil servis, telefon, web, adres | Türkiye (81 il) | OpenStreetMap (ODbL) — `npm run data:hospitals` | statik |
| Nöbetçi eczaneler | İzmir | İzmir BB | saatlik |
| İBB Wi-Fi noktaları | İstanbul | İBB açık veri | günlük |

Yeni bir açık veri kaynağı eklemek için `src/catalog/meta.ts`'e tanım, `src/catalog/loaders.ts`'e yükleyici eklemek yeterli; harita katmanı, detay kartı, arama ve filtreler otomatik oluşur.

## Özellikler

- **Özet ve uyarılar:** M4+ depremler, acil durum transponder kodları, yoğun yangın kümeleri, şiddetli hava, kötü hava kalitesi ve jeomanyetik fırtınalar otomatik olarak önceliklendirilir.
- **İl brifingi:** Haritada bir ile tıklayınca o ilin anlık havası, hava kalitesi, depremleri, uydu sıcak noktaları, hastaneleri, üzerindeki uçak sayısı ve ilgili haberleri tek kartta görünür.
- **İl renklendirme (koroplet):** Sıcaklık, hava kalitesi, haber yoğunluğu veya deprem sayısına göre.
- **İller tablosu:** 81 il; bölge filtresi, arama ve sütuna göre sıralama.
- **Birleşik arama** (`/` veya `Ctrl+K`): il, ilçe (975), otobüs hattı (İETT + ESHOT), durak, metro/tren istasyonu, iskele, kamera, otopark, uçak (çağrı kodu/tescil), deprem ve haber.
- **Hat takibi:** Aramaya hat kodu yazın (ör. `500T`, İzmir için `5`) — güzergah iki yön renkli çizilir, hattaki araçlar canlı gösterilir (15 sn), her aracın yönü ve yakın durağı listelenir. ESHOT durağına tıklayınca geçen hatlardan birini seçip izleyebilirsiniz.
- **Kamera izleme:** Haritada kameraya ya da sağ paneldeki **Kamera** sekmesine tıklayın; canlı yayın açılır, tam ekran yapılabilir. **Kamera duvarı** 1/4/9'lu ızgarada aynı anda birden çok yayını (tam ekran dahil) gösterir.
- **Gelişmiş filtreler:** Her katman için (açık olmasa bile) opaklık, boyut, etiketler ve her alana göre filtre: sayısal aralık, çoklu değer seçimi, metin arama, evet/hayır. Seçimler tarayıcıda hatırlanır.
- **Gece/gündüz sınırı**, Türkçe harita etiketleri, mobil uyumlu yerleşim.

### Klavye kısayolları

| Tuş | İşlev |
|---|---|
| `E` | Depremler |
| `F` | Hava trafiği |
| `N` | Haber yoğunluğu |
| `Y` | Yangınlar |
| `H` | Hava durumu |
| `G` | Gece/gündüz |
| `R` | Raylı sistem ve vapur hatları |
| `O` | İETT otobüsleri |
| `K` | Kameralar |
| `/` veya `Ctrl+K` | Arama |
| `[` / `]` | Sol / sağ paneli aç-kapat |
| `Esc` | Seçimi kapat |

### Kamera yayınları hakkında

FATİH yalnızca belediyelerin başka sitelerden oynatılmasına açıkça izin verdiği yayınları (şifresiz HLS, CORS açık, token/referer kontrolü yok) kendi içinde oynatır. Süreli imzalı token, şifreli akış (AES anahtarı alan adına kilitli), tek kullanımlık bilet, referer ya da çerçeve (X-Frame-Options/CSP) kısıtlaması olan yayınlar için bu kısıtlamalar aşılmaz; kamera haritada gösterilir ve belediyenin resmî izleme sayfasına bağlantı verilir. KVKK'nın 23.06.2026 tarihli duyurusu sonrası yayınları kapatan belediyeler açıklamasıyla listelenir. Derleme betiği Bursa'daki kapanmayı otomatik algılar; yayınlar yeniden açılınca `npm run data:cameras` ile güncellenebilir.

## İsteğe bağlı anahtarlar

`.env.template` dosyasını `.env` olarak kopyalayın:

- `FIRMS_API_KEY` — 48 saatlik FIRMS alan sorgusu (yoksa 24 saatlik genel CSV kullanılır)
- `OPENSKY_CLIENT_ID` / `OPENSKY_CLIENT_SECRET` — OpenSky için daha yüksek istek limiti

## Mimari

```
Tarayıcı (Next.js + MapLibre GL, WebGL)
   │  periyodik sorgu (usePoll)
   ▼
Next.js API rotaları (/api/*)  ── bellek içi TTL önbellek, bayat veri yedeği
   │
   ▼
Harici kaynaklar (AFAD, adsb.lol, OpenSky, NASA, Open-Meteo, TCMB, NOAA, RSS)
```

- `src/app/api/*` — her veri kaynağı için normalize eden sunucu rotaları
- `src/lib/pip.ts` — il poligonlarıyla nokta-poligon testi (yangın/deprem → il)
- `src/lib/geoparse.ts` — haber metninden il çıkarımı
- `src/lib/alerts.ts` — uyarı kuralları
- `src/components/MapView.tsx` — harita ve tüm katmanlar
- `src/data/` — 81 il ve sabit altyapı verileri

## Yol haritası

- [ ] Karayolları trafik kameraları (KGM / İBB) — halka açık bir API bulunursa
- [ ] AIS gemi takibi (Boğazlar trafiği; aisstream.io anahtarı ile)
- [ ] Diğer büyükşehirlerin (Ankara EGO, Bursa, Konya, Kocaeli…) canlı otobüs verileri — açık API yayımlandıkça
- [ ] Canlı TV yayınları paneli (TRT Haber vb.)
- [ ] MGM meteorolojik uyarıları (Meteouyarı)
- [ ] Baraj doluluk oranları (İSKİ, ASKİ, İZSU)
- [ ] MTA diri fay haritası ile gerçek fay geometrisi
- [ ] Deprem artçı analizi ve bölgesel yoğunluk ısı haritası
- [ ] Olay zaman çizelgesi ve geçmişe dönük oynatma

## Lisans ve atıf

Harita altlığı © CARTO, © OpenStreetMap katkıcıları. İl sınırları geoBoundaries (OSM, CC BY-SA 2.0).
Veriler ilgili kurumların kullanım koşullarına tabidir; bu panel resmî bir uyarı sistemi değildir.
