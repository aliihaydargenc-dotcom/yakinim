# Yakınım — uygulanan değişiklikler

**Tarih:** 10 Ekim 2026  
**Kapsam:** Mevcut React/Vite uygulamasında sınırlı hata düzeltmesi, veri/gizlilik iyileştirmesi ve düşük riskli PWA altyapısı. **Yeni ücretli servis, gizli API anahtarı, yeni npm paketi veya kapsamlı yeniden yazım yok.**

Bu belge **uygulanmış kod değişikliklerini** anlatır. Önerilen fakat yapılmayan işler `ANALIZ.md`'dedir; çalışma ve build sonuçları `TEST-SONUCLARI.md`'dedir.

## A. Hata düzeltmeleri (mevcut özellikleri korur)

### A1. Konum değişince önceki bölgenin sonuçlarının taşınması — P1

**Dosya:** `src/App.tsx`

- Seçili GPS/manuel konumu 5 ondalıklı `locationScope` anahtarıyla ayırdım.
- `area` durumuna `owner` alanı ekledim. Güncel alan, güncel seçili konuma ait değilse yer listesi gösterilmez ve ilgili sorgular çalışmaz.
- Aktif harita alanı sorgusuna ve Overture takviyesine `locationScope` ekledim; `useRetainedPlaces` kapsamını `area:<scope>`, `supplement:<scope>`, `duty:<date>:<scope>` haline getirdim.
- Yakıt, keşif, keşif takviyesi ve belediye veri sorgularında eski yuvarlanmış/eksik önbellek anahtarı yerine seçili konum kapsamı kullandım.
- Alan kaydırma sonucunun önceki konumun kapsamıyla yeni konuma yazılmasını önlemek için sahiplik kontrolü ekledim. Gün içinde aynı konumdaki harita hareketlerinde geçici yer biriktirme işlevi korundu.
- React Query'nin yeni alana önceki alan verisini geçici taşıması kaldırıldı; sahte "bu çevrede" verisi gösterimi riski azaltıldı.

**Sınır:** Hızlı GPS düzeltmesi, pan ve geri dönüşün gerçek tarayıcı performansı bu ortamda doğrulanamadı.

### A2. API biçimi ve koordinat doğrulaması — P1

**Dosya:** `src/services/api.ts`

- `fetchArea`, `fetchOvertureSupplement`, `fetchDuty` için beklenen `elements`, `places`, `pharmacies` dizilerinin gerçekten varlığı kontrol edilir; hatalı `{}` yanıtı sessizce sıfır kayıt gibi gösterilmez.
- Overture ek kayıtlarda eksik/uygunsuz `id`, `name`, enlem ve boylam değerleri filtrelenir.
- Yer birleştirme sırasında her yeni yerin **bütün önceki yerlere** uzaklığına bakma maliyeti azaltıldı: önce kategori ve normalize ad eşleşmesine göre gruplama, sonra aynı grupta 90m testi uygulanır. İlgili birleştirme kuralları korundu.

**Dosya:** `api/duty.js`

- Eksik enlem/boylamın JavaScript `Number(null)===0` yan etkisiyle kabul edilmesi engellendi.
- Geçersiz sayısal yarıçap/limit (NaN, Infinity, küsuratlı limit, sıfır/negatif değerler) için 400 cevabı eklendi; geçerli isteklerin sınırlandırılması ve mevcut eczane kaynak zinciri korunur.

### A3. Nöbetçi eczane alternatif kaynağının açık gösterilmesi — P1

**Dosyalar:** `src/App.tsx`, `src/components/MapView.tsx`

- Eczane detayında alternatif veri `Eczane Adresi · alternatif, resmî olmayan kaynak` olarak gösterilir.
- Nöbetçi listesinde resmî kaynağa erişilemeyince, alternatif kaynak ve **gitmeden telefonla doğrulama** notu görünür.
- Gerçek resmî veri, eczane adresi ve telefon normalizasyonu, yol tarifi, harita işaretçileri korunur.

### A4. Kullanıcı izni ve saklanan konum — P1

**Dosyalar:** `src/App.tsx`, `src/store.ts`, `src/components/LocationStatus.tsx`, `src/model1.css`

- İlk Safari konum talebinin kullanıcı butonuna bağlı akışı korunur. `permissions.state='prompt'` sonucunda otomatik tekrar talep edilmez. Yalnız açıkça `granted` biliniyorsa sessiz yenileme denenir.
- `localStorage`'daki son konumun lat/lng türü, coğrafi aralığı, zaman damgası, **gelecek tarihli kayıt** ve **6 saati geçmiş kayıt** denetlenir.
- Geri yüklenen konum **`Son kullanılan konum (6 saat içinde)`** olarak etiketlenir; canlı GPS gibi ifade edilmez.
- Yerel son konum verisini temizleyen **`Sil`** düğmesi eklendi; aktif yüksek doğruluk GPS izleyicisi iptal edilir. Bu işlem favorileri veya sunucu/sağlayıcı günlüklerini temizlemez.
- Konum satırı düğmeleri için en az 44px dokunma hedefi düzenlendi.

### A5. Veri kapsamı ve üçüncü taraf gizliliği — P1/P2

**Dosyalar:** `src/components/PilotViews.tsx`, `src/components/CityServices.tsx`, `src/model1.css`, `vercel.json`

