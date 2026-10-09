# Veri araştırması: doğrulanan bulgular

9 Ekim 2026. Kanıt: [makine tarafından üretilen denetim](public-data-audit.json). Yenileme: `python scripts/audit-public-sources.py`. Araştırma yeni servisleri uygulamaya bağlamaz.

## Sonuç

En somut yeni yollar: **şarj noktası dizini, şehirler arası ulaşım kaynakları, günlük ihtiyaç/doğa harita katmanları ve rakım**. Tek bir ulusal canlı şehir API'si bulunmadı. Kaynak bulunması, kullanım hakkı ve güncelliğin doğrulandığı anlamına gelmez.

| Veri | Gerçekten kontrol edilen | Karar |
|---|---|---|
| Şarj noktaları | Resmî OCM projesinin Türkiye klasöründe **2.098 JSON dosyası**; 60 dosya açıldı. 60/60 konum ve bağlantı tipi, 55/60 güç alanı. | Teknik erişim doğrulandı; kayıt lisansı ve güncellik filtreleriyle dizin prototipi yapılabilir. Canlı doluluk değil. |
| Ulaşım | MobilityData kataloğunda Türkiye için **25 kayıt**: 24 tarifeli veri, 1 araç-konumu kaydı. Antalya ve Muğla ZIP'leri açıldı. | Kaynak keşfi doğrulandı; sağlayıcı sözleşmesi ve güncel sefer doğrulaması gerekir. |
| Tuvalet / su / çocuk / doğa / şarj / geri dönüşüm / veteriner | OSM editörünün **9 kategori şeması** açılıp etiketler ve ek alanlar doğrulandı. | Mevcut sorgu altyapısıyla genişletilebilir. Türkiye'deki kayıt sayısı bu araştırmada ölçülmedi. |
| Rakım | Open-Meteo elevation uç noktasına Antalya, İstanbul, Ankara, İzmir koordinatları birlikte gönderildi; HTTP 200 ve 4 değer alındı. | Teknik erişim doğrulandı; hava API'si kullanım koşullarıyla birlikte planlanabilir. Anlık GPS yüksekliği değil. |
| Yer ve yol ayrıntıları | Overture Places ve Transportation Segment kaynak şemaları açıldı. Web/telefon/marka, sınıflandırma; yol yüzeyi ve erişim kuralları alanları var. | Şema doğrulandı; mevcut PMTiles dosyasındaki doluluk ve sürüm uyumu ayrıca ölçülmeli. Yol şeması tek başına rota servisi değil. |

## Şarj: kayıt ve lisans birlikte

