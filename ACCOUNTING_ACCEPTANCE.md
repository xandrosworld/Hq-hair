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
- Có nhập khoản thu độc lập với chứng từ hay không; quyền sửa/hủy khoản đã xác nhận.
- Hủy mất cọc giữ toàn bộ hay một phần, hoàn tiền, xử lý nợ và phân bổ ship. Hiện hệ thống giữ tiền đã nhận và đóng nợ về 0; đây chưa phải chính sách đã được khách chốt đầy đủ.
- Bồi thường có giảm nợ/doanh thu không; hiện thống kê riêng.
- Thu thừa, hoàn tiền và chuyển tiền giữa đơn.
- USD/VND, tỷ giá, ngày hạch toán báo cáo.
- Bộ đơn mẫu và kết quả mong muốn của khách.

## Kiểm tra
- Unit: thu nhiều đợt, tiền thực nhận khác chứng từ, tổng có phí cũ, chứng từ trùng/sai, tính toán báo cáo và hủy mất cọc.
- Integration: phân quyền, duyệt một phần/đủ, giao Xưởng và văn phòng, phiên bản cũ, idempotency, nhật ký và dữ liệu sau khởi động lại.
- Browser: giao diện Kế toán trên điện thoại và đối chiếu bảng thu/chi tiết/báo cáo/CSV.
