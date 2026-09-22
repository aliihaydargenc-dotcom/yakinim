# Yakınımda

**Sürüm:** 1.0.0

Mobil öncelikli, kurulabilir (PWA) günlük ihtiyaç haritası. Sunucu, hesap veya ücretli API anahtarı gerektirmez.

## İlk sürüm

- GPS ile kullanıcı konumu
- Nöbetçi eczane: Eczane Adresi public API
- Market / bakkal benzeri noktalar: OpenStreetMap `shop=supermarket|convenience`
- Manav: OpenStreetMap `shop=greengrocer`
- Fırın: OpenStreetMap `shop=bakery`
- Normal eczane: OpenStreetMap `amenity=pharmacy`
- ATM: OpenStreetMap `amenity=atm`
- 1 / 3 / 5 km arama yarıçapı
- Harita ve liste birlikte çalışır
- Favoriler cihazda saklanır
- Son kategori ve yarıçap cihazda hatırlanır
- Eczane sonuçları 15 dakika, OSM sonuçları 6 saat cihazda cache'lenir
- PWA uygulama kabuğu çevrimdışı açılabilir; Leaflet çalışma dosyaları ilk çevrimiçi kullanımdan sonra runtime cache'e alınır
- Harita tile'ları bilinçli olarak offline/prefetch edilmez
- Veri kaynağı geçici olarak erişilemezse süresi dolmuş son cihaz önbelleği güvenli fallback olarak gösterilir
- 1 / 3 / 5 km seçimi tam yarıçap uygular; ekstra tolerans eklenmez

## Veri kaynakları ve kota yaklaşımı

### Eczane Adresi

Dokümantasyon: https://eczaneadresi.com/api-docs

Public API anahtar istemiyor, CORS açık ve dokümantasyonda 60 istek/dakika/IP limiti belirtiliyor. API çıktısını kullanan yüzeylerde görünür "Veri: Eczane Adresi" atfı gerekiyor; arayüz bunu gösteriyor.

### OpenStreetMap / Overpass

POI sorguları kullanıcı etkileşimiyle çalışır ve 6 saatlik cihaz içi cache kullanır. Böylece aynı bölgede kategori değiştirip geri gelindiğinde gereksiz tekrar istekleri azalır.

Overpass: https://wiki.openstreetmap.org/wiki/Overpass_API

OSM tile politikası: https://operations.osmfoundation.org/policies/tiles/

Uygulama standart OSM tile'larını yalnız kullanıcının gördüğü harita alanında kullanır. Service Worker harita tile'larını önceden indirmez veya offline paketlemez.

### Konum ve gizlilik

GPS koordinatı hesap oluşturulmadan tarayıcıda kullanılır. Uygulama koordinatı kendi sunucusuna göndermez. Sonuç API'leri konuma göre sorgulanır; favoriler ve tercihler `localStorage` içinde kalır.

## Çalıştırma

Statik dosya olduğu için herhangi bir yerel HTTP sunucusu yeterli:

```powershell
cd "C:\Users\hayda\Desktop\Kisisel Entegrasyon\yakinimda"
python -m http.server 4173
```

Ardından `http://localhost:4173` açılır.

## Ücretsiz yayınlama

Bu yapı Cloudflare Workers Static Assets veya GitHub Pages üzerinde statik olarak yayınlanabilir. Cloudflare Workers Static Assets'te statik asset istekleri ücretsizdir; bu proje Functions kullanmadığı için Worker/Function kotasına ihtiyaç duymaz.


## Doğrulama

Repository'de bağımlılıksız bir smoke test ve GitHub Actions CI bulunur:

```bash
node --check app.js
node --check sw.js
npm run build
npm test
npx --yes wrangler@latest deploy --dry-run --outdir .wrangler-dry-run
```

CI; JavaScript sözdizimini, PWA manifestini, temel kategori sözleşmesini, kaynak atıflarını, yarıçap davranışını ve service worker cache politikasını kontrol eder.

## Cloudflare Workers Static Assets

Üretim hattı GitHub → Cloudflare Workers Builds → Workers Static Assets olarak yapılandırılmıştır. Repository kökündeki `wrangler.jsonc`, Worker adını `yakinim` olarak sabitler ve statik asset dizinini `./public` olarak tanımlar. `npm run build` deploy edilecek dosyaları temiz bir `public/` klasörüne kopyalar; geliştirme/CI dosyaları böylece public asset paketine hiç girmez.

Cloudflare Git entegrasyonunda varsayılan deploy komutu `npx wrangler deploy` ile bu yapılandırmayı doğrudan yayınlayabilir. `main` production, feature branch'leri ise preview doğrulaması için kullanılabilir.


### Statik build sözleşmesi

`package.json` içindeki `build` komutu framework bundle'ı üretmez; deploy-ready statik dosyaları `public/` içine senkronize eder. `public/` repository'de commitli tutulduğu için Cloudflare tarafında Build command boş olsa bile deploy çalışır; Build command `npm run build` ise klasör güvenli biçimde yeniden senkronize edilir.
