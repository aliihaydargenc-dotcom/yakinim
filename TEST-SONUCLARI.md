# Yakınım — test ve üretim doğrulama raporu

**Rapor tarihi:** 10 Ekim 2026  
**İncelenen ortam:** Linux çalışma konteyneri; Node.js `v22.16.0`, npm `10.9.2`.  
**Paket:** Bağımsız kaynak ZIP; gerçek yayın URL'sine dağıtılmadı.  
**Durum:** **KISMİ DOĞRULAMA. Production build başarılı değildir / tamamlanamamıştır.** Başarısızlığın ilk nedeni npm paketlerinin ortamda kurulamaması; bu durum gerçek bağımlılıklar kurulduğunda derlemenin başarılı olacağını **kanıtlamaz**.

## 1. Sonuç özeti

| Kontrol | Durum | Gözlem |
|---|---|---|
| Kullanıcı ZIP dosyasının açılması, klasör/dosya envanteri | **GEÇTİ** | Aktif React/Vite kodu, Vercel API, kütüphaneler, oyunlar, Android/CI, eski statik dosyalar incelendi. |
| Yeni regresyon testi `tests/hardening.cjs` | **GEÇTİ** | 27 TS/TSX dosyası sözdizimsel transpile edildi; API biçimleri, konum saklama, kaynak birleştirme, duty parametreleri, PWA/izin kontrolleri. Global TypeScript modülüyle çalıştırıldı. |
| `tests/duty.mjs` | **GEÇTİ** | Eczane HTML ayrıştırıcısı. |
| `tests/viewport.mjs` | **GEÇTİ** | Alan sorgusu, kalite/alternatif kaynak önbelleği. |
| `tests/overture.mjs` | **GEÇTİ** | PMTiles/Oveture veri biçimi ve kategori testleri (mock). |
| `tests/prices.mjs` | **GEÇTİ** | Fiyat zamanı, konum doğruluğu, paket eşlemesi ve kapsam testleri. |
| `tests/fishing.mjs` | **GEÇTİ** | Deniz/hava modeli, eksik veri, birim ve bölge testleri. |
| `tests/location-label.mjs` | **GEÇTİ** | Konum etiketi, bölge önbelleği ve hatalı koordinat. |
| `tests/discovery.mjs` | **GEÇTİ** | Keşif sıralaması ve kaynak kalitesi. |
| `tests/pilot.mjs` | **GEÇTİ** | Antalya durak/varış tarihi ve etkinlik verisi. |
| `tests/city-services.mjs` | **GEÇTİ** | Kesinti ve etkinlik normalizasyonu. |
| `tests/media.mjs` | **GEÇTİ** | Haber/radyo veri normalizasyonu. |
| `tests/network.mjs` | **GEÇTİ** | Eski nearby API uyumluluğu. |
| `tests/model1-data.mjs` | **GEÇTİ** | Nöbetçi eczanede resmî yanıt boşken fallback, RSS ve haber testleri. |
| `tests/discovery-extensions.mjs` | **GEÇTİ — geçici test çözümüyle** | İlk çağrıda `typescript` eksikti; global TypeScript geçici bağlantısıyla yeniden çalıştırılınca `exit 0`. Bağlantı sonrasında kaldırıldı. |
| `tests/audit-fixes.mjs` | **GEÇTİ — geçici test çözümüyle** | Back navigation / StrictMode regresyon testleri, geçici global TypeScript bağlantısıyla. |
| `tests/location-refinement.mjs` | **GEÇTİ — geçici test çözümüyle** | GPS konumu iyileştirme, cleanup ve iptal senaryoları; geçici global TypeScript bağlantısıyla. |
| `tests/interactions.mjs`, `tests/location.mjs`, `tests/mobile-discovery.mjs`, `tests/spatial.mjs` | **GEÇTİ — yalnız legacy** | Toplam dört eski statik uygulama testi; aktif React arayüzünün kabul kanıtı değildir. |
| `tests/performance.mjs`, `tests/product-standard.mjs`, `tests/production-hardening.mjs`, `tests/smoke.mjs`, `tests/sprint1.mjs`, `tests/sprint2.mjs` | **BAŞARISIZ — legacy uyuşmazlık** | Eski giriş/script ve eski sürüm metni beklentileri aktif Vite projesine uymuyor. Bu paketle kodu bu eski beklentilere döndürmedim. |
| `tests/audit-ui.cjs` | **BAŞARISIZ — ortam** | `Cannot find module 'react'`; UI testini çalıştırmak için gerçek npm bağımlılık kurulumu gerekir. |
| `npm run test:legacy` | **GEÇTİ** | Eski `app.js` ve `sprint1/2/3.js` sözdizimi denetimi. |
| Node.js sözdizimi (`node --check`) | **GEÇTİ** | `api/`, `lib/`, `public/`, `scripts/` altında **49** JS/CJS dosyası, 0 sözdizimi hatası. |
| `npm test` | **BAŞARISIZ — ortam** | İlk `tests/audit-fixes.mjs` import `typescript` hatasıyla durdu. Test zincirinin sonraki adımlarına geçilemedi. |
| `npm run build` | **BAŞARISIZ — ortam** | `tsc --noEmit` kurulu olmayan `react`, `@tanstack/react-query`, `lucide-react`, `zustand`, `vite`, JSX tipleri vb. yüzünden `TS2307` ve devam hataları verdi; Vite build aşamasına ulaşmadı. |
| `npm ci --no-audit --no-fund` | **BAŞARISIZ — ağ** | npm kayıt sunucusuna erişim/DNS engeli nedeniyle paket kurulumu zaman aşımına uğradı; işlem sonlandırıldı. |
| `npm ci --offline --ignore-scripts` | **BAŞARISIZ — eksik cache** | `ENOTCACHED`, örn. `zustand-5.0.15.tgz` yerel npm cache'inde yok. |
| `npm run test:mobile` (Playwright WebKit/Chromium) | **ÇALIŞTIRILAMADI** | Paketler, tarayıcı motorları ve Vite dev server yok. |
| Fiziksel iPhone Safari / Android | **ÇALIŞTIRILAMADI** | Uzak cihaz/önyüz erişimi mevcut değil. |
| Canlı Vercel Preview ve `/api/*` testleri | **ÇALIŞTIRILAMADI** | Proje dağıtılmadı, ağ erişimi doğrulanamadı. |
| PWA kurulum/çevrimdışı açılış | **KISMİ** | SW'nin API ve harici tile isteklerini yakalamadığı VM testinde doğrulandı; gerçek SW kurulum/yenileme testi yapılamadı. |

