# Giai đoạn Sale — tình trạng triển khai

Căn cứ: hợp đồng 2809/2026-HĐDV.XANDRO-HQ, C01–C04 và S01–S13; phản hồi HQ Hair ngày 30/09/2026. Đây là hồ sơ triển khai, không phải biên bản nghiệm thu. Trạng thái Xưởng hiện tại xem [FACTORY_IMPLEMENTATION.md](FACTORY_IMPLEMENTATION.md); quyền hiện hành xem phần đầu [CUSTOMER_PERMISSIONS.md](CUSTOMER_PERMISSIONS.md).

## Môi trường

- `https://hqhaircrm.io.vn/workspace`: đăng nhập riêng, dữ liệu chung trên VPS Vietnix; tên miền gốc chuyển tới đây.
- `/demo`: dữ liệu minh họa riêng theo trình duyệt. Không nhập đơn thật vào demo.
- Các bài kiểm thử tự tạo máy chủ và cơ sở dữ liệu riêng; không tạo đơn mẫu trong dữ liệu vận hành.

## Đã triển khai

| Nhóm | Khả năng hiện có | Điều kiện nghiệm thu / giới hạn |
|---|---|---|
| C01–C02 | Đăng nhập, đổi mật khẩu ban đầu, khóa/reset tài khoản và thu hồi phiên; Sale chỉ xem khách/đơn/chỉ số của mình; quản trị xem toàn bộ; mã tùy chọn HQ-JD / KT-xx / SX-xx / QT-xx; khách và đơn tự sinh theo mã, chặn trùng | Chờ tên/email thật; mã đã cấp không sửa tự do. Tài khoản cũ giữ mã hiện có |
| C03–C04 | Audit người/thời gian, snapshot trước sửa, chat chữ/ảnh, kiểm tra quyền khi đọc ảnh; bảng việc cần chú ý gồm bước 2/5/8/9 | Thông báo dạng bảng việc và tải lại định kỳ, chưa có email/push; liên thông Kế toán/Xưởng đã có kiểm thử tự động trên database riêng; vẫn cần nghiệm thu bằng dữ liệu khách |
| S01–S03 | Hồ sơ khách, tìm/lọc, người phụ trách, lịch sử đơn/doanh thu; địa chỉ riêng trên đơn; chuyển phụ trách có audit | Chốt dữ liệu cũ, trường bắt buộc, quy tắc khách mới/quay lại và kỳ biểu đồ theo bộ mẫu |
| S04 | 2.874 giá từ 38 sheet, 96 mẫu màu (94 nguồn + 2 bổ sung) và 167 ảnh; USD/100g hoặc USD/cái; màu phối lấy tông cao nhất; thay đổi % theo phạm vi, xem trước, lịch sử, khôi phục lần gần nhất; cấp quyền giá/màu riêng | 60A/Grey và các mẫu phối liên quan đã chốt tông Sáng. Giá đơn cũ không đổi theo bảng giá |
| S05–S09 | Hai phần sản phẩm/thanh toán, ba nhóm hàng, lưu nháp/gửi duyệt/khóa sửa; nhiều chứng từ chờ xác nhận; hạn thanh toán riêng; mã chống gửi trùng và version chống ghi đè | Chờ đơn mẫu xác nhận công thức/làm tròn/phí. Kế toán cấp quyền thêm hàng trong sản xuất sẽ nối ở GĐ2 |
| S10–S11 | Tìm/lọc trạng thái/tháng/khách/người phụ trách, bảng tiến độ; Sale check → tiếp tục sản xuất hoặc cần sửa, không thực hiện bước gửi văn phòng thay Xưởng; thao tác kiểm định/đặt ship → nhận hàng → hoàn thành | Đầu vào bước 5 và 8 đã nối với Xưởng/Kế toán; kiểm thử liên thông bằng dữ liệu riêng, không giả xác nhận trên đơn thật |
| S12 | Invoice tiếng Anh, xem/in/lưu PDF, không xuất chat/bill/lịch sử nội bộ | Mẫu hiện còn DRAFT; chờ mẫu khách duyệt trước dùng làm chứng từ thật |
| S13 | Doanh thu, đã nhận, chứng từ chờ xác nhận, công nợ, báo cáo CSV; hạn thanh toán độc lập với hạn giao; số ngày quá hạn, lọc nhóm chưa đặt hạn/chưa quá hạn/1–30/31–60/61–90/trên 90 | Nhóm tuổi nợ là cấu hình triển khai ban đầu cần xác nhận cùng kết quả mẫu; không tự gán hạn cho đơn cũ |

