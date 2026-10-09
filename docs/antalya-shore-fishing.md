# Antalya kıyı balıkçılığı: veri ve ürün araştırması

Araştırma tarihi: 9 Ekim 2026. Kapsam: Antalya kıyılarında karadan amatör olta balıkçılığı. Araştırma tamamlandı; balıkçılık ekranı ve canlı tahmin API entegrasyonu uygulamaya eklendi. Aşağıda kaynaklar, model sınırları ve sonraki geliştirme önerileri yer alıyor.

## Öneri

İlk sürümde **“Bugün kıyıda koşullar nasıl, hangi saatleri karşılaştırmalıyım?”** sorusunu yanıtlamak en yararlı başlangıç. Rüzgâr, hamle, dalga yüksekliği/periyodu/yönü, yağış ve gün doğumu/batımı aynı saat çizelgesinde gösterilebilir. Deniz sıcaklığı ve akıntı, mevcutsa ek bağlam sağlar. Ay bilgisi ayrı bir bilgi kartı olarak kalmalı.

Bu verilerden Antalya için doğrulanmış bir “balık tutma olasılığı” elde edilmez. Kullanıcıya “%87 balık var” gibi bir sonuç üretmek yerine, seçilen saatlerin neden karşılaştırılmaya değer olduğu açıklanmalı. Tür, yöntem, kıyı yapısı ve kişinin av günlüğü sonraki aşamada bu yorumu kişiselleştirebilir.

## Kaynak kodundan doğrulanan bulgular

Tersine mühendislik çalışması Open-Meteo'nun herkese açık sunucu kodundaki istek işleme, değişken eşleme ve model seçimi akışının incelenmesine dayanıyor. İncelenen sürüm: [`454d6ef3ef683587afac067f31627088cd111637`](https://github.com/open-meteo/open-meteo/tree/454d6ef3ef683587afac067f31627088cd111637). Aşağıdaki bulgular koddan doğrulandı; Antalya için hava ve deniz API yanıtları da canlı alınıp birimler ve zaman damgaları kontrol edildi.

| Bilgi | Kodda doğrulanan alan | Kıyı balıkçılığı ekranında kullanım |
| --- | --- | --- |
| Dalga | `wave_height`, `wave_period`, `wave_direction` | Saatler arasında deniz koşullarını karşılaştırma; yönü kıyının bakışıyla yorumlama |
| Rüzgâr dalgası / swell | `wind_wave_*`, `swell_wave_*` | Rüzgâr azalsa da uzun periyotlu dalganın devam edebileceğini görünür kılma |
| Yüzey akıntısı | `ocean_current_velocity`, `ocean_current_direction` | Model tahminini bağlam olarak gösterme; iskele dibindeki yerel akıntı ölçümü gibi sunmama |
| Deniz yüzeyi sıcaklığı | `sea_surface_temperature` | Günler arası eğilim; dip suyu sıcaklığı olarak adlandırmama |
| Rüzgâr ve hava | `wind_speed_10m`, `wind_gusts_10m`, `wind_direction_10m`, `precipitation_probability`, `weather_code`, `pressure_msl` | Atış koşulları, hava değişimi ve basınç eğilimi |
| Güneş | `sunrise`, `sunset` | Sabah/akşam saatlerini seçme; av verimini garanti eden bir kural kurmama |
| Ay | `moonrise`, `moonset`, `moon_phase` | Astronomik bilgi kartı; canlı servis desteği doğrulandı; ilk sürüm ay evresini gösterir |

