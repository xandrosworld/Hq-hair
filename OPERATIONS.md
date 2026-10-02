# Vận hành HQ Hair Workspace

## Khởi tạo

Node >=22.18. `npm ci`, `npm run build`, `npm start`.

Biến môi trường:

- `DATA_DIR`: thư mục dữ liệu bền vững, Railway `/data` (đã có volume).
- `HQ_ADMIN_EMAIL`, `HQ_ADMIN_PASSWORD`, `HQ_ADMIN_NAME`: cấp quản lý đầu tiên **chỉ khi bảng users rỗng**. Mật khẩu tối thiểu 12 ký tự; người dùng phải đổi lần đầu. Không ghi mật khẩu vào repo, log hay README.
- `NODE_ENV=production`: cookie Secure trên HTTPS.
- `BACKUP_DIR`: nơi lưu bản sao. Mặc định `${DATA_DIR}/backups`; nếu có nơi lưu độc lập đã mount, trỏ vào đó.

Mở `/workspace`. Quản lý vào “Tài khoản & đội ngũ” để cấp tài khoản, nhập bảng giá, phân công khách hàng. Cấp tài khoản Kế toán/Xưởng chỉ chuẩn bị danh tính; chưa mở chức năng các giai đoạn tiếp theo.

Tài khoản chuẩn bị triển khai không thay cho danh sách nhân sự khách gửi. Không tự gửi mật khẩu cho khách. Quản lý chuyển mật khẩu ban đầu qua kênh riêng và người nhận đổi ngay khi đăng nhập.

## Lưu trữ

`workspace.sqlite` chứa dữ liệu chung, tài khoản, phiên, audit, mã chống gửi trùng và bộ đếm mã. `demo.sqlite` độc lập, chỉ dùng giới thiệu. Không xóa volume khi deploy. Một replica trên Railway; không scale nhiều instance với database local này.

Hiện dùng SQLite transaction + JSON workspace phù hợp giai đoạn triển khai quy mô nhỏ. Tệp chứng từ lưu cùng database. Trước khi nhập dữ liệu lớn cần đo tải/dung lượng và chọn phương án database/tệp phù hợp. Không coi giới hạn danh sách là cam kết năng lực tải.

## Sao lưu và khôi phục

Tạo snapshot bằng SQLite backup khi khởi động và mỗi 24 giờ; kiểm tra `integrity_check`; giữ bản mới nhất cho mỗi ngày trong 14 ngày có sao lưu. Bản sao mặc định nằm cùng volume, **chưa thay thế bản sao ở nơi độc lập**. Quản lý có nút “Tải bản sao lưu” để cất ở nơi riêng; bản tải xuống chứa thông tin tài khoản và phải giữ kín.

Trước khi vận hành chính thức cần thống nhất nơi sao lưu ngoài volume, dung lượng, chi phí và người chịu trách nhiệm theo Phụ lục 03. Cấu hình `BACKUP_DIR` chỉ là điểm nối; nó không tự tạo dịch vụ lưu trữ ngoài Railway.

Thử khôi phục vào thư mục mới (không ghi đè đang chạy):

```sh
node scripts/restore-workspace.mjs /secure/backup.sqlite /new/hq-restored-data
```

Công cụ kiểm tra bản sao, khôi phục dữ liệu, xóa mọi phiên đăng nhập cũ và cache retry, kiểm tra lại tính toàn vẹn. Nó từ chối thư mục đích đã tồn tại. Dừng service, gắn thư mục đã xác minh vào DATA_DIR rồi khởi động. Đăng nhập lại và kiểm tra khách/đơn/chứng từ/quyền trước khi chuyển sử dụng. Giữ bản cũ để đối chiếu, không xóa trước khi xác nhận phục hồi.

## Khôi phục quyền quản lý

Quản lý đang hoạt động cấp lại mật khẩu từ giao diện; mọi phiên cũ bị thu hồi. Nếu mất toàn bộ quyền quản lý, người vận hành có quyền máy chủ xử lý trực tiếp database theo quy trình riêng; không mở endpoint reset công khai và không xóa database để cấp lại tài khoản.

## Đặc tả bảo mật hiện tại

