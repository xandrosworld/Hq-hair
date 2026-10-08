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


## Hoàn thiện kỹ thuật ngày 08/10/2026 — trước phản hồi nghiệm thu của khách

### Hướng dẫn vận hành hiện hành

1. **Chưa ghi nhận:** chỉ đưa vào sản xuất đơn đã được Kế toán duyệt, có mã chính thức. Có thể chọn từng đơn hoặc nhiều đơn (tối đa 100).
2. **Đã ghi nhận:** theo dõi sản xuất; tạm dừng hoặc tiếp tục. Đang tạm dừng phải tiếp tục trước khi gửi Sale Check. Xưởng không tự hủy mất cọc/phí hoặc xác nhận tiền.
3. **Sale Check:** chờ phản hồi. Nếu Sale yêu cầu sửa, xử lý và gửi lại để kiểm tra. Khi Sale chấp nhận, Xưởng mới gửi văn phòng; không bàn giao trong trạng thái tạm dừng.
4. **Đã gửi văn phòng:** theo dõi Kế toán kiểm tra tiền, Sale kiểm định/đặt ship và xác nhận khách nhận. Hạn gửi được giữ tại lúc bàn giao để tính sớm/đúng/trễ.
5. **QC:** Xưởng và Kế toán chỉ xem. Sale phụ trách lập QC ở bước 8; quản trị sửa ngoại lệ theo quyền và lý do. Không dùng hướng dẫn QC cũ ngày 02/10 để cấp quyền thao tác.
6. **Lỗi mạng/máy chủ:** thao tác hàng loạt giữ mã yêu cầu để thử lại, không tạo hai lần lịch sử nếu lần trước đã lưu. Lỗi phiên bản nghĩa có người vừa cập nhật đơn: kiểm tra trạng thái mới và chọn lại, không cố ghi đè.

### Lỗi được tái hiện và khắc phục

| Vấn đề | Bản sửa / bằng chứng |
| --- | --- |
| Phản hồi tải danh sách cũ đến sau khi ghi nhận hàng loạt làm UI hiện lại đơn chưa ghi nhận | Đánh số lượt tải, vô hiệu hóa lượt cũ khi bắt đầu ghi; kiểm thử giữ phản hồi cũ và trả về sau khi ghi thành công. |
| Máy chủ đã ghi hàng loạt nhưng client mất phản hồi; frontend chưa giữ mã chống trùng cho endpoint này | Đưa `/factory/batch` vào cơ chế ghi có retry. Kiểm thử ngắt phản hồi sau khi server xử lý: gửi lại cùng mã, mỗi đơn chỉ có một sự kiện. |
| Lỗi 503 trong khi xác nhận hàng loạt | Kiểm thử giữ lựa chọn/ghi chú, không cập nhật đơn, bấm thử lại dùng cùng mã; tạm dừng rồi tiếp tục đúng luồng. |
| Giới hạn ảnh QC bị dùng chung giới hạn chat 10 MiB | Tách kiểm tra QC 5 MiB ở server, kiểm thử đúng ngưỡng và vượt ngưỡng. Không thay giới hạn chat. |
| Tài liệu và bài kiểm thử QC cũ còn cho Xưởng ghi | Đồng bộ CUSTOMER_PERMISSIONS.md, SALE_IMPLEMENTATION.md, OPERATIONS.md và tests/accounting-qc.mjs theo quyền hiện hành. |

### Bằng chứng kiểm thử và phạm vi

| Nhóm | Bài kiểm thử |
| --- | --- |
| X01, X05, X06: nhóm đơn, ngày, sớm/trễ, thiếu ngày, gram/đơn vị riêng, lịch sử qua tháng/năm | `tests/factory-model.test.js`, `tests/delivery-days.test.js`, `tests/factory-integration.mjs` |
| X02–X04: ghi nhận, hàng loạt nguyên tử, phiên bản cũ, phản hồi Sale, gửi văn phòng, retry | `tests/factory-workflow.test.js`, `tests/factory-integration.mjs` trên Chromium và WebKit |
| Quyền các bộ phận, hủy mất cọc, khóa nội dung, audit | `tests/workflow-security.mjs`, `tests/accounting-qc.test.js` |
| QC đọc/ghi đúng vai trò qua API/UI, ảnh theo quyền, range, chống upload trùng, còn dữ liệu sau restart | `tests/accounting-qc.mjs` (database thử riêng) |
| Mobile, ảnh/PDF/video, mạng lỗi, phiên đăng nhập, luồng hoàn tất | `tests/mobile-workspace.mjs`, `tests/mobile-live.mjs`; xem MOBILE_QA.md về giới hạn thiết bị/codec |

Chạy WebKit cho bài Xưởng: `$env:FACTORY_BROWSER='webkit'; $env:FACTORY_PORT='3199'; node tests/factory-integration.mjs`. Bản Chromium mặc định cổng 3196. Không chạy các bài dùng trùng cổng cùng lúc. Ảnh ghi theo engine tại `data/factory-chromium-*.png` và `data/factory-webkit-*.png`. Toàn bộ thao tác ghi được kiểm tra trên dữ liệu thử riêng.

### Còn ngoài phạm vi xác nhận kỹ thuật tự động

- Khách xác nhận nghiệp vụ hủy mất phí, mốc tính tiến độ và cách quy đổi sản lượng như danh sách chờ phía trên; cung cấp đơn mẫu có kết quả và người nghiệm thu. Chưa nhận trả lời thì giữ nguyên hành vi đã triển khai.
- Cần chạy trên điện thoại vật lý để xác nhận camera/thư viện ảnh, bàn phím, tải tệp và codec Safari thực. WebKit trên Windows không thay thế Safari iPhone; không đánh dấu mục này đạt.
- Không coi bộ test đạt là nghiệm thu nghiệp vụ hoặc chứng nhận không còn mọi lỗi. Phạm vi trên là những tình huống đã đối chiếu và có kiểm chứng.

Kết quả lượt này: 74/74 unit test đạt; build thành công; factory-integration đạt trên Chromium và WebKit; accounting-qc và workflow-security đạt; mobile-workspace đạt 90 lượt mỗi engine (180 tổng), không có JavaScript page error. Video WebKit Windows vẫn chỉ xác minh truyền/tải tệp, không ghi nhận đạt phát trên iPhone thật.
