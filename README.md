# HQ Hair — Sale Workspace & Demo

Bản demo desktop cho buổi giới thiệu HQ Hair, dựa trên tài liệu Sale và trao đổi ngày 28/09/2026. Không phải bản nghiệm thu hệ thống 3 bộ phận.

## Không gian làm việc có đăng nhập

Mở `/workspace` để dùng tài khoản riêng và dữ liệu dùng chung. Xem [trạng thái theo hợp đồng](SALE_IMPLEMENTATION.md) và [hướng dẫn vận hành](OPERATIONS.md). Trên VPS, link gốc `/` chuyển tới workspace; `/demo` là demo riêng theo trình duyệt; các giới hạn demo dưới đây áp dụng cho link đó. Bảng giá và quy tắc màu đã nhập theo HQ Hair; công thức cuối và mẫu invoice còn chờ đối chiếu đơn thật.

## Chạy

Node 22.18 trở lên. `npm ci`, `npm run build`, `npm start`. Mở http://localhost:3000.
Phát triển giao diện: chạy server và `npm run dev` trong hai terminal.

## Luồng trình diễn 5–7 phút

1. Tổng quan: xem doanh thu, tiền đã xác nhận, công nợ và các việc cần theo dõi.
2. Khách hàng: xem hồ sơ/lịch sử, tạo khách mới. Mã khách tự sinh theo Sale `HQ-JD`.
3. Tạo đơn: chọn khách, sản phẩm gốc, sản phẩm bổ sung, quà tặng; đổi số lượng/thông số/giá.
4. Thanh toán & giao hàng: giảm giá, phí, địa chỉ nhận, vận chuyển, chứng từ nhiều lần.
5. Lưu bản nháp rồi mở lại; gửi yêu cầu duyệt. Đơn bị khóa và xuất hiện tiến độ 10 bước.
6. Mở đơn mẫu `HQ-JD-3-1` ở bước Sale tiếp nhận để xác nhận hoặc yêu cầu xưởng sửa lại.
7. Xem chat theo đơn, gửi yêu cầu sửa, in invoice/lưu PDF; mở công nợ và xuất CSV.

## Dữ liệu và giới hạn demo

- Tên, email, điện thoại, giá, chứng từ và lịch sử đều là dữ liệu giả. Không nhập dữ liệu vận hành thật.
- Phiên dùng thử riêng theo cookie HttpOnly. SQLite lưu phía server; mỗi trình duyệt có bộ dữ liệu riêng, không chia sẻ liên bộ phận.
- Railway mount `/data` để lưu SQLite qua restart/redeploy. Mất cookie sẽ tạo phiên mới. Khôi phục mẫu chỉ tác động phiên hiện tại.
- Vai trò hiện tại là Sale Judy. Không có đăng nhập, duyệt Kế toán, tài khoản Xưởng hay kết nối Google Sheets/ngân hàng/email trong bản demo.
- Thanh toán mới luôn chờ xác nhận, không tự giảm công nợ. Các khoản đã xác nhận trong đơn mẫu chỉ minh họa dữ liệu Kế toán.
- Công thức tạm để minh họa: doanh thu = sản phẩm gốc + bổ sung − giảm giá; tổng phải nhận = doanh thu + vận chuyển; tổng gửi khách = tổng phải nhận + phí nhận tiền. Quà tặng không thu tiền. Công nợ = tổng phải nhận − tiền đã xác nhận, tối thiểu 0. Công thức chính thức chờ biểu mẫu của khách.
- Demo dùng ngày giao dự kiến làm hạn thanh toán. Biểu đồ đang hiển thị tháng 1–9/2026. Không có tích hợp tracking hãng vận chuyển.
- Chứng từ PNG/JPG/WebP/PDF tối đa 1 MB; tối đa 200 khách, 300 đơn, 20 chứng từ/đơn, 200 tin nhắn/đơn/phiên. Invoice thương mại không bao gồm thông tin nội bộ/công nợ, không phải hóa đơn thuế.
- Giao diện đã bổ sung responsive cho điện thoại; phạm vi kiểm tra Chromium/WebKit, upload và các giới hạn thiết bị thật được ghi tại [MOBILE_QA.md](MOBILE_QA.md).

## Kiểm tra

`npm test` kiểm tra số tiền. Khi server chạy: `node tests/smoke.mjs` kiểm tra luồng giao diện, `node tests/api.mjs` kiểm tra khóa đơn/quyền sửa/đối soát. Biến `TEST_URL` dùng để chạy trên Railway. Ảnh kiểm tra lưu trong `screenshots/` và không được đưa lên deploy.