## Quyền và trạng thái cuối đơn

- Hoàn tất bước 8 yêu cầu xác nhận kiểm định, đơn vị vận chuyển, mã tracking, ngày đặt ship hợp lệ. Mã phiếu và ghi chú kiểm định được lưu; chưa tự thiết kế phiếu chính thức thay mẫu khách.
- Khóa nội dung là cờ độc lập với trạng thái. Sale không sửa đơn/thanh toán hoặc xin mở nháp sau khóa; chat và bước 9/10 tiếp tục. Trạng thái 9/10 cũ cũng được coi là khóa.
- Sale xác nhận đã nhận khi bước 8 đã hoàn tất. Đóng đơn còn nợ tạm yêu cầu quản trị ghi lý do ngoại lệ, công nợ vẫn giữ nguyên; quy tắc thương mại chính thức chờ xác nhận.
- Quản trị có màn sửa ngoại lệ nội dung/giá/giao hàng, lý do bắt buộc, giữ tiến độ/khóa và snapshot trước sửa. Có điều chỉnh trạng thái và số tiền/xác nhận của từng lần thanh toán, lưu trước/sau vào audit. Đây là quyền ngoại lệ quản trị, không phải phân hệ Kế toán.
- Quản trị đổi trạng thái không xác nhận tiền và không gỡ khóa sau bước 8. Không dùng cấp sửa đơn chờ duyệt để đưa đơn đã khóa về bản nháp.
- Xưởng hiện xem đầy đủ đơn đã gửi và chat; quản trị có thể thu hẹp còn sản phẩm/chat. Quyền vận hành Xưởng đã triển khai: sản xuất, tạm dừng/tiếp tục, Sale Check và bàn giao văn phòng, gồm hàng loạt tối đa 100 đơn. Cơ chế cấp quyền cho mọi thao tác/ngoại lệ tùy biến chưa hoàn thiện; không gọi đây là hệ thống phân quyền tổng quát đã xong.

## Dữ liệu và vận hành

- Ghi nghiệp vụ/audit trong giao dịch SQLite; chống ghi đè và gửi trùng. Chứng từ Sale chưa xác nhận không được cộng vào tiền đã nhận.
- Chứng từ PNG/JPEG/WebP/PDF tối đa 1 MiB/tệp, 20 chứng từ/đơn. Chat tối đa 20 ảnh/video mỗi tin: PNG/JPEG/WebP 10 MiB/ảnh, MP4/WebM 25 MiB/video, tổng 50 MiB. Kiểm tra định dạng thật và quyền truy cập.
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

1. Đã có email Judy/HQ-JD; chờ email cá nhân chủ doanh nghiệp để cấp quản trị, nhân sự còn lại và người được sửa giá/thêm màu.
2. Khoảng 5 đơn có kết quả tính tay; công thức giảm giá/phí, làm tròn/tỷ giá nếu có, hạn thanh toán, đóng đơn còn nợ.
3. Mẫu invoice và phiếu kiểm định, thông tin cần hiện/ẩn.
4. Nhóm giá 60A/Grey đã xác nhận Sáng lúc 23:48; không cần hỏi lại.
5. Có chuyển khách/đơn/công nợ cũ không; file nguồn và phạm vi nếu có.
6. Người chạy thử/xác nhận, lịch kiểm tra và ngày bắt đầu đã thống nhất.

Chỉ ghi đạt nghiệm thu sau khi đối chiếu C01–C04/S01–S13 bằng dữ liệu được khách xác nhận, khắc phục lỗi trọng yếu và có biên bản. GĐ1 không thay nghiệm thu phân hệ Kế toán/Xưởng hoặc liên thông cuối dự án.

Công nợ đã chốt độc lập theo từng đơn: đơn mới không mang nợ/tiền trả từ đơn cũ. Chưa xác nhận phạm vi chuyển dữ liệu lịch sử.

