# Giai đoạn Sale — tình trạng triển khai

Căn cứ: hợp đồng 2809/2026-HĐDV.XANDRO-HQ, C01–C04 và S01–S13; phản hồi HQ Hair ngày 30/09/2026. Đây là hồ sơ triển khai, không phải biên bản nghiệm thu.

## Môi trường

- `https://hqhaircrm.io.vn/workspace`: đăng nhập riêng, dữ liệu chung trên VPS Vietnix; tên miền gốc chuyển tới đây.
- `/demo`: dữ liệu minh họa riêng theo trình duyệt. Không nhập đơn thật vào demo.
- Các bài kiểm thử tự tạo máy chủ và cơ sở dữ liệu riêng; không tạo đơn mẫu trong dữ liệu vận hành.

## Đã triển khai

| Nhóm | Khả năng hiện có | Điều kiện nghiệm thu / giới hạn |
|---|---|---|
| C01–C02 | Đăng nhập, đổi mật khẩu ban đầu, khóa/reset tài khoản và thu hồi phiên; Sale chỉ xem khách/đơn/chỉ số của mình; quản trị xem toàn bộ; mã tùy chọn HQ-JD / KT-xx / SX-xx / QT-xx; khách và đơn tự sinh theo mã, chặn trùng | Chờ tên/email thật; mã đã cấp không sửa tự do. Tài khoản cũ giữ mã hiện có |
| C03–C04 | Audit người/thời gian, snapshot trước sửa, chat chữ/ảnh, kiểm tra quyền khi đọc ảnh; bảng việc cần chú ý gồm bước 2/5/8/9 | Thông báo dạng bảng việc và tải lại định kỳ, chưa có email/push; liên thông Kế toán/Xưởng kiểm thử ở giai đoạn sau |
| S01–S03 | Hồ sơ khách, tìm/lọc, người phụ trách, lịch sử đơn/doanh thu; địa chỉ riêng trên đơn; chuyển phụ trách có audit | Chốt dữ liệu cũ, trường bắt buộc, quy tắc khách mới/quay lại và kỳ biểu đồ theo bộ mẫu |
| S04 | 2.874 giá từ 38 sheet, 94 mẫu màu và 167 ảnh; USD/100g hoặc USD/cái; màu phối lấy tông cao nhất; thay đổi % theo phạm vi, xem trước, lịch sử, khôi phục lần gần nhất; cấp quyền giá/màu riêng | Chờ nhóm giá 60A và Grey; hai mẫu phụ thuộc bị chặn tra giá đến khi đủ dữ liệu. Giá đơn cũ không đổi theo bảng giá |
| S05–S09 | Hai phần sản phẩm/thanh toán, ba nhóm hàng, lưu nháp/gửi duyệt/khóa sửa; nhiều chứng từ chờ xác nhận; hạn thanh toán riêng; mã chống gửi trùng và version chống ghi đè | Chờ đơn mẫu xác nhận công thức/làm tròn/phí. Kế toán cấp quyền thêm hàng trong sản xuất sẽ nối ở GĐ2 |
| S10–S11 | Tìm/lọc trạng thái/tháng/khách/người phụ trách, bảng tiến độ; Sale check → tiếp tục sản xuất hoặc cần sửa, không thực hiện bước gửi văn phòng thay Xưởng; thao tác kiểm định/đặt ship → nhận hàng → hoàn thành | Đầu vào bước 5 và 8 từ Xưởng/Kế toán hoàn thiện ở GĐ2/3. Kiểm thử Sale dùng dữ liệu riêng có đánh dấu, không giả xác nhận Kế toán trên đơn thật |
| S12 | Invoice tiếng Anh, xem/in/lưu PDF, không xuất chat/bill/lịch sử nội bộ | Mẫu hiện còn DRAFT; chờ mẫu khách duyệt trước dùng làm chứng từ thật |
| S13 | Doanh thu, đã nhận, chứng từ chờ xác nhận, công nợ, báo cáo CSV; hạn thanh toán độc lập với hạn giao; số ngày quá hạn, lọc nhóm chưa đặt hạn/chưa quá hạn/1–30/31–60/61–90/trên 90 | Nhóm tuổi nợ là cấu hình triển khai ban đầu cần xác nhận cùng kết quả mẫu; không tự gán hạn cho đơn cũ |

## Quyền và trạng thái cuối đơn

