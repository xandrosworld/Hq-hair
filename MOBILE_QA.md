# Responsive và kiểm tra thao tác điện thoại

## Phạm vi

Kiểm tra bằng Playwright/Chromium (Microsoft Edge), bật mô phỏng thiết bị di động và cảm ứng. Dữ liệu và tài khoản thử nằm trong workspace SQLite riêng, không dùng dữ liệu khách trên production.

- Vai trò: Sale, Trưởng nhóm Sale, Quản lý, Xưởng, Kế toán.
- Khung chính 390 × 844; kiểm tra thêm 320, 360, 430, 768px; xoay ngang 844 × 390 và 932 × 430; kiểm tra lại desktop 1440 × 1000.
- Mỗi điểm kiểm tra ghi chiều rộng trang, phát hiện tràn ngang ngoài vùng cuộn và chụp ảnh; theo dõi lỗi JavaScript.

## Các thao tác được chạy

| Khu vực | Thao tác |
| --- | --- |
| Truy cập | Đăng nhập trên form điện thoại; mở/đóng menu; chuyển màn hình. |
| Khách hàng | Tạo hồ sơ, nhập/chọn trường bắt buộc, sao chép thông tin giao hàng, lưu, tìm, mở hồ sơ và tạo đơn. |
| Đơn hàng | Nhập thông số sản phẩm, số lượng, giá; lưu nháp; sửa; chuyển bước thanh toán/giao hàng; thêm chứng từ; gửi duyệt. |
| Chi tiết | Mở các tab sản phẩm, thanh toán, QC, bồi thường; mở/đóng hóa đơn; nhập tiền bồi thường và kiểm tra lưu. |
| Trao đổi | Gửi tin nhắn, tải ảnh, gửi ảnh, mở/đóng ảnh lớn. |
| Tra cứu | Tìm kiếm chung; thông báo; bảng giá; tìm mã màu và tra giá; chọn nhóm/ngôn ngữ quy chuẩn, phóng to/vừa khung. |
| Xưởng | Sáu màn hình, ghi nhận sản xuất qua nút xác nhận, chi tiết và QC chỉ xem đúng quyền. |
| Kế toán | Danh sách, mở đơn, chọn chứng từ, xác nhận thanh toán đủ. |
| QC Sale | Sau bước 7: nhập đánh giá, lưu, tải ảnh và hoàn tất QC. |
| Quản lý/Trưởng nhóm | Tổng quan, khách hàng, tài khoản/đội ngũ và các bảng theo quyền. |

Các bước trung gian để chuẩn bị QC dùng API có xác thực; không coi đó là kiểm thử nút bấm UI của bước trung gian. Các luồng này còn được kiểm tra riêng bằng `tests/factory-integration.mjs` và `tests/workflow-security.mjs`.

## Các lỗi đã sửa

- Chiều rộng tối thiểu desktop và sidebar cố định khiến trang quá rộng trên điện thoại: thêm khung responsive và menu thu gọn, cuộn riêng trong menu.
- Bảng giá có CSS riêng làm menu bị lớp nền che: dùng chung cơ chế menu với các màn hình khác.
- Tóm tắt đơn chồng nội dung và biểu đồ Quản lý bị ép hẹp: chuyển bố cục phù hợp màn hình nhỏ.
- Thanh lưu đơn che nội dung: đặt trong luồng trang trên màn hình nhỏ.
- Bảng Kế toán thiếu vùng cuộn: bổ sung vùng cuộn ngang để xem đủ cột.
- Ô chat quá hẹp: đưa ô nhập lên hàng riêng; giữ nút ảnh/gửi ở dưới.
- Cột tiền cố định che thông số sản phẩm: bỏ ghim cột trên điện thoại; bảng vẫn giữ đủ cột và cuộn trong vùng bảng.
- Cỡ chữ nhập liệu và vùng bấm nhỏ: tăng cỡ chữ form, chiều cao nút và vùng bấm; bổ sung tên truy cập cho nút tìm kiếm.

## Chạy lại

```
npm run build
node tests/mobile-workspace.mjs
npm test
node tests/factory-integration.mjs
node tests/workflow-security.mjs
```

Ảnh và báo cáo JSON tự sinh trong `data/mobile-audit/` (không đưa dữ liệu thử vào Git).

Kết quả ngày 08/10/2026: 77 lượt kiểm tra màn hình/trạng thái đạt, không có lỗi JavaScript được ghi nhận; 73 kiểm thử tự động đạt; bài kiểm tra Xưởng và luồng liên thông API đạt. Số 77 bao gồm cùng màn hình ở nhiều kích thước, không phải 77 chức năng khác nhau.

## Giới hạn

### Rà soát tải tệp bổ sung — 08/10/2026

