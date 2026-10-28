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

- Chỉ cập nhật E:Q của những dòng khớp tháng và mã Sale; không sửa nhân sự, chi phí, lương hoặc dữ liệu MKT.
- I là dòng tiền đã trừ vận chuyển. P là doanh thu thực thu, Q là thu hồi công nợ để công thức hoa hồng P+Q không cộng trùng.
- R không tự điền tỷ giá bình quân. Các khoản dùng tỷ giá riêng từ CRM; thiếu tỷ giá trả ô trống.
- Ghi đè giá trị hiện tại, không cộng thêm vào lần đồng bộ trước. Mã bị thiếu hoặc trùng khiến toàn bộ kế hoạch dừng trước khi ghi.
- Sao lưu công thức/giá trị trước mỗi lần ghi; đọc lại từng ô đã ghi để kiểm chứng.
- Các tiêu đề I/P hiện khác nghĩa nhau theo công thức của file mẫu; cần làm rõ nhãn khi nghiệm thu. Các bảng lương có tỷ giá chính sách riêng vẫn giữ nguyên.
- File hiện không có cột năm. Không tự chuyển sang năm mới; phải chọn và đối chiếu file năm mới trước.

## Tình trạng

Đã triển khai revision 899127d; 163 kiểm thử qua. Service account đã có quyền Editor đúng file; khóa riêng lưu ngoài Git tại /opt/hqhaircrm/data/google-accounting/service-account.json (600, UID 1000). Khóa công khai tải lên hết hạn 28/10/2027: cần thay khóa trước ngày này. Khóa tải xuống bị thất lạc d9591ca66893 đã xóa theo xác nhận người dùng.

Lần đồng bộ đầu ngày 28/10/2026 đã ghi và đọc lại khớp 40 dòng tháng 1–10, gồm công nợ HQ-LN 0.33 USD. Timer production đã bật, lần chạy ghi nhận Result=success. Chỉ xác nhận tab 05 và dữ liệu đã ghi; chưa nghiệm thu toàn bộ công thức lương/tài chính ở các tab phụ thuộc.
