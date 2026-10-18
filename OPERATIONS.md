# Vận hành HQ Hair Workspace

## Cập nhật ngày 16/10/2026

### Khách tự quản lý bảng giá và màu

- Quản trị có sẵn quyền quản lý. Để giao cho Sale: **Tài khoản & đội ngũ → Nhân sự & quyền truy cập**, bật riêng **Thêm / sửa bảng giá** và/hoặc **Thêm / sửa mẫu màu**. Tài khoản chưa được cấp quyền chỉ tra cứu; không tự mở quyền cho toàn bộ nhân viên.
- **Bảng giá & màu → Thêm mức giá**: nhập bảng giá, sản phẩm, quy cách, chiều dài, tông, đơn vị và số tiền. **Sửa giá** trên mỗi dòng cập nhật số tiền và ghi chú; giữ nguyên quy cách của dòng đó. Không nhập trùng một tổ hợp sản phẩm/quy cách/chiều dài/tông.
- **Danh mục màu → Thêm mẫu màu**: nhập mã, loại màu; màu phối chọn ít nhất hai màu đơn. Mã mới dùng mức giá của tông tương ứng (Đen/Nâu/Sáng). Màu phối dùng tông cao nhất. Thêm mã màu không yêu cầu nhập lại giá nếu tông đã có mức giá phù hợp.
- Lịch sử ghi người thao tác, thời gian, giá trước/sau và ghi chú. Các đơn đã lưu giữ nguyên đơn giá. API `/pricing/entries` dùng cùng phân quyền, phiên bản danh mục và cơ chế chống ghi lặp như điều chỉnh giá theo phần trăm.
- Kiểm tra bổ sung: `node tests/pricing-security.mjs`, `node tests/pricing-self-service.mjs` (thêm/sửa, giá trùng, retry mất mạng, chọn màu/giá vào đơn, cấp/thu hồi quyền, điện thoại).

### Quốc gia, ngày tháng, bộ lọc Xưởng và mã khách

- Danh sách dùng chung có 80 quốc gia, nhãn tiếng Việt, giữ nguyên giá trị lưu của các quốc gia cũ.
- Tổng quan Xưởng lọc đồng thời trạng thái đang hiển thị trên đơn, tháng đặt hàng, ngày kế toán duyệt từ ngày chọn và hạn gửi văn phòng không muộn hơn ngày chọn (bao gồm ngày biên). Đơn đã gửi dùng hạn đã chốt khi bàn giao.
- Các ô ngày/tháng dùng bộ chọn tiếng Việt, hiển thị ngày/tháng/năm hoặc tháng/năm, API vẫn nhận ISO. Có thể gõ trực tiếp hoặc mở lịch.
- Theo yêu cầu đổi cả mã khách và mã đơn: migration `judy-customer-numbering-20261016` chạy một lần khi khởi động. Chuỗi khách Judy bắt đầu ở `HQ-JD-3` được đánh lại từ 1; mã đơn và mã nháp tương ứng được cập nhật. ID nội bộ của đơn, chứng từ, media và dữ liệu tài chính giữ nguyên. Các chuỗi khác không thay đổi.
- Trước đổi mã, tạo và kiểm tra bản sao SQLite trong `DATA_DIR/identity-backups`. Ghi đối chiếu vào audit `customer-numbering-migration` và lịch sử đơn. Cập nhật bộ đếm Judy theo số khách sau đổi mã. Thu hồi phiên đăng nhập để tránh biểu mẫu cũ sửa nhầm khách do mã được đánh lại; người dùng đăng nhập lại sau deploy. Nếu phát hiện chuỗi không liên tục hoặc liên kết không khớp, dừng migration để kiểm tra.
- Kiểm tra: `npm test`, `npm run build`, `node tests/security.mjs`, `node tests/factory-integration.mjs`, `node tests/accounting-qc.mjs`, `node tests/navigation-audit.mjs`.