Chạy `node tests/mobile-workspace.mjs` sẽ chạy cả `tests/mobile-upload-cases.mjs`. Kết quả cập nhật: **78** lượt màn hình/trạng thái đạt, không có lỗi JavaScript; 73 unit test và workflow-security đạt.

- Chứng từ: chạm input để phát sinh filechooser, ảnh JPEG trên 1 MB có EXIF xoay 90 độ, tự giảm xuống tối đa 1 MB và giữ chiều đứng; xem trước; bỏ/chọn lại cùng tệp; từ chối HEIC, ảnh hỏng và PDF quá 1 MB; phục hồi sau lỗi; chọn/tải PDF hợp lệ và so sánh nguyên byte; lưu chứng từ PNG vào đơn.
- Chat: chọn nhiều PNG/WebP, bỏ/chọn lại, từ chối quá dung lượng mà giữ tệp cũ; chặn mạng rồi gửi lại; giả lập máy chủ đã lưu nhưng mất phản hồi, xác nhận chỉ một tin nhắn; giải mã ảnh xem trước, tải ảnh gốc và so sánh nguyên byte; tải lại trang vẫn thấy ảnh.
- QC: từ chối ảnh trên 5 MiB, ngắt mạng rồi chọn lại cùng ảnh, bỏ/thêm lại; lưu và kiểm tra liên kết tệp ở máy chủ; hoàn tất QC rồi tải lại trang vẫn thấy ảnh.
- Sửa thao tác: thêm nút bỏ chứng từ, reset input để chọn lại cùng tệp, khóa gửi khi đang đọc tệp, phóng vùng chạm xóa ảnh chat/QC trên điện thoại. Ảnh chứng từ tối đa 20 MB trước xử lý; bản lưu vẫn tối đa 1 MB, có xem trước để người nhập kiểm tra độ rõ. PDF vẫn tối đa 1 MB. HEIC chưa hỗ trợ.

Các file ảnh là dữ liệu thử tự sinh, không phải chứng từ khách hàng thật. Filechooser được Playwright nhận rồi cấp tệp; chưa thao tác thư viện ảnh/camera thực của hệ điều hành. Chưa xác nhận quay/upload/phát video trên thiết bị thật.

Đây là kiểm thử mô phỏng cảm ứng trên Chromium, không phải kiểm thử thiết bị iPhone/Android vật lý. Bàn phím ảo, Safari iOS, hộp chọn tệp/camera và hộp thoại in của hệ điều hành vẫn cần kiểm tra trên thiết bị thực trước khi ký nghiệm thu responsive. Kết quả không có nghĩa mọi tổ hợp dữ liệu và mọi thiết bị đều đã được kiểm tra.


## Rà soát mở rộng Android và iPhone — 08/10/2026

Phần này cập nhật kết quả mới nhất; các con số 77/78 ở trên là lịch sử.

### Môi trường và kết quả

- Chromium/Edge với cấu hình Pixel 7, cảm ứng; WebKit với cấu hình iPhone 13, cảm ứng. Cả hai chạy trên Windows, không phải thiết bị vật lý.
- Mỗi engine đạt 1.080 lượt kiểm tra kích thước/trạng thái, không có lỗi JavaScript hoặc tràn ngang toàn trang trong phạm vi kiểm tra. Đây là các lần đo lặp, không phải 1.080 chức năng độc lập.
- Kích thước: 320×740, 360×800, 390×844, 390×360 (khung nhìn thấp), 430×932, 768×1024, 844×390, 932×430, 1024×768, 1119×800, 1120×900 và 1440×1000.
- Mỗi trạng thái trung gian được kiểm tra ở cả 12 kích thước, gồm form, dialog và chi tiết. Kiểm tra riêng ô nhập sản phẩm, đánh giá QC và nút upload phải nằm trong chiều ngang điện thoại.
- Luồng UI: tạo khách/đơn, tự lưu, chọn màu bằng chạm, chứng từ, gửi duyệt; Kế toán duyệt; Xưởng sản xuất/tạm dừng/tiếp tục/Sale Check; Sale yêu cầu sửa; Xưởng gửi kiểm tra lại; Sale chấp nhận; Xưởng bàn giao; Kế toán kiểm tra cuối; Sale QC/đặt ship/nhận hàng/hoàn thành. Chuẩn bị tài khoản và một số đơn đầu vào dùng API trong database tạm riêng.
- Quản trị: chọn nhiều thành phần màu bằng checkbox, lưu màu phối; xem trước/áp dụng/khôi phục bảng giá. Sale, Lead, Quản trị, Kế toán, Xưởng được kiểm tra theo vai trò.
- Tệp: JPEG lớn có EXIF, PNG/WebP, PDF, MP4 và WebM dọc tự sinh; thiếu MIME/`application/octet-stream`; tệp hỏng/quá giới hạn; chọn lại cùng tệp; mất mạng và mất phản hồi sau ghi; so sánh byte tải xuống; kiểm tra HTTP Range và lưu liên kết QC qua tải lại trang.
- `npm test`: 73/73 đạt. `security.mjs`, `workflow-security.mjs`, `factory-integration.mjs`, `pricing-security.mjs` đạt.
- `concurrent-workspace.mjs`: 20 tài khoản, 80 khách, 60 đơn; 20 lượt sửa cùng phiên bản cho đúng 1 lượt thành công và 19 phản hồi xung đột. Đây là kiểm tra đồng thời cục bộ, không phải chứng nhận tải production.

