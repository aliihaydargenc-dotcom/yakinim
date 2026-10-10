# Yakınım — React/Vite uygulaması

**Geliştirilmiş karşılaştırma paketi · 10 Ekim 2026**

Yakınım; konuma göre yer keşfi, harita, nöbetçi eczane, market fiyatları, Antalya toplu ulaşımı, etkinlikler, kesintiler, balıkçılık, haber, radyo ve oyun modülleri içeren mobil öncelikli web uygulamasıdır. Bu paket mevcut mimari ve veri kaynakları korunarak iyileştirilmiştir; yeni ücretli servis veya API anahtarı gerektiren bağımlılık eklenmemiştir.

**Önemli:** Bu inceleme ortamında npm paketleri indirilemediği için tam `npm run build` ve gerçek cihaz testi **doğrulanamadı**. Kaynak yapısı Vercel/Vite dağıtımına uygun hazırlanmıştır; yayın öncesi aşağıdaki kontroller zorunludur. Teknik ayrıntılar `ANALIZ.md`, `DEGISIKLIKLER.md` ve `TEST-SONUCLARI.md` dosyalarında yer alır.

## Aktif mimari

| Konum | İşlev |
|---|---|
| `index.html`, `src/main.tsx`, `src/App.tsx` | **Aktif** React 18 / TypeScript uygulaması |
| `src/components/` | Liste/harita, fiyat, ulaşım, balıkçılık, haber, radyo, oyun arayüzleri |
| `src/services/` ve `src/store.ts` | İstemci API sorguları, konum ve tercihler |
| `api/` | Vercel Functions; sunucu tarafı kaynak doğrulama/erişim |
| `lib/` | Veri kaynakları için normalleştiriciler, statik durak kataloğu |
| `public/` | Vite'nin statik çıktıya kopyaladığı PWA, ikonlar ve lisanslı oyunlar |
| `tests/`, `playwright.config.ts` | Node regresyon ve tarayıcı senaryoları |
| `vercel.json` | Vite build, `dist` çıktısı, API fonksiyonları, güvenlik başlıkları |

Kök dizindeki `app.js`, `styles.css`, `sprint*.js`, `mobile-flow.*`, **kök `sw.js`** ve kök `manifest.webmanifest` önceki statik sürümün kalıntılarıdır; mevcut `index.html` tarafından yüklenmezler. Mevcut projeyle karşılaştırma ve geriye dönüş için bu turda silinmemişlerdir. **Yayınlanan servis çalışanı `public/sw.js` dosyasıdır.** Eski statik testlerin bir kısmı artık aktif uygulamayı test etmez.

## Kurulum ve çalıştırma

Node.js **22** önerilir. GitHub'a ZIP'i açarak dosyaları **depo köküne**, iç içe klasör oluşturmadan yükleyin.

```bash
npm ci
npm run dev
```

Vite varsayılan yerel geliştirme adresini açar. `npm run dev`, Vercel'in `/api/*` sunucusuz fonksiyonlarını tek başına çalıştırmaz. Gerçek veri için Vercel geliştirme ortamına veya ayrı **Vercel Preview** dağıtımına ihtiyaç vardır. `/?preview` sadece **temsili yerler** gösteren arayüz önizlemesidir; canlı veri doğrulaması değildir.

```bash
npm test
npm run build
npm run test:mobile
```

- `npm test`: mevcut test zinciri, yeni `tests/hardening.cjs` ve build kontrolü.
- `npm run build`: TypeScript denetimi + Vite üretim çıktısı (`dist`).
- `npm run test:mobile`: Playwright WebKit iPhone emülasyonu ve Chromium Android emülasyonları. BrowserStack için `.github/workflows/browserstack-mobile.yml` ayrıca mevcut; hesabın sırları gerekebilir.
- `npm run test:hardening`: yeni konum, API biçimi, önbellek ve güvenlik regresyon testleri (kurulmuş `typescript` bağımlılığı gerekir).

## Vercel ayrı önizleme yayını

1. Bu ZIP içeriğinden **ayrı bir GitHub deposu** oluşturun veya mevcut deponun karşılaştırma dalına aktarın. Mevcut üretim dalına otomatik aktarım yapmayın.
2. Vercel'de yeni proje oluşturun, ilgili depoyu seçin. Proje ayarlarında **Root Directory** depo kökü olsun.
3. Vercel, `vercel.json` ile `framework: vite`, `buildCommand: npm run build` ve `outputDirectory: dist` kullanır; `api/*.js` aynı projede serverless function olarak yayınlanır.
4. GitHub PR / ayrı dal ile bir **Preview URL** oluşturun. İlk dağıtımın build logunda başarılı tamamlandığını, API yanıtlarını ve harita katmanlarını denetleyin.
5. Test senaryoları ve gerçek iPhone Safari kontrol listesi `TEST-SONUCLARI.md` içinde verilmiştir.

Yerel ZIP'e `node_modules`, oluşturulmuş `dist` veya gizli anahtar koyulmamıştır. Bağımlılıklar `package-lock.json` üzerinden dağıtım sırasında kurulur. `api/overture.js` dinamik Node modülleri kullandığından önizlemede bu endpoint ayrıca denenmelidir. **Uyarı:** `.openai/hosting.json` önceki OpenAI statik hosting projesine ait kimliği, `android/` ve `public/.well-known/assetlinks.json` mevcut Android uygulamasının bilgilerini içerir. Bunlar Vercel Preview dağıtımı için kullanılmaz; bu paketi eski hosting projesine otomatik yüklemeyin. Yeni Preview URL'sinin Android TWA bağlantısını otomatik değiştirdiğini varsaymayın.

## Konum, kaynak şeffaflığı ve çevrimdışı kullanım

- Konumunuzu butondan cihaz izniyle veya haritadan elle seçebilirsiniz. iOS Safari'de otomatik yeni izin istemi tetiklenmez; ilk talep kullanıcı hareketiyle yapılır.
- Kullanılan son konum yaklaşık **6 saat** cihazda saklanır ve silinebilir. Favoriler ayrı yerel saklamada kalır. GPS koordinatları API isteklerine ve ilgili harici sağlayıcılara gidebilir; hassas konumu paylaşmak istemiyorsanız haritadan yaklaşık nokta seçin.
- Nöbetçi eczanede öncelik e-Devlet/TİTCK verisinin işlenmesidir. Teknik sorunlarda **Eczane Adresi** alternatif, resmî olmayan kaynak olarak gösterilir; gitmeden önce telefonla doğrulama önerilir.
- Market fiyatı kapsama ve son 48 saat kaydıyla, durak bilgileri Antalya kataloguyla, balıkçılık meteoroloji model verisiyle sınırlıdır. Etkinlik ve kesinti sonuçları kaynakta bulunabilen ilanlardan oluşur; eksiksiz kayıt garantisi verilmez.
- PWA `public/sw.js` yalnızca uygulama kabuğunu ve kendi statik varlıklarını saklar; `/api/*`, GPS verisi ve üçüncü taraf harita kareleri önbelleğe alınmaz. **Offline modda canlı modüller çalışmaz.** Gerçek tarayıcıda PWA kurulum/yenileme testi bu ortamda yapılamamıştır.

Eski kaynaklar veya kapsamlı ileride yapılabilecek teknik düzenlemeler için `ANALIZ.md` dosyasındaki öncelik planına bakın. Bu teslimat orijinal GitHub/Vercel üretim dağıtımını değiştirmez.