**Sayısal özet:** 12 mevcut Node testi doğrudan **geçti**; 3 mevcut test global TypeScript'e **geçici bağlantı** kurularak **geçti**; 4 eski statik uygulama testi **geçti** ancak aktif React sürümünü ölçmüyor; 1 yeni hardening testi **geçti**. Böylece **toplam 20 bağımsız Node test çalıştırması** `exit 0` verdi (15 mevcut/aktif ağırlıklı + 4 legacy + 1 yeni). Ayrıca **6 eski test** eski statik beklentilerinden dolayı başarısız, **1 UI testi** React eksikliğiyle başarısız; tam `npm test` ve `npm run build` **başarısız**. Bunlar "tüm testler geçti" anlamına gelmez.

## 2. Uygulanan komutlar ve kanıt örnekleri

```bash
node tests/duty.mjs
node tests/viewport.mjs
node tests/overture.mjs
node tests/prices.mjs
node tests/fishing.mjs
node tests/location-label.mjs
node tests/discovery.mjs
node tests/pilot.mjs
node tests/city-services.mjs
node tests/media.mjs
node tests/network.mjs
node tests/model1-data.mjs
```

Yukarıdaki **12** komut `exit 0` döndürdü. İlaveten mevcut `audit-fixes`, `location-refinement`, `discovery-extensions` dosyaları ilk bağımlılık hatasından sonra bu konteynerde hazır bulunan TypeScript'e geçici `node_modules/typescript` bağlantısı kurularak başarıyla çalıştırıldı; bağlantı kaldırıldı ve pakete dahil edilmedi. Yeni test, çalışma ortamında global kurulu TypeScript'e yalnız test amacıyla işaret edilerek çalıştırıldı:

