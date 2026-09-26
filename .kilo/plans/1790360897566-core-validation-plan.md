# Quiz Platform - Çekirdek Özellikler (Core Features) Manuel Doğrulama Planı

Bu plan, canlıya çıkmadan önce tamamlanması zorunlu olan **Kritik (Phase 1, Phase 2, Phase 3)** özelliklerin yerel ortamda (localhost) test edilmesi için adım adım bir QA (Kalite Güvence) rehberidir.

## 🧪 Senaryo 1: Kimlik Doğrulama (Auth) ve Token Yönetimi
*İlgili Hatalar: #1 (Race Condition), #2 (Dual Token), #3 (Token Refresh)*

| Adım | Aksiyon | Beklenen Başarılı Sonuç (Pass) | Hata Durumu (Fail) |
| :--- | :--- | :--- | :--- |
| 1.1 | Doğru bilgilerle giriş (Login) yapın. | Anında `/dashboard` yönlendirmesi yapılır. UI'da titreme (flickering) olmaz, sayfa stabil yüklenir. | Login başarılı olmasına rağmen sayfanın kısaca yüklenip tekrar `/login` rotasına geri atması (Race Condition). |
| 1.2 | LocalStorage'dan `token`'ı silin ve tarayıcıyı yenileyin. | Sistem sayfa yüklenirken doğrulamayı kontrol eder ve `/login` sayfasına pürüzsüz yönlendirir. | Beyaz ekran çıkması, uygulamanın çökmesi veya sonsuz yükleme (infinite loading) döngüsü. |
| 1.3 | Backend'den token yaşam süresini (expiry) 1 dakikaya düşürüp giriş yapın. 2 dakika bekleyip veri çeken bir işlem yapın. | 401 Unathorized hatası yakalanır, arkada sessizce "Token Refresh" devreye girer, işlem kesilmeden tamamlanır. | İşlem başarısız olur, ekrana hata düşer veya kullanıcı giriş ekranına atılır. |
| 1.4 | Uygulamayı aynı tarayıcıda hem "Oyun Kurucu" (Host) hem "Oyuncu" (Player) rolleriyle iki sekmede oynatın. | Creator token'ı ile Player token'ı çakışmaz. Sunucu ayrımı başarılı yapar. | Bir token diğerini ezer, oyuncu veya oyun kurucu ekranlarında 403 (Yetkisiz) API hataları tetiklenir. |

## 🎮 Senaryo 2: Oyun Akışı ve Soru Tipleri (Game Flow)
*İlgili Hatalar: #4 (Hardcoded Options), #6 (Missing Question Types), #10 (Submit Button Bug)*

| Adım | Aksiyon | Beklenen Başarılı Sonuç (Pass) | Hata Durumu (Fail) |
| :--- | :--- | :--- | :--- |
| 2.1 | "Çoktan Seçmeli" (Multiple Choice) bir soru oluşturup oyunu başlatın. | "Option 1", "Option 2" yerine, editörde yazılan *gerçek cevap şıkları* oyuncu ekranında görünür ve sorunsuz seçilir. | Oyuncu ekranında hala kodun içine gömülü sabit "Option 1" şıklarının belirmesi. |
| 2.2 | Oyunu "Doğru/Yanlış" (True/False) formatında bir soru ile test edin. | Ekranda Çoktan Seçmeli arayüzü yerine, yanyana sadece iki büyük buton (Doğru ve Yanlış) belirir. | Doğru/Yanlış desteği olmadığı için ekranın patlaması (boş ekran). |
| 2.3 | "Açık Uçlu" (Open Ended) bir soruya geldiğinizde klavyeden bir metin yazıp "Gönder / Submit" butonuna basın. | Yazılan metin basarıyla statet'e (`textAnswer`) bağlanır ve backend'e cevap olarak yollanır. | "Sıfırlanmış Const" hatası nedeniyle gönder butonunun işlevsiz kalması. |

## ⏱️ Senaryo 3: Durum Senkronizasyonu ve Zamanlayıcı (State & Timer)
*İlgili Hatalar: #5 (State Not Synced on Reload), #9 (Timer Desync)*

