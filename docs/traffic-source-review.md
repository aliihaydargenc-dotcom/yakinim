# Harita ve açık trafik kaynakları

İnceleme: 10 Ekim 2026.

## Uygulanan yaklaşım

Keşif, ulaşım, kesinti ve yol görünümü MapLibre/OpenFreeMap Liberty temel haritasını kullanır. Yandex iframe ve veri paylaşımı kaldırıldı. Temel harita renkleri, yol yoğunluğu anlamına gelmez. POI listesi mevcut Overpass, Overture ve belediye adaptörlerinden gelir; bir temel harita temasını değiştirmek bu kaynakların kapsamını artırmaz.

`TOMTOM_API_KEY` yapılandırılmadığında `/api/traffic` İBB’nin anahtarsız, belgelenmiş trafik endeksi servisini kullanır. Bu bir İstanbul geneli endekstir; yol kesimi yoğunluğu veya Antalya kapsamı değildir. İstanbul sınırları için yaklaşık koordinat kontrolü yapılır (40.7–41.6 N, 27.9–30 E); belediye sınırı tespiti iddiası yoktur. İstanbul dışında kapsama yok yanıtı verilir ve upstream çağrılmaz.

Kaynak tarihleri saat dilimi verilmemişse Türkiye UTC+03 olarak yorumlanır. En yeni geçerli gözlem kullanılır; 15 dakikadan eski veri canlı olarak gösterilmez, gelecekteki/geçersiz değerler reddedilir. Sıfır bir geçerli ölçümdür. Sunucu yanıtı bir dakika önbelleklenir; istemci dakikada bir yeniler. İstek hata verdiğinde eski kart canlı veri olarak tutulmaz. Hiçbir kullanıcı koordinatı İBB isteğine eklenmez; sabit şehir endeksi URL’si kullanılır.

## Kaynaklar ve bulgular

- Kullanıcının paylaştığı katalog: https://github.com/public-apis/public-apis
- TomTom katalogda Maps, Directions, Places and Traffic APIs olarak yer alır ve `apiKey` gerektirir. Resmî akış dokümanı: https://developer.tomtom.com/traffic-api/documentation/traffic-flow/flow-segment-data . Türkiye kapsamı resmî tabloda doğrulandı; aynı haritada sunucu anahtarlı akış katmanı eklendi. Gerçek trafik isteği anahtar olmadan test edilemedi; plan/kota ve lisans kontrolü etkinleştirme öncesinde yapılmalı. Ayrıntılar: [public-data-integration.md](public-data-integration.md).
- Katalogdaki AZ511, Road511 ve LiveTrafficCam Türkiye geneli kaynağı değildir. Bir liste kaydı, hizmetin bugün çalıştığını veya hedef şehir kapsamını garanti etmez.
- OpenStreetMap, mevcut POI adaptörlerine uygundur; canlı trafik yoğunluğu sağlamaz. OSM düzenleme API’si ile salt okunur Overpass sorguları karıştırılmamalıdır.
- Open-Meteo mevcut hava/deniz adaptörlerinde zaten kullanılıyor; sırf katalogda yer aldığı için ikinci bir bağlantı eklenmedi.
- İBB veri kataloğu: https://data.ibb.gov.tr/api/3/action/package_search?q=trafik&rows=10
- İBB Trafik Endeks servisi: https://api.ibb.gov.tr/tkmservices/api/TrafficData/v1/TrafficIndexHistory/1/5M
- İBB dokümantasyonu: https://api.ibb.gov.tr/tkmservices/Help/Api/GET-api-TrafficData-v1-TrafficIndexHistory-day-period
- Lisans: https://data.ibb.gov.tr/license
- İBB saatlik yoğunluk dosyaları tarihsel CSV verileridir; canlı yol yoğunluğu diye sunulmadı.

## Doğrulama

Kaynak endpoint’i HTTP 200 ve XML gözlem verisi döndürdü. Yeni sunucu adaptörü de gerçek kaynak üzerinde Node 22 ile doğrulandı (bulut proxy ortamında `NODE_USE_ENV_PROXY=1` gerekli). İBB endeksi 49, gözlem zamanı 2026-10-10T09:05:00Z; bu bir test anı gözlemidir, sürekli güncellik garantisi değildir.

Birim testleri kapsam, sıfır, UTC+03 dönüşümü, eski/gelecek/bozuk veri ve önbelleği kontrol eder. Tarayıcı testleri endeks kartı, kaynak hatası ve eski verinin canlı gibi görünmemesini kontrol eder. Gerçek iPhone testi bu çalışma kapsamında yapılmadı.

Antalya/Türkiye geneli yol bazlı canlı yoğunluk için anahtarsız ve kullanılabilir bir kaynak doğrulanamadı. Sunucu anahtarı sağlandığında aynı MapLibre haritasında TomTom akış katmanı açılır. Anahtar yoksa canlı yoğunluk renkleri gösterilmez.
