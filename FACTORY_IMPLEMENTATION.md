# Không gian Xưởng — phạm vi và nghiệm thu

Đối chiếu X01–X06 trong hợp đồng và file “Mô tả giao diện riêng của xưởng”. Giao diện giữ phong cách HQ Hair hiện tại. Quyền thao tác tuân theo luồng 10 bước khách đã chốt sau bản ý tưởng.

## Chức năng

| Mục | Nội dung |
| --- | --- |
| X01 Tổng quan | Bốn nhóm đơn, thông báo 5 ngày, biểu đồ trạng thái theo tháng đặt hàng, đơn quá hạn hoặc còn tối đa 3 ngày; sản lượng, ngày đặt, hạn gửi văn phòng và liên kết chi tiết. |
| X02 Chưa ghi nhận | Chỉ đơn đã duyệt có mã chính thức; tìm mã/Sale/sản phẩm/ghi chú; lọc ngày, hạn giao, thời gian còn lại; sắp xếp, phân trang; ghi nhận một hoặc nhiều đơn. |
| X03 Đã ghi nhận | Đang sản xuất, tạm dừng, theo dõi kết quả hủy; ngày ghi nhận đầu tiên, người thao tác, lịch sử; cập nhật từng đơn hoặc hàng loạt. |
| X04 Sale Check | Chờ Sale, tiếp tục sản xuất, yêu cầu sửa; ngày gửi, thời gian chờ, phản hồi Sale trong chi tiết và bảng; gửi lại sau sửa; trao đổi và lịch sử. |
| X05 Đã gửi văn phòng | Ngày gửi thực tế, sớm/đúng hạn/trễ, lọc thời gian và tiến độ; theo dõi kiểm tra thanh toán/đặt ship và đã gửi khách. |
| X06 Thống kê | Năm/tháng, số đơn đã gửi, tỷ lệ sớm/đúng hạn/trễ, biểu đồ 12 tháng về đơn và kg, bảng tổng hợp; đơn vị khác thống kê riêng. |

## Quy tắc

- Ghi nhận sản xuất trước khi tạm dừng hoặc gửi Sale Check. Khi tạm dừng phải tiếp tục sản xuất trước khi gửi Sale Check.
- Sale yêu cầu sửa: quay lại Xưởng, gửi Sale Check lại để Sale kiểm tra. Chỉ gửi văn phòng khi Sale đã chấp nhận và Xưởng không tạm dừng.
- Xưởng không xác nhận tiền hoặc gửi hàng cho khách. Kế toán xử lý hủy mất cọc khi đơn tạm dừng, theo luồng đã có.
- Nhãn “Hủy - Mất phí” chỉ phục vụ theo dõi dữ liệu nếu có; chưa có quy tắc tính phí/điều kiện được chốt nên không tạo thao tác tài chính mới cho Xưởng.
- Hạn gửi văn phòng được chốt tại thời điểm bàn giao; thay đổi hạn sau đó không làm sai lịch sử sớm/trễ. Báo cáo dựa trên ngày gửi thực tế theo múi giờ Việt Nam, bỏ đơn hủy và không đoán ngày còn thiếu.
- Sản lượng cộng các dòng sản phẩm, giữ riêng từng đơn vị. Chỉ gram được đổi sang kg.
- Quyền xem đầy đủ hoặc chỉ sản phẩm do quản trị cấu hình vẫn được giữ. Chế độ chỉ sản phẩm không tiết lộ tiền, khách hàng hoặc ghi chú lịch sử ngoài danh sách cho phép.
- Hàng loạt tối đa 100 đơn; kiểm tra toàn bộ quyền, trạng thái và phiên bản trước khi lưu. Một đơn lỗi thì cả lượt không cập nhật; gửi lại cùng mã yêu cầu không ghi nhận hai lần.

## Kiểm tra

- `npm test`: kiểm thử luồng, quyền, lọc, thời gian và thống kê.
- `npm run build`: biên dịch giao diện.
- `node tests/factory-integration.mjs`: tạo workspace thử riêng, đăng nhập các vai trò, kiểm tra hàng loạt nguyên tử/phiên bản/idempotency, ghi nhận qua UI, Sale sửa/chấp nhận, bàn giao văn phòng, thống kê và khung điện thoại 390px. Cần Microsoft Edge; ảnh kiểm tra lưu trong `data/factory-*.png`.