Session 8 giờ tuyệt đối, cookie HttpOnly/Secure/SameSite Strict; token phiên lưu dạng SHA-256. Mật khẩu scrypt N=32768, salt ngẫu nhiên. POST có CSRF và origin check. Sai mật khẩu trả cùng thông báo; giới hạn theo email và IP. Quản lý không xem được mật khẩu đã cấp qua API. Không lưu credential ở localStorage.

Chỉ các route quản lý được đọc audit/backup/toàn bộ khách-đơn. Sale bị lọc dữ liệu tại server và kiểm tra lại quyền trước mỗi ghi. Chuyển phụ trách/khóa tài khoản có hiệu lực ở yêu cầu tiếp theo. Giao diện có thể còn dữ liệu đã tải trước đó; không thể thu hồi các bản đã được người dùng hợp lệ tải xuống trước khi đổi quyền.

Nguồn kỹ thuật: [Node SQLite](https://nodejs.org/docs/latest-v22.x/api/sqlite.html), [Node crypto](https://nodejs.org/docs/latest-v22.x/api/crypto.html).

Ảnh chat lưu trong bảng `chat_images` của database tương ứng (demo/workspace), tối đa 4 ảnh x 5 MiB mỗi tin. Cần theo dõi dung lượng volume và backup khi lượng ảnh tăng; ảnh không đi vào JSON danh sách đơn. Route mở ảnh kiểm tra phiên và quyền hiện tại trên đơn, kể cả sau chuyển người phụ trách.


## Cập nhật vận hành VPS và bản sao trên máy vận hành

- Hệ thống hiện chạy tại https://hqhaircrm.io.vn/workspace trên Vietnix; Railway chỉ chuyển hướng và giữ bản trước chuyển máy chủ. Hướng dẫn Railway phía trên là lịch sử.
- VPS tự kiểm tra GitHub main mỗi 2 phút, build/test, backup rồi thay container; lỗi khởi động sẽ quay lại image trước. Không tự quay lùi dữ liệu.
- Bản sao VPS hằng ngày lưu 14 ngày. `python -X utf8 scripts/vps-backup.py` tạo online snapshot riêng của cả workspace/demo, tải qua SSH đã ghim host key, đối chiếu SHA-256 và SQLite integrity; lưu ngoài VPS tại `data/offsite-backups` (gitignored, ACL chỉ tài khoản vận hành và SYSTEM).
- Windows task `HQHair-OutsideVPS-Backup` chạy nền lúc 09:30 giờ máy và khi người dùng đăng nhập, chạy bù khi có thể. Cài lại bằng `powershell -NoProfile -ExecutionPolicy Bypass -File scripts/install-backup-task.ps1`. Tác vụ không chứa mật khẩu; script đọc .env ở workspace.
- Điều kiện: máy bật, đúng người dùng đăng nhập, có mạng, Python/paramiko/python-dotenv và thư mục dự án còn nguyên. Đây là bản sao vận hành bổ sung, chưa thay kho sao lưu độc lập luôn hoạt động do khách quản lý.
- Kiểm tra `Get-ScheduledTaskInfo -TaskName HQHair-OutsideVPS-Backup`, `data/offsite-backups/status.json` (lần thành công gần nhất) và `last-error.json` nếu có. Giữ một bản thành công/ngày trong 14 ngày; thời gian ngừng máy không tạo được bản mới.
- Thử khôi phục từ bản ngoài VPS vào thư mục mới bằng `scripts/restore-workspace.mjs`; không khôi phục đè dữ liệu live khi kiểm tra.


## Accounting and QC release (2026-10-02)

- QC media is stored as BLOBs in `qc_media` in the existing SQLite databases, included in normal backups. Metadata only is returned in order state. Images: 5 MiB; MP4/WebM: 12 MiB; 4 files per row; 200 files/200 MiB per order. Unused uploads are retained for history and count toward the order quota.
- `app_migrations` records the one-time customer-authorized full Factory visibility update; later permission changes survive restarts.
- Cancelled orders retain data at stage -1, excluded from financial reports. Accounting actions require the accounting role and a current order version. QC editing requires assigned Sale, Factory, or manager, subject to content lock.
- Verification: `npm test`, `node tests/security.mjs`, and after build `node tests/accounting-qc.mjs` (includes isolated API tests and Edge UI tests for all three roles). Tests create their own temporary databases and never change live orders.
