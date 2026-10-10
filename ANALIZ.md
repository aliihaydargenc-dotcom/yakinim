# Yakınım — bağımsız teknik inceleme ve önceliklendirme

**Tarih:** 10 Ekim 2026  
**İncelenen kaynak:** Kullanıcı tarafından sağlanan `yakinim-main.zip`  
**Hedef:** Mevcut çalışan modülleri ve veri sağlayıcılarını koruyarak küçük, doğrulanabilir iyileştirmeler; mevcut üretim koduyla bağımsız karşılaştırma.  
**Kanıt standardı:** Koddan saptanan davranışlar ve çalıştırılan yerel testler; bu ortamda dış servislere canlı erişim, tam npm kurulumu, başarılı üretim derlemesi veya gerçek cihaz çalıştırması yapılamadı. Başarısı doğrulanamayan noktalar özellikle işaretlenmiştir.

## 1. Yönetici özeti

**Teknoloji değiştirilmemeli.** Aktif uygulama `index.html → src/main.tsx → src/App.tsx` zinciriyle çalışan **React 18 + TypeScript + Vite 6** uygulamasıdır. Tanımlanan kütüphaneler; Zustand, TanStack Query, MapLibre GL JS, PMTiles, React ve Vercel Functions'tır. Bu yığın ihtiyaçlarla uyumludur. Next.js, yeni veritabanı, harita sağlayıcısı veya ücretli API'ye geçiş için gerekçe saptanmadı.

**En yüksek öncelik**, konumla ilişkili önbellek/kısmi sonuçların başka konuma taşınması, doğrulanmamış verinin eksiksiz sanılması ve fiziksel iOS Safari'deki konum izninin belirsizliğidir. Bu teslimatta düşük riskli önlemler uygulandı; veri sağlayıcılarının fiilî servis kalitesi ve gerçek telefon davranışı henüz kanıtlanmış değildir.

**Bağımsız gözlem:** Proje içinde iki nesil kod birlikte bulunuyor. Kök `app.js`, `sw.js`, `sprint1.js`, `sprint2.js`, `sprint3.js`, eski stiller ve bunların testleri **aktif Vite girişine bağlı değil**. `README.md` ise orijinalde statik uygulama/`python http.server` dağıtımı anlattığından yanıltıcıydı. Yeni README aktif uygulamayı belgeliyor; eski dosyalar olası geri dönüş ve karşılaştırma için silinmedi.

## 2. Öncelik tablosu

