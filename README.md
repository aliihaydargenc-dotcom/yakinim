# Yakınımda

**Sürüm:** 1.0.0

Mobil öncelikli, kurulabilir (PWA) günlük ihtiyaç haritası. Sunucu, hesap veya ücretli API anahtarı gerektirmez.

## Özellikler

- GPS ile kullanıcı konumu
- Nöbetçi eczane: Eczane Adresi public API
- Market / bakkal: OpenStreetMap `shop=supermarket|convenience`
- Manav: OpenStreetMap `shop=greengrocer`
- Fırın: OpenStreetMap `shop=bakery`
- Normal eczane: OpenStreetMap `amenity=pharmacy`
- ATM: OpenStreetMap `amenity=atm`
- 1 / 3 / 5 km arama yarıçapı
- Harita ve liste birlikte çalışır
- Favoriler ve tercihler cihazda saklanır
- Eczane sonuçları 15 dakika, OSM sonuçları 6 saat cihazda cache'lenir
- Veri kaynağı geçici olarak erişilemezse son cihaz önbelleği fallback olarak gösterilir
- PWA kabuğu çevrimdışı açılabilir
- Harita tile'ları offline/prefetch edilmez

## Veri kaynakları

### Eczane Adresi

Dokümantasyon: https://eczaneadresi.com/api-docs

Public API anahtar istemez. API çıktısını kullanan yüzeylerde görünür "Veri: Eczane Adresi" atfı uygulanır.

### OpenStreetMap / Overpass

POI sorguları kullanıcı etkileşimiyle çalışır ve cihaz içi cache kullanır.

Overpass: https://wiki.openstreetmap.org/wiki/Overpass_API

OSM tile politikası: https://operations.osmfoundation.org/policies/tiles/

## Gizlilik

GPS koordinatı hesap oluşturulmadan tarayıcıda kullanılır. Favoriler ve tercihler `localStorage` içinde kalır.

## Yerel çalıştırma

```powershell
python -m http.server 4173
```

Ardından `http://localhost:4173` açılır.

## Doğrulama

```bash
node --check app.js
node --check sw.js
npm test
```

GitHub Actions aynı kontrolleri PR ve `main` pushlarında çalıştırır.

## Vercel

Proje framework gerektirmeyen statik bir sitedir. GitHub repository Vercel'e bağlandığında root'taki `index.html`, `app.js`, `styles.css`, manifest ve service worker doğrudan yayınlanır.

`vercel.json` yalnız güvenlik başlıklarını tanımlar. Ek build komutu veya output directory gerekmez.

Önerilen akış:

`feature branch → GitHub CI → main merge → Vercel production deploy`

Bu yaklaşım gereksiz preview/deployment üretimini azaltmak için küçük değişiklikleri toplu geliştirme turunda birleştirmeyi hedefler.