```bash
NODE_PATH=/opt/nvm/versions/node/v22.16.0/lib/node_modules node tests/hardening.cjs
# Hardening PASS: 27 TS/TSX parses, source shape, dedupe, GPS scope/expiry/clear, duty input and PWA privacy.
```

Normal internete erişen proje ortamında aynı kontrolün **`npm ci` sonrası** `npm run test:hardening` ile çalıştırılması beklenir. Bu global `NODE_PATH` yolu ZIP'e, `package.json` içine veya Vercel ayarına eklenmemiştir.

Başarısızlık kanıtlarının özeti:

```text
node tests/discovery-extensions.mjs
Error [ERR_MODULE_NOT_FOUND]: Cannot find package 'typescript'

npm test
Error [ERR_MODULE_NOT_FOUND]: Cannot find package 'typescript'

npm run build
src/App.tsx(...): error TS2307: Cannot find module 'react' ...
src/App.tsx(...): error TS2307: Cannot find module '@tanstack/react-query' ...
... birçok eksik bağımlılığın tetiklediği tip/JSX hatası
```

**Not:** Birlikte gelen altı eski statik testin başarısızlığı `src/main.tsx` yerine eski `app.js`/`sprint` kaynaklarını beklemelerinden kaynaklanıyor. Yeni `tests/hardening.cjs` modern kod için ayrı koruma sağlar. Geçici global TypeScript, locked proje sürümüyle birebir özdeş olmak zorunda değildir.

**Yorum:** `npm run build`'in başarısızlığını değiştirilen kodun kesin hatası veya başarılı derlenmesi olarak sınıflandırmak bu koşullarda mümkün değildir. Harici paketler indirildikten sonra bağımsız gerçek TypeScript tip denetimi gereklidir. `transpileModule` kontrolü tip kontrolü yerine geçmez.

## 3. Statik doğrulamalar

- `node --check api/duty.js`, `node --check api/overture.js`, `node --check public/sw.js` dahil `api/`, `lib/`, `public/`, `scripts/` altında toplam **49** JS/CJS dosyasının sözdizimi denetimi: **49/49 GEÇTİ**.
- `package.json`, `package-lock.json`, `vercel.json`, Vite giriş noktaları, `public/manifest.webmanifest`, `/public/icons`, `/public/games` ve serverless endpoints paket envanterinde korunur.
- `src/App.tsx` için aynı konuma ait `owner`, konum-temelli sorgu anahtarları ve `areaReady` korumasının kaynak-kodu regresyon kontrolleri vardır. Bu, gerçek harita animasyonu/eşzamanlı isteğin tarayıcıda doğrulandığı anlamına gelmez.
- Yeni servis çalışanı, `/api/*` ve üçüncü taraf URL'leri ele almadan bırakacak biçimde test edilmiştir.
- `vercel.json`: `framework: vite`, `outputDirectory: dist`, `Permissions-Policy: geolocation=(self)`.
- ZIP kaynak bütünlüğü/kritik dosya ve CRC denetimleri paketleme aşamasında kontrol edilir; bu doküman gelecekteki Vercel build'i garanti etmez.

## 4. Mevcut test altyapısı uyumsuzlukları

`tests/production-hardening.mjs` gibi bazı testler eski kök `app.js`/`sw.js` ve `index.html`'deki `sprint3.js` referanslarını bekliyor; bunlar **aktif Vite uygulamasını test etmiyor**. Bu durum güncel kodu eski teste uydurmak için aktif girişe kullanılmayan script eklenerek giderilmedi. Eski testler `test:legacy` grubu altında ayrıştırılıp yalnız tarihsel sürümde çalıştırılmalı. Mevcut `npm test` yine eski ve yeni testleri birlikte içeriyor; tüm zincirin geçmesi ayrıca incelenmeli.