## Khởi tạo

Node >=22.18. `npm ci`, `npm run build`, `npm start`.

Biến môi trường:

- `DATA_DIR`: thư mục dữ liệu bền vững, Railway `/data` (đã có volume).
- `HQ_ADMIN_EMAIL`, `HQ_ADMIN_PASSWORD`, `HQ_ADMIN_NAME`: cấp quản lý đầu tiên **chỉ khi bảng users rỗng**. Mật khẩu tối thiểu 12 ký tự; người dùng phải đổi lần đầu. Không ghi mật khẩu vào repo, log hay README.
- `NODE_ENV=production`: cookie Secure trên HTTPS.
- `BACKUP_DIR`: nơi lưu bản sao. Mặc định `${DATA_DIR}/backups`; nếu có nơi lưu độc lập đã mount, trỏ vào đó.

Mở `/workspace`. Quản lý vào “Tài khoản & đội ngũ” để cấp tài khoản, nhập bảng giá, phân công khách hàng. Kế toán và Xưởng đã có không gian vận hành riêng. Quyền hiện hành xem phần đầu CUSTOMER_PERMISSIONS.md; phạm vi Xưởng và kiểm thử xem FACTORY_IMPLEMENTATION.md.

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

Ảnh chat lưu trong bảng `chat_images` của database tương ứng (demo/workspace), tối đa 20 ảnh/video mỗi tin, ảnh 10 MiB, video 25 MiB, tổng 50 MiB (chat-limits.js). Cần theo dõi dung lượng volume và backup khi lượng ảnh tăng; ảnh không đi vào JSON danh sách đơn. Route mở ảnh kiểm tra phiên và quyền hiện tại trên đơn, kể cả sau chuyển người phụ trách.


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
- Current workflow: cancellation before approval without receipts uses stage -1; deposit forfeiture closes at stage 10 with cancellation and content-lock markers. Cancelled orders are excluded from financial reports. Accounting actions require the accounting role and a current order version. QC editing requires assigned Sale at stage 8 or manager; Factory and Accounting are read-only. Manager changes after lock require a reason.
- Verification: `npm test`, `node tests/security.mjs`, and after build `node tests/factory-integration.mjs`, `node tests/workflow-security.mjs` and `node tests/mobile-workspace.mjs`. `node tests/accounting-qc.mjs` verifies the current Sale step-8 QC permissions, read-only Factory/Accounting UI, authenticated media, locks and restart persistence. Tests create their own temporary databases and never change live orders.


## Product standards reference (2026-10-02)

- Sale/lead/manager have a Product standards navigation entry. The 14-page customer PDF and WebP previews are served only through authenticated `/api/work/product-standards/:file` routes. Factory/Accounting cannot access this Sale reference.
- Files live in `DATA_DIR/product-standards` (override: `HQ_STANDARDS_DIR`), outside the public web root and Git. Deploying code preserves this directory. Keep an independent copy of these immutable files: the SQLite backup does not include them. The operator copy is `data/product-standards`, with the original customer PDF also retained in Downloads.
- Original SHA-256: `bfcd6f789895d11af7888d27d06d8734c2365defbd24d0123cdaae2a38e9af5f`. Previews are 2160x1215 WebP; 7 categories, Vietnamese/English paired pages. Do not silently revise source specifications.
- API/UI tests generate synthetic document fixtures and do not need the private customer file.


## Xác nhận phần Xưởng ngày 09/10/2026

