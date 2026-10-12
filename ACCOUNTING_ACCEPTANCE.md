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

## Còn chờ để nghiệm thu toàn bộ phân hệ
- Có nhập khoản thu độc lập với chứng từ hay không.
- Nghiệp vụ bồi thường/hoàn hàng ngoài đơn hủy: khách chưa chốt, hiện thống kê riêng.
- Bộ đơn mẫu và kết quả mong muốn của khách.
- Biểu mẫu, ánh xạ và công thức các kết nối file Kế toán/tài chính/lương theo K03–K05 của hợp đồng; không coi riêng luồng thu tiền là đã hoàn thành toàn bộ phân hệ.

## Kiểm tra
- Unit: thu nhiều đợt, tiền thực nhận khác chứng từ, tổng có phí cũ, chứng từ trùng/sai, tính toán báo cáo và hủy mất cọc.
- Integration: phân quyền, duyệt một phần/đủ, giao Xưởng và văn phòng, phiên bản cũ, idempotency, nhật ký và dữ liệu sau khởi động lại.
- Browser: giao diện Kế toán trên điện thoại và đối chiếu bảng thu/chi tiết/báo cáo/CSV.

## Cập nhật sau xác nhận khách
- Khoản thu được bổ sung ngày thực nhận khi xác nhận; chứng từ cũ không tự gán ngày đối soát thành ngày thực nhận.
- Quản trị cấp quyền riêng một khoản đã xác nhận, dùng một lần. Kế toán sửa tiền/ngày nhận với lý do; giữ lịch sử trước/sau và nguồn cấp quyền. Không mở lại quy trình sản xuất khi sửa khoản thu.
- Báo cáo theo ngày duyệt / thực nhận mới trong không gian Kế toán và Số liệu Kế toán của quản trị: chọn tháng, tách doanh thu đơn và từng đợt thu, phân bổ ship qua toàn bộ các đợt trước khi lọc tháng, CSV cùng số liệu.
- Đã đồng bộ màn Doanh thu & công nợ của Sale với báo cáo Kế toán: doanh thu theo ngày duyệt, tiền theo ngày thực nhận. Không loại khoản thu trong kỳ chỉ vì đơn được đặt hoặc duyệt ở kỳ trước.
- Hủy mất cọc giữ tiền và không còn nợ đã được khách xác nhận. Ship/thiệt hại đơn hủy đã chốt tại mục cập nhật 15:58 bên dưới.
- Thu dư vẫn ghi số thật; không tự hoàn hoặc chuyển tiền giữa đơn.

## Chốt 12/10/2026 15:58 — hủy chưa giao và thiệt hại
- Đơn hủy chưa giao không phân bổ tiền đã nhận cho ship: ship đã nhận = 0; doanh thu đã nhận bằng tổng tiền đã xác nhận, công nợ = 0. Giữ phí dự kiến trên hồ sơ gốc để đối chiếu, không coi đó là ship đã thu.
- Kế toán nhập thiệt hại thực tế tại tab Thiệt hại của đơn hủy mất cọc. Ghi ngày, lý do và người nhập; tổng cộng vào thống kê Thiệt hại hiện có. Không suy ra thiệt hại từ công nợ thiếu hoặc tự trừ doanh thu.
- Không mở lại đơn đã đóng, không thay đổi cơ chế bồi thường của đơn không hủy. Tỷ giá theo ngày nhận tiền; quyết định cuối về nhập tay/tự động ở mục 18:47 bên dưới.
- Đã kiểm tra API và giao diện nhập thiệt hại trên đơn thực sự đi qua duyệt, Xưởng tạm dừng và hủy mất cọc trong cơ sở dữ liệu kiểm thử.

## Đồng bộ báo cáo Sale — 12/10/2026
- Các ô tổng, biểu đồ theo ngày/tháng/năm, tổng hợp đội Sale và CSV trên màn Doanh thu & công nợ dùng cùng nguồn tính theo sự kiện duyệt/thu như Kế toán.
- Bộ lọc người phụ trách/từ khóa áp dụng trước khi tổng hợp sự kiện; không lọc đơn theo ngày đặt trước khi tính tiền thu.
- Giảm giá theo các đơn duyệt trong kỳ; thiệt hại theo ngày ghi nhận, bỏ khoản đã hủy ghi nhận. Công nợ là số dư hiện tại, được ghi nhãn rõ, không giả lập số dư lịch sử cuối tháng.
- CSV Sale và Kế toán chung định dạng: dòng duyệt đơn, dòng thu tiền, dòng thiệt hại và dòng công nợ hiện tại. Ngày chứng từ cũ được chỉ rõ là nguồn thay thế ngày thực nhận.
- Kiểm thử đơn đặt tháng 8, duyệt tháng 9, thu tháng 9/10 trên Chromium và WebKit; số liệu các tháng và tổng CSV khớp công thức dùng chung.

## Chốt 12/10/2026 18:47 — làm phần tỷ giá trong hợp đồng
- Khách chọn triển khai phần nhập tay trong hợp đồng trước. Không kích hoạt kết nối tự động VietinBank, không tạo phí tích hợp.
- Kế toán nhập tỷ giá VND/1 USD theo ngày nhận tiền riêng cho từng đợt, tối đa hai chữ số thập phân; lưu cùng khoản thu khi xác nhận.
- Tỷ giá đã xác nhận chỉ sửa theo quyền quản trị cấp một lần; nhật ký lưu tỷ giá trước/sau và lý do. Không thay đổi tỷ giá các khoản khác.
- Báo cáo Kế toán và Số liệu Kế toán quản trị hiển thị thực nhận/ship/doanh thu đã nhận VND. CSV chung Sale/Kế toán bổ sung tỷ giá và ba cột VND. USD vẫn là đơn vị gốc.
- Quy đổi từng khoản, làm tròn đến đồng; VND doanh thu nhận bằng VND thực nhận trừ VND ship để đối chiếu đúng tổng. Không lấy tỷ giá hôm nay để quy đổi lịch sử.
- Cho phép xác nhận USD khi chưa có tỷ giá; hiển thị rõ khoản thiếu, không tự điền tỷ giá và không coi giá trị thiếu là 0 trong chi tiết/CSV. Tổng VND chỉ cộng khoản có tỷ giá và cảnh báo chưa đầy đủ. Bổ sung tỷ giá sau xác nhận cũng cần quyền quản trị.
- Không quy đổi doanh thu đơn chưa thu/công nợ sang VND bằng một tỷ giá tự chọn; chưa có quy tắc tỷ giá riêng cho hai chỉ tiêu này.
- Đã kiểm tra 91 unit tests, build, luồng API/giao diện Kế toán nhập tỷ giá, lưu sau restart, sửa được cấp quyền, phân bổ ship xuyên kỳ và CSV.
