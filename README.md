# HQ Hair — Demo Sale

Bản demo desktop cho buổi giới thiệu HQ Hair, dựa trên tài liệu Sale và trao đổi ngày 28/09/2026. Không phải bản nghiệm thu hệ thống 3 bộ phận.

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
- Desktop tối thiểu 1120px; chưa tối ưu điện thoại theo phạm vi đã chốt.

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

Railway được kết nối trực tiếp với repo `xandrosworld/Hq-hair`, nhánh `main`, service `sale-web` trong project `hq-hair-sale-demo`. Push lên `main` sẽ kích hoạt build/deploy Dockerfile ở thư mục gốc. Không cần Railway CLI trên máy mới cho việc deploy thông thường.

Dashboard: https://railway.com/project/74bba706-31fa-4b6f-ad2a-4787f48ffed9

Nếu cần quản trị qua CLI, cài Railway CLI, chạy `railway login`, sau đó:

```sh
railway link --project 74bba706-31fa-4b6f-ad2a-4787f48ffed9 --environment production --service sale-web
railway service status --service sale-web
```

Giữ volume mount `/data` và biến `PORT=3000`; Dockerfile đặt `DATA_DIR=/data`. Không commit cơ sở dữ liệu, cookie phiên, `.env` hay token. Trình duyệt trên máy khác có phiên demo riêng; mã nguồn được đồng bộ qua GitHub.

Kiểm tra giao diện (tùy chọn): `npx playwright install chromium`, khởi động server, rồi chạy `node tests/smoke.mjs` và `node tests/design.mjs`.
