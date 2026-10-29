# EduExam Pro - Hệ Thống Thi Trực Tuyến & Khảo Thí THCS

Nền tảng kiểm định chất lượng giáo dục, thi trực tuyến và giám sát chống gian lận đa tầng dành cho học sinh Trung học Cơ sở (Khối 6, 7, 8, 9).

---

## 🚀 Hướng Dẫn Đưa Lên GitHub & Chạy Trực Tiếp (GitHub Pages)

Dự án đã được cấu hình sẵn **GitHub Actions** (`.github/workflows/deploy.yml`) và **Vite Relative Base** (`base: './'`) để tự động đóng gói và xuất bản lên GitHub Pages hoàn toàn miễn phí.

### Bước 1: Khởi tạo và Đẩy mã nguồn lên GitHub

Mở Terminal trong thư mục dự án và chạy các lệnh sau:

```bash
# 1. Khởi tạo Git repository
git init

# 2. Thêm tất cả tệp vào Git
git add .

# 3. Tạo commit đầu tiên
git commit -m "feat: release EduExam Pro"

# 4. Đặt nhánh chính là main
git branch -M main

# 5. Liên kết tới repository GitHub của bạn (thay bằng URL repo của bạn)
git remote add origin https://github.com/<tai-khoan-github>/<ten-repository>.git

# 6. Đẩy code lên GitHub
git push -u origin main
```

---

### Bước 2: Kích hoạt GitHub Pages (Chỉ mất 30 giây)

1. Mở trang repository của bạn trên [GitHub](https://github.com).
2. Nhấn vào tab **Settings** (Cài đặt) ở phía trên.
3. Ở menu bên trái, tìm và chọn mục **Pages**.
4. Tại phần **Build and deployment**:
   - Ở mục **Source**, chuyển từ `Deploy from a branch` sang 👉 **GitHub Actions**.
5. Chờ khoảng 1-2 phút: GitHub Actions sẽ tự động chạy file `.github/workflows/deploy.yml`, build dự án và xuất bản trang web.
6. Khi hoàn tất, link website của bạn sẽ hiện ra ở ngay đầu trang Pages:
   ```text
   https://<tai-khoan-github>.github.io/<ten-repository>/
   ```

---

## 💻 Chạy Dự Án Cục Bộ (Local Machine)

Nếu bạn muốn chạy và phát triển trên máy tính:

1. **Cài đặt thư viện:**
   ```bash
   npm install
   ```

2. **Khởi chạy máy chủ phát triển:**
   ```bash
   npm run dev
   ```

3. Mở trình duyệt truy cập: `http://localhost:3000`

---

## 🗄 Kết Nối Cơ Sở Dữ Liệu Đám Mây (Turso Cloud libSQL)

Dự án đã được tích hợp trực tiếp với **Turso Cloud Database (`libsql://eduexam-db-thaytruongit.aws-ap-southeast-1.turso.io`)** qua cả 2 cơ chế:
- **Trên GitHub Pages (`@libsql/client/web`)**: Trình duyệt kết nối trực tiếp tới Turso Cloud qua giao thức HTTPS/WSS mà không cần máy chủ trung gian. Giáo viên tạo đề, thêm học sinh hay học sinh nộp bài trên link GitHub Pages đều được lưu trữ và đồng bộ tức thời trên cùng một cơ sở dữ liệu đám mây.
- **Trên Server Node.js / Express (`@libsql/client`)**: Tự động khởi tạo bảng (`admin_config`, `exams`, `submissions`, `exam_sessions`) và đồng bộ dữ liệu song song với Turso Cloud.

---

## 🌟 Tính Năng Nổi Bật

- ⏱ **Phòng thi chuẩn khảo thí**: Đồng hồ đếm ngược bảo lưu thời gian thực, hộp thoại xác nhận nộp bài thông minh nhắc nhở câu chưa làm.
- 🛡 **Giám sát chống gian lận**: Phát hiện rời tab / chuyển cửa sổ, tự động trừ điểm vi phạm.
- 📊 **Quản lý & Xuất điểm**: Bảng điểm lớp, xuất file CSV cho giáo viên lưu trữ hồ sơ học tập.
- ☁️ **Đồng bộ Turso Cloud 100%**: Hoạt động xuyên suốt khi đẩy lên GitHub Pages lẫn chạy máy chủ cục bộ.

