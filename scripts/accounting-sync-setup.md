# Kích hoạt đồng bộ kế toán

Đích cố định: `1EYLtTFO4fsjZo9YzutnPhimBXOLCGCaHlyvB36Kaa_M`, tab `05_Dữ liệu CRM`, năm 2026.

## Quyền Google cần thiết

1. Trong Google Cloud của chủ hệ thống, bật Google Sheets API và tạo service account riêng cho đồng bộ.
2. Chia sẻ đúng file kế toán cho địa chỉ email của service account, quyền Editor. Không cần chia sẻ cả Drive.
3. Tạo khóa JSON và lưu riêng trên máy chủ với quyền chỉ chủ sở hữu đọc được. Không đưa vào Git, tin nhắn hoặc log.
4. Đặt `GOOGLE_APPLICATION_CREDENTIALS` thành đường dẫn khóa, `DATA_DIR` thành thư mục SQLite của CRM, `ACCOUNTING_SHEET_YEAR=2026`.

## Kiểm tra và kích hoạt

Chạy trong môi trường Node >=22.18 có mã nguồn CRM và quyền đọc SQLite:

```sh
node scripts/sync-accounting-sheet.mjs
```

Mặc định chỉ đọc và lưu kế hoạch, chưa ghi Google Sheet. Kiểm tra bản sao lưu trong `DATA_DIR/accounting-sheet-backups`, đặc biệt tháng 10 và dữ liệu thiếu tỷ giá.

Sau khi đối chiếu kế hoạch:

```sh
node scripts/sync-accounting-sheet.mjs --write
```

Lần ghi đầu phải đối chiếu với báo cáo CRM và công thức tổng trên Sheet. Sau đó mới cấu hình lịch chạy 5 phút một lần bằng bộ lập lịch máy chủ, có khóa chống chạy chồng và ghi nhận lỗi. Lịch production đã bật ngày 28/10/2026 bằng hqhair-accounting-sync.timer (5 phút sau mỗi lần hoàn thành).

## Phạm vi dữ liệu

- Tab 05 chỉ cập nhật E:Q của những dòng khớp tháng và mã Sale; không sửa nhân sự, chi phí, lương hoặc dữ liệu MKT.
- Tab 13 đồng bộ mã đơn đã duyệt theo tháng duyệt đầu tiên (múi giờ Việt Nam), mã Sale và mặc định loại Giá vốn hàng hóa nếu ô loại còn trống. Gắn ID CRM trong ghi chú ô mã đơn; chạy lại không đổi vị trí dòng hoặc ghi đè số tiền/nội dung/NCC/trạng thái nhập tay. Đơn đã hủy giữ dòng chi phí và có ghi chú để đối soát. Đổi tháng duyệt hoặc Sale không khớp thì dừng để kiểm tra, không tự chuyển chi phí.
- Khi tháng hết dòng trống, chèn thêm dòng bên trong vùng tổng hiện có, sao chép định dạng/validation và công thức tên Sale. Các tham chiếu tổng của Google Sheets tự mở rộng. Dòng có thông tin nhập tay nhưng chưa có mã đơn không bị lấy để ghi đơn mới.
- I là dòng tiền đã trừ vận chuyển. P là doanh thu thực thu, Q là thu hồi công nợ để công thức hoa hồng P+Q không cộng trùng.
- R không tự điền tỷ giá bình quân. Các khoản dùng tỷ giá riêng từ CRM; thiếu tỷ giá trả ô trống.
- Ghi đè giá trị hiện tại, không cộng thêm vào lần đồng bộ trước. Mã bị thiếu hoặc trùng khiến toàn bộ kế hoạch dừng trước khi ghi.
- Sao lưu công thức/giá trị trước mỗi lần ghi; đọc lại từng ô đã ghi để kiểm chứng.
- Tiêu đề I là Dòng tiền thu về (VND); P là Doanh thu thực thu (USD). Các bảng lương có tỷ giá chính sách riêng vẫn giữ nguyên.
- File hiện không có cột năm. Không tự chuyển sang năm mới; phải chọn và đối chiếu file năm mới trước.

