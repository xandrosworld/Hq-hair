# HQ Hair — thiết kế demo Sale

## Hướng thiết kế

Không gian làm việc cho ngành tóc xuất khẩu: navy, nền sáng ấm, champagne, xanh nhẹ. Font Be Vietnam Pro tự lưu trên máy chủ, icon Phosphor nhất quán. Ảnh sản phẩm tạo riêng chỉ dùng để minh họa thương hiệu, không đại diện ảnh sản phẩm thật của HQ Hair.

Toàn bộ các màn được đồng bộ: tổng quan, đơn hàng, khách hàng, tạo đơn hai bước, thanh toán, chi tiết/timeline, chat và invoice. Thanh tiến độ trong bảng thể hiện giai đoạn hiện tại từ dữ liệu đơn. Biểu đồ và KPI tính từ bản ghi demo, không dùng tỷ lệ tăng trưởng tự đặt.

Tìm kiếm nhanh bằng Ctrl+K/Cmd+K; thông báo dựa trên đơn cần chú ý. Các cửa sổ giữ focus bàn phím, đóng bằng Escape và trả lại focus. Hiệu ứng nhẹ có hỗ trợ giảm chuyển động. Mục tiêu là trải nghiệm desktop, theo phạm vi đã thống nhất.

## Tài sản hình ảnh

- Công cụ: built-in `image_gen`, không dùng CLI/API fallback.
- Ảnh gốc: `public/assets/hair-editorial.png`.
- Bản dùng trên web: `public/assets/hair-editorial.webp`, chuyển định dạng/nén từ ảnh gốc, giữ nguyên nội dung.
- Các ảnh kiểm tra giao diện: `screenshots/refined/`.
- Icon giao diện: thư viện `@phosphor-icons/react`, không phải ảnh raster.

### Prompt đã sử dụng

Use case: product-mockup. Create one exquisite photorealistic luxury hair-extension product still life for the right half of a professional HQ Hair sales dashboard welcome banner. Horizontal wide image, 1536x1024 if possible. Three silky human-hair extension wefts, deep natural black, warm brunette and champagne blonde, cascading in gentle sculptural S curves over pale warm ivory limestone display blocks. A small matte ivory unbranded presentation box near the back, subtle champagne ribbon. Editorial beauty campaign photography, premium boutique salon supply aesthetic, meticulous real individual strands and soft luminous highlights, diffuse morning studio light from upper left, sophisticated warm off-white / champagne monochrome backdrop. Products occupy center-right, left 30 percent softly empty ivory with no object there so it can fade into a UI. Tight art-directed closeup, nothing busy. No humans, no face, no hands, no text, no typography, no watermark, no logos, no flowers. This is a background photograph asset only, not a screenshot or mockup of the interface.

## Kiểm tra

`node tests/design.mjs`: bộ lọc kỳ, tương tác biểu đồ, Ctrl+K, điều hướng từ kết quả, thông báo, các màn chính và không tràn ngang ở 1280/1440/1920px. `node tests/smoke.mjs`: luồng tạo khách → lưu nháp → gửi duyệt, chứng từ, chat, invoice và CSV. `npm test`: công thức tài chính và dữ liệu mẫu.

Link: https://sale-web-production-4b69.up.railway.app
