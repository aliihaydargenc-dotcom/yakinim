# Antalya odaklı canlı keşif entegrasyonu

9 Ekim 2026. Bu araştırma sonunda uygulamaya veri bağlandı: 12 yeni yer kategorisi, konuma göre hava kalitesi, İstanbul için belediye tuvaletleri ve İSPARK bildirimleri.

## Uygulanan

- Tuvalet, içme suyu, şarj, oyun alanı, spor merkezi, veteriner, geri dönüşüm, kamp, piknik, seyir noktası, müze ve plaj. Mevcut kategori panelinden seçilir; liste ve haritada gösterilir.
- İsimsiz altyapı noktaları kategori adıyla korunur. Yeni kategorilerde açıkça özel/yasak erişimli kayıtlar ve içilmez olarak işaretlenen su noktaları çıkarılır. Ücret, erişilebilirlik, bebek bakım alanı, kayıtlı çalışma saatleri ve bilinen şarj soketi/gücü varsa gösterilir. Eksik özellik olumlu kabul edilmez; saat etiketinden otomatik "açık" sonucu çıkarılmaz.
- Seçilen yeni kategori için 5 km OSM sorgusu, ayrıca 4,5 km Overture kategori sorgusu yapılır. Overture'ın genel 300 sonuç sınırından önce kategori filtrelenir; yoğun restoran/mağaza verisi veteriner veya müzeleri gizlemez. Haritaya geçişte bulunan kayıtlar korunur.
- Hava kalitesi, Tümü ekranındaki hava kartında kısa bir açılır satırdır. PM2.5, PM10 ve Avrupa AQI; CAMS/Open-Meteo **model tahmini**. Endeks bantları sağlayıcı dokümanından alındı; yerel sensör ölçümü veya sağlık garantisi değildir.
- İstanbul konumunda İSPARK'ın bildirdiği boş/toplam kapasite ile kaynakta aktif belediye tuvaletleri birleştirilir. Diğer şehirlerde İBB isteği yapılmaz. Sonuçlar koordinata göre süzülür; İstanbul etiketi ülke geneli kapsam anlamına gelmez.
- Sıfır boş yer ile bilinmeyen kapasite ayrılır. Kapalı kaydı ve eski veri açıklaması korunur. Bir kaynağın başarısız olması diğer kaynağın kayıtlarını silmez. Kaynak/lisans açıklamaları yer ayrıntısındadır.
- Yeni Vercel fonksiyonu eklenmedi; `/api/nearby` doğrulanmış `layer=air` ve `layer=municipal` seçenekleriyle genişletildi. Toplam 12 fonksiyon sınırı korunuyor.

## Canlı doğrulama

| Kaynak | İstek / sonuç | Sınır |
|---|---|---|
| OSM Overpass | Antalya `36.88,30.70`, 5 km örneğinde bir sağlayıcı 116 kayıt verdi: 45 tuvalet, 45 oyun alanı, 15 su, 11 şarj. | Bu sağlayıcının veri tabanı zamanı 24 Temmuz 2026; güncel işletme doğrulaması değil. Başka sağlayıcı daha az kayıt döndürdü. Sayılar hizmetlerin aktif/erişilebilir olduğu anlamına gelmez. |
| OSM yeni sorgu | Konyaaltı başlangıç noktası `36.8615,30.6377`, 5 km: alternatif sağlayıcı 25 kayıt; tuvalet, oyun, su, kamp ve geri dönüşüm. | İlk sağlayıcı sonraki denemelerde HTTP 500; alternatif kaynak çalıştı. Arşivlenen eski kayıtlar güncel veriyle birleştirilerek yeniden canlandırılmadı. |
| Overture Places | Antalya `36.88,30.70`, 3 km genel sorguda 300 kayıt. Yeni sınıflandırmayla plaj, müze, kamp ve veteriner geldi. | Statik `2026-09-23.1` veri sürümü; canlı açık olma/doluluk değil. |
| Overture kategori sorgusu | Aynı merkez, 4,5 km: **1 elektrikli araç şarj, 75 veteriner, 25 müze kaydı**. Her sorguda 36/36 karo başarıyla okundu. | Kaynak kaydı sayısı; bağımsız işletme doğrulaması değil. İstemci kaynaklar arası yakın/aynı adlı kopyaları ayrıca azaltır. |
| Open-Meteo Air | Antalya, İstanbul, Ankara, İzmir, Van: PM2.5, PM10, Avrupa AQI için 48/48 saat dolu. Sunucu normalleştiricisi Antalya'nın güncel saatini seçti. | Beş örnek tüm ülke için kesintisiz hizmet garantisi değil. |
| İBB / İSPARK | `/ispark/Park`: 245 kayıt, koordinat/kapasite/boş yer/açıklık alanları. | Sağlayıcı ölçüm zamanı yanıtında yok; uygulama kendi veri alma zamanını gösterir. |
| İBB tuvaletleri | GeoJSON 422 kayıt; 386'sı kaynakta Aktif, 19 Pasif, 17 Dönemlik. Yalnız Aktif kayıtlar alındı. | Kaynaktaki durum fiziksel olarak bağımsız doğrulanmadı. |
| İBB yakın sonuç | İstanbul `41.01,28.97`, 15 km sunucu filtresi: 231 tuvalet + 197 otopark; iki kaynak da geldi. | Kullanıcı konumu değişince yeniden süzülür. |

