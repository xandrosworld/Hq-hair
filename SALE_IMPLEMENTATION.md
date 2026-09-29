# Giai đoạn Sale — trạng thái triển khai

Căn cứ: Hợp đồng 2809/2026-HĐDV.XANDRO-HQ, Phụ lục 01 và tiêu chí nghiệm thu Phụ lục 02. Đây là bản theo dõi triển khai, không phải biên bản nghiệm thu.

## Hai không gian

- `/`: demo giới thiệu, dữ liệu mẫu riêng theo trình duyệt.
- `/workspace`: đăng nhập riêng, dữ liệu chung lưu tại máy chủ; bắt đầu với danh sách khách, đơn và bảng giá rỗng. Không tự đưa dữ liệu demo sang vận hành.
- Tài khoản đầu tiên là quản lý triển khai. Danh sách nhân sự thực và quyền cuối cùng được cấu hình sau khi HQ Hair xác nhận.

## Đã xây dựng và kiểm tra

| Nhóm hợp đồng | Phần triển khai hiện có | Phần cần xác nhận / nối tiếp |
|---|---|---|
| C01 | Đăng nhập, băm mật khẩu scrypt, đổi mật khẩu lần đầu, phiên HttpOnly 8 giờ, CSRF, giới hạn thử đăng nhập, cấp/khóa/reset tài khoản; thu hồi phiên khi khóa/reset | Ma trận quyền chi tiết. Tài khoản Kế toán/Xưởng được tạo trước nhưng không truy cập phân hệ Sale |
| C02 | Dữ liệu dùng chung; Sale chỉ xem khách/đơn mình phụ trách; quản lý xem toàn bộ; chuyển người phụ trách; mã tự tăng không tái sử dụng khi xóa đơn; kiểm tra quyền tại máy chủ | Quy tắc mã chính thức; hiện dùng mã hệ thống HQ-Sxxx |
| C03–C04 | Nhật ký actor/thời gian; snapshot bản trước khi sửa đơn; audit hồ sơ, bảng giá, phân công; chat theo đơn nằm trong phạm vi quyền; bảng việc cần chú ý; cập nhật danh sách mỗi 30 giây khi không soạn | Thông báo và chat liên bộ phận kiểm thử đầy đủ ở GĐ2/3; chưa có push/email |
| S01–S03 | Hồ sơ khách, tìm/lọc, lịch sử đơn, doanh thu/tỷ lệ quay lại; địa chỉ trên đơn được lưu riêng | Trường bắt buộc, quy tắc nhập khách cũ, kỳ thống kê và biểu đồ khách theo tháng |
| S04 | Quản lý nhập/sửa bảng giá; Sale chọn theo nhóm; giá trên đơn đã lưu không bị thay khi sửa danh mục | Bảng giá thật, cách áp giá, quy tắc sửa đơn giá |
| S05–S09 | Nháp hai bước; ba nhóm sản phẩm; tổng tiền; nhiều chứng từ chờ xác nhận; khóa khi gửi; yêu cầu sửa; quản lý có thể mở lại đơn chờ duyệt; lưu lịch sử; kiểm tra version chống ghi đè; mã thao tác chống gửi trùng | Công thức chính thức; hạn thanh toán; quyền sửa khi đơn đã đi xa hơn chờ duyệt; cách cập nhật tracking sau gửi |
| S10–S11 | Danh sách/tìm kiếm/trạng thái/tháng, bảng tiến độ, chi tiết và lịch sử; luồng Sale tiếp nhận/sửa lại có kiểm tra trạng thái | Bộ lọc Sale/khách chuyên biệt, quy tắc sắp xếp cuối cùng, tích hợp Xưởng/Kế toán |
| S12–S13 | Invoice thương mại/in PDF, CSV theo quyền, doanh thu/công nợ/biểu đồ | Mẫu invoice, công thức công nợ, tuổi nợ và kỳ báo cáo khách xác nhận; chưa dùng invoice chờ xác nhận để yêu cầu thanh toán thật |

## Các kiểm soát dữ liệu

- Thao tác nghiệp vụ và audit commit trong cùng giao dịch SQLite. Không lưu nửa chừng khi validation/quyền/version sai.
- Mỗi lần lưu đơn/hồ sơ có version. Nếu người khác đã sửa, yêu cầu cũ bị từ chối với HTTP 409.
- Yêu cầu ghi có Idempotency-Key. Gửi lại cùng khóa và nội dung không tạo thêm dữ liệu. Kết quả gửi lại luôn lọc theo quyền hiện tại, kể cả sau chuyển người phụ trách.
- Sale không tự ghi tiền đã xác nhận. Chứng từ mới luôn chờ Kế toán, mã giao dịch được kiểm tra trùng theo phương thức.
- Chứng từ PNG/JPEG/WebP/PDF tối đa 1 MiB/tệp, tối đa 20 chứng từ/đơn. Kiểm tra chữ ký định dạng; chỉ trả trong dữ liệu đơn người dùng được quyền đọc. Tệp nằm trong database nên đi cùng bản sao lưu. Chưa có quét mã độc bên thứ ba.
- Quản lý có thể cấp lại quyền sửa cho đơn stage 2 đã có yêu cầu; các bước sau chờ quy trình liên bộ phận xác nhận.
- Mật khẩu, cookie, database và tài liệu hợp đồng không đưa vào Git/image.

## Đầu vào chờ HQ Hair

1. Tên/email/vai trò, quyền xem chéo và người nghiệm thu.
2. Danh mục, quy cách, đơn vị và bảng giá thật; quy tắc giảm giá/sửa đơn giá.
3. Ít nhất 5 đơn có kết quả tính tay: giảm giá, quà tặng, phí, nhiều lần thu, còn nợ; quy tắc làm tròn/tỷ giá/hạn thanh toán.
4. Mẫu invoice, logo và thông tin hiện/ẩn khi gửi khách.
5. Quyền duyệt/mở sửa, tracking, các mốc văn phòng 6/8/9/10.
6. Dữ liệu cũ cần nhập; hạ tầng và nơi sao lưu độc lập.

Xác nhận đặc tả và ngày bắt đầu theo khoản 3.2 khi đủ đầu vào thiết yếu. Không tự chốt ngày nghiệm thu hoặc coi bản triển khai này đã hoàn tất S01–S13.

## Kiểm thử

- `npm test`: công thức minh họa và validation.
- `node tests/security.mjs`: máy chủ riêng, tài khoản quản lý + 2 Sale + Kế toán; quyền, phiên, CSRF, retry, sửa đồng thời, phân công, giá snapshot, chứng từ, audit, restart, backup, khôi phục và tải backup.
- `node tests/workspace-auth.mjs`: trình duyệt đi hết login/đổi mật khẩu/cấp tài khoản/bảng giá/tạo khách/tạo đơn/gửi/chat/reload. Mặc định dùng Edge, server riêng.
- `node tests/api.mjs`, `smoke.mjs`, `design.mjs`, `workspace.mjs`, `motion.mjs`: hồi quy demo hiện tại. Đặt TEST_URL và BROWSER_CHANNEL nếu cần.
- Chưa nghiệm thu bằng dữ liệu đối chiếu của khách, chưa kiểm thử tải lớn hoặc toàn luồng 3 bộ phận.
