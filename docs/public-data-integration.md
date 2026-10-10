# Türkiye verisi ve aynı haritada trafik

10 Ekim 2026 tarihinde `freepublicapis.com` ve `3rt4nm4n/turkish-apis` incelendi. FreePublicAPIs ana sayfası 749 API gösterirken herkese açık `/api/apis?limit=1000` yanıtı 713 kayıt döndürdü; bu iki sayı eşitmiş gibi raporlanmadı. Türkiye deposunda İngilizce/Türkçe tekrarları dahil 75 satır var. Katalog kayıtlarının tamamı metadata düzeyinde tarandı; ilgili adayların belgeleri ve örnek yanıtları ayrıca kontrol edildi. Katalog sağlık puanı Türkiye kapsaması, ticari kullanım hakkı veya veri doğruluğu değildir.

## Uygulanan akışlar

### Etkinlikler

Etkinlik.io'nun RSS özelleştirme sayfasında normal şehir seçimi yapılarak adres formatı doğrulandı: `https://etkinlik.io/rss/sorgu?sehirIds=8` Antalya, `sehirIds=7` Ankara. Bu kimlikler plaka kodu değildir. `lib/event-cities.json` sayfanın yayınladığı 84 şehir/yer filtresini içerir; KKTC ve alternatif Afyon etiketi de kaynakta vardır. Liste, Türkiye'de 84 il olduğu iddiasını taşımaz.

- `/api/events?city=all` Türkiye seçkisini; belirli kimlik şehir akışını getirir. Şehir arayüzden seçilebilir; konumun ili çözülebilirse başlangıç seçimi olarak kullanılır. GPS zorunlu değildir.
- RSS en fazla 50 aday getirir. İlk sekiz etkinliğin herkese açık detay sayfasındaki eşleşen `Event` JSON-LD verisi, en fazla dört eşzamanlı istekle okunur. Her kaynak isteği beş saniyeyle sınırlıdır.
- RSS `pubDate`, etkinliğin başlangıç tarihi kabul edilmez. Doğrulanamayan tarihler ve mekânlar uydurulmaz; kart kaynağa yönlendirir. İptal bilgisi doğrulanan kayıtlar çıkarılır. Bitiş saati bulunmayan doğrulanmış etkinlik gün sonuna kadar listelenir; arayüz bunu gerçek bitiş saati olarak sunmaz.
- Sonuçlar 15 dakika önbelleğe alınır, aynı şehre devam eden istekler paylaşılır. Antalya seçildiğinde mevcut belediye/bilet kaynakları da birleşir; kaynak arızası kısmi yanıt olarak bildirilir.
- Gerçek Node adaptörüyle Ankara ve Antalya akışları ayrı ayrı 50 aday ve sekiz doğrulanmış tarih/mekân döndürdü. Bu seçki bütün etkinlikleri kapsamaz. Ankara sorgusu yaklaşık 3,8 saniye, Antalya sorgusu yaklaşık 2,9 saniyede tamamlandı; ölçümler bu çalışma ortamına aittir.

### Yer sorgusu

Keşif kategorilerinin yarıçap sorgusunda üç Overpass sağlayıcısı sırayla 3,2'şer saniye bekleniyordu. İstemcideki 10 saniyelik sınırın çoğunu yalnızca sağlayıcı geçişi tüketebiliyordu. `lib/nearby.cjs` ilk sağlayıcıdan sonra 250 ve 500 ms'de yedekleri başlatır. İlk dolu ve tamamlanmış yanıt alındığında diğer istekleri ve başlamamış zamanlayıcıları iptal eder. Eksik/`remark` içeren yanıtlar kabul edilmez. Boş sonuç ancak üç kaynağın da tamamlanmış boş yanıt vermesiyle kabul edilir.

Bu, harita üzerindeki her veri eksikliğinin düzeldiği iddiası değildir. Temel harita OpenFreeMap; yer verisi Overpass ve Overture'dan gelir. Mevcut harita alanı sorgusundaki kalite seçimi, işaretçi korunması ve Overture akışı korunur.

### Trafik

TomTom resmi kapsam tablosunda Türkiye hem Traffic Flow hem Traffic Incidents için destekleniyor. Eklenen katman yalnızca **Traffic Flow** raster katmanıdır; olay/yol kapanması listesi uygulanmış değildir.