Trưởng nhóm Sale đã có vai trò riêng mặc định chỉ đọc toàn đội; tổng hợp theo người phụ trách. Quản trị có thể cấp riêng thao tác như Sale và phân công khách, không biến Lead thành quản trị. Xem CUSTOMER_PERMISSIONS.md và tests/sales-lead.mjs.


## Chốt hiển thị và công thức báo cáo — 09/10/2026

- Bảng Thanh toán & giao hàng giữ lưu ý phí (không gắn số tiền), ngay dưới là **Tổng thu**. Bỏ dòng Dự kiến theo chứng từ. Sau Đã nhận thêm **Doanh thu đã nhận = Đã nhận − Phí vận chuyển**.
- Hóa đơn/PDF dùng lưu ý tiếng Anh và dòng **TOTAL USD** riêng ngay phía dưới, bằng Tổng thu; không xuất công nợ/chứng từ nội bộ.
- Tab Doanh thu & công nợ: Doanh thu lấy Doanh thu đơn hàng; Đã nhận lấy Doanh thu đã nhận; Công nợ lấy Tổng thu trừ tiền thực nhận gốc theo từng đơn (giữ sàn 0 và không bù trừ giữa đơn). Giảm giá cộng giảm giá đơn; Thiệt hại cộng bồi thường chưa bị hủy.
- Thẻ KPI, đường biểu đồ, tổng hợp đội Sale trong tab này và CSV cùng dùng doanh thu đã nhận sau phí vận chuyển. Tiền thực nhận gốc vẫn được lưu riêng để đối soát và tính công nợ. Trang tổng quan ngoài tab báo cáo vẫn giữ chỉ số tiền thực nhận hiện có.
- Khách chốt lúc 11:07 ngày 09/10/2026: Doanh thu đã nhận = max(0, Tổng đã nhận − Phí vận chuyển), tính riêng từng đơn trước khi cộng báo cáo. Tiền nhận nhỏ hơn hoặc bằng phí vận chuyển cho kết quả 0; phí 85 USD, nhận 86 USD thì doanh thu đã nhận 1 USD. Thay thế cách tính có thể âm trước đó; không thay Doanh thu đơn hàng, tiền thực nhận hoặc công nợ.
- Tổng thu giữ phí nhận tiền trên dữ liệu cũ nếu còn; công nợ dùng Tổng thu nên tính cả khoản cũ này. Không sửa dữ liệu chứng từ/đơn đã lưu.
- Ví dụ: hàng 800, giảm 30, vận chuyển 85, thực nhận 500 → doanh thu 770, tổng thu 855, doanh thu đã nhận 415, công nợ 355 USD.
- Kiểm thử: `tests/reporting.test.js` kiểm tra chưa nhận/nhận ít hơn phí/một phần/đủ/dư, chứng từ chờ, đơn hủy/nháp và phí cũ; `tests/financial-display.mjs` kiểm tra số mẫu trên Chromium/WebKit, khung 320/390/1440, PDF, thẻ/biểu đồ/CSV. Có thể xuất PDF thử bằng `$env:PRINT_PDF='1'; node tests/financial-display.mjs`.


## Xác nhận phần Xưởng ngày 09/10/2026

- Chỉ Kế toán hủy mất cọc khi đơn bước 4 đang tạm dừng tại Xưởng; không có nghiệp vụ hủy mất phí. API chặn cả trạng thái không hợp lệ và phiên bản cũ. Không thay đổi số tiền/chứng từ lịch sử.
- Xưởng hiển thị ngày duyệt lần đầu, hạn gửi văn phòng, số ngày kế hoạch, ngày gửi và số ngày thực tế. Cả hai khoảng thời gian tính từ ngày duyệt; sớm/đúng/trễ so ngày gửi với hạn chốt khi bàn giao. Thiếu ngày hiện “—”.
- Cộng gram rồi đổi tổng sang kg; đơn vị khác giữ riêng. Đơn mẫu và kết quả nghiệm thu từ khách vẫn đang chờ.
- Chi tiết quy tắc và bằng chứng: FACTORY_IMPLEMENTATION.md. Xác nhận này thay thế các mô tả cũ cho phép hủy mất cọc ở bước thanh toán cuối.