- Hoàn tất bước 8 yêu cầu xác nhận kiểm định, đơn vị vận chuyển, mã tracking, ngày đặt ship hợp lệ. Mã phiếu và ghi chú kiểm định được lưu; chưa tự thiết kế phiếu chính thức thay mẫu khách.
- Khóa nội dung là cờ độc lập với trạng thái. Sale không sửa đơn/thanh toán hoặc xin mở nháp sau khóa; chat và bước 9/10 tiếp tục. Trạng thái 9/10 cũ cũng được coi là khóa.
- Sale xác nhận đã nhận khi bước 8 đã hoàn tất. Đóng đơn còn nợ tạm yêu cầu quản trị ghi lý do ngoại lệ, công nợ vẫn giữ nguyên; quy tắc thương mại chính thức chờ xác nhận.
- Quản trị có màn sửa ngoại lệ nội dung/giá/giao hàng, lý do bắt buộc, giữ tiến độ/khóa và snapshot trước sửa. Có điều chỉnh trạng thái và số tiền/xác nhận của từng lần thanh toán, lưu trước/sau vào audit. Đây là quyền ngoại lệ quản trị, không phải phân hệ Kế toán.
- Quản trị đổi trạng thái không xác nhận tiền và không gỡ khóa sau bước 8. Không dùng cấp sửa đơn chờ duyệt để đưa đơn đã khóa về bản nháp.
- Xưởng hiện xem đầy đủ đơn đã gửi và chat; quản trị có thể thu hẹp còn sản phẩm/chat. Quyền vận hành Xưởng chưa triển khai. Cơ chế cấp quyền cho mọi thao tác/ngoại lệ tùy biến chưa hoàn thiện; không gọi đây là hệ thống phân quyền tổng quát đã xong.

## Dữ liệu và vận hành

- Ghi nghiệp vụ/audit trong giao dịch SQLite; chống ghi đè và gửi trùng. Chứng từ Sale chưa xác nhận không được cộng vào tiền đã nhận.
- Chứng từ PNG/JPEG/WebP/PDF tối đa 1 MiB/tệp, 20 chứng từ/đơn. Chat ảnh PNG/JPEG/WebP tối đa 5 MiB/ảnh, 4 ảnh/tin. Kiểm tra định dạng thật và quyền truy cập.
- VPS sao lưu hằng ngày và trước triển khai; 14 ngày. Bản sao ngoài VPS tải về máy vận hành bằng `scripts/vps-backup.py`, kiểm SHA-256 và SQLite integrity. Xem OPERATIONS.md về lịch chạy và điều kiện máy vận hành.
- Mật khẩu, .env, database, file khách và backup không đưa vào Git. Không thay mật khẩu quản trị đang sử dụng trong quá trình kiểm thử.

## Bộ kiểm thử nội bộ

- `npm test`: công thức, sản phẩm, màu/giá, tuổi nợ, ranh giới workflow và khóa nội dung.
- `node tests/security.mjs`: đăng nhập/CSRF/phân quyền, chống ghi trùng/ghi đè, chat ảnh, chuyển người phụ trách, lưu qua khởi động lại, sao lưu và khôi phục.
- `node tests/workspace-auth.mjs`: trình duyệt tạo tài khoản/khách/đơn, sản phẩm, invoice, chat ảnh, Xưởng và thu hẹp quyền.
- `node tests/pricing-security.mjs`: bảng giá, cấp quyền, điều chỉnh %, history/restore, ảnh và màu thiếu.
- `node tests/workflow-security.mjs`: mã tùy chọn/trùng mã, ranh giới Sale–Xưởng, khóa bền vững, quản trị ngoại lệ, chat sau khóa, retry và audit.
- `node tests/workflow-ui.mjs`: trình duyệt kiểm định/khóa/chat, sửa quản trị, thanh toán ngoại lệ, nhận hàng/hoàn thành, bộ lọc.

## Chờ dữ liệu khách và nghiệm thu

1. Tên/email tương ứng HQ-JD/HQ-EM/HQ-LN; người giữ quản trị và quyền sửa giá/thêm màu.
2. Khoảng 5 đơn có kết quả tính tay; công thức giảm giá/phí, làm tròn/tỷ giá nếu có, hạn thanh toán, đóng đơn còn nợ.
3. Mẫu invoice và phiếu kiểm định, thông tin cần hiện/ẩn.
4. Nhóm giá của 60A và Grey; không hỏi lại Other hoặc quy tắc phối màu đã chốt.
5. Có chuyển khách/đơn/công nợ cũ không; file nguồn và phạm vi nếu có.
6. Người chạy thử/xác nhận, lịch kiểm tra và ngày bắt đầu đã thống nhất.

Chỉ ghi đạt nghiệm thu sau khi đối chiếu C01–C04/S01–S13 bằng dữ liệu được khách xác nhận, khắc phục lỗi trọng yếu và có biên bản. GĐ1 không thay nghiệm thu phân hệ Kế toán/Xưởng hoặc liên thông cuối dự án.
