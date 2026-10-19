Pethy.bacSi = {
  MUC: [{ten:'Lịch khám của tôi',href:'/bac-si/'}],
  TT: {cho_xac_nhan:'Chờ xác nhận',da_xac_nhan:'Đã xác nhận',da_hoan_thanh:'Đã hoàn thành',da_huy:'Đã hủy',khong_den:'Không đến'},
  homNay: () => new Date().toLocaleDateString('en-CA',{timeZone:'Asia/Ho_Chi_Minh'}),
  async uid(){ const r = await Pethy.db.auth.getUser(); return r.data && r.data.user && r.data.user.id; }
};
