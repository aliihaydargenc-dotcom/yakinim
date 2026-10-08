# Yakınım — Model 1

Onaylanan tasarımın ilk çalışan uygulama paketi. Kaynak kodu Vite/React, API uç noktaları Vercel'de çalışır.

## Kurulum

ZIP içindeki yakinim klasörünün dosyalarını mevcut reponun köküne aktar. İç içe ikinci bir yakinim klasörü oluşturma.
`npm ci` ardından `npm test`. Vercel build: `npm run build`, çıktı: `dist`.
Yerel geliştirme: `npm run dev`. Bu komut web arayüzünü açar; `/api/*` için Vercel geliştirme ortamı veya yayımlanmış bir dağıtım gerekir. API olmadan gerçek veri doğrulaması yapılamaz.
`/?preview` konum izni istemeyen temsili yer önizlemesidir. Haber ve radyo örnek veriye çevrilmez; gerçek API gerekir.

## Değişen akış

- Keşfet listeyle açılır. Harita yalnızca açıldığında yüklenir. Kategori, eczane filtresi ve arama liste/harita arasında ortak kalır.
- Eczane içinde Tümü/Nöbetçi; ayrı nöbetçi kutusu yok.
- Haritada isimler dokunmadan gösterilir. Uzakta kümelenir; çakışan isimler yakınlaştırınca ayrışır. Detay için dokunulabilir.
- Kırık beyaz/füme/mürdüm ve sistem fontu; büyük tanıtım metinleri kaldırıldı.
- Haber kaynakları TRT, Habertürk, AA, BBC Türkçe, DW olarak mevcut çoklu akıştan gelir. Yayıncılar dengeli sıralanır, gelecek tarihli kayıtlar süzülür. Tam haber metni ve görselleri kopyalanmaz; yayıncıya bağlantı verilir.
- Radyo kataloğu tüm yayınların tek tek kontrolünü beklemez. Gerçek ses durumu oynatıcıdan gelir; katalog doğrulandı iddiası kaldırıldı. Yayınların gerçek telefonda süreklilik testi henüz tamamlanmadı.
- Aynı sitedeki oyun iframe’lerinin çalışması için X-Frame-Options SAMEORIGIN olarak ayarlandı; farklı sitelerin iframe erişimi açılmadı.
- Oyunlar uygulama dosyalarından, seçilince iframe içinde açılır: Düşen Bloklar, 2048, Hafıza. Yükleme ana sayfaya oyun kodu taşımaz. Oyunların rekorları cihazda tutulur.
- Resmi eczane yanıtı boşsa yedek kaynak denenir. Resmi kayıtta koordinat bulunamazsa adres/telefon korunur, harita ve yol tarifi uydurulmaz. Gün bilgisi hafıza önbelleği anahtarında tutulur; nöbet verisinde CDN eski veri gösterimi kapatıldı.

## Kontroller ve sınırlar

`npm test`: eczane/viewport/Overture/media testleri, Model 1 kaynak dengeleme ve boş resmi eczane yanıtında yedek kaynak testi, TypeScript ve üretim derlemesi.
`npm run test:mobile`: güncel Model 1 Playwright senaryoları. İki senaryo: liste/nöbetçi/oyun akışı ve hızlı yer kaynağının diğerini beklememesi.
`npm run test:model1`: ek tarayıcı kontrolü; 360 ve 390 px, haber/radyo mock yanıtları, üç oyun açılışı ve dokunmatik kontroller. CHROMIUM_EXECUTABLE ortam değişkeni isteğe bağlıdır. Görseller test-results altında oluşur.

Bu paket henüz fiziksel Android/iOS cihazda son kabul testi değildir. Radyo sesi, iOS konum, harita sağlayıcısının erişimi ve gerçek eczane listeleri cihazda ayrıca karşılaştırılmalıdır. MapLibre'ın büyük kodu ayrı paket olarak sadece Harita açıldığında yüklenir. Gerçek veri hızları için yer API'lerinin mevcut kaynak/önbellek sınırları devam ediyor; ön işlenmiş bölgesel veri mimarisi bu pakette uygulanmadı. Aylık yer verisi canlı işletme doğrulaması olarak gösterilmez.

APK bu pakette üretilmedi. Web kabulünden sonra konum ve arka plan medya davranışıyla birlikte paketlenecek.
Canlı Vercel sitesi ve GitHub ana dalı bu çalışma sırasında değiştirilmedi.