- Chỉ Kế toán hủy mất cọc khi đơn bước 4 đang tạm dừng tại Xưởng; không có nghiệp vụ hủy mất phí. API chặn cả trạng thái không hợp lệ và phiên bản cũ. Không thay đổi số tiền/chứng từ lịch sử.
- Xưởng hiển thị ngày duyệt lần đầu, hạn gửi văn phòng, số ngày kế hoạch, ngày gửi và số ngày thực tế. Cả hai khoảng thời gian tính từ ngày duyệt; sớm/đúng/trễ so ngày gửi với hạn chốt khi bàn giao. Thiếu ngày hiện “—”.
- Cộng gram rồi đổi tổng sang kg; đơn vị khác giữ riêng. Đơn mẫu và kết quả nghiệm thu từ khách vẫn đang chờ.
- Chi tiết quy tắc và bằng chứng: FACTORY_IMPLEMENTATION.md. Xác nhận này thay thế các mô tả cũ cho phép hủy mất cọc ở bước thanh toán cuối.


## Nhập bảng giá Excel (16/10/2026)

Vào **Bảng giá & màu → Nhập Excel**. Quản lý hoặc Sale được cấp quyền sửa giá/màu có thể nhập phần dữ liệu tương ứng. Quyền được kiểm tra lại tại máy chủ.

- **Tải mẫu Excel**: sheet `BangGia` (mỗi dòng một mức giá) và `MauSac` (màu đơn), kèm `HuongDan`. Sheet không dùng có thể để trống. Giữ tên sheet và tiêu đề cột.
- **Xuất Excel hiện tại**: xuất giá và màu đơn vào cùng định dạng, sửa hàng loạt rồi nhập lại. Màu phối và ảnh vẫn quản lý tại Danh mục màu.
- **File gốc**: hỗ trợ Bảng giá Basic so9, Premium HQ so 9 và BABY THIN HAIR + BAO TẨY theo bố cục đã đối chiếu. Baby mặc định lấy dãy bên phải (M–O ở Baby Bulk Hair), theo xác nhận khách ngày 16/10; Bao tẩy lấy I. Tên sheet Baby được ánh xạ sang tên sản phẩm hiện có để tránh sinh trùng.
- **Chỉ thêm mới** là mặc định, bỏ qua dữ liệu đã có. **Thêm mới và cập nhật** thay giá/ghi chú khi khóa sản phẩm, quy cách, kích thước, cm và tông khớp. Đơn vị hoặc inch khác sẽ báo lỗi; không tự đổi ý nghĩa giá.
- Màu nhập hàng loạt hỗ trợ Black/Brown/Blonde/Other. Tạo màu phối tại màn hình màu để chọn thành phần. Không đổi loại màu cũ qua import.
- Xem trước phân biệt thêm mới/cập nhật/bỏ qua/không đổi và báo nguồn từng lỗi. Có lỗi thì không ghi bất kỳ dòng nào. Xác nhận lưu cả đợt trong transaction, kiểm tra phiên bản, chống gửi lặp và lưu lịch sử. Không xóa dòng vắng trong file; không đổi giá trên đơn đã lưu.
- Giới hạn mỗi file 5 MB, 10.000 dòng, 50 sheet; danh mục tối đa 20.000 mức giá và 5.000 màu. Dùng số thực trong Excel; công thức cần tính và lưu trước khi nhập. File bố cục mới dùng mẫu chuẩn; không tự nhận mọi kiểu bảng tính.

Kiểm thử: `npm test`, `npm run build`, `node tests/pricing-import.mjs`. Đặt `HQ_PRICE_SOURCE_DIR` để đối chiếu thêm ba file gốc tại máy kiểm thử. Dữ liệu kiểm thử dùng thư mục tạm; không ghi dữ liệu production. Ba file nguồn hiện tại khớp 2.874 mức giá seed (Basic 2.004, Premium 468, Baby 402).


## Báo cáo theo kỳ đã xác nhận (16/10/2026)

