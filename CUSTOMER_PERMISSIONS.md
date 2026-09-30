# Phân quyền — phản hồi HQ Hair ngày 30/09/2026

Nguồn: file “mô tả phân quyền.docx” và tin nhắn Xuân Hải lúc 14:00:32 do chủ dự án cung cấp. Phân biệt yêu cầu đã xác nhận với phương án đang trao đổi. Tài liệu này chưa có nghĩa các chức năng đã được triển khai.

## Đã xác nhận trong tin nhắn

- Mỗi Sale chỉ được xem đơn và mọi chỉ số liên quan tới đơn mình phụ trách. Áp dụng cho tổng quan, tìm kiếm, báo cáo, xuất dữ liệu, chi tiết và ảnh đính kèm; kiểm tra tại máy chủ.
- Sau bước 8 chỉ được chat và thao tác các bước tiếp theo; không thêm hoặc thay đổi nội dung đơn. Mốc mới này thay cho mô tả khóa sau kiểm tra thanh toán lần cuối ở file trước.
- Chat theo đơn là kênh phối hợp Sale–Xưởng, gồm chữ và ảnh.

## Phương án cũ — đã được thay thế lúc 14:11 ngày 30/09/2026

Khách nói “tớ đang tính”: Xưởng chỉ xem slide 1 (sản phẩm); mọi thông tin khách hàng/thanh toán chuyển sang slide 2 mà Xưởng không được xem.

Hệ quả kỹ thuật cần triển khai khi mở vai trò Xưởng:

- API cho Xưởng chỉ trả trường sản xuất được phép, không trả cả đơn rồi ẩn tab.
- Tách thông tin khách/địa chỉ/liên hệ, thanh toán, bill, công nợ, invoice và báo cáo tài chính khỏi dữ liệu Xưởng.
- Bảng sản phẩm vừa nhận có Unit price và Amount. Đề xuất ẩn cả hai cột với Xưởng; giữ cho Sale/Kế toán/quản trị. Điểm này cần khách xác nhận vì slide 1 đang có trường tài chính.
- Chat Sale–Xưởng không tự sao chép bill hoặc dữ liệu khách/thanh toán. File do người dùng chủ động gửi vào chat được các thành viên có quyền chat xem; ẩn slide 2 không thể ngăn lộ nội dung do người dùng tự gửi vào chat.
- Quyền Kế toán đọc chat này chưa được xác nhận; không tự suy diễn từ quyền xem toàn bộ nội dung đơn trong file cũ.

## Trạng thái và khóa

Phân công theo DOCX: Sale bước 1,2,5,8,9,10; Kế toán bước 3,7; Xưởng bước 4,6. Quản trị nắm toàn công ty.

Diễn giải triển khai: khi hoàn tất bước 8 (kiểm định/đặt ship), bật khóa nội dung độc lập với trạng thái hiện tại; Sale vẫn chuyển 9/10 và chat. Không cho thêm sản phẩm, sửa trọng lượng/giá/ghi chú/thông tin nhận hàng, thêm/sửa chứng từ hoặc tracking sau khóa. Không dùng việc cho phép bước tiếp theo để mở khóa nội dung.

Lúc 14:05:41, khách xác nhận quản trị cần sửa mọi thứ và cấp quyền cho mọi thứ. Đây là ngoại lệ quản trị đối với khóa sau bước 8; cần triển khai kèm audit và lý do, không áp dụng ngầm cho các vai trò khác.

Trước mốc khóa không có nghĩa Sale được tự sửa toàn bộ đơn: vẫn giữ khóa sau gửi duyệt và quyền Kế toán cấp để thêm sản phẩm bổ sung khi đang sản xuất theo DOCX. Không đưa đơn đang sản xuất về bản nháp để thực hiện quyền bổ sung.

## Tiêu chí kiểm thử khi triển khai

1. Hai Sale không đọc được đơn, ảnh, tổng doanh thu hoặc kết quả xuất của nhau, kể cả gọi API trực tiếp.
2. Xưởng không nhận các trường tài chính/khách hàng trong JSON, file tải xuống, lịch sử snapshot, tìm kiếm, thông báo hoặc ảnh bill; chỉ thấy ảnh chat được phép.
3. Sau hoàn tất bước 8, mọi đường ghi nội dung/chứng từ đều bị từ chối ở máy chủ; chat và chuyển đúng bước 9/10 vẫn hoạt động.
4. Sale không thực hiện bước 6 thay Xưởng; không bỏ qua bước hoặc tự duyệt tiền.
5. Cấp quyền bổ sung chỉ cho phép đúng thao tác/phạm vi được cấp, lưu người cấp, người sửa, thời gian và nội dung thay đổi.

## Xác nhận mới nhất và phần triển khai

