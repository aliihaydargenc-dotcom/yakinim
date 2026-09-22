# Yakınımda

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
- PWA uygulama kabuğu çevrimdışı açılabilir; harita tile'ları bilinçli olarak offline/prefetch edilmez

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

Bu yapı Cloudflare Pages veya GitHub Pages üzerinde statik olarak yayınlanabilir. Cloudflare Pages'te statik asset istekleri ücretsizdir; bu proje Functions kullanmadığı için Worker/Function kotasına ihtiyaç duymaz.