| Öncelik | Bulgu / somut kanıt | Etki | Bu paket | Kalan işlem |
|---|---|---|---|---|
| **P0 — yayın kapısı** | `npm ci` paketleri ağ/kayıt erişimi olmadan indiremiyor; `npm run build`, modül eksikliğiyle sonlanıyor. | Üretimde derleneceği ispatlanamıyor. | **Açık — ortam kısıtı**, doğrulanmış gibi sunulmadı. | Vercel Preview üzerinde `npm ci`, TypeScript, Vite build, API smoke ve WebKit e2e başarılı olmalı. |
| **P1** | `src/App.tsx`, `useRetainedPlaces` önceki harita verisini konumlar arasında tutabiliyordu; keşif/yakıt anahtarları yuvarlanmış konumla çakışabiliyordu. | Yanlış yer/mesafe, kullanıcı güveni. | **Düzeltildi:** her konuma özgü kapsam, sorgu anahtarı ve alan sahipliği kontrolü. | Harita sürükleme ve peş peşe GPS düzeltmeleri gerçek tarayıcıda denenmeli. |
| **P1** | `src/services/api.ts`, bazı API'lerden `{}` dönmesi gerçek sıfır sonuç olarak algılanabiliyordu. | Kaynak hatasının yanlış biçimde "yer yok" görünmesi. | **Kısmen düzeltildi:** alan, Overture ve eczane yanıt biçimi kontrolü eklendi. | Tüm uç noktalara ortak şema ve hata standardı. |
| **P1** | `api/duty.js` resmî e-Devlet/TİTCK HTML akışını ayrıştırıyor; yapısal değişimlerde yedek özel kaynak kullanılıyor. `PlaceDetail` kaynağın niteliğini açık belirtmiyordu. | Yanlış nöbetçi eczaneye gitme riski. | **Azaltıldı:** alternatifin resmî olmadığı ve telefon doğrulaması açıkça yazıldı; geçersiz istekler reddediliyor. | Resmî erişim, il/ilçe ve gün eşleştirmesi gerçek kaynakta test edilmeli. |
| **P1** | GPS otomatik yenileme ve eski konumun "cihaz konumu" gibi anlaşılması; silme eyleminin olmayışı (`src/App.tsx`, `src/store.ts`). | iOS izin deneyimi, konum gizliliği. | **Düzeltildi:** yalnız izin daha önce verilmişse otomatik yenileme, geri yüklenen konum etiketi, `Sil`, tarih/koordinat doğrulaması. | Fiziksel iPhone Safari/ana ekrana eklenmiş PWA testleri. |
| **P1** | Trafik `iframe`'ine çapraz köken konum izni veriliyordu (`src/components/CityServices.tsx`, `vercel.json`). | Üçüncü tarafa gereksiz tarayıcı izni. | **Düzeltildi:** yalnız `geolocation=(self)`; Yandex'e aktarılan seçim/arama bilgisi belirtiliyor. | Trafik iframe davranışı dağıtımda doğrulanmalı. |
| **P2** | React sürümü `public/sw.js` kayıt etmiyor, kök eski `sw.js` Vite'yle dağıtılmıyordu. | PWA çevrimdışı beklentisi boşa çıkıyor. | **İyileştirildi:** statik Vite kabuğu SW kaydı, API/harita tile'larını bilinçli hariç tutma. | Offline ilk kurulum, sürüm geçişi, iOS ve Android güncelleme testleri. |
| **P2** | `src/App.tsx` merkezi bileşeni çok sayıda sorumluluk ve yoğun tek satır içeriyor. | Değişiklik regresyonu, bakım güçlüğü. | **Kapsam dışında:** büyük refactor yapılmadı. | Kabulden sonra sorgu/konum/navigasyon modülleri aşamalı ayrıştırılsın. |
| **P2** | Kök eski sürüm dosyaları, iki manifest ve farklı test beklentileri; `tests/production-hardening.mjs` aktif Vite girişini değil eski statik `sprint3.js` içe aktarımını bekliyor. | Yanlış test başarısızlıkları ve dağıtım karışıklığı. | **Belgelendi**; kök eski dosyalar korunarak README güncellendi. | Orijinal sürüm arşivlendikten sonra ayrı `legacy/` / test grupları. |
| **P2** | Kullanıcı konumuyla kamuya açık sunucusuz API'ler; uygulama genelinde kullanıcı başına kota kontrolü görünmüyor. | Servis suiistimali, upstream oran sınırları. | **Açık:** yeni altyapı/ücretli servis eklenmedi. | Vercel edge/rate limit ve kaynak sağlayıcı koşullarını kapasite planıyla değerlendirin. |
| **P2** | Overture PMTiles sabit `2026-09-23.1` anlık görüntüsü, statik Antalya durak kataloğu. | Güncellik sınırlaması. | **Korundu, belirtildi.** | Tarihli sürüm denetimi/otomatik rapor ve sağlayıcı onaylı yenileme. |
| **P3** | Bazı genel CSS/bileşenler, trafik/harita akışında ergonomi ve erişilebilirlik açıkları oluşturabilir. | Dar ekran, ekran okuyucu ve klavye kullanımı. | Konum eylemi 44 px hedefe yükseltildi, hareket azaltma uyumluluğu iyileştirildi. | Lighthouse, VoiceOver, 320/360/390/412 px gerçek cihaz karşılaştırması. |

## 3. Modül ve veri kaynağı envanteri

İçerik sağlayıcıları **değiştirilmedi**. Aşağıdaki gözlemler kodun nasıl çalıştığını anlatır; **kaynakların 10 Ekim 2026 itibarıyla canlı yanıt verdiğini kanıtlamaz**.

