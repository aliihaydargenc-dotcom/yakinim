# Antalya: trafik, kesintiler ve belediye etkinlikleri

## Kaynaklar

- Trafik: Yandex'in resmi `map-widget/v1/` gömülü haritası, `l=map,trf` ve Türkçe arayüz. Harita logosu, bağlantıları ve atıfları korunur. Kendi MapLibre haritamıza kopyalanmış bir trafik katmanı değildir; otobüs durağı görünümünden ayrı sekmedir. Başlangıç merkezi kullanıcının seçtiği konum, konum yoksa Antalya merkezdir.
- Su: https://www.sukesintileri.com.tr/antalya-su-kesintisi-sorgulama. Tarih, saat, ilçe başlığı ve kesinti yeri okunur. Kaynak ASAT'ın resmi servisi değildir. Bitiş ve aktiflik bilgisi olmadığı için kayıtlar yalnızca bildirilen kesintilerdir. Eski kayıtlar devam eden kesinti olarak sunulmaz. Mahalle adından tahmini koordinat üretilmez.
- Elektrik: https://kesintiapi.ckenerji.com.tr/AEDAS/RetrieveOutages ve `RetrieveOutageTransformersList`; mahalleler `GetLocation?tmno=` üzerinden okunur. Kapsam AEDAŞ bölgesidir, yalnızca Antalya değildir. Aynı OUTAGE_NO tek kayıttır. Alanlar trafo/parça ve koordinat sırasına göre kapatılmış çoklu poligonlardır. Tahmini bitiş, tamamlanma bildirimi değildir. Kaynak boş liste döndürdüğünde eski kesinti saklanmaz. API erişimleri salt okunurdur.
- Etkinlik: https://kultursanat.muratpasa-bld.gov.tr/etkinlik-takvimi üzerindeki JSON takvim verisi; yalnızca JSON ayrıştırılır, uzak kod çalıştırılmaz. Ardışık sergi günleri birleştirilir, ayrı gösterimler korunur. Çocuk, sergi ve diğer türler eklenmiştir. Kaynakta açıkça ücretli/ücretsiz yazıyorsa gösterilir; diğer kayıtların ücreti tahmin edilmez.
- Türkan Şoray Kültür Merkezi ve Muratpaşa Belediyesi Kültür Salonu koordinatları: https://kultursanat.muratpasa-bld.gov.tr/merkezlerimiz resmi harita bağlantıları. Mekân adı tam eşleşmezse yol tarifi üretilmez.

## Güncellik ve doğrulama

9 Ekim 2026 Türkiye saatiyle araştırma ve entegrasyon sırasında Yandex haritası açık tutuldu. Yeni trafik PNG isteklerinin `tm` değeri `2026.10.08.22.45.00` değerinden `2026.10.08.22.47.00` değerine ilerledi; sayfa yenilenmedi. Bu gözlem otomatik güncellemeyi doğrular, tüm yol ölçümlerinin kesin periyodunu veya sıfır gecikmeyi kanıtlamaz. Bu yüzden arayüz saniyelik ölçüm ya da doğrulanmamış son güncelleme saati göstermez. Manuel harita yenileme bulunur.

Kesinti kaynakları 5 dakikalık sunucu önbelleğiyle kontrol edilir; ekran görünürken 5 dakikalık sorgulama ve manuel yenileme vardır. Son kontrol saati veri alınma saatidir, sahadaki değişikliğin ölçülme saati değildir. Mahalle sorguları sınırlı eşzamanlılık ve toplam zaman bütçesiyle yapılır; eksik sonuçlar belirtilir.

İlk gerçek kaynak örneğinde 27 su bildirimi, tek elektrik kesintisine bağlı 30 trafo ve 32 alan poligonu bulundu. Daha sonraki elektrik sorgusu boş döndü. Bunlar test anı sayılarıdır; uygulamaya sabit veri olarak eklenmedi.

Backend doğrulaması: `npm test`. Mobil akışlar: `tests/e2e/city-services.spec.ts`; kaynak hatası ve tekrar deneme, arama/ilçe filtresi, elektrik alan haritası, trafik sekmesi ve yenileme, etkinlik türü ve resmi koordinat bağlantısı. Emüle Android Chrome 360×800 ve 412×915 doğrulandı; fiziksel telefon/iOS testi yerine geçmez.

## 9 Ekim mobil sadeleştirme

Açılış ve ilk kategori Tümü. Trafikte arama sabit kalır, durak ve trafik arama değerleri ayrı tutulur. Trafik yer araması Yandex widget'ın `mode=search&text=` parametrelerine aktarılır. Gömülü haritaya yalnızca Yandex origin'i için konum izni devredilir; izin politikası tüm sitelere açılmaz.

Etkinlikte tarih/tür filtreleri kaldırıldı; Tümü ve serbest metin araması kaldı. Ürün fiyatlarının üst açıklamaları ve alt raf farkı metni kaldırıldı. Kesinti ekranında ilçe seçimi, genel harita geçişi, kaynak/sorgu saatleri ve uzun açıklamalar kaldırıldı; kayıt tarihi ve tahmini bitiş gibi kayıt verileri duruyor. Elektrik alanı yalnızca ilgili kayıt içinden açılır.

Akaryakıt listesi başlangıçtaki küçük harita sınırıyla daraltılmaz, bağımsız geniş çevre sorgusu da kullanır. Sorgu sürerken erken boş sonuç mesajı göstermez. Adsız OSM yakıt istasyonlarına genel ad verilir. Antalya merkez kontrolünde geniş sorgu 59 ham yakıt kaydı döndürdü; bu sayı yinelenen veya isimsiz kayıt içerebilir ve kullanıcıya 59 farklı doğrulanmış istasyon vaadi değildir.