Birincil kaynaklar: [OCM export README](https://github.com/openchargemap/ocm-export/blob/8e3bedca48ca94807d96b2f5e7ee02cffe63ae54/README.md), [referans lisansları](https://github.com/openchargemap/ocm-export/blob/8e3bedca48ca94807d96b2f5e7ee02cffe63ae54/data/referencedata.json), [Türkiye kayıtları](https://github.com/openchargemap/ocm-export/tree/8e3bedca48ca94807d96b2f5e7ee02cffe63ae54/data/TR).

- Eski `ocm-data` deposu kullanımdan kaldırılmış; README güncel export deposuna yönlendiriyor.
- GitHub contents uç noktası 1.000 dosyada duruyor. 2.098 sayısı, **kesilmemiş TR Git ağacından** hesaplandı.
- Örneklem dosya adına göre eşit aralıklı 60 kayıt; rastgele veya temsil gücü kanıtlanmış örneklem değil. 60/60 alan doluluğu bütün ülkeye genellenmez.
- 51/60 kaydın sağlayıcısı OCM Contributors, sağlayıcı ID 1; referans dosyasında **CC BY 4.0**. Diğer 9 kayıt: Toger.co ID 34 (3 kayıt, paylaşım anlaşmasıyla CC0) ve Otopriz ID 42 (6 kayıt, CC0). Bu üç sağlayıcının beyanı doğrulandı; ülke klasörünün tamamındaki diğer sağlayıcılar ayrıca kontrol edilmeli. Atıf/lisans kayıt bazında korunmalı.
- Depo sürümü 22 Nisan 2026 tarihli. Örneklemde son doğrulama yılları 2017–2026 arasında; yalnızca 19 kayıt 2026 tarihli. Depo güncellemesini işletme doğrulama tarihi olarak göstermemeliyiz.
- Uygulama için uygun alanlar: kaynak ID, koordinat, işletmeci, soket türü, kW, erişim türü, sağlayıcı, doğrulama tarihi. Kullanıcı yorumları, fotoğrafları ve katkıcı kimlikleri bu araştırmaya alınmadı.

## Ulaşım: katalog hatalarını ayıklamak

[MobilityData Türkiye kayıtları](https://github.com/MobilityData/mobility-database-catalogs/tree/c6aa6792758f7c1ad5dbb5877b843cc83d617dc7/catalogs/sources/gtfs). Resmî kaynak olarak işaretlenen adaylar arasında İstanbul, İzmir ESHOT/metro/İZBAN/tram, Kocaeli, Isparta, Sivas araç-konumu ve Flixbus var. Bu işaret sağlayıcı doğrulaması yerine geçmez.

**Kalite bulgusu:** 15 katalog kaydının koordinat kutusu Türkiye dışında. Birkaç İzmir kaydının dosya adı `tr-kocaeli-...` olsa da içerikte şehir İzmir. Dosya adına veya katalog kutusuna güvenerek konuma göre yönlendirme yapmamalıyız.

Katalogdan bulunan [üçüncü taraf GTFS dosyaları](https://github.com/Egezenn/kk-gtfs):

| Örnek | Durak | Hat | Dosyadaki hizmet dönemi | Dosyadan hesaplanan konum |
|---|---:|---:|---|---|
| Antalya | 4.618 | 167 | 1 Ekim–30 Kasım 2026 | Enlem 36,201–37,235; boylam 29,320–32,318 |
| Muğla | 3.467 | 383 | 1 Ekim–30 Kasım 2026 | Enlem 36,335–37,541; boylam 27,237–29,739 |

ZIP'lerde agency, stops, routes, trips, stop_times, shapes ve calendar dosyaları var; SHA-256 değerleri denetim JSON'unda. Bunlar üretilmiş tarifeler; araçların gerçekten bu saatlerde geldiği doğrulanmadı. [DATA_LICENSE](https://github.com/Egezenn/kk-gtfs/blob/main/DATA_LICENSE) CC0 bildiriyor; üçüncü tarafın lisansı Kentkart'ın olası üst kaynak haklarını otomatik temizlemez. Üretime almadan sağlayıcı koşulları ayrıca kontrol edilir. Katalog yazılımının Apache lisansı, listedeki tüm ulaşım verilerinin lisansı değildir.

## Harita katmanları

[OSM kategori şemaları](https://github.com/openstreetmap/id-tagging-schema/tree/459e7ecd9b94219d1d214d6105133566a402d6d9/data/presets):

- Tuvalet: ücret, açılış saatleri, erişim, bebek değiştirme, tekerlekli sandalye, el yıkama.
- İçme suyu: erişim, mevsimsel kullanım, ücret, işletmeci, şişe doldurma, tekerlekli sandalye.
- Şarj: marka, işletmeci, kapasite, erişim, ücret; güç/soket alanları için ayrı etiket kontrolü gerekir.
- Oyun alanı, kamp, piknik, seyir noktası, geri dönüşüm ve veteriner: kategori etiketleri doğrulandı.

Şema kodu lisansı ile **OSM veri tabanının ODbL koşulları** ayrıdır. Atıf ve birleşik/türetilmiş veri tabanı yükümlülükleri tasarımda değerlendirilir. Eksik `wheelchair`, `opening_hours` veya `fee` etiketi olumlu cevap sayılmaz. İçilebilirlik kaydı suyun güncel laboratuvar ölçümü değildir.

## Rakım ve Overture

Denendi: `https://api.open-meteo.com/v1/elevation?latitude=36.88,41.01,39.93,38.42&longitude=30.70,28.97,32.86,27.14`; yanıt `{"elevation":[0.0,48.0,870.0,13.0]}`. Dört nokta bütün ülke doğrulaması değildir. Rakım, yürüyüş planlamasında bağlam olabilir; rota eğimi için rota boyunca örnekleme gerekir. [Open-Meteo koşulları](https://open-meteo.com/en/terms): veri atfı ve barındırılan API'nin ticari kullanım koşulları ayrı ele alınır.

[Overture Places](https://github.com/OvertureMaps/schema/blob/main/schema/places/place.yaml) şemasında telefon, web sitesi, marka, adres, taxonomy ve confidence var. Confidence müşteri puanı değildir. [Transportation](https://github.com/OvertureMaps/schema/blob/main/schema/transportation/segment.yaml) yol yüzeyi ve erişim kurallarını tanımlar. İndirilen veri sürümünün lisansı, kaynakları ve alan doluluğu incelenmeden bunları hazır entegrasyon saymıyoruz.

## Erişim ve sonraki sıra

Kamuya açık kaynak şemaları ve indirilebilir dosyalar normal HTTPS ile incelendi; giriş, CAPTCHA, koruma veya ağ kuralı aşılmadı. Kullanım hakkı belirsiz kaynaklar üretime alınmadı. Hava kalitesi, AFAD, İBB portalı, GBIF, OBIS ve canlı OCM API'si için doğrudan erişim hâlâ ortam ağ geçidinde engelli; yeni alanlar mevcut izinler korunarak ortam taslağına kaydedildi. Taslak kaydı çalışan ortamı değiştirmiyor.

Uygulama sırası: **OSM günlük ihtiyaç katmanları → lisansı açık/güncelliği görünür şarj dizini → şehir sağlayıcı dizini ve doğrulanmış tarifeler → hava kalitesi**. Canlı doluluk, ülke geneli güncel menü/akaryakıt ve otomatik belediye duyuruları için uygun ortak servis henüz doğrulanmadı.