| Modül | Kaynak ve işleyiş | Güncellik / doğrulama riski | Öneri |
|---|---|---|---|
| Harita ve yakın yerler | `api/viewport.js`, `lib/nearby.cjs`, OpenStreetMap/Overpass; çoklu sunucu denemesi. MapLibre ile çizim. | Kullanıcı katkılı OSM bilgisi işletme açılış/kapanışını garanti etmez; Overpass yoğunluk/zaman aşımı. | Sorgu hatası ile geçerli boş yanıtı ayır; gerçek kaynağı ve mümkünse tarihi göster; mevcut çoklu deneme korunsun. |
| Ek yerler | `api/overture.js`; `2026-09-23.1/places.pmtiles` kaynağı, Overture/PMTiles ve kategori eşlemesi. | Snapshot tarihli, bütün ülkede canlı işletme doğrulaması değil; S3 erişimi veya tile kapsaması kesilebilir. | Anlık görüntü tarihini kullanıcıya gerektiğinde açıkla; yeni snapshot geçişini kontrollü test et. Bu turda Overture function için 60 sn sınırı eklendi. |
| Market ürün fiyatları | `lib/prices.cjs`, `api/prices.js`: `api.marketfiyati.org.tr/api/v2/`; yakın market depoları, son **48 saat** teklifleri, eş paket karşılaştırması. | Eksik şube/ürün eşleşmesi; bazen kısmi fiyat verisi; fiyat son kontrol zamanı ile alışveriş anı farklı. | Mevcut "Kaynak ve kapsam" notunu koru; mağaza/ambalaj eşleşmesini ve tazelik filtrelerini düzenli test et. |
| Nöbetçi eczane | `api/duty.js`: e-Devlet/TİTCK HTML ayrıştırma, Nominatim il/ilçe çözümleme; erişilemezse Eczane Adresi alternatif. | Resmî HTML/CSRF akışı değişebilir; alternatif **resmî teyit değildir**; konumu olmayan resmî kayıtlar için marker üretilemez. | Kaynağı ayrı bildir, resmî akışı düzenli izle; açık kaynak seçimi/kaynak sağlığı metrikleri ekle. |
| Toplu ulaşım | `lib/transit.cjs`, Kentkart/Antalyakart servisleri; `lib/antalya-stops.json`. | Katalog **8 Ekim 2026** tarihli, **4618** durak kaydı içeriyor; kapsama seçili hatlarla sınırlı. Varışın zaman damgası 3 dk sınırıyla değerlendirilmekte. | Katalog yaşını göster; yenileme betiği ve canlı varış doğrulaması işlet. Antalya dışını destekleniyormuş gibi göstermeyin. |
| Trafik | `src/components/CityServices.tsx`, Yandex trafik iframe'i. | Kullanıcının seçtiği konum ve arama terimi sağlayıcıya aktarılır; iframe açılması canlı servis garantisi değil. | Kaynak gizlilik notu ve gereksiz geolocation iznini kaldırma uygulandı. |
| Etkinlikler | `lib/events.cjs`, Antalya Büyükşehir Belediyesi fuar sitesi, Muratpaşa Belediyesi takvimi, bilet/kültür portallarına ait ayrıştırıcılar. | HTML/JS düzeni değişebilir; kaynakların yalnız bir kısmı cevap verebilir; **eksiksiz Antalya etkinlik takvimi değildir**. | Kapsam/kısmi sonuç/fetchedAt göster, iptal/ertelenen etkinlikleri sağlayıcıdan doğrula. |
| Kesintiler | `lib/outages.cjs`, su için SuKesintileri.com.tr toplayıcı sitesi, elektrik için AEDAŞ/CK Enerji servisleri. | Su kaynağı resmî kurum sitesi değil; ilanların gecikmesi, elektrik poligonunun eksik olması mümkün. | Resmî/kaynak ayrımını ve fetchedAt'i göster; tarih, mahalle ve kesinti bitiş bilgisini kesin kabul etme. |
| Balıkçılık / hava / deniz | `lib/fishing.cjs`, `src/services/forecast.ts`, Open-Meteo model servisleri ve hava/deniz parametreleri. | Tahminler fiziksel gözlem veya balık tutma garantisi değildir; model güncelleme gecikmesi olabilir. | Model zamanı, ölçü birimi, eksik parametre ve sahil koordinatını doğrula. |
| Haber | `lib/news.cjs`, TRT, Habertürk, Anadolu Ajansı, BBC Türkçe, DW RSS; kaynak dengeleme. | RSS gecikmesi, telif, geç tarih ve içerik formatı. | Yayıncıya bağlantı, kaynak zamanı, görsel güvenliği; mevcut dengeleme korunmalı. |
| Radyo | `api/radio.js`, Radio Browser istasyon bilgileri, RİAK sıralama notu, canlı stream. | Katalog doğrulaması gerçek ses yayınının açılacağını garanti etmez; format, CORS, mobil arka plan sesi kısıtlanabilir. | Fiziksel iOS/Android üzerinden istasyon değiştirme, kilit ekranı ve bağlantı kaybını test et. |
| Oyunlar | `public/games/*`, üçüncü taraf lisans dosyaları. | Oyunlar statik iframe; çevrimdışı ve dokunmatik kontrol sürüme göre farklı olabilir. | Lisans dosyalarını muhafaza et; aynı-origin gömme ve dokunma testlerini koru. |

