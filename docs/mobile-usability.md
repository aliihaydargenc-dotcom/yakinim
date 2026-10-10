# Ekran sözleşmesi — 10 Ekim 2026

| Ekran / düğme | Davranış |
| --- | --- |
| Keşfet | Tam alan harita; arama, kategoriler, hava durumu ve sonuç paneli yok |
| Sol üst konum / sağ üst konum ikonu | Tek konum penceresi |
| Konumumu kullan | Konumu alır; küçük nokta ve animasyonlu yakınlaşma; GPS değişimlerini takip eder |
| Haritadan seç | Haritada nokta seçimi; Keşfet haritasına veya ilgili hizmete dönüş |
| Konumu sil | Konumu, işaretini ve takibi kaldırır |
| Haritada sürükleme | Kullanıcının kamera tercihini korur; tekrar cihaz konumu seçilince merkezlenir |
| Harita işaretleri | Keşfet'te tür başına en fazla 2, toplam en fazla 12 kayıt |
| Hizmetler | Yer araması, kategori seçenekleri, Market, Toplu ulaşım ve Etkinlikler |
| Market | Tek Ürünler görünümü; il, kategori ve ürün arama; kısa fiyat satırları |
| Fiyat satırı | Şube, birim fiyat, kaynak zamanı ve yol tarifi |
| Toplu ulaşım | Antalya durakları; liste/harita; aynı kısa durak kartı ve geliş tahminleri |
| Hat | Gidiş/dönüş ve durak sırası; geri ile durağa dönüş |
| Etkinlikler | Şehir, arama, tarih, mekân, kaynak/bilet bağlantısı |
| Kaydedilen | Kayıt listesi, yol tarifi ve kaldırma |
| Diğer | Mevcut haber, radyo ve oyunlar |

Ürün araması ve tek markette bulunan ürünler korunur. Tarih, konum, stok veya geliş bilgisi üretilmez. Kayıtların açıklama paragrafları kaldırılmıştır; kısa yükleme/hata durumları ve gerekli harita atıfları kalır. Konum seçilmeden yakın çevre sorgusu yapılmaz. Antalya dışındaki cihaz noktası Antalya merkezinde kullanıcı noktası gibi çizilmez. İlçe çözümlemesinin v2 önbelleği korunur.

Durak haritası için istek sınırları üç ondalığa ve tampon alana alınır. Aynı alan içindeki küçük hareketler ve yeniden boyutlandırmalar yeni istek üretmez. Sorgular iptal sinyalini kullanır. Varış yenilemesi kamerayı oynatmaz. Özel katman duraklara ikinci otobüs sembolü çizmez.

`npm test` kaynak doğruluğunu, GPS takibini, harita alanı yeniden kullanımını, katman filtresini ve üretim derlemesini denetler. `mobile-foundation`, `shell`, `redesign` ve `unified-mobile` tarayıcı testleri yeni ekran sözleşmesini denetler. Tarayıcı emülasyonu fiziksel cihaz testi değildir.
