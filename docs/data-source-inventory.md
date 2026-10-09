# Yakınım veri kaynağı envanteri

Kontrol: 9 Ekim 2026. Amaç: kategori fikirlerinden önce alınabilecek alanları, gerçek kapsamı ve erişim gereksinimlerini belirlemek.

Devam araştırması: [doğrulanan dosyalar, lisanslar ve kalite bulguları](research/public-data-findings.md). Kamuya açık GitHub exportları üzerinden Türkiye şarj dosyaları, ulaşım katalogları ve OSM şemaları incelendi; rakım API'sinden canlı yanıt alındı. Aşağıdaki ilk envanterdeki aday statüleri için bu yeni kanıt kaydı esas alınır.

## Kanıt ve durum

**Mevcut**: depoda entegrasyon var; bu oturumda her kaynağın canlı çalıştığı anlamına gelmez. **Genişletme**: mevcut sağlayıcının veri modeliyle yapılabilecek ek sorgu; yerel doluluk henüz ölçülmedi. **Aday**: erişim, kullanım koşulları ve örnek yanıt doğrulanmadan uygulamaya alınmaz.

Bu oturumda hava kalitesi, GBIF, AFAD, İBB açık veri, Overpass, Wikidata ve Open Charge Map uç noktalarına istek yapıldı. Hepsi sağlayıcı yanıtından önce ağ geçidinin CONNECT 403 engeline takıldı. Sağlayıcı kesintisi veya başarısız API olarak değerlendirilmez. Önceki araştırmada hava/deniz örnekleri canlı doğrulanmıştı; ayrıntılar `data-and-design-roadmap.md` içinde.

## Mevcut kaynaklar

| Veri | Kaynak / erişim | Kapsam ve sınır |
|---|---|---|
| Yerler: market, restoran, eczane, ATM, sağlık, akaryakıt, otopark, park | OpenStreetMap / Overpass; `lib/nearby.cjs`, `lib/viewport.cjs` | Koordinat sorgusu ülke genelinde; harita kayıtlarının eksiksizliği garanti değil. Açık olma/doluluk kanıtı değil. |
| Ek yer dizini | Overture Places / PMTiles; `api/overture.js` | Tarihli veri sürümü; güncel işletme durumunu kanıtlamaz. |
| Ürün ve şube teklifleri | TÜBİTAK Market Fiyatı; `lib/prices.cjs` | Konuma göre kapsanan zincir/şubeler; tüm marketler veya tüm ürünler değil. |
| Nöbetçi eczane | TİTCK e-Devlet sorgusu, ikincil sağlayıcı; `api/duty.js` | İl ve gün sorgusu mevcut; HTML/oturum akışına bağımlı. Kaynak ve sorgu tarihi gerekli. |
| Durak, yaklaşan araç, güzergâh | Kentkart / Antalyakart; `lib/transit.cjs` | Bölge 026; Antalya entegrasyonu. Ülke geneli gibi gösterilmemeli. |
| Elektrik / su kesintisi | AEDAŞ; su için SuKesintileri.com.tr; `lib/outages.cjs` | Antalya odaklı; su kaynağı resmî kurum değil. Kapsam ve kaynak ayrılmalı. |
| Etkinlik | Muratpaşa, Antalya kitap fuarı, bilet/etkinlik sayfaları; `lib/events.cjs` | Antalya odaklı, bir kısmı belirli sayfalara bağlı; tam etkinlik takvimi değil. |
| Haber | Yayıncı RSS; `lib/news.cjs` | Ulusal/kategori akışı; otomatik olarak yerel haber sayılmaz. |
| Hava / deniz | Open-Meteo; `lib/fishing.cjs` | Hava koordinata göre; deniz kıyı/model hücresine göre. Tahmin ile ölçüm ayrılır. |

## Yeni veri aileleri