## Tình trạng

Cập nhật tab giá vốn 28/10/2026: revision abe94ee đã triển khai khỏe, 168 kiểm thử qua. Đã ghi và đọc lại 11 đơn vào tháng 10, lần chạy lại costChanges=0. Đối chiếu bản sao trước/sau xác nhận các ô nhập tay, công thức tên Sale, số thứ tự và tổng tháng giữ nguyên. Timer enabled/active. Thử chèn 20 dòng bằng đúng hàm production trên tab QA tạm trong Google Sheets: SUM và SUMIF tự mở rộng, giữ khoản cũ và cộng khoản mới đúng 60; tab QA đã dọn sau kiểm tra.

Đã triển khai revision 899127d; 163 kiểm thử qua. Service account đã có quyền Editor đúng file; khóa riêng lưu ngoài Git tại /opt/hqhaircrm/data/google-accounting/service-account.json (600, UID 1000). Khóa công khai tải lên hết hạn 28/10/2027: cần thay khóa trước ngày này. Khóa tải xuống bị thất lạc d9591ca66893 đã xóa theo xác nhận người dùng.

Lần đồng bộ đầu ngày 28/10/2026 đã ghi và đọc lại khớp 40 dòng tháng 1–10, gồm công nợ HQ-LN 0.33 USD. Timer production đã bật; lần chạy tiếp theo 15:45 ghi nhận Result=success và written-and-verified.

## Rà soát workbook ngày 28/10/2026

- Đối chiếu hợp đồng gốc: K03–K05 và Điều 8.1–8.2 bao gồm kết nối và hoàn thiện liên kết lương/tài chính theo nghiệp vụ đã chốt. Không triển khai chế độ tỷ giá chung đã hoãn.
- Sửa 1.137 công thức AGGREGATE không tương thích Google Sheets thành INDEX/FILTER, giữ nguyên điều kiện nhân sự và thứ tự. Đã xác nhận đủ 4 Sale và HQ-MKT-VH ở các bảng tự động; các ô chọn nhân viên/chấm công/KPI nhập tay giữ nguyên.
- Sửa liên kết tiền hàng mới thành dòng tiền sau vận chuyển trừ thu hồi công nợ, tránh cộng trùng khi bảng Dòng tiền cộng hai khoản.
- Sửa 1.250 ô tổng/liên kết: thêm tổng USD còn thiếu; khi khoản USD khác 0 thiếu tỷ giá, tổng VND và các phép tính phụ thuộc hiển thị Chưa có tỷ giá, không cộng ô thiếu như 0. Tổng có đủ tỷ giá tiếp tục dùng công thức gốc. Không thay tỷ giá chính sách tính lương.
- Đọc lại 29 tab, 17.290 công thức: không có effectiveValue.errorValue; mọi công thức sửa khớp kế hoạch. Không còn AGGREGATE, _xlfn hoặc #REF! trong công thức.
- Đối chiếu tháng 10: đã nhận 5.511,78 USD = vận chuyển 518 USD + dòng tiền 4.993,78 USD; công nợ 72,22 USD. Khoản thiếu tỷ giá trên CRM tiếp tục để trống VND ở dòng dữ liệu gốc.
- Bản sao trước sửa và kế hoạch từng ô nằm trong data/accounting-live-audit.xlsx, data/roster-formula-audit.json, data/financial-formula-audit.json (không đưa dữ liệu khách vào Git).
- Đây là kiểm tra kỹ thuật và dữ liệu CRM hiện có, không phải xác nhận các khoản chấm công, KPI, chi phí nhập tay hoặc chính sách lương chưa được khách cung cấp mẫu đối soát. File dành cho năm 2026; phải xác nhận file năm mới trước khi chuyển kỳ năm.