## Railway

Link dùng thử: https://sale-web-production-4b69.up.railway.app

Project `hq-hair-sale-demo`, service `sale-web`. Build bằng Docker, Node 22. Health check `/api/health`. `railway up --service sale-web --detach`.
Chỉ deploy thư mục này; tài liệu hợp đồng, ghi âm và tài liệu nguồn không được đưa vào image.

## Làm tiếp trên máy khác

Cài Git và Node.js 22.18+ (khuyến nghị Node 22 LTS), rồi chạy:

```sh
git clone https://github.com/xandrosworld/Hq-hair.git
cd Hq-hair
npm ci
npm run build
npm start
```

Mở http://localhost:3000. Để sửa giao diện với hot reload, giữ `npm start` ở terminal thứ nhất và chạy `npm run dev` ở terminal thứ hai; mở địa chỉ Vite in ra. Không cần file `.env` để chạy demo. Dữ liệu local tự tạo riêng, không phải bản sao dữ liệu Railway.

Trước khi làm: `git pull --ff-only`. Sau khi sửa:

```sh
npm test
npm run build
git add .
git commit -m "Describe the change"
git push origin main
```

Máy chủ chính từ 30/09/2026: **https://hqhaircrm.io.vn/workspace**, VPS Vietnix Ubuntu 24.04 LTS. Truy cập `/` chuyển đến đăng nhập; bản demo vẫn ở `/demo`.

Push lên `main` như trên. VPS kiểm tra GitHub mỗi 2 phút bằng `hqhair-deploy.timer`, build Docker và chạy unit tests trước khi thay container. Dữ liệu nằm ngoài image tại `/opt/hqhaircrm/data`. Bản build thành công được kiểm tra `/api/health` đúng mã commit; nếu lỗi khởi động sẽ quay về image trước (không tự ghi đè cơ sở dữ liệu).

Các file vận hành mẫu nằm trong `deploy/`. Bản đang chạy nằm ở `/opt/hqhaircrm/config`; thay đổi các file hạ tầng này cần được người vận hành cài lại, không tự thay cùng mã ứng dụng. SSH được lưu riêng trong `.env` local và không đưa vào Git, Docker hoặc GitHub Secrets. Có thể dùng `python scripts/vps-ssh.py <file-lệnh.sh>` từ máy đã có `.env`, Python paramiko và python-dotenv.

Kiểm tra trên VPS:

```sh
systemctl status hqhair-deploy.timer hqhair-backup.timer
journalctl -u hqhair-deploy.service -n 80 --no-pager
cat /opt/hqhaircrm/state/current
curl -fsS http://127.0.0.1:3000/api/health
```

Dữ liệu được sao lưu trước mỗi lần triển khai và hằng ngày lúc 02:15 UTC, kiểm tra SQLite integrity, giữ 14 ngày. Bản sao hằng ngày nằm trong `/opt/hqhaircrm/backups`, trên cùng VPS. Máy vận hành có tác vụ `HQHair-OutsideVPS-Backup` tải bản sao đã kiểm tra về `data/offsite-backups` lúc 09:30 và khi đăng nhập; cần máy bật, người dùng đăng nhập và có mạng. Chưa có kho backup độc lập luôn hoạt động. Bản chuyển máy chủ ban đầu được giữ thêm trên máy vận hành (`data/migration/railway-final.tar.gz`, gitignored) và volume Railway. Khôi phục dữ liệu cần dừng app và kiểm tra bản sao trước, không chép SQLite đang mở lên nhau.

Railway cũ giữ bản dữ liệu trước chuyển máy chủ và chuyển hướng sang tên miền mới. `deployment-mode.json` trong volume cũ khóa mọi ghi API; không chuyển file này sang VPS. Không xóa volume dự phòng khi chưa quyết định thời gian lưu. Theo dõi phí Railway trong thời gian giữ chuyển hướng/dự phòng.

Không commit cơ sở dữ liệu, cookie phiên, `.env`, khóa SSH hoặc token. Tài khoản và mật khẩu quản trị giữ nguyên sau chuyển máy chủ. Cookie theo tên miền nên cần đăng nhập lại ở địa chỉ mới; dữ liệu demo cũ được giữ trong DB, nhưng trình duyệt ở tên miền mới có cookie demo riêng.

Kiểm tra giao diện (tùy chọn): `npx playwright install chromium`, khởi động server, rồi chạy `node tests/smoke.mjs` và `node tests/design.mjs`.
