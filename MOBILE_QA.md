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

Đây là kiểm thử mô phỏng cảm ứng trên Chromium, không phải kiểm thử thiết bị iPhone/Android vật lý. Bàn phím ảo, Safari iOS, hộp chọn tệp/camera và hộp thoại in của hệ điều hành vẫn cần kiểm tra trên thiết bị thực trước khi ký nghiệm thu responsive. Kết quả không có nghĩa mọi tổ hợp dữ liệu và mọi thiết bị đều đã được kiểm tra.