- Vercel'in sunucu ortamına `TOMTOM_API_KEY` eklendiğinde `/api/traffic` katman yapılandırmasını döndürür. Anahtarın tarayıcıya, istemci paketine veya JSON yanıtına gitmesi gerekmez.
- `/api/traffic?action=tile&z=...&x=...&y=...` yalnızca sınırları geçerli sabit TomTom trafik PNG adreslerini çağırır; kullanıcıdan hedef URL kabul etmez. HTTP hatası veya PNG olmayan yanıt yoğunluk verisi gibi gösterilmez.
- Vercel rewrite bu adresi mevcut ulaşım fonksiyonuna yönlendirir; trafik ayrı bir serverless fonksiyon eklemez. `service=traffic` yönlendirmesi diğer ulaşım işlemlerinden ayrılır; istemcinin API adresi korunur.
- Mevcut MapLibre/OpenFreeMap üzerinde raster katmanı açılır; dış siteye veya gömülü haritaya geçilmez. Katman iki dakikada bir yenilenir, sağlayıcı atfı gösterilir. Veri bulunmayan yollar için yoğunluk varsayılmaz.
- Anahtar yokken katman açılmaz. Mevcut İBB şehir endeksi yalnızca İstanbul kapsamıyla kalır; ülke geneli yol trafiği gibi sunulmaz.
- Anahtar bulunmadığından gerçek TomTom uç noktası ve Türkiye yol kalitesi bu çalışma sırasında test edilmedi. PNG/anahtar gizliliği, geçersiz koordinatlar ve harita katmanı fixture ile test edildi. Etkinleştirmeden önce seçilen planın temel harita üzerinde gösterime izin verdiği, atıf ve kota koşulları kontrol edilmelidir.

## Araştırılan diğer adaylar

| Kaynak | Kanıt ve karar |
|---|---|
| TurkiyeAPI | Güncel `/v2/meta`, `/v2/provinces`, `/v2/provinces/34/districts` anahtarsız çalıştı: 81 il ve İstanbul'da 39 ilçe. Referans veri seti 2025, son güncelleme 2026-05-21. İdari veri için uygun; şehir merkezine en yakın il hesabı gerçek idari sınır tespiti olmadığı için GPS ters çözümüne böyle bağlanmadı. |
| LatLng | İstanbul, Ankara ve Antalya yakın yer sorguları sonuç verdi. Resmî belge bütün API çağrılarında anahtar istiyor; örnek anahtarsız yanıt bununla çelişiyor. OSM/Photon tabanlı ve bazı sonuçlarda adres alanları boş. Bu belirsizlikle otomatik üretim sağlayıcısı yapılmadı. |
| Barkod API / Camgöz | Güncel JoJ belgesinde market bazlı ürün fiyatı ve fiyat geçmişi uç noktaları var; anahtar/kredi/plan gerekiyor. Mağaza şubesi bazında stok veya her fiyatın doğruluğu kanıtlanmadı. |
| HGM Atlas | Harita platformu; anahtarlı aday. Canlı ülke geneli trafik verisi olarak doğrulanmadı. |
| EPİAŞ | Eski teknik adres zaman aşımına uğradı, güncel portal erişilebilir. Katalogdaki açıklama mahalle bazında elektrik kesintileri için yeterli kanıt değil. |
| Autobahn / transport.opendata.ch | Almanya otoyolları / İsviçre toplu taşıması. Türkiye trafiği için kullanılamaz. |
| Open-Meteo, Nominatim, City Bikes, USGS, Nager.Date | Önceki katalogla örtüşüyor; yeni ve farklı bir trafik kaynağı değiller. |

Bu iki kaynaktan anahtarsız ve doğrulanmış Türkiye geneli canlı yol yoğunluğu sağlayıcısı çıkmadı. Nöbetçi eczane, tüm belediyelerin canlı araçları veya bütün dağıtım şirketlerinin kesintileri için tek birleşik kaynağa da ulaşılamadı.

## Kaynaklar

- https://www.freepublicapis.com/api
- https://github.com/3rt4nm4n/turkish-apis
- https://etkinlik.io/rss/bilgi
- https://etkinlik.io/api-bilgi (V2 API yayıncı başvurusu/token; RSS için kayıt gerekmiyor)
- https://turkiyeapi.dev/
- https://api.turkiyeapi.dev/v2/meta
- https://www.latlng.work/docs
- https://jojapi.com/hub/api/product-barcode-api
- https://developer.tomtom.com/traffic-api/documentation/tomtom-maps/v1/product-information/market-coverage
- https://developer.tomtom.com/traffic-api/documentation/traffic-flow/raster-flow-tiles

## Doğrulama

`npm test` veri/adaptör sınırları ve üretim derlemesini kapsar. Playwright shell ve şehir hizmetleri testleri 360 px Chromium emülasyonunda şehir değiştirme, bilinmeyen tarih, trafik PNG yükleme ve hata halinde katmanı kaldırmayı doğrular; masaüstü 1440 px geçişinde taşma da kontrol edilir. Bunlar fiziksel cihaz testleri veya TomTom üretim verisi testi değildir.
