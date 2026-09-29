# HQ Hair · Kịch bản demo Sale

## Trình diễn trong 7 phút

1. **Tổng quan (45 giây):** giới thiệu doanh thu, tiền đã xác nhận và công nợ. Bấm kỳ tháng để thấy số liệu thay đổi. Bấm một nhóm trong “Nhịp vận hành” để lọc danh sách bên dưới.
2. **Khách hàng (45 giây):** mở hồ sơ, xem lịch sử mua và thông tin giao hàng. Tạo đơn từ khách có sẵn để tránh nhập quá nhiều trong buổi demo.
3. **Tạo đơn (2 phút):** chọn ngày giao tương lai, sửa số lượng, thêm sản phẩm bổ sung và quà tặng. Sang thanh toán, nhập giảm giá/phí. Lưu nháp, mở lại, rồi gửi duyệt. Cho khách thấy đơn bị khóa và timeline xuất hiện.
4. **Theo dõi (1 phút):** mở Đơn hàng → Bảng tiến độ. Tìm mã đơn vừa tạo. Các thẻ mở chi tiết; trạng thái thay đổi bằng thao tác nghiệp vụ, không kéo thả vượt bước.
5. **Sale kiểm tra (1 phút):** từ “Khám phá demo”, mở tình huống kiểm tra hàng từ Xưởng. Xem ghi chú màu tóc, gửi trao đổi, rồi xác nhận tiếp nhận hoặc yêu cầu sửa. Mở nhật ký để thấy thao tác vừa ghi nhận.
6. **Chứng từ và báo cáo (1 phút):** xem trước invoice, in/lưu PDF. Mở công nợ và xuất CSV. Nhấn rõ thanh toán Sale mới nhập phải chờ xác nhận, chưa làm giảm công nợ.
7. **Kết thúc (30 giây):** hỏi khách thao tác nào cần điều chỉnh theo quy trình thực tế, chốt danh mục/giá, công thức và mẫu invoice cần cung cấp cho giai đoạn Sale.

## Chuẩn bị

- Dùng desktop từ 1280px trở lên; hỗ trợ tối thiểu 1120px. Để zoom trình duyệt 100%.
- Nút “Khám phá demo” mở các điểm bắt đầu. “Khôi phục dữ liệu mẫu” cần xác nhận, chỉ thay dữ liệu phiên hiện tại.
- Mở phiên trình duyệt mới nếu cần bộ mẫu nguyên trạng; các phiên không chia sẻ dữ liệu.
- Ngày giao của đơn mới phải sau ngày đặt. Bộ biểu đồ mẫu thể hiện tháng 1–9/2026.
- Đây là demo Sale để đánh giá trải nghiệm. Tài khoản nhiều người, phân quyền thực và liên thông đầy đủ Kế toán/Xưởng thuộc các mốc triển khai tiếp theo; không trình bày bản này như đã nghiệm thu.

## Kiểm tra local

`npm test`, `npm run build`, khởi động server, rồi chạy `node tests/api.mjs`, `node tests/smoke.mjs`, `node tests/design.mjs` và `node tests/workspace.mjs`.

`TEST_URL` chỉ định địa chỉ server. `BROWSER_CHANNEL=msedge` cho phép dùng Edge đã cài thay Chromium của Playwright. `tests/capture.mjs` chụp tổng quan để rà soát. Ảnh và dữ liệu local không đưa vào Git.

`node tests/motion.mjs` kiểm tra bộ icon tách nền, hiệu ứng số liệu và chế độ giảm chuyển động; đồng thời ghi video thao tác. Hiệu ứng tự tắt nếu hệ điều hành/trình duyệt bật giảm chuyển động, không ảnh hưởng số liệu hoặc chức năng.

## Hoàn thiện trải nghiệm soạn đơn

- Khối tóm tắt luôn phản ánh khách hàng, mức độ hoàn thiện và tổng tiền đang soạn; bấm từng mục để chuyển tới bước tương ứng.
- Khi gửi duyệt, lỗi hiển thị ngay tại trường và đưa con trỏ tới nơi cần sửa. Có thể lưu bản nháp khi chưa đủ thông tin giao hàng.
- Khi còn thay đổi chưa lưu, chuyển trang cần chọn tiếp tục sửa hoặc bỏ thay đổi. Đóng/tải lại tab cũng có cảnh báo của trình duyệt.
- Sau khi gửi duyệt, dùng nút bổ sung chứng từ hoặc xem invoice ngay trên đầu chi tiết đơn.
- `node tests/editor.mjs` kiểm tra lỗi nhập liệu, tổng tiền, lưu nháp, bảo vệ thay đổi và tạo mới liên tiếp.
