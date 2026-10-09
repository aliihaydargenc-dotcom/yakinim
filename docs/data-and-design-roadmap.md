# Yakınım: yeni veriler ve tasarım önerisi

9 Ekim 2026. İncelenen uygulama sürümü: `c575c1e`. Önerilen ilk adım: **konuma bağlı hava/UV özeti, Türkiye kıyılarına açılan balıkçılık ve içerikleri öne alan küçük arayüz düzenlemeleri**. Yeni kategori sayısını artırmadan önce mevcut bilgileri bulmayı ve karşılaştırmayı kolaylaştırmak daha değerli.

Bu belge araştırmayı ve onaylanan geliştirmeyi birlikte kaydeder. Uygulanan ilk sürüm: görünür konum etiketi, kategori panelleri, sade fiyat ekranı, kısa hava/UV özeti, Türkiye kıyı seçimi, saat karşılaştırması, ek deniz/hava alanları, cihazda favori kıyılar ve özel av günlüğü. Hava kalitesi, şarj, belediye genişlemesi ve deprem servisleri araştırma adayları olarak kalır. Tasarım örneği: [HTML dosyası](previews/yakinim-design-concept.html). Dosyadaki bütün fiyatlar ve tahminler örnektir; düğmeler ve saat seçimi denenebilir.

## Kanıtın kapsamı

- React uygulaması, API'ler ve kategori yapısı incelendi. Mobil ekranlar 390×844 boyutunda yerel arayüz ve **canlı üretim API yanıtlarıyla** görüntülendi. Üretim sitesi tarayıcıdan ortamın sertifika zinciri nedeniyle açılamadı; HTTPS doğrulaması kapatılmadı. Üretim API'leri curl ile normal TLS doğrulamasıyla alındı.
- Open-Meteo hava/deniz uç noktalarına doğrudan istekler HTTP 200 döndü. Antalya, İzmir kıyısı ve Trabzon kıyısı örnekleri kontrol edildi. Bu kontrol tüm kıyı noktalarında kesintisiz veya aynı çözünürlükte veri garantisi değildir.
- Açık kaynak sunucu kodu `454d6ef3ef683587afac067f31627088cd111637` sürümünde incelendi. Alanın kodda bulunması ile Türkiye'den canlı yanıt alınması aşağıda ayrı belirtilir.
- Hava kalitesi, AFAD, OBIS ve Overpass istekleri bu ortamın ağ geçidi tarafından 403 ile engellendi. Bu, sağlayıcının kullanılamadığı anlamına gelmez; bu servislerden canlı veri doğrulaması yapılmış sayılmaz.

## Türkiye genelinde eklenebilecek veriler

