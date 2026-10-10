# Yakınım · kontrollü mobil yayın süreci

## Geliştirme ve onay

1. Değişiklikler ayrı dalda hazırlanır; üretim `main` değişmeden kalır.
2. Taslak PR açılır, GitHub CI ve mobil emülasyon kontrolleri sonuçlanır. Başarısız kontrol atlanmaz; neden incelenir.
3. Kullanıcı telefonda **gerçek cihaz** akışlarını kontrol eder; otomatik emülasyon fiziksel telefonun yerini tutmaz. BrowserStack'teki Automate kullanım hakkı dolduğu için ücretli gerçek-cihaz GitHub işi yalnızca manuel tetiklenir; kullanıcı telefon testi ücretsizdir.
4. Kullanıcı onay verdiğinde PR, mümkünse tek **squash** commit ile `main` dalına alınır. Üretim Vercel yayını ayrıca kontrol edilir.
5. Kaynak kesintileri ve geçici veri eksiklikleri kullanıcının olumsuz test bulgusu olarak değil, ayrı veri problemi olarak değerlendirilir.

## Telefonda kısa test listesi

- **Konum:** Konumum doğru mu; konum izni verildikten sonra harita izliyor mu?
- **Nöbetçi eczane / harita:** Bir yerin detayını aç; X'e basınca panel dar başlığa iniyor mu? Listeyi açıp boş haritaya dokun; yine küçülüyor mu?
- **Otobüs:** Durağı aç, yaklaşan araca bas; güzergâh, seçilen durak ve yaklaşık mesafe görünüyor mu? Yenile; geri tuşuyla aynı durağa dönüyor musun?
- **Etkinlikler:** Etkinlik.io kaynaklı kayıtların tarih ve saati görünüyor mu; farklı seanslar ayrı mı?
- **Geri dönüş / gezinti:** Keşfet, Hizmetler, Kaydedilen, Diğer geçişlerinde takılma veya örtüşen panel var mı?

## Teknik sınırlar

- Açık kaynak harita/ulaşım verisi fiziksel GPS hızıyla güncellenmeyebilir.
- Etkinlik tarihi kaynak tarafından farklı biçimlerde bildirilebilir; tarih/saat belirli değilse uydurulmaz.
- Üretim yayınının çalışması, GitHub testlerinin geçtiği anlamına gelmez.
- Eski kök JavaScript ve statik sayfalar arşivlenene kadar korunur; yanlış testler aktif CI sonucunu maskelememelidir.

## Otomatik mobil kontrol kapsamı

- `npm run test:mobile`: Güncel uygulamadan seçilmiş 4 kabul akışını iPhone Safari/WebKit ve iki Android Chromium görünümünde çalıştırır; toplam 12 senaryo, tekrar deneme yoktur.
- `npm run test:mobile:extended`: Önceki bütün geniş E2E senaryolarını isteğe bağlı olarak çalıştırır; bunlar farklı mimari sürümlerinden kalmış olabilir. İlk 6 hatadan sonra durur, bakım sırasında modernize edilir. **Bu testlerin geçerli olmadığı veya geçtiği varsayılmaz.**
- `browserstack-real-mobile.spec.ts`: Sadece ayrı, manuel tetiklenen gerçek-cihaz BrowserStack yapılandırması tarafından çalıştırılır.
- GitHub CI tüm Node/kaynak/derleme kontrollerini ve kısa mobil kabul akışını içerir. Geniş test paketi gizlenmiş değil, sadece zaman ve bakım maliyeti nedeniyle otomatik CI'den ayrılmıştır.