### Các sửa đổi trong lượt này

- Nhập sản phẩm trên điện thoại chuyển thành từng khối có nhãn; giữ đầy đủ trường và cách tính giá.
- QC trên điện thoại hiển thị thông số và vùng đánh giá/upload theo chiều dọc, không giấu nút tải tệp trong bảng 900px.
- Sửa tóm tắt đơn tràn ngang ở 320px; dialog dùng chiều cao `dvh` và cuộn trong khung nhỏ.
- Chọn màu phối bằng checkbox, không yêu cầu Ctrl trên điện thoại.
- Chuẩn hóa MIME thiếu từ trình chọn tệp; kiểm tra chữ ký PDF trước xem trước; thông báo rõ HEIC/MOV và tệp rỗng.
- Video có `playsInline`; khi trình phát không gửi được cookie, nút tải qua `fetch` có xác thực giữ nguyên kiểm tra quyền. Tệp tải về có thể phát hoặc tải nguyên bản; hủy request và thu hồi Blob URL khi đóng.
- Sửa fixture kiểm thử cũ theo các quy tắc đã có: URL hợp lệ, thông số/chứng từ bắt buộc, 20 tệp chat, một đơn chưa duyệt mỗi khách. Không nới quy tắc nghiệp vụ để làm test đạt.

### Website/VPS thực tế

- Kiểm tra HTTPS health/revision tại `https://hqhaircrm.io.vn`, dịch vụ deploy/backup trên Vietnix đều active; đầy đủ 14 ảnh quy chuẩn và PDF gốc 51.139.469 byte.
- `mobile-live.mjs` kiểm tra 16 lượt trang đăng nhập/demo trên hai engine, ở 320/390/430/844px; không tạo/sửa đơn vận hành.
- Thông tin quản trị cũ lưu local bị từ chối đăng nhập; không reset mật khẩu hay tạo tài khoản trên production. Các thao tác có đăng nhập/chỉnh sửa nêu trên được thực hiện ở máy chủ thử riêng với cùng mã nguồn.

### Giới hạn phải giữ khi bàn giao

- Chromium xác nhận giải mã và phát MP4/WebM dọc; WebKit Windows không phát được các video có xác thực, kể cả Blob trong môi trường thử. Đã tái hiện yêu cầu media thiếu cookie bằng log 401, đồng thời xác nhận tải qua fetch đúng quyền và tải nguyên byte. **Không ghi nhận đạt phát video trên Safari iPhone thật.** Kết quả `mediaChecks` trong JSON giữ trạng thái chưa kiểm chứng này.
- HEIC/HEIF, MOV và codec HEVC chưa được chuyển đổi tự động. JPG/PNG/WebP và MP4/WebM vẫn là các định dạng được nhận; MP4 không bảo đảm mọi codec bên trong đều phát trên mọi máy.
- Chưa có điện thoại vật lý để kiểm tra camera/thư viện ảnh, Files/iCloud/Google Drive picker, bàn phím ảo, safe area thực, hộp thoại in và tải PDF 49 MB trên mạng di động. Khung 390×360 chỉ mô phỏng phần hiển thị bị thu hẹp, không thay bàn phím thật.
- PDF quy chuẩn trong môi trường thử là fixture vận chuyển; website thật được kiểm tra có đủ tệp trên VPS. Chưa tải PDF qua phiên người dùng production.

### Chạy lại trên Windows

Cần Node theo package.json, Microsoft Edge, WebKit (`npx playwright install webkit`) và FFmpeg trong PATH để tạo video mẫu. Hai engine dùng cổng/database tạm khác nhau.

```powershell
npm run build
$env:MOBILE_DEEP='1'
$env:MOBILE_OUTPUT='data/mobile-audit/chromium'
node tests/mobile-workspace.mjs
$env:MOBILE_BROWSER='webkit'
$env:MOBILE_PORT='3198'
$env:MOBILE_OUTPUT='data/mobile-audit/webkit'
node tests/mobile-workspace.mjs
node tests/mobile-live.mjs
```

Ảnh và `results.json` nằm trong `data/mobile-audit/chromium`, `webkit`, `live` (gitignored). Đọc cả `mediaChecks`, không chỉ số lượt đạt. Không chạy hai tiến trình dùng cùng `MOBILE_PORT` cùng lúc.