| Öncelik | Kullanıcıya sağlayacağı bilgi | Kaynak | Doğrulama / kapsam | İşin büyüklüğü |
| --- | --- | --- | --- | --- |
| 1 | Hissedilen sıcaklık, yağmur, görüş ve UV; dışarı çıkmadan kısa özet | [Open-Meteo Weather](https://open-meteo.com/en/docs) | Antalya örneğinde yeni alanlar canlı alındı. Türkiye genelindeki konumlar için mevcut tahmin mimarisi kullanılabilir; bunlar model tahminidir. | Küçük; balıkçılıktaki hava sorgusu genişletilebilir. |
| 2 | Hava kalitesi, toz ve polen | [Open-Meteo Air Quality](https://open-meteo.com/en/docs/air-quality-api), CAMS | `pm10`, `pm2_5`, `dust`, `european_aqi`, polen alanları sunucu kodunda doğrulandı. Canlı istek ortamda engellendi. Avrupa/global model kapsamı, özellikle polen için şehir bazında ayrıca denenmeli. | Orta; birimler, endeks türü ve eksik kapsam ayrı işlenir. |
| 3 | Yakındaki şarj noktalarının konumu ve kaynakta varsa soket bilgileri | [OpenStreetMap / Overpass](https://wiki.openstreetmap.org/wiki/Tag:amenity%3Dcharging_station); ikinci sağlayıcı adayı [Open Charge Map](https://openchargemap.org/site/develop/api) | Uygulama OSM altyapısını zaten kullanıyor. Yeni etiket sorgusu ağ geçidinde engellendi. Open Charge Map canlı erişimi/anahtar koşulları bu çalışmada denenmedi. Konum kaydı, soketin o anda boş veya çalışır olduğunu kanıtlamaz. | Orta; nokta dizini kolay, gerçek doluluk için işletmeci entegrasyonu gerekir. |
| 4 | Yakındaki son depremler: tarih, merkez, büyüklük, mesafe | [AFAD](https://deprem.afad.gov.tr/last-earthquakes.html) | Resmî kaynak adayı. Canlı erişim engellendi; otomatik veri sözleşmesi henüz doğrulanmadı. Deprem tahmini/erken uyarı olarak sunulamaz. | Orta; veri erişimi ve deprem türü/büyüklük birimleri önce doğrulanır. |
| 5 | Konumun şehrine uygun kesinti, ulaşım ve belediye etkinlikleri | İlgili belediye/dağıtım şirketi; mevcut Muratpaşa ve AEDAŞ bağlantıları | Projede çalışan bölgesel entegrasyonlar var. Ülke çapında tek doğrulanmış ortak API yok; şehir bazında sağlayıcı ve kapsam gerekir. | Büyük; birkaç şehirle başlayıp sağlayıcı dizini genişletilir. |
| 6 | Yakındaki içme suyu çeşmeleri, tuvalet, geri dönüşüm ve erişilebilirlik bilgileri | [OpenStreetMap](https://wiki.openstreetmap.org/wiki/Map_features) | Aynı harita altyapısıyla yapılabilir; yeni alanlar için canlı sorgu/yerel kapsam henüz test edilmedi. Eksik etiket “yok” veya “erişilemez” anlamına gelmez. | Küçük–orta; yeni etiket eşlemeleri ve kaynak/eksik veri gösterimi gerekir. |

Akaryakıt fiyatı, canlı otopark doluluğu ve canlı şarj doluluğu da yararlı adaylar; ancak ülke çapında güvenilir ve kullanımı uygun bir ortak veri servisi bu araştırmada doğrulanmadı. Bunları hazır entegrasyon gibi planlamamak gerekir.

## Balıkçılık: alınabilen yeni bilgiler

| Yeni bilgi | Alan / birim | Kontrol sonucu | Kullanıcının neyi anlamasına yardım eder? |
| --- | --- | --- | --- |
| Yerel rüzgâr dalgası | `wind_wave_height` m, `wind_wave_period` s | Antalya'da 48/48 saat dolu | Dalganın rüzgârla birlikte değişimini inceleme. |
| Swell / uzaktan gelen dalga | `swell_wave_height` m, `swell_wave_period` s | Antalya'da 48/48 saat dolu | Rüzgâr azalsa da dalganın neden sürebildiğini görme. |
| Yüzey akıntısı | `ocean_current_velocity` varsayılan km/h; `wind_speed_unit=ms` isteğinde m/s, `ocean_current_direction` ° | Antalya'da 48/48 saat dolu; İzmir ve Trabzon örneklerinde 24/24 saat dolu | Bölgesel akıntıyı bağlam olarak gösterme; iskele dibindeki akıntı ölçümü değildir. |
| Deniz seviyesi | `sea_level_height_msl` m | Antalya'da 48/48 saat dolu | Ortalama deniz seviyesine göre model değerini izleme; tek başına gelgit/av saati tablosu veya kıyı güvenlik ölçüsü değildir. |
| Görüş mesafesi | `visibility` m | Antalya'da canlı alındı | Görüş koşullarını planlamada kullanma. |
| Bulut, yağış miktarı, hissedilen sıcaklık | `cloud_cover` %, `precipitation` mm, `apparent_temperature` °C | Antalya'da canlı alındı | Kıyıda kalma süresi ve hazırlığı için hava bağlamı. |
| UV ve güneşlenme | `uv_index_max`, `sunshine_duration` s | Antalya'da günlük alanlar canlı alındı | Güneşe maruz kalma bilgisi. |
| Basınç eğilimi | `pressure_msl` hPa | API zaten alıyor; mevcut ekran göstermiyor | Saatler arasındaki basınç değişimini gösterme; av başarısı kuralı değildir. |

### Türkiye kıyılarına genişletme

Veri kaynağı Antalya ile sınırlı değil. Şu örnek istekler canlı çalıştı:

- İzmir kıyısı `38.43,27.10`: dalga yüksekliği, deniz sıcaklığı ve akıntıda 24/24 saat dolu.
- Trabzon kıyısı `41.02,39.72`: aynı alanlarda 24/24 saat dolu.

Uygulamadaki Antalya koordinat sınırı ve sahil düğmeleri bunun için genişletilmeli. Fiyatlarda yaptığımız ülke geneli açılımına benzer, fakat balıkçılıkta **deniz hücresi ve kıyı seçimi** de ele alınmalı. İç bölgede GPS konumunu otomatik av noktası saymak yerine haritadan kıyı seçimi sunulmalı.

Önemli bulgu: Trabzon isteğinin döndürdüğü deniz model konumu `41.208336,39.708344`; seçilen kıyıdan yaklaşık 21 km uzakta. İzmir için dönen konum `38.458336,27.041672`. Dolayısıyla “bu kayalıkta ölçülen koşul” dili yanlış olur. API zaten `modelLocations` alanını saklıyor; tahminin bölgesel olduğu ve model konumunun farklı olabildiği anlaşılır gösterilmeli.

### Balıkçılık için diğer kaynaklar / kullanıcı verisi

- **Güncel tür/boy/dönem/bölge kuralları:** [BSGM](https://www.tarimorman.gov.tr/BSGM) ve [Resmî Gazete](https://www.resmigazete.gov.tr/). BSGM'ye erişildi; yürürlükteki tebliğ ile tüm değişiklikler birlikte doğrulanmadı. Tür limitlerini doğrulanmış sayısal içerik olarak henüz eklememek gerekir. İleride kaynak bağlantısı ve kontrol tarihi olan tür rehberi oluşturulabilir.
- **Resmî deniz uyarısı:** [MGM deniz sayfası](https://www.mgm.gov.tr/deniz/deniz.aspx) erişildi. Otomatik, kararlı bir uyarı API'si doğrulanmadı. İlk aşamada görünür resmî kaynak bağlantısı; otomatik uyarı için ayrı sözleşme araştırması.
- **Derinlik/kıyı yapısı:** [EMODnet Bathymetry](https://emodnet.ec.europa.eu/en/bathymetry) ve [Copernicus Marine](https://marine.copernicus.eu/) ikinci aşama adayları. Bu oturumda servis/lisans/kıyı çözünürlüğü doğrulanmadı. Seyir haritası veya güvenli erişim garantisi olarak kullanılamaz.
- **Klorofil ve daha zengin deniz modelleri:** Copernicus Marine adayı; ürün seçimi, erişim/hesap ve veri işleme maliyeti ayrıca araştırılmalı. Klorofil doğrudan “burada balık var” değildir.
- **Türlerin geçmiş gözlem kayıtları:** [OBIS](https://obis.org/) ve [GBIF](https://www.gbif.org/developer/occurrence) adayları. OBIS canlı erişimi engellendi; GBIF denenmedi. Tarihsel tür kaydı bugünkü av verimini göstermez.
- **Av günlüğü:** dış API gerektirmez. Kullanıcının tür, yöntem, yem, süre ve sonucunu tarih/koşullarla saklamak uygulamaya özgü en değerli veri olabilir. Noktalar varsayılan olarak özel kalır; fotoğraf/konum paylaşımı ayrı kullanıcı tercihi olur. Yeterli veri olmadan başarı yüzdesi üretmeyiz.

## Tasarım eleştirisi

Mevcut krem zemin, mor vurgu ve dört düğmeli alt menü korunmaya değer. Sorun renk azlığı değil, **içeriğin önündeki kontroller ve bilgilerin sıralaması**.

1. **Fiyat bilgisi çok aşağıda:** 390×844 ekran incelemesinde arama, ana kategori sırası, Marketler/Ürün fiyatları geçişi, dokuz kategori düğmesi ve açıklama sonrasında ilk fiyat ekranın altına geliyor. Sık kullanılan 2–3 kategoriyi görünür tutup diğerlerini erişilebilir “Diğer kategoriler” panelinde açmak; uzun kapsam açıklamasını detayda tutmak önerilir. Mesafe, paket ve güncellik kısa biçimde görünür kalır.
2. **Balıkçılık kolay fark edilmiyor:** aynı yatay sırada yer kategorileri, ulaşım, kesintiler ve balıkçılık bulunuyor. Balıkçılık ilk görünümde ekran dışında kalabiliyor. Favori/kısayol alanı veya kategorileri açan tek panel daha iyi; ana ekrana her yeni veri için bir sekme eklemeyelim.
3. **Konum görünür olmalı:** üstteki “Konum” eylemi tek başına hangi şehrin fiyatlarının gösterildiğini anlatmıyor. Şehir/ilçe veya seçilen nokta etiketini küçük bir satırda göstermeli; şehir/ilçe adı için ters konum çözümlemesi ayrıca gerekir.
4. **Balıkçılıkta önce özet ve karşılaştırma:** seçilen saat için dalga, periyot, rüzgâr ve hamleyi birlikte gösteren dört ölçü; altında Bugün/Yarın ve saat çizelgesi. Sayfalık yatay kartlar yerine küçük tablo veya grafik, saatler arasındaki değişimi daha kolay gösterir. Hazırlık, ay ve kaynak ayrıntıları açılır alanlarda kalabilir.
5. **Eksik kaynak daha anlaşılır anlatılmalı:** bir inceleme anında deniz verisi geldi, hava/güneş alanları eksikti. Mevcut “Bazı tahmin verileri eksik” metni doğru ama genel. “Deniz tahmini mevcut; hava tahmini alınamadı” gibi eldeki verilere uygun açıklama daha yararlı. Genel yenileme hatası, mevcut verinin zamanı ve hiç veri olmaması ayrı görünmeli.
6. **Fiyat kartında hiyerarşi:** ürün + paket; en düşük güncel teklif; diğer aynı ürün teklifleri; fiyat farkı. Aynı zincirin birden çok şubesi ayrıntıda açılabilir, zincir başına özet ve şube mesafesi kaybolmamalı. Farklı marka/paketlerin alternatif olduğu başlığı korunur.

Tasarım örneği ilkelerden özellikle fiyatlara hızlı ulaşmayı ve kıyı saatlerini karşılaştırmayı gösterir. Tam uygulama/harita/kategori paneli değildir. 360, 390 ve 760 pikselde yatay taşma ve fiyat/kıyı/saat düğmeleri kontrol edildi.

## Önerilen geliştirme sırası

1. **Küçük tasarım düzenlemesi:** konum satırı, kategori erişimi, kısa kaynak/kapsam satırı; fiyat ve balıkçılıkta asıl veriyi yukarı taşıma.
2. **Balıkçılık 2. sürüm:** Türkiye'den kıyı seçimi, Bugün/Yarın ve saat karşılaştırması; yeni swell/akıntı/görüş/UV alanları; eksik kaynak açıklaması ve bölgesel model konumu.
3. **Günlük yaşam:** aynı hava verisinden konuma göre kısa hava/UV kartı; ardından hava kalitesi servisinin Türkiye örnekleriyle canlı doğrulanması.
4. **Kayıtlar:** özel av günlüğü ve favori kıyılar. Daha sonra belediye/şarj/deprem entegrasyonları, her biri için kaynak kapsamı doğrulanarak eklenir.

## Kullanım koşulları ve teknik notlar

- [Open-Meteo README](https://github.com/open-meteo/open-meteo/blob/454d6ef3ef683587afac067f31627088cd111637/README.md) API verisi için CC BY 4.0 atfını belirtir; barındırılan ücretsiz API'nin ticari kullanım koşulu ayrı konudur. Mevcut sunucu önbelleğiyle aynı hava/deniz isteğinden birden çok ekran yararlanabilir. Ticari kullanım ve trafik artışında sağlayıcının planı kontrol edilir.
- [Saatlik alanlar](https://github.com/open-meteo/open-meteo/blob/454d6ef3ef683587afac067f31627088cd111637/Sources/App/Controllers/VariableHourly.swift), [CAMS kapsamı/alanları](https://github.com/open-meteo/open-meteo/blob/454d6ef3ef683587afac067f31627088cd111637/Sources/App/Cams/CamsDomain.swift), [deniz alanları](https://github.com/open-meteo/open-meteo/blob/454d6ef3ef683587afac067f31627088cd111637/Sources/App/MfWave/MfWaveVariable.swift) incelendi; sağlayıcı kodu uygulamaya kopyalanmadı.
- Akıntı hızında API varsayılanı km/h; canlı yeni istekte `wind_speed_unit=ms` ile m/s geldiği doğrulandı. Uygulama her iki birimi kabul edip m/s gösterir; rüzgârda mevcut uygulama m/s kullanıyor. Birimler açık doğrulanmalı ve tek sisteme çevrilecekse `/3.6` dönüşümü uygulanmalı. Yönlerin “geldiği/gittiği” sözleşmesi doğrulanmadan aynı ok gösterimi kullanılmamalı.
- Verisi gelmeyen alan `0` yapılmaz. Tahmin ile gözlem, ölçüm zamanı ile uygulamanın veri alma zamanı birbirinden ayrılır. Av başarısı veya güvenlik için doğrulanmamış yüzde/puan üretilmez.
- İleri canlı doğrulama için ortamda izin gereken alanlar: `air-quality-api.open-meteo.com`, `deprem.afad.gov.tr`, `api.obis.org`, `overpass-api.de`. Bu adaylar için canlı entegrasyon henüz doğrulanmış değildir.
