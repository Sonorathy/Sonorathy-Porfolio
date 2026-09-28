# Admin — hướng dẫn nhanh

## Mở admin

```bash
cd ~/sonorathy-portfolio
npm run admin
```

Mở trình duyệt vào **http://localhost:4321**. Tắt admin bằng `Ctrl+C` trong Terminal.
(Cần Node.js 18 trở lên. Kiểm tra bằng `node -v`; nếu chưa có thì cài ở https://nodejs.org.)

## Làm được gì

- **Danh sách project** (cột trái): kéo để đổi thứ tự trên trang chủ, bấm 👁 để ẩn/hiện, bấm **+ Thêm** để tạo project mới. Project mới luôn ở chế độ **ẩn** cho tới khi bạn bật 👁.
- **Thông tin chung**: tên, slug (tên file `project-<slug>.html`), nhóm năng lực, tagline, nhãn nhỏ, SEO, có hiện trong carousel hay không.
- **Thẻ ở trang chủ**: ảnh cover, tag, role, highlights, đoạn Problem (có bộ đếm ký tự, nên 150–260).
- **Nội dung case study**: các khối Đoạn văn / Chips / Số liệu / Bảng — thêm, sửa, đổi thứ tự, xoá.
- **Ảnh / video**: kéo thả nhiều file cùng lúc. Ảnh lớn hơn 2400px tự được thu nhỏ thành JPG trước khi lưu vào `assets/work/<slug>/`. Mỗi ảnh có chú thích, alt, tuỳ chọn “Khung mobile”.
- **Mật khẩu (NDA)**: đặt / đổi / gỡ mật khẩu cho từng project (giống GAMBLE).
- **Tiếng Việt (EN / VI)**: công tắc ở đầu trình soạn project. Chế độ **VI** chỉ hiện các ô cần dịch, mỗi ô có bản tiếng Anh ở trên để đối chiếu; ô để trống thì web hiện tiếng Anh. Thêm/bớt dòng, đổi thứ tự, ảnh và cài đặt vẫn làm ở chế độ **EN** (dùng chung cho cả hai ngôn ngữ). Nhãn *Tiếng Việt: x/y* cho biết đã dịch bao nhiêu ô. Sửa chữ tiếng Anh ở ô đã có bản dịch thì admin nhắc cập nhật bên VI. Preview tự hiện đúng ngôn ngữ đang sửa.
- **Preview** (cột phải): xem ngay trang chủ hoặc trang project, chuyển Desktop / Mobile.

## Lưu và publish

1. **Lưu & build** (hoặc `⌘S`): ghi `content/projects.json` và tạo lại các trang HTML. Preview tự tải lại.
2. **Publish lên web**: xem danh sách file thay đổi → ghi chú → **Commit & Push**. Admin chạy `git add -A`, `git commit`, `git pull --rebase`, `git push` bằng git + SSH key trên máy bạn. GitHub Pages cập nhật sau khoảng 1 phút.

## Lưu ý

- Các file `project-*.html` và phần thẻ Work / carousel trong `index.html` giờ được **tạo tự động** từ `content/projects.json`. Sửa tay trong file HTML sẽ bị ghi đè ở lần Lưu tiếp theo — hãy sửa trong admin.
- Các phần khác của trang chủ (hero, About, Services, FAQ…) vẫn sửa trong `index.html` như trước.
- Mật khẩu project chỉ là lớp che phía trình duyệt: đủ cho người xem bình thường, không phải bảo mật tuyệt đối.
- Admin chỉ chạy trên máy bạn (`127.0.0.1`), người ngoài không truy cập được.