- 14:11:44: Xưởng được xem toàn bộ thông tin đơn hàng, gồm giá/thành tiền, thông tin khách và thanh toán. Thay thế đề xuất ẩn tab 2 và ẩn giá ở phần cũ bên trên.
- Đã mở workspace Xưởng: danh sách đơn đã gửi duyệt, thông tin đơn, sản phẩm, khách, giao hàng, thanh toán/chứng từ, lịch sử và chat ảnh. Bản nháp vẫn thuộc Sale; việc chỉ hiển thị đơn từ gửi duyệt là quy tắc khởi tạo cần đưa vào đặc tả cuối.
- Quản trị chọn phạm vi xem cho từng tài khoản Xưởng: `full` (mặc định theo xác nhận mới) hoặc `products` (chỉ sản phẩm/chat). Chế độ products dùng allowlist ở API, loại khách, tiền, bill, bảng giá, snapshot và ghi chú lịch sử. Chat do Sale/Xưởng tự gửi vẫn hiển thị.
- Thay đổi quyền áp dụng trên yêu cầu tiếp theo; giao diện Xưởng làm mới mỗi 15 giây và khi quay lại tab. Dữ liệu đã tải trước khi đổi quyền không thể thu hồi khỏi thiết bị người dùng.
- Bản này triển khai quyền Xưởng xem/chat và cấu hình phạm vi xem. Chưa triển khai quyền quản trị sửa mọi trường, phân quyền ngoại lệ tổng quát, chuyển trạng thái Xưởng/Kế toán hoặc khóa sau hoàn tất bước 8. Các mục đó vẫn là yêu cầu tiếp theo, không coi là đã nghiệm thu.

## Ngôn ngữ giao diện — xác nhận 30/09/2026 14:14

- Giao diện nội bộ dùng tiếng Việt, gồm kinh doanh, quản trị và Xưởng.
- Hóa đơn sản phẩm gửi khách dùng nhãn tiếng Anh; nút xem/in vẫn tiếng Việt. Bảng sản phẩm chung nhận ngôn ngữ riêng khi in.
- Giữ nguyên dữ liệu do người dùng nhập (tên sản phẩm, thông số, ghi chú, tên khách), mã nghiệp vụ và thương hiệu. Nhãn danh mục có sẵn được dịch ở lớp hiển thị, không đổi khóa lưu trữ.

## Bảng giá và danh mục màu — xác nhận 30/09/2026

- Mọi tên sheet có chứa Closure, Frontal, Ponytail hoặc Topper (không phân biệt hoa thường) tính USD/cái, gồm Ponytail Baby. Mọi sheet khác tính USD/100g; HD Lace cũng theo quy tắc tên khách chốt, không tự suy diễn lại đơn vị.
- Đã nhập 2.874 ô giá từ 38 sheet: Basic 2.004, Baby 402, Premium 468. Giữ sheet/ô nguồn, chiều dài inch/cm, phân khúc, kích thước và tông; đối soát không bỏ sót ô số ngoài cột chiều dài.
- Nhập 94 mã màu từ bảng Airtable HQ COLOR, kèm 167 ảnh lưu cục bộ. 16 video được dẫn về bảng gốc; không giữ URL ảnh có chữ ký hết hạn trong dữ liệu triển khai.
- Màu phối Ombre/Piano/Balayage lấy tông cao nhất: Đen < Nâu < Sáng. Other (Dark Red, Light Red, Light Pink, Orange) là Sáng theo khách xác nhận 16:54:25.
- Hai mẫu chưa suy được tông chắc chắn: #Balayage 2-4/60A (thiếu màu đơn 60A), #Ombre Grey-9C (thiếu màu đơn Grey). Khóa lấy giá cho hai mẫu đến khi người có quyền bổ sung màu đơn hoặc xác định lại thành phần. Không tự suy đoán theo tên/ảnh.
- Tab Bảng giá & màu chỉ cho kinh doanh/quản trị; ảnh yêu cầu đăng nhập. Xưởng giữ quyền xem đơn hiện tại, không tự được quyền sửa bảng giá.
- Quản trị cấp riêng quyền điều chỉnh giá và quyền thêm/sửa mẫu màu cho từng tài khoản kinh doanh. Kiểm tra quyền tại máy chủ ở mỗi yêu cầu.
- Điều chỉnh % theo toàn bộ/bảng/loại sản phẩm, xem trước, làm tròn 0,01 USD, kiểm tra phiên bản, chống ghi lặp; lịch sử và khôi phục lần điều chỉnh gần nhất. Không ghi lại giá đơn cũ.
- Chọn từ bảng giá trong màn hình tạo đơn lưu giá và tham chiếu phiên bản vào dòng hàng; hỗ trợ sản phẩm gốc/bổ sung/quà tặng. Basic/Baby/Premium là dòng bảng giá, không tự gán thành nguồn tóc.
- Import chỉ khởi tạo khi DB chưa có bảng giá, không ghi đè chỉnh sửa quản trị khi khởi động lại. Dữ liệu và lịch sử nằm cùng workspace.sqlite, đi theo sao lưu hiện có.
