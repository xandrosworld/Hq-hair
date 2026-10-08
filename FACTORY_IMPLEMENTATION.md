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
- Quyền xem đầy đủ hoặc chỉ sản phẩm do quản trị cấu hình vẫn được giữ. Chế độ chỉ sản phẩm không trả dữ liệu thanh toán, khách hàng hoặc ghi chú lịch sử ngoài danh sách cho phép; trả riêng phản hồi sửa hàng của Sale để Xưởng làm việc.
- Hàng loạt tối đa 100 đơn; kiểm tra toàn bộ quyền, trạng thái và phiên bản trước khi lưu. Một đơn lỗi thì cả lượt không cập nhật; gửi lại cùng mã yêu cầu không ghi nhận hai lần.

## Kiểm tra

- `npm test`: kiểm thử luồng, quyền, lọc, thời gian và thống kê.
- `npm run build`: biên dịch giao diện.
- `node tests/factory-integration.mjs`: tạo workspace thử riêng, đăng nhập các vai trò, kiểm tra hàng loạt nguyên tử/phiên bản/idempotency, ghi nhận qua UI, Sale sửa/chấp nhận, bàn giao văn phòng, thống kê và khung điện thoại 390px. Cần Microsoft Edge; ảnh kiểm tra lưu trong `data/factory-*.png`.
- `node tests/workflow-security.mjs`: luồng liên thông qua API, quyền từng bộ phận, xác nhận tiền, khóa nội dung, hủy mất cọc, lịch sử và xử lý công nợ.

## Rà soát đối chiếu ngày 08/10/2026

Nguồn: trang 9 của PDF hợp đồng người dùng cung cấp và các slide 2–7 trong `Mô-ta-giao-diện-riêng-của-xưởng (1).pptx`. Slide là ý tưởng giao diện; các yêu cầu phân quyền khách chốt sau đó được ưu tiên. Đây là bảng đối chiếu kỹ thuật, không thay thế biên bản nghiệm thu hai bên.

| Mục / slide | Kết quả kiểm tra và bổ sung | Trạng thái |
| --- | --- | --- |
| X01 / 2 | Tổng số theo nhóm; biểu đồ mặc định toàn bộ hiện tại, có lọc tháng; thông báo; danh sách gấp có xem tất cả; liên kết đơn. | Đã triển khai; đã kiểm tra giao diện desktop/mobile. |
| X02 / 3 | Ghi nhận UI hàng loạt, chặn chưa tới bước; lưu người/thời gian; tìm/lọc/sắp xếp theo ngày tương ứng; phiên bản cũ không ghi đè. | Đạt kiểm thử API/UI. |
| X03 / 4 | Tạm dừng sau phản hồi Sale vẫn vào nhóm tạm dừng; giữ lần ghi nhận đầu; hủy mất cọc đúng quyền Kế toán. | Đạt phần đã có quy tắc; hủy mất phí chưa đủ điều kiện nghiệm thu. |
| X04 / 5 | Phản hồi Sale hiển thị cả chế độ chỉ sản phẩm; thời gian chờ dừng khi Sale phản hồi; sửa lại giữ lịch sử; không gửi văn phòng trước Sale chấp nhận. | Đạt kiểm thử API/UI và mô hình dữ liệu. |
| X05 / 6 | Tìm tên khách trong quyền được xem; ngày gửi từ dữ liệu bàn giao/lịch sử; hạn kế hoạch đóng băng; quyền Xưởng không xác nhận tiền/giao khách. | Đạt kiểm thử API/UI; mốc đo đang dùng được ghi ở dưới. |
| X06 / 7 | Biểu đồ tỷ lệ và cột chồng sớm/đúng/trễ/chưa rõ; biểu đồ kg; bảng tháng; so sánh tháng trước kể cả qua năm; xử lý dữ liệu lịch sử, đơn vị khác và thiếu ngày. | Đã triển khai; kiểm thử số liệu, API và giao diện. |

Các chỗ hợp đồng để trống, cần được ghi vào biên bản chốt nghiệp vụ:

1. **X03 quyền/điều kiện/cọc/phí:** khách đã chốt Kế toán hủy mất cọc khi Xưởng tạm dừng. “Hủy mất phí” chưa có quyền, bước thực hiện, công thức/số tiền và ảnh hưởng công nợ; đã hỏi lại, chưa tự tạo nghiệp vụ.
2. **X05 mốc kế hoạch/thực tế:** hiện so hạn gửi văn phòng lưu tại lúc bàn giao với ngày Xưởng thực sự gửi văn phòng, theo múi giờ Việt Nam.
3. **X06 quy đổi:** hiện 1.000 gram = 1 kg; pieces/bundles và các đơn vị khác được giữ riêng, không suy đoán trọng lượng.

Vì mục 1 chưa được xác nhận, không đánh dấu toàn bộ X01–X06 “nghiệm thu 100%”. Những mục đã có quy tắc được triển khai và kiểm tra độc lập.