- Sale có sáu thẻ: giảm giá, doanh thu thuần, dòng tiền thu vào, doanh thu thực thu, thu hồi công nợ, công nợ phải thu. Vận chuyển đã nhận và thiệt hại hiển thị trong báo cáo Kế toán.
- Doanh thu/giảm giá theo lần Kế toán duyệt đầu tiên. Dòng tiền theo ngày thực nhận đã xác nhận, trừ vận chuyển phân bổ một lần qua các khoản thu; khoản cũ dùng ngày chứng từ khi thiếu ngày thực nhận riêng.
- Theo tháng: thực thu = thu trong tháng từ đơn duyệt cùng tháng; thu hồi công nợ = thu trong tháng từ đơn duyệt trước tháng đó. Khoản thu thiếu ngày duyệt hoặc thu trước kỳ duyệt được nêu riêng, không tự xếp loại. Đến hiện tại: thực thu bằng tổng tiền nhận trừ vận chuyển; thu hồi công nợ hiện “Không áp dụng”, không có tiền/tỷ lệ và CSV ghi chú không áp dụng. Theo năm: hai chỉ tiêu phân loại thu vẫn chờ khách chốt.
- Công nợ tháng/năm cũ lấy cuối kỳ, kỳ hiện tại lấy hôm nay. Chỉ trừ khoản đã xác nhận có ngày thu đến mốc đó; điều chỉnh khoản thu dùng dữ liệu đã sửa hiện có. Đơn hủy sau mốc vẫn có công nợ tại mốc. Khi có phiên bản trước chỉnh sửa, dùng điều khoản tiền của phiên bản tại mốc; thiếu lịch sử chỉnh sửa hoặc ngày thu cần thiết thì không hiển thị tổng công nợ như số hoàn chỉnh. CSV dùng cùng công thức và ghi rõ mốc.
- Khách đã mua và bốn nhóm: lũy kế đến cuối kỳ, mỗi khách một lần. Khách mới theo lần duyệt đầu tiên, không theo ngày tạo hồ sơ. Khách quay lại tháng/năm phải mua trước kỳ và có đơn duyệt trong kỳ; hai đơn đầu tiên cùng kỳ không tính quay lại. Đến hiện tại giữ thống kê tổng khách có từ hai đơn duyệt. Biểu đồ nhóm dùng khách đã mua thay vì hồ sơ chưa mua.
- Báo cáo Sale/Kế toán/Xưởng thống nhất Đến hiện tại / Theo tháng / Theo năm. Xưởng theo ngày thực tế gửi văn phòng; chọn tháng không cộng các tháng trước. So sánh kỳ trước khi có dữ liệu. Danh sách công nợ cần thu/tiến độ xử lý vẫn là trạng thái hiện tại và được ghi rõ.
- Khách xác nhận 16/10 lúc 22:58–23:01: tổng quan Xưởng dùng ngày kế toán duyệt làm mốc từ ngày, giữ hạn gửi văn phòng làm mốc đến ngày. Chưa tự áp quy tắc phân loại thu tháng cho chế độ năm.

Kiểm thử: `npm test`, `npm run build`, `node tests/period-dashboard.mjs`, `node tests/report-percentages.mjs`. Trường hợp kiểm thử gồm đơn đặt năm trước nhưng duyệt trong kỳ, thu qua nhiều tháng, snapshot trước sửa tiền, hủy sau mốc, thiếu ngày, khách mua hai lần cùng kỳ, năm trước, CSV và giao diện điện thoại. Không di trú hoặc ghi lại dữ liệu kinh doanh.


