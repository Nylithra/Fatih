<div align="center">

# 🇹🇷 ⬡ FATİH

### Türkiye Durum Farkındalığı Paneli

**Türkiye'nin 81 ilini gerçek zamanlı açık kaynak verilerle izleyen OSINT ve durum farkındalığı platformu.**

[![Canlı Panel](https://img.shields.io/badge/Canlı_Panel-00E5FF?style=for-the-badge\&logo=vercel\&logoColor=white)](https://fatihlive.vercel.app/)
[![Next.js](https://img.shields.io/badge/Next.js-16-black?style=for-the-badge\&logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=for-the-badge\&logo=typescript\&logoColor=white)](https://www.typescriptlang.org/)
[![MapLibre](https://img.shields.io/badge/MapLibre_GL-WebGL-396CB2?style=for-the-badge)](https://maplibre.org/)
[![Lisans](https://img.shields.io/badge/Lisans-MIT-D4AF37?style=for-the-badge)](LICENSE)

**Depremler, hava trafiği, haberler, yangınlar, hava durumu, hava kalitesi, toplu taşıma, kameralar, altyapı ve uzay hava durumunu tek bir GPU hızlandırmalı harita üzerinde birleştirir.**

[🌐 Resmî Site](https://fatihlive.vercel.app/) · [🐛 Hata Bildir](https://github.com/kvnloo/osiris/issues) · [💡 Özellik İste](https://github.com/kvnloo/osiris/issues)

</div>

---

## Genel Bakış

**FATİH**, Türkiye genelindeki açık ve kamuya açık veri kaynaklarını tek bir arayüzde birleştiren gerçek zamanlı bir **Açık Kaynak İstihbarat (OSINT) ve durum farkındalığı platformudur.**

FATİH, dünya ölçeğindeki OSINT platformlarının yaklaşımını Türkiye'ye odaklayarak **81 ilin tamamını** tek bir interaktif harita üzerinde izlemeyi amaçlar.

Platform;

* Depremleri
* Hava trafiğini
* Haber yoğunluğunu
* Uydu yangın tespitlerini
* Hava durumunu
* Hava kalitesini
* Döviz kurlarını
* Uzay hava durumunu
* Toplu taşımayı
* Kamuya açık kamera yayınlarını
* Hastaneleri
* Otoparkları
* Kritik altyapıyı
* Fay zonlarını

tek bir sistem içerisinde sunar.

Temel katmanların büyük bölümü **API anahtarı gerektirmeden** çalışır.

> **Amaç:** Türkiye'de neler olduğunu, mümkün olduğunca gerçek zamanlı ve açık veri kaynakları üzerinden tek bir ekrandan görebilmek.

---

## Veri Katmanları

| Alan                | Veriler                                             | Kaynak                                                                 |
| ------------------- | --------------------------------------------------- | ---------------------------------------------------------------------- |
| **Depremler**       | M4+ ve güncel sismik hareketlilik                   | AFAD → Kandilli → USGS                                                 |
| **Hava Trafiği**    | Canlı uçak konumları                                | adsb.lol + OpenSky                                                     |
| **Haberler**        | Türkiye geneli haber yoğunluğu                      | TRT Haber, BBC Türkçe, DW Türkçe, CNN Türk, Hürriyet, Sözcü, Habertürk |
| **Yangınlar**       | Uydu tabanlı aktif sıcak noktalar                   | NASA FIRMS + NASA EONET                                                |
| **Hava Durumu**     | 81 il hava durumu                                   | Open-Meteo                                                             |
| **Hava Kalitesi**   | AQI, PM2.5, PM10                                    | Open-Meteo / CAMS                                                      |
| **Döviz**           | USD, EUR, GBP, CHF, JPY vb.                         | TCMB                                                                   |
| **Uzay**            | Kp indeksi, ISS konumu                              | NOAA SWPC                                                              |
| **Toplu Taşıma**    | Metro, tramvay, tren, vapur                         | OpenStreetMap + belediye verileri                                      |
| **Canlı Otobüsler** | Araç konumları ve güzergâhlar                       | İETT / İzmir BB                                                        |
| **Kameralar**       | Kamuya açık belediye kameraları                     | Belediye kaynakları                                                    |
| **Hastaneler**      | ~1.550 sağlık tesisi                                | OpenStreetMap                                                          |
| **Otoparklar**      | Anlık doluluk                                       | İBB / İzmir BB                                                         |
| **Altyapı**         | Havalimanları, limanlar, barajlar, enerji tesisleri | Açık veri kaynakları                                                   |
| **Fay Zonları**     | KAF / DAF şematik gösterimi                         | Sabit referans verisi                                                  |
| **İl Sınırları**    | Türkiye'nin 81 ili                                  | geoBoundaries / OSM                                                    |

---

# Mimari

```text
┌─────────────────────────────────────────────────────┐
│                    FATİH İSTEMCİ                    │
│                                                     │
│  ┌────────────┐  ┌────────────┐  ┌──────────────┐  │
│  │  MapLibre  │  │    HUD     │  │    Arama     │  │
│  │   WebGL    │  │   Paneller │  │  & Filtreler │  │
│  │   Harita   │  │  Katmanlar │  │    Sistemi   │  │
│  └────────────┘  └────────────┘  └──────────────┘  │
├─────────────────────────────────────────────────────┤
│                 NEXT.JS API KATMANI                 │
│                                                     │
│ /api/earthquakes     /api/flights                   │
│ /api/news             /api/fires                    │
│ /api/weather          /api/air-quality              │
│ /api/cameras          /api/transit                  │
│ /api/space            /api/currency                 │
│ /api/parking          /api/*                        │
├─────────────────────────────────────────────────────┤
│                    VERİ KAYNAKLARI                  │
│                                                     │
│ AFAD · Kandilli · USGS · adsb.lol · OpenSky        │
│ NASA · NOAA · Open-Meteo · TCMB · OSM               │
│ geoBoundaries · İBB · İETT · İzmir BB · RSS        │
└─────────────────────────────────────────────────────┘
```

---

# Özellikler

## 🌍 Gerçek Zamanlı Türkiye Haritası

FATİH, farklı kaynaklardan gelen verileri tek bir interaktif Türkiye haritasında birleştirir.

### Harita Katmanları

* **Depremler**
* **Hava trafiği**
* **Haber yoğunluğu**
* **Yangınlar**
* **Hava durumu**
* **Hava kalitesi**
* **Uzay hava durumu**
* **Raylı sistemler**
* **Vapur hatları**
* **Otobüsler**
* **Kameralar**
* **Hastaneler**
* **Otoparklar**
* **Kritik altyapı**
* **Fay zonları**
* **İl sınırları**

Her katman bağımsız olarak açılıp kapatılabilir ve filtrelenebilir.

---

# 🚨 Uyarı Sistemi

FATİH, önemli olabilecek olayları otomatik olarak önceliklendirir.

Örneğin:

* M4+ depremler
* Acil durum transponder kodları
* Yoğun yangın kümeleri
* Şiddetli hava koşulları
* Kötü hava kalitesi
* Jeomanyetik fırtına koşulları

> FATİH bir resmî acil durum veya uyarı sistemi değildir. Veriler yalnızca durum farkındalığı amacıyla sunulur.

---

# 🌋 Deprem Takibi

Deprem verileri öncelikli kaynaklardan alınır ve gerektiğinde yedek kaynaklara geçilir:

```text
AFAD
 ↓
Kandilli
 ↓
USGS
```

Desteklenen özellikler:

* Son 1 gün
* Son 2 gün
* Son 7 gün
* Son 30 gün
* Büyüklük filtresi
* İl ataması
* Harita üzerinde deprem gösterimi
* Otomatik önceliklendirme
* İl bazlı deprem özeti

**Yenileme:** ~60 saniye

---

# ✈️ Canlı Hava Trafiği

Uçuş verileri:

* **adsb.lol**
* **OpenSky Network**

kaynaklarından birleştirilir.

Gösterilebilen bilgiler:

* Uçak konumu
* Çağrı kodu
* Tescil
* İrtifa
* Hız
* Yön
* Uçak tipi
* Askerî uçak göstergesi
* Acil durum squawk kodları

### Acil Durum Kodları

| Kod    | Anlam                     |
| ------ | ------------------------- |
| `7500` | Uçak kaçırma bildirimi    |
| `7600` | Telsiz haberleşme arızası |
| `7700` | Genel acil durum          |

> Squawk kodunun görülmesi tek başına bir olayın kesin olarak gerçekleştiği anlamına gelmez.

**Yenileme:** ~20 saniye

---

# 📰 Haber İstihbaratı

FATİH, çeşitli haber kaynaklarının RSS akışlarını takip eder.

Mevcut kaynaklar:

* TRT Haber
* BBC Türkçe
* DW Türkçe
* CNN Türk
* Hürriyet
* Sözcü
* Habertürk

Haber başlıkları analiz edilerek ilgili **il ve bölgelere göre haber yoğunluğu** oluşturulur.

**Yenileme:** ~3 dakika

---

# 🔥 Yangın Takibi

Uydu tabanlı aktif yangın sıcak noktaları NASA kaynaklarından alınır.

Kaynaklar:

* NASA FIRMS
* NASA EONET
* VIIRS S-NPP
* VIIRS NOAA-20

Yalnızca Türkiye sınırları içerisindeki noktalar gösterilir.

Yangın noktaları coğrafi analiz kullanılarak ilgili ile atanabilir.

**Yenileme:** ~15 dakika

---

# 🌦️ Hava Durumu

Türkiye'nin **81 ili** için hava durumu verileri sağlanır.

Veriler:

* Sıcaklık
* Rüzgâr
* Nem
* Hava durumu
* WMO durum kodu

**Kaynak:** Open-Meteo

**Yenileme:** ~15 dakika

---

# 🌫️ Hava Kalitesi

Hava kalitesi verileri Open-Meteo / CAMS kaynaklarından alınır.

Gösterilen veriler:

* Avrupa AQI
* PM2.5
* PM10

Hava kalitesi il bazında haritada görselleştirilebilir.

**Yenileme:** ~15 dakika

---

# ☀️ Uzay Hava Durumu

FATİH, Dünya'daki durum farkındalığının yanında temel uzay hava durumu verilerini de takip eder.

Gösterilen veriler:

* NOAA Kp indeksi
* Jeomanyetik fırtına durumu
* ISS konumu

**Kaynak:** NOAA SWPC

**Yenileme:** ~15 saniye

---

# 🚍 Toplu Taşıma

FATİH'in toplu taşıma sistemi giderek genişleyen bir veri katmanına sahiptir.

## 🚇 Raylı Sistemler ve Vapur Hatları

Türkiye genelindeki ulaşım altyapısı OpenStreetMap üzerinden oluşturulur.

Desteklenen sistemler:

* Metro
* Tramvay
* Hafif raylı sistem
* Füniküler
* Teleferik
* Tren
* Vapur
* İstasyonlar
* Duraklar
* İskeleler

Verileri yeniden oluşturmak için:

```bash
npm run data:transit
```

---

# 🚌 İETT Canlı Araç Takibi

İstanbul'daki İETT ağı için canlı araç verileri desteklenir.

Yaklaşık:

* **7.000 araç**
* **15.000 durak**

Gösterilen bilgiler:

* Araç konumu
* Hız
* Hat
* Yön
* Yakındaki durak

**Yenileme:** ~20 saniye

---

# 🚍 İzmir ESHOT

ESHOT durak verileri de desteklenmektedir.

Yaklaşık:

**11.800 durak**

**Kaynak:** İzmir Büyükşehir Belediyesi açık verileri

Verileri yeniden oluşturmak için:

```bash
npm run data:izmir
```

---

# 📹 Belediye Kamera Ağı

FATİH, kamuya açık belediye kamera yayınlarını harita üzerinde bir araya getirir.

Kapsama giren bölgeler arasında:

* İstanbul
* Kahramanmaraş
* Nevşehir
* Kocaeli
* Kayseri
* Erzurum
* Trabzon
* Rize
* Alanya
* Bursa
* Tekirdağ
* Balıkesir

bulunmaktadır.

Kamera desteği:

* Harita kamera işaretçileri
* Kamera bilgi paneli
* Tam ekran görüntüleme
* Çoklu kamera duvarı
* 1 / 4 / 9 kamera düzeni

### Kamera Duvarı

```text
┌──────────┬──────────┬──────────┐
│ Kamera 1 │ Kamera 2 │ Kamera 3 │
├──────────┼──────────┼──────────┤
│ Kamera 4 │ Kamera 5 │ Kamera 6 │
├──────────┼──────────┼──────────┤
│ Kamera 7 │ Kamera 8 │ Kamera 9 │
└──────────┴──────────┴──────────┘
```

### Kamera Yayınları Hakkında

FATİH, yalnızca yayın sahibinin kamuya açık olarak erişime sunduğu ve teknik olarak gömülmesine izin verilen yayınları kendi içerisinde oynatır.

Aşağıdaki güvenlik mekanizmaları aşılmaz:

* Kimlik doğrulama
* İmzalı token
* Şifreleme anahtarları
* Referer kontrolü
* CSP / X-Frame-Options
* Tek kullanımlık bilet sistemleri

Gömülemeyen yayınlar için uygun olduğunda ilgili belediyenin **resmî izleme sayfasına bağlantı** verilir.

---

# 🏥 Hastaneler

FATİH, Türkiye genelinde yaklaşık:

**1.550 sağlık tesisi**

içeren bir veri setine sahiptir.

Bulunabilen bilgiler:

* Tesis türü
* Branşlar
* Acil servis bilgisi
* Telefon
* Web sitesi
* Adres
* Konum

**Kaynak:** OpenStreetMap

---

# 🅿️ Otopark Takibi

Desteklenen belediyelerde anlık otopark doluluk verileri gösterilir.

### İstanbul

**İSPARK**

### İzmir

**Akıllı Otopark / İZUM**

**Yenileme:** ~2 dakika

---

# 🔎 Birleşik Arama

FATİH'in tüm veri katmanlarına tek bir arama sistemi üzerinden ulaşılabilir.

Aramayı açmak için:

```text
/
```

veya:

```text
Ctrl + K
```

Aranabilen veriler:

* İl
* İlçe
* Otobüs hattı
* Otobüs durağı
* Metro istasyonu
* Tren istasyonu
* İskele
* Kamera
* Otopark
* Uçak
* Deprem
* Haber

Sistem yaklaşık **975 ilçeyi** destekler.

---

# 🚌 Hat Takibi

Arama alanına bir hat kodu yazılarak hat takip edilebilir.

Örnek:

```text
500T
```

İzmir için:

```text
5
```

Hat takip ekranı:

* Güzergâh
* İki yön
* Canlı araçlar
* Araç yönü
* Yakındaki durak
* Hattaki aktif araçlar

bilgilerini gösterebilir.

---

# 🏙️ İl Brifingi

Harita üzerinde bir ile tıklandığında ilgili ilin anlık durum özeti görüntülenir.

Kart içerisinde:

* 🌡️ Hava durumu
* 🌫️ Hava kalitesi
* 🌋 Depremler
* 🔥 Uydu yangın noktaları
* 🏥 Hastaneler
* ✈️ Hava trafiği
* 📰 İlgili haberler
* 🏗️ Altyapı

gibi bilgiler bir arada gösterilir.

---

# 🗺️ İl Renklendirme

81 il, farklı veri kümelerine göre dinamik olarak renklendirilebilir.

Desteklenen görünümler:

* 🌡️ Sıcaklık
* 🌫️ Hava kalitesi
* 📰 Haber yoğunluğu
* 🌋 Deprem yoğunluğu

Bu sayede Türkiye genelindeki bölgesel farklılıklar tek bakışta görülebilir.

---

# 🎛️ Gelişmiş Filtreler

Her önemli veri katmanı kendi filtrelerine sahiptir.

Desteklenen filtre türleri:

* Sayısal aralık
* Çoklu değer seçimi
* Metin araması
* Evet / hayır
* Etiketler
* İşaretçi boyutu
* Katman opaklığı

Filtre seçimleri tarayıcıda saklanır.

---

# ⌨️ Klavye Kısayolları

| Tuş        | İşlev                              |
| ---------- | ---------------------------------- |
| `E`        | Depremleri aç/kapat                |
| `F`        | Hava trafiğini aç/kapat            |
| `N`        | Haberleri aç/kapat                 |
| `Y`        | Yangınları aç/kapat                |
| `H`        | Hava durumunu aç/kapat             |
| `G`        | Gece/gündüz görünümü               |
| `R`        | Raylı sistem ve vapurları aç/kapat |
| `O`        | İETT otobüslerini aç/kapat         |
| `K`        | Kameraları aç/kapat                |
| `/`        | Aramayı aç                         |
| `Ctrl + K` | Aramayı aç                         |
| `[`        | Sol paneli aç/kapat                |
| `]`        | Sağ paneli aç/kapat                |
| `Esc`      | Seçimi kapat                       |

---

# ⚡ Performans

FATİH, yüksek miktarda harita verisini akıcı şekilde göstermek için GPU hızlandırmalı bir mimari kullanır.

### Performans teknikleri

* MapLibre GL / WebGL
* Aşamalı veri yükleme
* Görünür alan odaklı sorgular
* Bellek içi TTL önbellekleme
* Eski veriyi koruyan yedekleme sistemi
* Katman bazlı polling
* İstemci tarafında filtreleme
* Gerektiğinde veri yükleme

Sistem, kullanılmayan katmanlar için gereksiz API istekleri göndermemeye çalışır.

---

# 🧱 Proje Mimarisi

```text
Tarayıcı
│
├── Next.js
├── TypeScript
├── MapLibre GL
└── WebGL
      │
      │ Periyodik veri sorguları
      ▼
Next.js API Rotaları
│
├── /api/earthquakes
├── /api/flights
├── /api/news
├── /api/fires
├── /api/weather
├── /api/air-quality
├── /api/cameras
├── /api/transit
├── /api/space
├── /api/currency
├── /api/parking
└── /api/*
      │
      ▼
Harici Açık Veri Kaynakları
│
├── AFAD
├── Kandilli
├── USGS
├── adsb.lol
├── OpenSky
├── NASA
├── NOAA
├── Open-Meteo
├── TCMB
├── OpenStreetMap
├── geoBoundaries
├── İBB / İETT
├── İzmir BB
└── RSS kaynakları
```

---

# 📁 Proje Yapısı

```text
src/
├── app/
│   └── api/
│       ├── earthquakes/
│       ├── flights/
│       ├── news/
│       ├── fires/
│       ├── weather/
│       ├── cameras/
│       ├── transit/
│       └── ...
│
├── components/
│   └── MapView.tsx
│
├── lib/
│   ├── pip.ts
│   ├── geoparse.ts
│   └── alerts.ts
│
├── catalog/
│   ├── meta.ts
│   └── loaders.ts
│
└── data/
    ├── provinces/
    ├── infrastructure/
    └── ...
```

### Temel Dosyalar

| Dosya                        | Görevi                                        |
| ---------------------------- | --------------------------------------------- |
| `src/app/api/*`              | Veri kaynaklarını normalize eden API rotaları |
| `src/lib/pip.ts`             | Nokta-poligon ve il ataması                   |
| `src/lib/geoparse.ts`        | Haberlerden coğrafi konum çıkarımı            |
| `src/lib/alerts.ts`          | Uyarı ve önceliklendirme kuralları            |
| `src/components/MapView.tsx` | Ana harita ve veri katmanları                 |
| `src/catalog/meta.ts`        | Veri seti tanımları                           |
| `src/catalog/loaders.ts`     | Veri seti yükleyicileri                       |
| `src/data/`                  | Sabit coğrafi ve altyapı verileri             |

---

# 🚀 Hızlı Başlangıç

Projeyi klonlayın:

```bash
git clone https://github.com/kvnloo/osiris.git
cd osiris
```

Bağımlılıkları yükleyin:

```bash
npm install
```

Geliştirme sunucusunu başlatın:

```bash
npm run dev
```

Ardından:

```text
http://localhost:3000
```

adresini açın.

---

# 🐳 Docker

Docker ile çalıştırmak için:

```bash
docker compose up --build
```

Ardından:

```text
http://localhost:3000
```

adresine gidin.

---

# 🔑 İsteğe Bağlı API Anahtarları

Temel sistem API anahtarı olmadan çalışabilir.

`.env.template` dosyasını `.env` olarak kopyalayabilirsiniz:

```bash
cp .env.template .env
```

İsteğe bağlı değişkenler:

```env
FIRMS_API_KEY=

OPENSKY_CLIENT_ID=
OPENSKY_CLIENT_SECRET=
```

### FIRMS

NASA FIRMS API anahtarı, alan bazlı yangın sorguları ve daha yüksek kullanım limitleri için kullanılabilir.

### OpenSky

OpenSky kimlik bilgileri, desteklenen durumlarda daha yüksek istek limitleri sağlayabilir.

---

# 🗃️ Veri Kataloğu

FATİH'in veri kataloğu, yeni açık veri kaynaklarının sisteme kolayca eklenebilmesi için modüler şekilde tasarlanmıştır.

Yeni bir veri kaynağı eklemek için temel olarak:

```text
src/catalog/meta.ts
```

içerisine veri tanımı ve:

```text
src/catalog/loaders.ts
```

içerisine veri yükleyicisi eklenmesi yeterlidir.

Harita katmanı, detay kartı, arama ve filtre sistemi bu katalog yapısı üzerinden genişletilebilir.

---

# 🛣️ Yol Haritası

* [ ] Karayolları trafik kameraları
* [ ] KGM / İBB trafik verileri
* [ ] AIS gemi takibi
* [ ] Boğazlar için canlı deniz trafiği
* [ ] Ankara EGO canlı otobüsleri
* [ ] Bursa canlı ulaşım verileri
* [ ] Konya canlı ulaşım verileri
* [ ] Kocaeli canlı ulaşım verileri
* [ ] Canlı TV yayınları paneli
* [ ] MGM meteorolojik uyarıları
* [ ] Baraj doluluk oranları
* [ ] MTA diri fay haritası
* [ ] Gerçek fay geometrileri
* [ ] Deprem artçı analizi
* [ ] Bölgesel deprem yoğunluk haritası
* [ ] Olay zaman çizelgesi
* [ ] Geçmiş veriler için oynatma sistemi
* [ ] Daha fazla belediye kamera ağı
* [ ] Daha fazla belediye açık veri kaynağı

---

# 📚 Veri Kaynakları ve Atıflar

FATİH, farklı kurum ve topluluklar tarafından sağlanan açık ve kamuya açık veri kaynaklarını kullanır.

Başlıca kaynaklar:

* **AFAD**
* **Kandilli Rasathanesi**
* **USGS**
* **NASA**
* **NASA FIRMS**
* **NASA EONET**
* **NOAA SWPC**
* **Open-Meteo**
* **OpenSky Network**
* **adsb.lol**
* **Türkiye Cumhuriyet Merkez Bankası**
* **OpenStreetMap**
* **geoBoundaries**
* **İBB**
* **İETT**
* **İzmir Büyükşehir Belediyesi**
* **Diğer belediye açık veri platformları**
* **Haber kuruluşlarının RSS akışları**

Harita altyapısında:

**© CARTO · © OpenStreetMap katkıcıları**

İl sınırları:

**geoBoundaries**

kullanılmaktadır.

Her veri kaynağının kendi kullanım koşulları ve lisansları geçerlidir.

---

# ⚠️ Sorumluluk Reddi

FATİH, **resmî bir afet, güvenlik, meteoroloji veya acil durum uyarı sistemi değildir.**

Gösterilen bilgiler üçüncü taraf açık veri kaynaklarından alınır ve gecikme, eksiklik veya yanlışlık içerebilir.

Deprem, yangın, hava durumu, hava trafiği veya diğer kritik olaylarda **ilgili resmî kurumların duyuruları esas alınmalıdır.**

---

# 📄 Lisans

**MIT License**

Ayrıntılar için:

```text
LICENSE
```

dosyasına bakabilirsiniz.

---

<div align="center">

# 🇹🇷 FATİH

### Türkiye'yi tek haritada gör.

**Gerçek zamanlı · Açık veri · OSINT · 81 İl**

🌐 **[fatihlive.vercel.app](https://fatihlive.vercel.app/)**

</div>
