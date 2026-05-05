# Hệ thống Quản lý Công nợ (Debt Management System)

Một ứng dụng quản lý công nợ hiện đại, bảo mật và trực quan dành cho cá nhân hoặc tổ chức nhỏ. Hệ thống cung cấp cái nhìn toàn diện về tình hình tài chính, giúp theo dõi các khoản nợ, thanh toán và hoạt động của người dùng một cách hiệu quả.

## 🚀 Tính năng chính

### 1. Bảng điều khiển (Dashboard) trực quan
- **Thống kê hoạt động:** Biểu đồ cột chi tiết hiển thị các hoạt động (Đăng ký, Tạo nợ, Thanh toán) trong 30 ngày qua.
- **Phân tích dữ liệu:** Biểu đồ tròn phân tích tỷ lệ tạo nợ theo ngày và tỷ lệ thu hồi toàn hệ thống (dành cho Admin).
- **Thẻ tóm tắt:** Hiển thị nhanh tổng nợ, nợ đã trả và số dư còn lại với các chỉ số tăng trưởng.

### 2. Quản lý Công nợ
- **Tạo nợ mới:** Giao diện đơn giản để thêm khoản nợ cho con nợ hiện có hoặc mới.
- **Theo dõi trạng thái:** Phân loại khoản nợ theo "Đã trả" hoặc "Chưa trả".
- **Lịch sử thanh toán:** Ghi lại chi tiết từng lần thanh toán.

### 3. Phân quyền Người dùng
- **Admin:** Quyền truy cập toàn hệ thống, xem số liệu tổng quát của tất cả người dùng, quản lý mọi khoản nợ.
- **User:** Quản lý danh sách con nợ và khoản nợ của riêng mình.

### 4. Giao diện & Trải nghiệm
- **Thiết kế hiện đại:** Sử dụng Tailwind CSS với phong cách tối giản, tinh tế.
- **Hiệu ứng mượt mà:** Chuyển động và chuyển trang được tối ưu bằng `motion`.
- **Chế độ xem:** Hỗ trợ tốt trên cả máy tính và thiết bị di động (Responsive).

## 🛠 Công nghệ sử dụng

- **Frontend:** React 18, Vite
- **Styling:** Tailwind CSS
- **Biểu đồ:** Recharts
- **Icons:** Lucide React
- **Animations:** Framer Motion (motion)
- **Xử lý sự kiện:** TypeScript

## 📦 Cài đặt và Chạy thử

1. Cài đặt dependencies:
   ```bash
   npm install
   ```

2. Chạy môi trường phát triển:
   ```bash
   npm run dev
   ```

3. Xây dựng bản sản xuất:
   ```bash
   npm run build
   ```

---
Dự án được xây dựng với tiêu chuẩn mã nguồn sạch, dễ dàng bảo trì và mở rộng.