### Cập nhật chốt khoảng ngày cho 6 thẻ Sale / Kế toán
- Thay bộ chọn tháng/năm/đến hiện tại của 6 thẻ bằng Từ ngày – Đến ngày; mặc định đầu tháng hiện tại đến hôm nay, bao gồm hai ngày biên.
- Doanh thu thuần và giảm giá theo ngày duyệt trong khoảng. Dòng tiền theo ngày nhận trong khoảng, trừ vận chuyển được phân bổ một lần trên toàn bộ lịch sử thu.
- Thực thu: tiền nhận trong khoảng từ đơn duyệt trong khoảng. Thu hồi công nợ: tiền nhận trong khoảng từ đơn duyệt trước ngày bắt đầu.
- Công nợ là số dư đến hết ngày kết thúc, bao gồm các đơn duyệt trước ngày bắt đầu còn nợ. Bảng theo Sale và CSV dùng cùng khoảng; vận chuyển, thiệt hại kế toán cũng theo khoảng này.
- Khoảng thiếu ngày, ngày không tồn tại, đảo chiều hoặc vượt hôm nay không áp dụng; giao diện giữ số liệu khoảng hợp lệ trước đó và báo rõ.
- Quy tắc này thay thế trạng thái Không áp dụng/chờ chốt năm ở 6 thẻ. Thống kê khách hàng và Xưởng giữ cơ chế riêng đã chốt.
- Biểu đồ doanh thu dùng cùng khoảng; danh sách công nợ cần thu hiện tại vẫn là phần riêng, có tiêu đề phân biệt.


### Chốt cuối: khoảng tháng và phân loại thu từng tháng (17/10/2026)
- Thay hai ô ngày bằng Từ tháng – Đến tháng, mặc định tháng hiện tại. Tháng cũ lấy trọn tháng, tháng hiện tại đến hôm nay.
- Trong mỗi tháng: thực thu là tiền nhận từ đơn duyệt cùng tháng; thu hồi là tiền nhận từ đơn duyệt trước tháng nhận. Cộng các khoản này qua các tháng chọn, luôn trừ vận chuyển phân bổ một lần trên lịch sử thu.
- Công nợ là số dư tại cuối tháng kết thúc (hoặc hôm nay), bao gồm mọi đơn cũ còn nợ; tuyệt đối không cộng số dư cuối từng tháng.
- Ví dụ đơn 1.000 duyệt tháng 8, trả 400/300/300 trong tháng 8/9/10: chọn 8–10 cho thực thu 400, thu hồi 600, công nợ 0.
- Quy tắc này thay thế việc phân loại theo ngày bắt đầu toàn khoảng đã mô tả trước đó. Sale, tổng quan, kế toán, bảng theo Sale, biểu đồ và CSV đồng bộ.


### Chốt ngày ghi nhận thu (17/10/2026 00:43)
- Mọi báo cáo tiền thu, thực thu, thu hồi, vận chuyển phân bổ, VND, biểu đồ và CSV lấy ngày kế toán xác nhận từng khoản (confirmedAt), quy đổi sang ngày Việt Nam.
- Ngày gửi bill và ngày thực nhận ngân hàng là thông tin đối chiếu; không dùng làm ngày báo cáo, kể cả dữ liệu cũ. Không thay đổi các ngày này hay timestamp xác nhận trong dữ liệu thật.
- Công nợ cuối kỳ chỉ trừ khoản được xác nhận đến cuối kỳ. Công nợ hiện tại gồm mọi đơn cũ/mới còn nợ; khoản cũ thiếu timestamp vẫn được tính vào tổng đã trả hiện tại, nhưng báo cáo tiền thu cảnh báo thiếu ngày và công nợ lịch sử hiện chưa đủ dữ liệu.
- Doanh thu và giảm giá vẫn theo ngày kế toán duyệt đơn lần đầu. Tiền thu theo từng lần xác nhận; không lấy ngày duyệt đơn đầu tiên thay cho các lần thu sau.
- Hồi quy HQ-JD-2-1: gửi 28/9, ngân hàng về 3/10, kế toán xác nhận 16/10, tiền 746,40 trừ ship 60 = 686,40 vào tháng 10, không vào tháng 9.

- Xưởng: bộ lọc tháng, nhóm tháng và cột ngày trên tổng quan/chưa ghi nhận dùng ngày kế toán duyệt lần đầu; bỏ ngày tạo đơn khỏi các mốc này. Thời gian kế hoạch/thực tế bắt đầu từ ngày duyệt; hạn theo đơn (hạn đã chốt lúc gửi văn phòng với đơn đã gửi), thực tế theo sự kiện gửi văn phòng. Ngày ghi nhận và Sale Check vẫn là các sự kiện riêng có nhãn rõ.