| Adım | Aksiyon | Beklenen Başarılı Sonuç (Pass) | Hata Durumu (Fail) |
| :--- | :--- | :--- | :--- |
| 3.1 | Bir soru aktifken ve oyuncu ekranında süre geriye sayarken (örn. 15. saniyede) tarayıcıyı yenileyin (F5). | Sayfa tekrar açıldığında soru metni, şıklar ve *geriye kalan süre durumu* sunucudan recover (kurtarma) edilerek kaldığı yerden pürüzsüzce devam eder. | Yüklenme sonrası oyunun donması, başlangıç ekranına dönmesi veya sayacın sıfırlanması. |
| 3.2 | Sürenin tamamen bitmesini (00:00) bekleyip ekranı izleyin. | Zamanlayıcı `0`'a geldiğinde tam olarak durur. Butonlar deaktif/kilitli duruma geçer. | Sürenin matematikte `-1, -2` diye eksi değerlere inmeye devam etmesi. |

## 🌐 Senaryo 4: Gerçek Zamanlı Bağlantı (SignalR & Network Resiliency)
*İlgili Hatalar: #7 (Lobby Await), #8 (SessionId Missing), #18 (SignalR Reconnect)*

| Adım | Aksiyon | Beklenen Başarılı Sonuç (Pass) | Hata Durumu (Fail) |
| :--- | :--- | :--- | :--- |
| 4.1 | Oyuncu PIN girerek Lobi sayfasına düşsün, ardıdan hemen Host "Oyunu Başlat" desin. | Oyuncu "Soru Başlıyor" (QuestionStarted) SignalR komutunu kesinlikle kaçırmaz, senkron biçimde odaya girer. | Listener async/await hatası yüzünden oyuncunun oyun başladığı halde Lobide takılı kalması. |
| 4.2 | Oyuncu sınavdayken oyuncunun (veya cihazın) internet bağlantısını 5 saniyeliğine kesip geri verin. | Ara yüz "Yeniden bağlanılıyor..." uyarısını verir, internet geri geldiğinde `.onreconnected` çalışır ve aynı `sessionId` üzerinden aktif gruba otomatik tekrar katılıp veriyi yansıtır. | Bağlantı geldikten sonra SignalR'ın kopuk kalması ve uygulamanın manuel sayfa yenileme istemesi. |
| 4.3 | Birden fazla oyuncuyu simüle edin ve oyuncular farklı cevaplar versin. | Bütün oyuncular kendi `sessionId` bilgileriyle oyun hub'ına ekli olduğu için herkesin skoru ana ekrana doğru akar. | Kimi oyuncunun eylemlerinin Real-Time Hub'ına eksik veya hiç aktarılamaması. |

## 🚧 Senaryo 5: Hata Yönetimi & UX Kalkanları (Error Handling)
*İlgili Hatalar: #22 (API Error global), #12 (Friendly Errors), #11 (Loading Stats)*

| Adım | Aksiyon | Beklenen Başarılı Sonuç (Pass) | Hata Durumu (Fail) |
| :--- | :--- | :--- | :--- |
| 5.1 | Dashboard'a girerken ağı yavaşlatarak (Chrome DevTools -> Network -> Slow 3G) girin. | Veri API'den çekilirken ekranda bir "Yükleniyor" (Skeleton/Spinner) animasyonu gösterilir. | Veri gelene kadar uygulamanın boş/beyaz sayfası ile kullanıcının baş başa kalması. |
| 5.2 | Yanlış veya sahte bir PIN ile oyuna girmeyi deneyin (Veya API sunucusunu zorla durdurun). | Ekranda çiğ bir `console.error` veya `alert()` yerine Toast bildirimleri (örn: sağ üstte uyarı balonu) ile "Oyun bulunamadı" yazar. | Konsola düşen kırmızı hatalar ve arayüzün kullanıcıya reaksiyon vermemesi. |

---

**Doğrulama Kararı:**
Uygulamayı geliştirirken, özellik kodlaması bitince bu senaryoları sırayla deneyin. Yukarıdaki hiçbir maddede "Hata Durumu" kolonu yaşanmıyorsa, lokaldeki testiniz bitmiş ve **proje artık gönül rahatlığıyla canlı sunucuya (Prod) alınmaya hazır hale gelmiş demektir.**
