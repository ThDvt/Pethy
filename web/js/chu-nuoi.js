// Menu và hàm dùng chung của khu chủ nuôi.
Pethy.chuNuoi = {
  MUC: [{ten:'Tổng quan',href:'/chu-nuoi/'},{ten:'Đặt lịch mới',href:'/chu-nuoi/dat-lich.html'},{ten:'Thú cưng',href:'/chu-nuoi/thu-cung.html'},{ten:'Hóa đơn',href:'/chu-nuoi/hoa-don.html'}],
  ngay: iso => new Date(iso).toLocaleDateString('vi-VN',{weekday:'long',day:'2-digit',month:'2-digit',timeZone:'Asia/Ho_Chi_Minh'}),
  TRANG_THAI: {cho_xac_nhan:'Chờ xác nhận',da_xac_nhan:'Đã xác nhận',da_hoan_thanh:'Đã hoàn thành',da_huy:'Đã hủy',khong_den:'Không đến'}
};