## 5. Vercel Preview kabul testleri — zorunlu yapılacaklar

Bu adımlar **çalıştırıldı işaretlenmemiştir**; kullanıcı veya CI, internet erişimli yeni Preview üzerinde sonuçları doldurmalıdır.

| Senaryo | Geçme ölçütü | Durum |
|---|---|---|
| `npm ci && npm test && npm run build` | Sıfır çıkış, `dist/index.html` ve hash'li JS/CSS bulunur; kurulum sonrası tip hatası yok | **BEKLİYOR** |
| Preview API smoke (`/api/viewport`, `/api/overture`, `/api/duty`, `/api/prices`, `/api/transit`, `/api/events`, `/api/outages`, `/api/fishing`) | Parametre doğrulaması, kaynak/süre/kapsam hata yönetimi, beklenen JSON sözleşmesi | **BEKLİYOR** |
| `npm run test:mobile` | iPhone 14 WebKit/Pixel Chromium senaryoları; başarısızlar ayrı raporlanır | **BEKLİYOR** |
| iPhone Safari — ilk izin | İlk açılışta kendiliğinden izin penceresi çıkmaz; `Konumumu kullan` dokunuşunda çıkabilir; ret sonrası haritadan seçim mümkün | **BEKLİYOR** |
| iPhone Safari — izin verildi | GPS konumu ve enlem-boylam bulunur; hızla güncellenen hassasiyet eski veriyi yeni veri sanmaz | **BEKLİYOR** |
| iPhone Safari — yaklaşık konum | "Kesin Konum" kapalı/konum servisi devre dışı; kullanıcı elle konum seçebilir; sayfa kilitlenmez | **BEKLİYOR** |
| Yer değişikliği | Antalya → İstanbul → Antalya; önceki bölgenin market/eczane/keşif konumları diğerine taşınmaz, harita pan sonucu izole kalır | **BEKLİYOR** |
| Nöbetçi eczane | Resmî liste varsa kaynağı görünür; alternatifte resmî olmadığı belirtilir, telefon/yol tarifi işlevi kontrol edilir | **BEKLİYOR** |
| Market fiyatı | Aynı ürün/paket karşılaştırması; güncelleme zaman damgası, yanlış konum ve kaynak kısmi hatası | **BEKLİYOR** |
| Antalya ulaşımı | Yakın durak, tarihli katalog, canlı varış tazeliği ve hat yönü; Antalya dışına yanlış veri gönderilmez | **BEKLİYOR** |
| Etkinlik/kesinti | Birden fazla sağlayıcı; tarih, kaynak, kısmi/boş/hata gösterimi, kesinti haritası | **BEKLİYOR** |
| Balıkçılık | Seçilen sahil, saat/dalga/rüzgâr verisi, sıfır ile eksik değer ayrımı, güncel model zamanı | **BEKLİYOR** |
| Haber/radyo/oyun | Liste, kaynak atfı, gerçek radyo sesi; 2048/diğer oyunların dokunma ve iframe davranışı | **BEKLİYOR** |
| PWA install/offline/reload | Önce online kurulum, offline kabuğun açılması, canlı verinin offline olarak güncelmiş gibi sunulmaması, yeni sürümde güncelleme | **BEKLİYOR** |
| Güvenlik/performans | Gizli anahtar yok; yanıtlarda HTML/JSON başlıkları, istek limitleri, 360px/390px/412px ekran ve ağ zayıflama | **BEKLİYOR** |

## 6. Yayın kararı

**Bu çalışma kapsamında "production-ready/doğrulandı" kararı verilmemiştir.** Dosyalar Vercel Preview'a import edilebilir Vite + API kaynak düzenindedir; fakat gerçek Vercel dağıtımının başarılı olacağı veya iPhone Safari'de sorunsuz çalışacağı henüz kanıtlanmamıştır. Üretim sürümünüzü koruyup **yalnız ayrı GitHub deposu/dalı ve Vercel Preview** üzerinden karşılaştırma yapınız. Bekleyen kabuller geçerse kademeli yayına alınabilir.