| Aile | Çekilebilecek alanlar | Kaynak ve yöntem | Durum / önemli sınır |
|---|---|---|---|
| Tuvalet ve su | Konum, ücret, erişim, tekerlekli sandalye, içilebilirlik etiketi | [OSM](https://wiki.openstreetmap.org/wiki/Map_features): `amenity=toilets`, `drinking_water` | Genişletme; olmayan etiket bilinmiyor demektir. |
| Çocuk / spor | Oyun alanı, spor sahası, spor türü, erişim | OSM `leisure=playground/pitch/sports_centre` | Genişletme; tesis kaydı rezervasyon/doluluk değil. |
| Doğa / keşif | Kamp, piknik, seyir noktası, plaj, müze, tarihî yer | OSM `tourism`, `natural=beach`, `historic` | Genişletme; giriş ücreti ve saatler eksik olabilir. |
| Yürüyüş / bisiklet | Yol geometrisi, rota ilişkisi, yüzey, eğim bilgisi varsa | OSM yol/rota verisi | Genişletme; nokta sorgusundan ayrı rota işleme gerekir. Yol bulunması güvenli/geçilebilir olduğunu kanıtlamaz. |
| Erişilebilirlik | Wheelchair, basamak, erişilebilir tuvalet, yüzey | OSM etiketleri | Genişletme; bilinmeyen değer erişilebilir diye sunulmaz. |
| Geri dönüşüm / evcil hayvan | Atık türü, konteyner; veteriner, köpek parkı | OSM `amenity=recycling/veterinary`, `leisure=dog_park` | Genişletme; toplama programı ayrı belediye verisi. |
| Şarj istasyonu | Konum, işletmeci, soket türü, güç, erişim | OSM; [Open Charge Map](https://openchargemap.org/site/develop/api) | OSM genişletme; OCM aday, anahtar/koşul doğrulanacak. Canlı uygunluk için işletmeci gerekir. |
| Hava kalitesi | PM2.5, PM10, NO2, ozon, toz, AQI | [Open-Meteo CAMS](https://open-meteo.com/en/docs/air-quality-api) | Aday; model verisi. Polen alanlarının bölgesel kapsamı ayrıca test edilir. |
| Deprem kayıtları | Zaman, merkez, derinlik, büyüklük/türü, kullanıcıya mesafe | [AFAD](https://deprem.afad.gov.tr/last-earthquakes.html) | Aday; erişim sözleşmesi doğrulanacak. Erken uyarı/tahmin değil. |
| Toplu ulaşım | Durak, hat, sefer takvimi; varsa araç konumu | Belediye açık verisi, [GTFS / GTFS-Realtime](https://gtfs.org/) | Şehir bazında aday. GTFS standarttır; Türkiye çapında ortak veri sağlayıcısı değil. |
| Otopark / trafik | Konum, kapasite, ücret; varsa canlı doluluk ve yol durumu | [İBB Açık Veri](https://data.ibb.gov.tr/), diğer belediye portalları | Aday; her veri kümesinin güncellemesi ve lisansı ayrı kontrol edilir. |
| Semt pazarları | Kurulduğu gün, adres, koordinat, belediye duyurusu | İlçe belediyelerinin pazar listeleri | Aday; ülke geneli tek API doğrulanmadı. Tatil/taşınma değişiklikleri gerekir. |
| Etkinlik / kültür | Tarih, mekân, fiyat/ücretsiz, yaş sınırı, kaynak bağlantısı | Belediyeler, kültür kurumları, bilet sağlayıcıları | Şehir bazında aday; tekrar kayıt ve iptal takibi gerekir. |
| Kesinti / şehir duyurusu | Mahalle, başlangıç/bitiş, neden, duyuru zamanı | Su idaresi, elektrik dağıtımı, belediye | Şehir/şirket bazında aday; tek ulusal feed doğrulanmadı. |
| Deniz / balıkçılık ileri | Derinlik, deniz tabanı, klorofil, ek akıntı ürünleri | [EMODnet](https://emodnet.ec.europa.eu/en/bathymetry), [Copernicus Marine](https://marine.copernicus.eu/) | Aday; hesap, ürün, lisans, çözünürlük ve işleme maliyeti araştırılacak. |
| Doğa gözlemi | Tarihsel tür kaydı, tarih, koordinat hassasiyeti | [GBIF](https://www.gbif.org/developer/occurrence), [OBIS](https://api.obis.org/) | Aday; güncel hayvan/balık varlığı veya av verimi değil. Kayıt lisansı ve hassas konum kontrol edilir. |
| Yerlerin kültürel açıklaması | Açıklama, görsel lisansı, resmî web adresi | [Wikidata](https://www.wikidata.org/wiki/Wikidata:Data_access), Wikimedia | Aday; mekân eşleştirme ve her görselin lisansı ayrı. |

Akaryakıt fiyatı, restoran güncel menüsü, işletme yoğunluğu, canlı şarj ve canlı otopark için ülke geneli kullanılabilir ortak servis henüz doğrulanmadı. Bunlar sağlayıcı anlaşması gerektirebilir; bir web sayfasının açık olması otomatik kullanım izni değildir.

## Kaynak kabul koşulu

Her kaynak için: örnek yanıt, coğrafi kapsam, sağlayıcı zamanı, alma zamanı, güncelleme sıklığı, kimlik doğrulama, lisans/attribution, istek limiti, maliyet, hata davranışı ve sorumlu sağlayıcı kaydedilir. Bu alanlar dolmadan “hazır” statüsü verilmez.

Harita aileleri için Antalya, İstanbul, Ankara, İzmir ve küçük şehir/ilçe örneğinde kayıt sayısı ve temel alan doluluğu ölçülür. Kullanıcıya verisiz bölgede boş sonuç ile sağlayıcı hatası farklı gösterilir. Model verisi, gözlem, statik dizin ve canlı durum ayrı etiketlenir.

## Önerilen sıra

1. Mevcut kaynaklarda gerçek kapsam ve güncellik görünürlüğü; Antalya entegrasyonlarını ülke geneli sanan akışları düzeltmek.
2. Aynı OSM altyapısıyla tuvalet/su, çocuk/spor, doğa/keşif ve erişilebilirlik alanları için beş bölgede örnek sorgu ve doluluk ölçümü.
3. Hava kalitesi ve şarj dizini adaylarında canlı API/lisans doğrulaması.
4. Belediye kaynak dizini: önce Antalya, İstanbul, Ankara, İzmir; her şehir için ulaşım, pazar, etkinlik, kesinti ayrı yetenek kaydı.
5. Güvenilir kaynaklar arttığında kullanıcının niyetine göre birleştirme: çocukla dışarı çıkma, araçla yolculuk, yürüyüş, günlük ihtiyaç. Eksik veriden öneri türetilmez.

Canlı araştırmanın devamı için izin gereken aday alanlar: `air-quality-api.open-meteo.com`, `api.gbif.org`, `deprem.afad.gov.tr`, `data.ibb.gov.tr`, `overpass-api.de`, `www.wikidata.org`, `api.openchargemap.io`. Bu belge araştırma kaydıdır; yeni servisler uygulamaya eklenmiş değildir.