### Đối chiếu công nợ theo ngày kết thúc (17/10/2026)
- Các khoản phát sinh được cộng trong khoảng chọn. Số dư công nợ lấy toàn bộ lịch sử đến ngày kết thúc, không giới hạn theo ngày bắt đầu và không cộng số dư các tháng.
- Bổ sung mục mở rộng “Đối chiếu công nợ” dùng chung cho Sale, Tổng quan và Kế toán: số dư cuối tháng trước + nợ tăng − nợ giảm = số dư ngày kết thúc. Từng dòng đối chiếu một đơn, không bù tiền trả dư giữa các đơn.
- Nợ tăng/giảm là thay đổi ròng từng đơn (bao gồm điều chỉnh/hủy), không đồng nghĩa chỉ tiêu thu hồi công nợ. Thiếu lịch sử thì không tự đặt số dư đầu kỳ bằng 0.
- Hồi quy chính: cuối 9 còn 100; ba đơn tháng 10 còn thiếu tổng 30; thu nợ tháng 7 là 20; đến 16/10 còn 110. Khoản thu ngày 20/10 không ảnh hưởng số dư 16/10; đổi mốc bắt đầu không đổi số dư.
- Giữ nguyên phân loại thực thu/thu hồi hiện có trong khi chờ khách xác nhận lại. Không coi thay đổi này là xác nhận mới cho quy tắc phân loại đó. Khoản thu sửa sai tiếp tục dùng dữ liệu đã sửa theo chính sách báo cáo hiện có; đây chưa phải cơ chế khóa sổ bất biến.

### Khách xác nhận phân loại thu hồi công nợ (17/10/2026 09:19)
- Thu hồi công nợ: khoản thu trong kỳ của đơn duyệt trước tháng nhận tiền, bất kể nợ từ tháng nào trước đó.
- Đơn duyệt và thu tiền cùng tháng: vào dòng tiền và thực thu cùng tháng, không vào thu hồi công nợ. Phần chưa thu vẫn nằm trong công nợ tại ngày kết thúc.
- Khoảng nhiều tháng cộng phát sinh riêng từng tháng; tháng kết thúc chưa hết chỉ lấy đến ngày kết thúc. Áp dụng cùng quy tắc tháng cho cả khoảng ngày, không phân loại theo mốc bắt đầu bộ lọc.
- Xác nhận này thay thế ghi chú chờ xác nhận về phân loại ở trên. Ngày kế toán xác nhận và cách trừ vận chuyển giữ theo quy tắc đã có.

### Báo cáo Kế toán USD/VND (18/10/2026)
- Báo cáo Kế toán có 9 chỉ số: 6 chỉ số hiện tại, thêm tổng thu phí vận chuyển, tổng thu (gồm vận chuyển) và bồi thường/thiệt hại. Bỏ các dải tổng phụ lặp bên dưới.
- Doanh thu/giảm giá dùng accountingApproval.exchangeRate nhập riêng lúc duyệt. Tiền thu dùng tỷ giá từng khoản đã xác nhận. Bồi thường dùng exchangeRate nhập riêng từng lần ghi nhận; khoản hủy ghi nhận không tính.
- Dữ liệu thiếu tỷ giá hiển thị Chưa có tỷ giá, không tự suy đoán hoặc trình bày tổng VND chưa đủ như tổng đầy đủ. Công nợ chỉ có USD. Các khoản phát sinh cộng theo kỳ, công nợ vẫn là số dư cuối kỳ.
- In / Lưu PDF có đủ 9 chỉ số, kỳ báo cáo và Sale đang chọn. Excel có trang Tổng hợp USD/VND và Chi tiết; bảng theo Sale cũng hiển thị hai loại tiền.
- Dữ liệu cũ giữ nguyên; không điền hàng loạt tỷ giá cho khoản cũ.