### Önbellek katmanları

- **İstemci sorguları:** TanStack Query `staleTime` değerleri özelliğe göre değişiyor; yakın yerler 10 dk, ek Overture yerleri 30 dk (kategori keşif eki 6 saat), nöbetçi sonuçları 5 dk. Konum kapsama anahtarı bu turda güçlendirildi.
- **Sunucu:** Örnek olarak `api/duty.js` bellek içi 5 dk ve gün/konum anahtarı; `api/viewport.js` 15 dk; `lib/prices.cjs` 5 dk; `lib/events.cjs` 15 dk; `lib/outages.cjs` 5 dk. Serverless örnekleri birbirinden bağımsız ve geçici olabilir: bellek önbelleği dağıtık ve garantili değildir.
- **CDN:** Bazı kamusal içerikler için ayrı `s-maxage`, ancak nöbetçi eczane ve kişisel konumla ilişkili hassas API'lerde `no-store` kullanılıyor. Her yeni endpoint için özel tekrar değerlendirme yapılmalı.
- **PWA:** Yeni `public/sw.js` yalnızca statik kabuğu, ikonları, Vite varlıklarını ve aynı alan adındaki oyun dosyalarını saklar. API, GPS, üçüncü taraf karo veya güncel işletme verisini cache'lemez.

**Önemli ayrım:** "Önbellekten hızlı açıldı" = "kaynak bugün doğru" anlamına gelmez. İki ayrı ibare veya zaman işareti gereklidir: `kaynağın veri tarihi` ve `uygulamanın sorgulama tarihi`.

## 4. iOS Safari, mobil UX ve erişilebilirlik

**Kod düzeyinde:** GPS talebi doğrudan kullanıcı butonu içindedir; yüksek doğruluk başarısızsa yaklaşık konum denemesi, ardından kısa süreli daha iyi hassasiyet izleme vardır. `navigator.permissions` Safari'de desteği ve sonuçları değişebildiği için otomatik yenileme yalnız **granted** durumunda yapılır. Konum alınamazsa elle haritadan seçme çalışması korunmuştur. Kayıtlı ve taze konumlar açık biçimde tanımlanır; kayıt silinebilir. 44px dokunma hedefi eklendi. Yatay sonsuz tanıtım sayfası eklenmedi; mevcut kompakt liste/harita navigasyonu korundu.

