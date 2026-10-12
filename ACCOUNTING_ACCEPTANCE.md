# Kế toán — phạm vi và nghiệm thu 12/10/2026

## Đã chốt và giữ nguyên
- Chỉ Kế toán xác nhận khoản thực nhận. Chứng từ chưa đối soát không giảm công nợ.
- Duyệt đầu tại bước 3; kiểm tra đủ tiền sau khi Xưởng gửi văn phòng ở bước 7.
- Vận chuyển đã nhận = min(tổng thực nhận, phí vận chuyển); doanh thu đã nhận = max(0, tổng thực nhận - phí vận chuyển).
- Đơn đã duyệt hủy mất cọc vẫn thuộc báo cáo tài chính. Chỉ Kế toán được hủy mất cọc khi Xưởng đang tạm dừng.

## Đã gia cố kỹ thuật
- Tổng phải nhận trong danh sách và chi tiết dùng cùng công thức với công nợ, bao gồm phí thanh toán của đơn cũ nếu có.
- Lưu số tiền chứng từ ban đầu, người và thời điểm đối soát khi xác nhận mới; không dựng lịch sử cho dữ liệu cũ.
- Kiểm tra chứng từ trùng, đã xác nhận, số tiền sai; một khoản lỗi không làm xác nhận một phần danh sách.
- Khóa thao tác đang gửi, chặn bấm lặp; API giữ khóa idempotency khi thử lại do mất mạng.
- Không cho nhập khoản xác nhận mới trong thao tác hủy mất cọc.
- Hiển thị riêng tổng đã nhận, vận chuyển đã nhận và doanh thu đã nhận.

## Chờ khách xác nhận — chưa nghiệm thu nghiệp vụ
- Có nhập khoản thu độc lập với chứng từ hay không. Quyền sửa đã chốt: quản trị cấp quyền, Kế toán sửa rồi khóa lại.
- Hủy mất cọc giữ toàn bộ hay một phần, hoàn tiền, xử lý nợ và phân bổ ship. Hiện hệ thống giữ tiền đã nhận và đóng nợ về 0; đây chưa phải chính sách đã được khách chốt đầy đủ.
- Bồi thường có giảm nợ/doanh thu không; hiện thống kê riêng.
- Thu thừa, hoàn tiền và chuyển tiền giữa đơn.
- Nguồn/loại/thời điểm tỷ giá VietinBank và VND. Ngày báo cáo đã chốt: doanh thu đơn theo ngày duyệt, thực nhận theo từng đợt.
- Bộ đơn mẫu và kết quả mong muốn của khách.

## Kiểm tra
- Unit: thu nhiều đợt, tiền thực nhận khác chứng từ, tổng có phí cũ, chứng từ trùng/sai, tính toán báo cáo và hủy mất cọc.
- Integration: phân quyền, duyệt một phần/đủ, giao Xưởng và văn phòng, phiên bản cũ, idempotency, nhật ký và dữ liệu sau khởi động lại.
- Browser: giao diện Kế toán trên điện thoại và đối chiếu bảng thu/chi tiết/báo cáo/CSV.

## Cập nhật sau xác nhận khách
- Khoản thu được bổ sung ngày thực nhận khi xác nhận; chứng từ cũ không tự gán ngày đối soát thành ngày thực nhận.
- Quản trị cấp quyền riêng một khoản đã xác nhận, dùng một lần. Kế toán sửa tiền/ngày nhận với lý do; giữ lịch sử trước/sau và nguồn cấp quyền. Không mở lại quy trình sản xuất khi sửa khoản thu.
- Báo cáo theo ngày duyệt / thực nhận mới trong không gian Kế toán và Số liệu Kế toán của quản trị: chọn tháng, tách doanh thu đơn và từng đợt thu, phân bổ ship qua toàn bộ các đợt trước khi lọc tháng, CSV cùng số liệu.
- Đã đồng bộ màn Doanh thu & công nợ của Sale với báo cáo Kế toán: doanh thu theo ngày duyệt, tiền theo ngày thực nhận. Không loại khoản thu trong kỳ chỉ vì đơn được đặt hoặc duyệt ở kỳ trước.
- Hủy mất cọc giữ tiền và không còn nợ đã được khách xác nhận. Ship/thiệt hại đơn hủy vẫn chờ chi tiết; chưa bổ sung cơ chế tự động.
- Thu dư vẫn ghi số thật; không tự hoàn hoặc chuyển tiền giữa đơn.

## Chốt 12/10/2026 15:58 — hủy chưa giao và thiệt hại
- Đơn hủy chưa giao không phân bổ tiền đã nhận cho ship: ship đã nhận = 0; doanh thu đã nhận bằng tổng tiền đã xác nhận, công nợ = 0. Giữ phí dự kiến trên hồ sơ gốc để đối chiếu, không coi đó là ship đã thu.
- Kế toán nhập thiệt hại thực tế tại tab Thiệt hại của đơn hủy mất cọc. Ghi ngày, lý do và người nhập; tổng cộng vào thống kê Thiệt hại hiện có. Không suy ra thiệt hại từ công nợ thiếu hoặc tự trừ doanh thu.
- Không mở lại đơn đã đóng, không thay đổi cơ chế bồi thường của đơn không hủy. Nguồn/loại/thời điểm tỷ giá vẫn chờ khách chốt.
- Đã kiểm tra API và giao diện nhập thiệt hại trên đơn thực sự đi qua duyệt, Xưởng tạm dừng và hủy mất cọc trong cơ sở dữ liệu kiểm thử.

## Đồng bộ báo cáo Sale — 12/10/2026
- Các ô tổng, biểu đồ theo ngày/tháng/năm, tổng hợp đội Sale và CSV trên màn Doanh thu & công nợ dùng cùng nguồn tính theo sự kiện duyệt/thu như Kế toán.
- Bộ lọc người phụ trách/từ khóa áp dụng trước khi tổng hợp sự kiện; không lọc đơn theo ngày đặt trước khi tính tiền thu.
- Giảm giá theo các đơn duyệt trong kỳ; thiệt hại theo ngày ghi nhận, bỏ khoản đã hủy ghi nhận. Công nợ là số dư hiện tại, được ghi nhãn rõ, không giả lập số dư lịch sử cuối tháng.
- CSV Sale và Kế toán chung định dạng: dòng duyệt đơn, dòng thu tiền, dòng thiệt hại và dòng công nợ hiện tại. Ngày chứng từ cũ được chỉ rõ là nguồn thay thế ngày thực nhận.
- Kiểm thử đơn đặt tháng 8, duyệt tháng 9, thu tháng 9/10 trên Chromium và WebKit; số liệu các tháng và tổng CSV khớp công thức dùng chung.