Canlı sunucu kodu Node 22'nin desteklenen `NODE_USE_ENV_PROXY=1` ayarıyla bu ortamda çalıştırıldı; TLS doğrulaması açık kaldı. API anahtarı, giriş, CAPTCHA veya erişim koruması aşılmadı.

## Birincil kaynaklar ve kullanım

- [OSM/Overpass API](https://wiki.openstreetmap.org/wiki/Overpass_API), [OSM telif ve ODbL](https://www.openstreetmap.org/copyright). İstemci kaynak atfı ve lisans bağlantısı gösterir; bu kaynakların veri tabanı koşulları ayrıca geçerlidir.
- [Overture Places atıf/lisansları](https://docs.overturemaps.org/attribution/): Meta, Microsoft ve diğer sağlayıcılar için CDLA Permissive 2.0; Foursquare Apache 2.0/bildirimler; AllThePlaces CC0. Yer ayrıntısında bu kaynağa bağlantı verilir.
- [Open-Meteo hava kalitesi dokümanı](https://open-meteo.com/en/docs/air-quality-api), [kullanım koşulları](https://open-meteo.com/en/terms). CC BY 4.0 kaynak atfı gösterilir. Ücretsiz barındırılan API'nin ticari kullanım şartı veri lisansından ayrıdır.
- [İSPARK veri kümesi](https://data.ibb.gov.tr/dataset/ispark-otopark-listesi-web-servisi), [tuvalet veri kümesi](https://data.ibb.gov.tr/dataset/sehir-tuvaletleri-veri-seti), [İBB Açık Veri Lisansı](https://data.ibb.gov.tr/license). Lisans ticari/ticari olmayan kullanım ve uyarlamaya izin verir; atıf/lisans bağlantısı gerektirir. Belirtilen kamu sektörü atıf cümlesi ayrıntıda gösterilir. Kurumun uygulamayı onayladığı ileri sürülmez.

## Antalya'da ek keşifler

- Konyaaltı Belediyesi'nin [pazar yerleri](https://www.konyaalti.bel.tr/pazar-yerleri) sayfasında sekiz pazarın günü, adresi ve harita bağlantısı var. Günler belediye sayfasında doğrulandı; bu sayfadan takvim entegrasyonu bu sürüme alınmadı.
- Antalya CBS portalının kamuya açık `/portal/sharing/rest/search` uç noktasında 27 Feature Service kaydı bulundu. Parklar; tuvalet, oyun/spor ve oturma elemanı katmanları ile hizmet birimleri metadatası erişilebilir. İncelenen öğelerde yeniden kullanım lisansı boş/belirsiz; kayıtlar uygulamaya kopyalanmadı. İtfaiye denetimi veya kişi içerebilecek satırlar indirilmedi.
- AFAD son deprem sayfası erişilebilir; denenen eski JSON filtre yolu beklenen JSON vermedi. Deprem entegrasyonu çalışır sayılmadı.
- Open Charge Map canlı POI API'si anahtar gerektiren HTTP 403 döndü; anahtar koruması aşılmadı. Şarj ekranında OSM ve Overture verisi kullanıldı.

## Kontroller

API/veri testleri: isim olmayan yerler, özel erişim, içilmez su, soket bilgisi, sıfır/eksik/çelişkili kapasite, belediye kapsamı, önbellek ve kısmi hata, hava birimi/saat kontrolü, geçersiz istekler. Mobil testler: kategori seçimi, ayrıntı/lisans, harita geçişi, İBB kapsamından çıkış, hava verisi/eksik değer/yeniden deneme, genel sonuç sınırına takılmayan kategori sorgusu. Mevcut market, balıkçılık, radyo, harita ve oyun kontrolleri de çalıştırılır.