- Etkinlik ve kesintilerde mevcut API'den gelen `source`, `coverage` ve `fetchedAt` gibi kapsam/tarih alanlarının anlaşılır gösterimi artırıldı; tarih bulunmadığında gerçek olmayan tarih üretilmez.
- Trafik iframe'inden `allow="geolocation"` devri kaldırıldı, uygulama düzeyi `Permissions-Policy` **`geolocation=(self)`** yapıldı.
- Kullanıcının seçtiği koordinat ve arama teriminin Yandex trafik sağlayıcısı tarafından işlendiği küçük bir gizlilik notu eklendi.

### A6. Hareket duyarlılığı — P3

**Dosya:** `src/components/CategoryRail.tsx`

- Kaydırma için desteklenmeyen `'instant'` davranışı yerine standart `'auto'` kullanıldı; azaltılmış hareket tercihi ve mevcut yatay kategori çubuğu korundu.

## B. Küçük mimari/işletim iyileştirmeleri (ayrı kayıt)

### B1. Aktif React PWA kabuğu

**Dosyalar:** `public/sw.js` **(yeni)**, `src/main.tsx`

- Eski kök servis çalışanına müdahale etmeden Vite'nin `public/` klasöründen yayınlanan, sürümlü statik önbelleğe sahip **yeni servis çalışanı** eklendi.
- İlk başarılı online indirmede `index.html`, Vite'nin HTML'de görülen hash'li giriş varlıkları, mevcut ikon/manifest; kullanıldıkça aynı kökendeki oyun ve JS/CSS varlıkları cache'lenebilir.
- **`/api/*`, üçüncü taraf harita tiles, harici siteler ve GPS veri yanıtları servis çalışanı tarafından cache'lenmez.**
- SW kaydı yalnız güvenli HTTPS/yerel güvenli bağlamda `load` sonrası denenir; kayıt hatası uygulamanın açılmasını engellemez.
- Bu **tam offline uygulama** değildir: harita, canlı modüller ve henüz indirilmemiş kod parçaları çevrimdışı çalışmaz. SW'nin gerçek iOS/Safari testleri yapılmadı.

### B2. Dağıtım süresi ve kaynak tanımı

**Dosya:** `vercel.json`

- Mevcut `framework: vite`, `buildCommand: npm run build`, `outputDirectory: dist` korunmuştur.
- Kaynak kaydı yapılmış `api/overture.js` fonksiyonuna `maxDuration: 60` eklendi; diğer fonksiyonların davranışı değiştirilmedi. Bunun kullanılabilirliği Vercel planı ve ortamı içinde ayrıca doğrulanmalıdır.

### B3. Geliştirme ve kaynak yönetimi

**Dosyalar:** `.gitignore`, `package.json`, `README.md`

- `.env*` dosyalarının (örnek `.env.example` hariç) ve özel anahtar türlerinin yanlışlıkla kaynak kontrolüne girmemesi için ignore kuralları eklendi.
- `npm run test:hardening` komutu ve bu kontrolün mevcut `npm test` zincirine dahil edilmesi sağlandı. **Yeni npm bağımlılığı eklenmedi.**
- Eski, statik `Yakınımda` projesini tarif eden README tamamen aktif React/Vite, Vercel önizleme ve dürüst çalışma sınırlarına uygun güncellendi.
- Eski sürüm koduna, oyun varlıklarına, üçüncü taraf lisanslara, fiyat/toplu taşıma/etkinlik/fishing sağlayıcı URL'lerine bilinçli olarak dokunulmadı.

### B4. Tekrarlanabilir regresyonlar

**Dosya:** `tests/hardening.cjs` **(yeni)**

- Aktif istemcinin 27 TS/TSX dosyasının TypeScript sözdizimi dönüşümü.
- Koordinat önbelleği geçersiz/süresi geçmiş/gelecek tarihli/silinmiş durumları.
- Yanlış API yanıt biçimi, Overture geçersiz koordinat filtreleme, aynı isimli yakın yerin tekilleştirilmesi.
- `api/duty.js` hatalı isteklerde 400 yanıtı.
- Servis çalışanının API ve harici tile isteklerini yakalamadığının statik/test-kopyası kontrolü; Vercel izin politikası; React konum kapsamı korumaları.

**Dikkat:** Bu kontroller tarayıcı e2e, gerçek API yanıtı, tam TypeScript **tip** denetimi veya başarılı Vite production build yerine geçmez.

## C. Bilinçli olarak değiştirilmedi

- **React, Vite, MapLibre, React Query, Zustand** sürümleri ve mevcut package lock paket listesi.
- OSM/Overpass, Overture, TİTCK ve Eczane Adresi, Market Fiyatı, Kentkart, Yandex, etkinlik/kesinti/hava/deniz/haber/radyo sağlayıcıları.
- Yer keşfi, favoriler, ürün fiyat karşılaştırması, Antalya durakları, rota/varış, etkinlik/kesinti, balıkçılık, haber, radyo, oyun bileşenleri ve yerel statik oyun lisansları.
- Legacy kaynak dosyaları: bunlar halen pakette mevcut ancak Vite girişinde kullanılmıyor.
- Canlı GitHub ana dalı ve orijinal Vercel production yayını; erişim/işlem yapılmadı.

## D. Geri dönüş ve kıyaslama

ZIP'i ayrı depoda yayımlayın; orijinal dosyaları değiştirmeyin. Her düzeltme birbiriyle sınırlı dosyalardadır; geri dönüş gerekirse ayrı depodaki ilgili dosya eski sürümden alınabilir. **Öncelik**, `npm ci → npm test → npm run build → Preview e2e → fiziksel iPhone testi → canlı veri kontrolü` basamaklarıdır. Başarılı olmadığı belirlenmeden üretime alınmamalı. Sonuçlar `TEST-SONUCLARI.md`'dedir.