**Doğrulanmamış fiziksel senaryolar:** iPhone Safari ilk izin/"Bir kez izin ver"/"İzin verme"; Safari gizli sekme; ev ekranına ekli PWA (izin davranışı Safari'den farklı olabilir); "Kesin Konum" kapalıyken yaklaşık konum; GPS 100m→20m iyileşmesi; kilit ekranından geri dönüş; 3G/kötü internet; VoiceOver; sekme değiştirme; GPS tamamen kapalı; harita pan sonrasında değişen konum; radyo sesi arka planda; web kit harita GPU belleği. Playwright WebKit emülasyonu **gerçek iOS Safari'nin tam karşılığı değildir**.

**İleride:** `src/App.tsx` navigasyon, modal focus iade mekanizması, harita/oyun iframe erişilebilirliği, minimum iPhone SE genişliği ve büyük yazı boyutu senaryoları ekran kaydıyla test edilmeli.

## 5. Güvenlik ve veri bütünlüğü

**Olumlu gözlemler:** Vercel API'leri kullanıcı koordinatını genellikle aralık doğrulamasından geçiriyor; sunucu URL'lerinin önemli bölümü sabit tanımlanmış; haber/etkinlik bağlantılarında URL filtreleri ve kaynak atfı var; React varsayılan metin kaçışını kullanıyor; `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`, `X-Frame-Options` başlıkları tanımlanmış; kritik eczane API'sinde `no-store` kullanılıyor; kod taramasında gömülü yeni API anahtarı gerektiren bir bileşen belirlenmedi. Bu **penetrasyon testi değildir**.

**Kalan riskler:**

1. Kullanıcı koordinatları ve bazı sorgu parametreleri sunucuya, harici sağlayıcıya ve sunucu erişim günlüklerine yansıyabilir. Açık onay/gizlilik bildirimi, kısa günlük saklama ve IP gizliliği uygulama işletmesi tarafından netleştirilmeli.
2. Public fonksiyonlar bot trafiği veya aşırı sorgulamayla kaynağı yorabilir. Kullanım ölçümü, adil oran sınırı ve sağlayıcı kotası planlanmalı. Şimdilik ücretli gateway eklenmedi.
3. HTML/RSS tabanlı veri ayrıştırıcıları kaynak düzeni değişince 200 OK ile eksik veri döndürebilir; mümkünse ayrıştırıcı sürümü, `partial` ve hata sebebi ölçülmeli.
4. Resmî ve alternatif eczane verisini tek listeye ayrım olmadan karıştırmamak gerekir. Yeni arayüz açık kaynak etiketliyor; **resmî veri doğruluğunun garantisi yok**.
5. Yerel kaydedilen son konum 6 saatte zaman aşımına uğrar; silme butonu sadece konum anahtarını temizler. Favoriler, diğer uygulama saklama alanları, sunucu erişim günlükleri veya sağlayıcının gördüğü önceki istekler bu işlemle silinmez.
6. Sürüm uyuşmazlığı / bağımlılık güvenlik taraması ağ gerektiriyor. `npm audit` bu çalışmada sonuçlandırılamadı; canlı CI'da raporlanmalı.

## 6. Mimari değerlendirme ve önerilen geliştirme sırası

**Mevcut mimariyi koru.** Büyüyen `src/App.tsx` bileşenini ancak testler yeşil olduktan sonra görev bazında küçük adımlarla ayır: `useDeviceLocation`, `useNearbySources`, `useMapViewport` ve `NearbyPage`; her çıkarım ayrı PR ve e2e senaryo ile desteklenmeli. `src/services/api.ts` için `zod` benzeri yeni bir kütüphane eklemek şart değil: önce küçük bağımlılıksız tip koruyucuları/şemalarıyla `source`, `fetchedAt`, `partial`, `data` sözleşmesini standartlaştır.

**Maliyet/fayda:** Yeni framework veya yeni harita SDK'sı mobil performansı otomatik artırmaz. Ölçüm olmadan yeniden yazım yapılmamalı. İlk ölçüm, Web Vitals (özellikle LCP/INP), MapLibre açılış süresi, endpoint P95, Vercel function süreleri, browser bellek tüketimi ve iOS konum başarı oranı olmalı.

**Sürüm geçiş planı:** (1) Preview build + smoke test; (2) fiziksel iPhone/Android GPS ve modül senaryoları; (3) sağlayıcı yanıtlarının Antalya ve başka illerde doğrulanması; (4) iki sürümü aynı cihazda A/B karşılaştırma — doğru sonuç, ilk anlamlı içerik, eksik/yanlış veri, ekran başına dokunma sayısı, hata oranı; (5) ancak daha iyi olduğu kanıtlanan düzeltmeleri üretime seçici taşı.

## 7. Bu teslimatın kesin sınırı

Bu paket **uygulanmış kaynak kodu iyileştirmeleri** ve **çalışan bağımsız Node regresyonları** içerir. **Başarılı production build, canlı Vercel Preview, fiziksel iPhone Safari veya canlı market/nöbetçi/ulaşım sağlayıcısı doğrulaması içermez.** Test zincirinin ve dağıtımın geçip geçmediği `TEST-SONUCLARI.md` dosyasında açıkça açıklanmıştır. Canlı sisteme, önceki GitHub deposuna veya Vercel projesine işlem yapılmadı.
