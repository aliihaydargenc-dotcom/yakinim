# Yakınım Android — TWA

Paket: `com.alihaydargenc.yakinim`, sürüm: `1.0.0` / `100`.
Notlarım (Mori) ile aynı Bubblewrap / Android Browser Helper yöntemi kullanılır.
`https://yakinim.vercel.app/` destekleyen tarayıcıda tam ekran açılır.
Site güncellemeleri APK içine kopyalanmaz; uygulama güncel siteyi açar.
Harita, haberler, nöbetçi eczane ve radyo için internet gerekir.
Bildirim delegasyonu kapalıdır. Konum izni site istediğinde tarayıcı tarafından
sorulur; oyunlar sitedeki aynı kaynaktan yüklenen oyunlardır.

## Derleme

Node 22+, JDK 17, Android SDK Platform 36 ve Build Tools 36.0.0 gerekir.
SDK lisansları derleme ortamında kabul edilmiş olmalıdır.

```sh
npm --prefix android ci
npm --prefix android run generate
python3 android/build.py --signing-json /private/signing.json --output /output/Yakinim-1.0.0.apk
```

`JAVA_HOME` ve `ANDROID_HOME` doğru konumlara ayarlanır.
Üretilen `android/twa`, derleme önbellekleri ve özel imza dosyaları Git'e alınmaz.
İmza JSON'u `packageId`, `keystoreFile`, `alias`, `storePassword`, `keyPassword`
alanlarını içerir. Sonraki APK'lar aynı anahtar ve daha yüksek `appVersionCode`
ile hazırlanmalıdır. Anahtarın özel yedeği korunmalıdır.
Herkese açık sertifika parmak izi `twa-config.json` ile
`public/.well-known/assetlinks.json` içinde bulunur; build.py eşleşmeyi doğrular.
Bu dosya HTTPS üzerinden doğrudan JSON olarak sunulmalıdır.

Android Browser Helper / Bubblewrap şablonları Apache 2.0 lisanslıdır.

## Telefon kabul testi

Tam ekran açılış, konum izni (izin/ret), haritada yer adları, Eczane/Nöbetçi,
haber bağlantıları, radyo başlat/durdur, üç oyunda dokunma kontrolleri ve Android
geri hareketi gerçek telefonda kontrol edilir. Paket imza doğrulaması bu testin
yerine geçmez. Desteklenen tarayıcı bulunamaz veya site eşleşmesi doğrulanamazsa
Custom Tab yedeğinde adres çubuğu görünebilir.