Kaynaklar: [saatlik alanlar](https://github.com/open-meteo/open-meteo/blob/454d6ef3ef683587afac067f31627088cd111637/Sources/App/Controllers/VariableHourly.swift), [günlük alanlar](https://github.com/open-meteo/open-meteo/blob/454d6ef3ef683587afac067f31627088cd111637/Sources/App/Controllers/VariableDaily.swift), [deniz değişkenleri ve birimleri](https://github.com/open-meteo/open-meteo/blob/454d6ef3ef683587afac067f31627088cd111637/Sources/App/MfWave/MfWaveVariable.swift), [istek işleme ve ay/güneş hesabı](https://github.com/open-meteo/open-meteo/blob/454d6ef3ef683587afac067f31627088cd111637/Sources/App/Controllers/ForecastapiController.swift).

### Kıyı için önemli model sınırı

Deniz uç noktasında varsayılan hücre seçimi `sea`. Kıyı koordinatı için dönen model koordinatı, kullanıcının seçtiği yerle birebir aynı olmayabilir. Yanıtta dönen koordinatlar da saklanmalı ve haritada tahminin hangi deniz hücresine ait olduğu gösterilmeli.

İncelenen Météo-France dalga/akıntı/sıcaklık kaynağı `1/12°` ızgara kullanıyor. Antalya enleminde bu yaklaşık kuzey-güney 9,3 km, doğu-batı 7,4 km ölçeğindedir. Bu hesap yalnız bu model içindir; `marine_best_match` başka modeller de seçebilir. Aynı modelin ham zaman adımları dalgada 3 saat, akıntıda 1 saat, sıcaklıkta 6 saattir. API'deki saatlik seri her saatin ayrı bir ölçüm olduğu anlamına gelmez.

Kaynak: [model ızgarası, zaman adımı ve güncelleme aralığı](https://github.com/open-meteo/open-meteo/blob/454d6ef3ef683587afac067f31627088cd111637/Sources/App/MfWave/MfWaveDomain.swift). Küçük koy, mendirek, kayalık ve kıyıya vuran dalga bu ölçekle yeterince temsil edilmeyebilir. Tek bir dalga eşiğinden “bu nokta güvenli” sonucu çıkarılmamalı.

## Antalya için kullanıcıya yararlı içerik

- **Yer seçimi:** Konyaaltı, Lara/Kundu, Kemer, Kaş/Kalkan, Manavgat/Side ve Alanya için ayrı başlangıç bölgeleri; kullanıcı tam kıyı noktasını haritadan seçer. Bunlar doğrulanmış avlak önerileri değildir.
- **Kıyı tipi:** Kum/çakıl, kayalık veya iskele; kullanıcı seçimiyle başlayabilir. Sadece yakınlık verisinden dip yapısı tahmin edilmemeli.
- **Saat karşılaştırması:** Önümüzdeki 24–48 saat için rüzgâr/hamle, dalga/periyot ve yağış; gün doğumu/batımı işaretleri. “Rüzgâr artıyor”, “dalga devam ediyor”, “yağış olasılığı yükseliyor” gibi veriye bağlı açıklamalar.
- **Yöntem kartları:** Yemli dip oltası ve spin için ayrı planlama notları; kıyının bakışı biliniyorsa rüzgârın karşıdan/arkadan/yandan gelişi. Tekniğe göre başarı yüzdesi üretilmez.
- **Tür rehberi:** Türün tanınması, yöntem/yem, sezon gözlemi ve güncel yasal kısıtlar. Levrek, çipura, kefal, istavrit gibi türler için içerik ancak yerel ve resmî kaynaklarla teyit edilerek yayımlanmalı; bu araştırma tür bazında Antalya av verimi doğrulamıyor.
- **Av günlüğü:** Tarih, nokta, tür, yöntem, yem, süre ve sonuç; aynı anda hava/deniz tahmini. Kullanıcının gözlemiyle model tahmini ayrı tutulur. Bu kayıtlar birikmeden yerel başarı iddiası kurulmaz.

## Diğer kaynaklar ve doğrulama durumu

| Kaynak | Amaç | Bu oturumdaki durum |
| --- | --- | --- |
| Open-Meteo Weather + Marine | Birleştirilebilir açık hava/deniz tahmini | Açık kaynak kodu ve README incelendi; Antalya hava/deniz API yanıtları canlı doğrulandı |
| [MGM](https://www.mgm.gov.tr/) | Resmî deniz tahmini ve meteorolojik uyarılar | Deniz sayfasına canlı erişim doğrulandı; resmî otomatik veri sözleşmesi doğrulanmadı |
| [Tarım ve Orman Bakanlığı / BSGM](https://www.tarimorman.gov.tr/BSGM) | Amatör avcılık mevzuatı, tür/boy/miktar/zaman kısıtları | BSGM ana sayfasına erişim doğrulandı; yürürlükteki tebliğ ve tüm değişiklikler doğrulanmadığından sayısal limitler eklenmedi |
| [Resmî Gazete](https://www.resmigazete.gov.tr/) | Tebliğ metni ve sonraki değişiklikler | Belge ve değişiklikler birlikte kontrol edilmeli; erişim izni gerekiyor |
| OpenStreetMap / mevcut harita | Kıyı geometrisi ve çevre bağlamı | Proje zaten kullanıyor; bir noktanın ava açık olduğu veya erişilebilir olduğu çıkarılamaz |

Ay/solunar bilgisi için ayrı ücretli sağlayıcı zorunlu görünmüyor: incelenen Open-Meteo kodu ay doğuşu/batışı ve fazı hesaplıyor. Ancak bu astronomik çıktılar yerel balık aktivitesinin bilimsel doğrulaması değildir. Tide/deniz seviyesi, akıntı ve dalga da ayrı kavramlar olarak gösterilmeli.

## Uygulamaya uyacak veri akışı

Mevcut Vercel API düzenine `/api/fishing` eklendi. Sunucu koordinatı doğrular, hava ve deniz isteklerini ayrı yapar, sonuçları UTC zaman damgasıyla birleştirir; ekranda saatler `Europe/Istanbul` ile gösterilir. Tarayıcı keyfi bir kaynak URL'si göndermemeli.

Canlı yanıtları doğrulanan başlangıç istekleri (uygulama ilk sürümde dalga, rüzgâr, yağış, sıcaklık, güneş ve ay evresini kullanır):

```text
https://api.open-meteo.com/v1/forecast
  ?latitude=36.86&longitude=30.64
  &hourly=wind_speed_10m,wind_gusts_10m,wind_direction_10m,precipitation_probability,weather_code,pressure_msl
  &daily=sunrise,sunset,moon_phase
  &forecast_days=2&timezone=Europe%2FIstanbul&timeformat=unixtime&wind_speed_unit=ms

https://marine-api.open-meteo.com/v1/marine
  ?latitude=36.86&longitude=30.64
  &hourly=wave_height,wave_period,wave_direction,swell_wave_height,swell_wave_period,sea_surface_temperature,ocean_current_velocity,ocean_current_direction
  &forecast_days=2&timezone=Europe%2FIstanbul&timeformat=unixtime&cell_selection=sea
```

İstekler tek satır URL olarak oluşturulur. Ay alanları ayrı, isteğe bağlı bir sorguyla denenmeli; desteklenmiyorsa temel hava/deniz ekranını bozmamalı. Parametre varlığı, her model/hücrede dolu veri döneceği anlamına gelmez.

Her veri setinde sağlayıcı, istenen/dönen koordinat, birimler, veri alınma zamanı ve varsa model üretim zamanı korunmalı. `fetchedAt` modelin üretim zamanı olarak gösterilmemeli. Eksik değer `null` kalmalı; sıfır dalga veya sıfır rüzgâra çevrilmemeli. Bir kaynak başarısızsa diğerinin bilgisi gösterilip eksiklik belirtilmeli. Son önbellek kullanılırsa yaşı görünür olmalı.

Dalga, rüzgâr ve akıntı yönlerinin “geldiği / gittiği yön” tanımları sağlayıcı sözleşmesinden ayrıca doğrulanmalı. Birimler yanıtın `hourly_units` alanından okunmalı; özellikle deniz akıntısı hızının birimi varsayılmamalı.

## Lisans, erişim ve tamamlanması gereken kontroller

İncelenen [Open-Meteo README](https://github.com/open-meteo/open-meteo/blob/454d6ef3ef683587afac067f31627088cd111637/README.md), veri lisansını **CC BY 4.0** olarak belirtir ve görünür kaynak atfı ister. Ücretsiz servis kullanımını açık kaynak geliştiriciler/ticari olmayan kullanım için tanımlar; ticari kullanım için ayrıca iletişim ister. Veri lisansı, ücretsiz servis kullanım hakkıyla aynı şey değildir. Sunucu kodu AGPL lisanslıdır; bu çalışma kodu uygulamaya kopyalamıyor.

Bu oturumda `open-meteo.com` ve Bakanlık alan adına yapılan istekler ağ politikasından `403 Forbidden` aldı. Aynı sağlayıcının herkese açık GitHub koduna erişim başarılı oldu. Araştırma için gereken Open-Meteo, MGM, Bakanlık ve Resmî Gazete alan adları mevcut tarayıcı indirme izinleri korunarak ortam ayar taslağına eklendi; taslak kaydı çalışan makineye izin uygulamaz.

İzinler uygulandıktan sonra tamamlanacak işler:

1. Antalya kıyısındaki farklı bölgelerden hava/deniz yanıtı almak; koordinat sapmasını, boş hücreleri, birimleri ve tarih aralıklarını kontrol etmek.
2. Ay alanlarının yayımlanmış API'de desteklendiğini doğrulamak; kod ile çalışan servis sürümünü eşitlemek.
3. MGM verisinin kullanım/entegrasyon biçimini ve güncel amatör avcılık tebliğini değişiklikleriyle birlikte doğrulamak.
4. Önbellek, zaman eşleştirme, eksik veri ve kaynak kesintisi testleriyle `/api/fishing` geliştirmek.
5. Ardından kıyı ekranı ve av günlüğünü eklemek. Tür/yem/sezon önerilerini yerel uzman ve gözlem kayıtlarıyla doğrulamak.

Mevcut sonuç: ilk sürümün temel veri alanları ve mimarisi belirlenmiştir; canlı Antalya verisi, mevzuat ve yerel tür önerileri henüz doğrulanmamıştır.

## Uygulamaya alınan özellik (9 Ekim 2026)

Balıkçılık sekmesi Konyaaltı, Lara, Kemer, Kaş, Side ve Alanya için canlı Open-Meteo hava/deniz model tahminlerini sunar. İki günlük saatlik dalga yüksekliği/periyodu/yönü, rüzgâr/hamle/yönü, yağış olasılığı ve deniz sıcaklığı; günlük gün doğumu/batımı ve ay evresi gösterilir. API çıktıları canlı kontrol edildi: saatler Unix saniyesi, rüzgâr m/s, dalga metre, periyot saniye. Eksik alanlar sıfır yapılmaz; kaynaklardan biri çalışmazsa kısmi veri belirtilir. Önbellek 15 dakika, konum kapsamı Antalya çevresiyle sınırlıdır.

Open-Meteo bölgesel model verisidir, kıyı ölçümü veya av verimi değildir. Ay evresinden başarı puanı türetilmez. MGM'nin deniz sayfası ve BSGM resmî sayfası kullanıcıya kaynak olarak sunulur. Tür bazında güncel boy/miktar yasakları doğrulanmadan sayısal sınır eklenmemiştir; avdan önce yürürlükteki düzenleme kontrol edilmelidir.

Ürün fiyatları kategori aramalarıyla kaynak ürün kimliğine göre birleştirilir; yalnızca aynı kimlik/paketin farklı zincir teklifleri karşılaştırılır. Kaynaktaki farklı kimlikler aynı marka adıyla zorla eşleştirilmez. Tek zincirde bulunan ürünler alternatifler altında ayrı görünür. Kategori sınıflaması ürün adından yapılır ve kaynak kapsamı tüm ürünleri içermez.

## Onaylanan genişletme: Türkiye kıyıları ve karşılaştırma

Antalya sınırı kaldırıldı; Akdeniz, Ege, Marmara ve Karadeniz için 18 başlangıç kıyısı ve haritadan kıyı seçimi eklendi. Bugün/Yarın, saat seçimi ve kısa saatlik tablo; swell, rüzgâr dalgası, akıntı, deniz seviyesi, görüş ve UV ayrıntıları gösterilir. Akıntı m/s isteğinde m/s gelir; km/h yanıtı da açık birim kontrolüyle m/s'ye çevrilir. Model noktası kullanıcı noktasından 50 km'den uzaktaysa deniz koşulları yerel tahmin olarak gösterilmez. Konyaaltı, İzmir, Trabzon ve Ankara hava modu canlı test edildi.

Favori kıyılar ve en son 200 av kaydı yalnızca cihazdaki tarayıcıda saklanır. Av kaydına eklenen koşullar seçilen saate ait bölgesel tahmindir; geçmiş gözlem veya gerçekleşmiş av havası olarak sunulmaz. Günlüğün tarihindeki tahmin günü uyuşmazsa koşul eklenmez.
