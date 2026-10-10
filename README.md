# Yakınım

**Konumuna göre çalışan, mobil öncelikli yakın çevre uygulaması.**

[Uygulamayı aç](https://yakinim.vercel.app/) · [GitHub deposu](https://github.com/aliihaydargenc-dotcom/yakinim) · [Geliştirme ve mobil kontrol listesi](docs/mobile-release-checklist.md)

Yakınım; yakınındaki yerleri keşfetmeyi, Antalya'daki toplu ulaşım ve günlük hizmet bilgilerine erişmeyi tek bir mobil arayüzde birleştirir. Uygulama **React + TypeScript + Vite** ile geliştirilir, Vercel üzerinde yayımlanır. Konum haritası MapLibre kullanır.

## Uygulamanın bölümleri

| Bölüm | Neler var? |
| --- | --- |
| **Keşfet** | Konuma dayalı harita, yakındaki noktalar, harita üzerinden konum seçimi |
| **Hizmetler** | Kategori bazlı yer arama, nöbetçi eczaneler, market ürün fiyatları, Antalya toplu ulaşımı ve etkinlikler |
| **Kaydedilen** | Kaydettiğin yerler ve yol tarifi bağlantıları |
| **Diğer** | Haberler, radyo ve altı oyunluk kütüphane |

Diğer çevre hizmetleri arasında, veri kapsamı elverdiğinde, trafik, kesinti ve kıyı/balıkçılık bilgileri de bulunur. Erişilebilir veri, şehir ve kaynak bazında değişebilir.

### Antalya toplu ulaşımı

- Durağa göre yaklaşan otobüsler ve kaynağın bildirdiği tahmini varış süreleri.
- Seçilen otobüsün güzergâhı, üzerindeki duraklar ve son bildirilen araç konumu.
- Haritada **seçtiğin durak** için belirgin işaret ve otobüs ile durak arasındaki yaklaşık mesafe.
- Araç koordinatlarının otomatik sorgulanması (20 saniyelik uygulama aralığı) ve manuel **Yenile**.
- Güzergâhtan geri dönünce aynı durağın otobüs listesinin korunması.

**Canlı takip sınırı:** Otobüs GPS'i telefonun konumu gibi kesintisiz akmaz. Kaynak yeni koordinat bildirdiğinde güncellenir. Bir araç izlenen duraktan sonra kaynak listesinden çıkarsa takip kesilebilir. Güzergâh üzerinden ölçülemeyen mesafe açıkça **kuş uçuşu** olarak belirtilir.

### Etkinlik ve diğer kaynaklar

Etkinlik.io kayıtlarında RSS akışının bildirdiği etkinlik başlangıç tarihi ve saati değerlendirilir; aynı etkinliğin farklı seansları ayrı tutulur. Diğer kaynaklar için yayın saati otomatik olarak etkinlik saati sayılmaz. Kaynakta olmayan saat, fiyat, konum veya kesinlik üretilmez.

Nöbetçi eczane, fiyat, kesinti ve ulaşım verileri üçüncü taraf/resmî sağlayıcıların güncelliğine bağlıdır. Özellikle eczane nöbetini yola çıkmadan önce teyit etmek yararlı olabilir. Harita verisinin atıf ve lisans bağlantıları harita bilgi denetiminden açılabilir.

## Geliştirme ortamı

**Gereksinim:** Node.js 22 ve npm.

```bash
git clone https://github.com/aliihaydargenc-dotcom/yakinim.git
cd yakinim
npm ci
npm run dev
```

Vite'ın gösterdiği yerel adresi açın. **Dikkat:** `npm run dev` komutu, Vercel'deki `/api/*` sunucusuz fonksiyonlarını tek başına çalıştırmaz. Gerçek kaynak entegrasyonu için uygun bir Vercel geliştirme veya Preview ortamı gerekir. `/?preview` parametresi örnek arayüz verileriyle çalışabilir; canlı veri doğrulaması yerine geçmez.

### Test ve derleme komutları

| Komut | Kapsam |
| --- | --- |
| `npm test` | Kod, veri, güvenlik ve React derlemesini kapsayan bağımsız regresyon kontrolleri; ilk hatada durmaz, sonunda başarısız adımları bildirir |
| `npm run build` | TypeScript denetimi ve Vite üretim çıktısı (`dist/`) |
| `npm run test:mobile` | Aktif arayüz için dört akış × üç mobil tarayıcı profili = **12 kısa Playwright senaryosu** |
| `npm run test:mobile:extended` | Geçmişten gelen kapsamlı E2E paketi; bakım amaçlı, otomatik CI kapısından ayrı |
| `npm run test:hardening` | API, konum, önbellek ve gizlilik doğrulamaları |

Playwright için yerel tarayıcı motorları kurulmamışsa önce `npx playwright install chromium webkit` çalıştırın. CI, gerekli Linux bağımlılıklarını da yükler.

**Testlerin kapsamı:** Kısa mobil paket, aktif uygulamanın temel akışlarını denetler; geçmişte yazılmış tüm senaryoların geçtiği anlamına gelmez. Gerçek Android/iOS telefon testinin yerini tutmaz. Haricî BrowserStack gerçek-cihaz akışı hesap kullanım hakkına bağlıdır ve **yalnızca manuel** tetiklenir.

## Proje yapısı

```text
src/
  AppShell.tsx       Dört ana sekme, alt navigasyon
  App.tsx            Hizmetler, konum, kaynak durumları
  components/        Harita, ulaşım, etkinlik, fiyat, oyun, medya
  services/          İstemci veri sorguları
  store.ts           Yerel uygulama durumu
api/                 Vercel sunucusuz uç noktaları
lib/                 Kaynak ayrıştırma ve veri normalleştirme
public/              PWA varlıkları, servis çalışanı, oyun içerikleri
tests/               Node kontrolleri ve Playwright senaryoları
.github/workflows/   CI ve isteğe bağlı test işleri
```

Aktif uygulamanın giriş noktası **`src/main.tsx`**, ana kabuğu **`src/AppShell.tsx`** dosyasıdır. PWA servis çalışanı **`public/sw.js`** üzerinden yayımlanır.

Kök dizindeki `app.js`, `sprint*.js`, eski `sw.js` ve bazı statik dosyalar tarihsel sürümden kalmıştır. Bu aşamada geri dönüş ve karşılaştırma için korunmuştur; yeni uygulamanın aktif giriş noktası olarak değerlendirilmemelidir.

## Yayınlama ve değişiklik yönetimi

1. Yeni geliştirmeleri `main` dışında bir **feature/stabilizasyon dalında** hazırlayın.
2. GitHub'da pull request açın; bağımsız kod/veri kontrolleri ile **12 senaryoluk mobil kabul testini** değerlendirin.
3. Gerekirse gerçek telefonda kontrol edin; [mobil kontrol listesi](docs/mobile-release-checklist.md) temel akışları içerir.
4. Onaylanan paketi tercihen **squash merge** ile `main` dalına alın. Üretim dağıtımını Vercel'de doğrulayın.

`main` dalı üretim dağıtımını tetikler. Pull request dalları Vercel'de ayrı **Preview** dağıtımları oluşturur. Preview ile üretim aynı adres değildir.

## Konum, gizlilik ve çevrimdışı kullanım

- Konum izni kullanıcı işlemiyle istenir; alternatif olarak haritadan elle konum seçilebilir.
- Son konum ve kaydedilen yerler tarayıcıda yerel olarak saklanabilir; konumu silme kontrolü bulunur.
- Konum bazlı servislerin çalışabilmesi için yaklaşık veya kesin koordinatlar ilgili API'lere aktarılabilir. Hassas GPS iznini vermek istemeyenler haritadan yaklaşık bir nokta seçebilir.
- Servis çalışanı uygulama kabuğu ve statik varlıklar için kullanılır. Canlı API sonuçları ve harita karoları çevrimdışı kullanılacak biçimde önbelleklenmez. **İnternet olmadan canlı veriler güncellenmez.**
- Kaynağın cevap vermemesi, boş sonuç döndürmesi ve eski kayıt sunması aynı durum değildir; arayüz geliştirmelerinde bu fark korunmalıdır.

## Dokümantasyon

- [Mobil yayın ve kontrol listesi](docs/mobile-release-checklist.md)
- [Veri kaynakları ve tasarım yol haritası](docs/data-and-design-roadmap.md)
- [Kaynak envanteri](docs/data-source-inventory.md)
- [Eski inceleme notları](ANALIZ.md)

Önceki sürümlerden kalan inceleme dosyaları tarihsel referanstır; güncel çalışma biçimi için bu README, aktif kaynak kod ve GitHub Actions sonuçları esas alınır.
