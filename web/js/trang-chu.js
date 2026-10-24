(async function(){
  const { db, thuc, el, tien, MAU } = Pethy;
  const dv = document.getElementById('ds-dich-vu'), bs = document.getElementById('ds-bac-si');

  async function lay(){
    if (!thuc) return { dich_vu: MAU.dich_vu, bac_si: MAU.bac_si, cau_hinh: MAU.cau_hinh, danh_gia: MAU.danh_gia, mau: true };
    const [a, b, c, e] = await Promise.all([
      db.from('dich_vu').select('id,ten,loai,gia,mo_ta').eq('dang_ap_dung', true).order('loai').order('ten'),
      db.from('bac_si_cong_khai').select('id,ho_ten,chuyen_mon,gioi_thieu,anh_dai_dien,lich_lam_viec,diem_tb,so_danh_gia').order('ho_ten'),
      db.from('cau_hinh').select('khoa,gia_tri').eq('cong_khai', true),
      db.from('danh_gia_cong_khai').select('id,so_sao,nhan_xet,ten_hien_thi,ngay,tong,diem_tb').not('nhan_xet','is',null).order('ngay',{ascending:false}).limit(6)
    ]);
    if (a.error || b.error || c.error) throw new Error('Không tải được dữ liệu');
    // Lỗi khi tải đánh giá (ví dụ chưa cập nhật cơ sở dữ liệu) không làm hỏng cả trang chủ.
    return { dich_vu: a.data, bac_si: b.data, cau_hinh: Object.fromEntries(c.data.map(r => [r.khoa, r.gia_tri])), danh_gia: e.error ? [] : e.data };
  }

  try {
    const d = await lay();
    // Chọn tranh minh họa theo tên dịch vụ (không dấu), dự phòng theo loại; dịch vụ lạ dùng tranh chung.
    const bo = t => ' ' + String(t || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd') + ' ';
    const TRANH = [[/ (tai kham|kiem tra lai|hen kham lai)/, 'tai-kham'], [/ (tiem|vaccine|vac xin|phong dai|mui )/, 'tiem'],
      [/ (tam|spa|ve sinh|goi dau)/, 'tam'], [/ (cat |tia |cao |cat-tia|grooming|lam dep|chai long)/, 'cat-tia'],
      [/ (xet nghiem|sieu am|x quang|x-quang|noi soi|chan doan hinh anh|mau )/, 'xet-nghiem'], [/ (phau thuat|triet san|tieu phau|dieu tri|cap cuu|bang bo|khau)/, 'phau-thuat'],
      [/ (rang|nha khoa|lay cao)/, 'nha-khoa'], [/ (luu chuong|noi tru|trong giu|gui thu|khach san)/, 'luu-chuong'], [/ kham/, 'kham']];
    const tranh = x => { const t = bo(x.ten), g = TRANH.find(r => r[0].test(t)); return g ? g[1] : (String(x.loai || '').toLowerCase() === 'tiem' ? 'tiem' : String(x.loai || '').toLowerCase() === 'kham' ? 'kham' : 'chung'); };
    const MOTA = { kham:'Bác sĩ khám lâm sàng, tư vấn hướng điều trị và dặn dò cách chăm sóc bé tại nhà.',
                   tiem:'Tiêm vaccine phòng bệnh đúng lịch. Mũi tiêm được ghi vào sổ tiêm điện tử và web nhắc bạn mũi tiếp theo.' };
    const THU = ['', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy', 'Chủ nhật'];
    const lichTheoThu = l => { const m = new Map(); (l || []).forEach(c => { if (!m.has(c.thu)) m.set(c.thu, []); m.get(c.thu).push(c.tu + ' đến ' + c.den); }); return [...m].sort((a, b) => a[0] - b[0]); };
    const chiTiet = x => { const l = lichTheoThu(x.lich_lam_viec);
      return el('div',{class:'bs-ct'}, el('h3',{}, 'Lịch làm việc'),
        l.length ? el('ul',{class:'bs-lich'}, l.map(([t, g]) => el('li',{}, el('b',{}, THU[t]), g.join(', '))))
                 : el('p',{class:'cm'}, 'Chưa có lịch cố định. Giờ trống hiện ở bước chọn giờ khi đặt lịch.')); };
    const MAUNEN = ['var(--hong)','var(--bac)','var(--kem2)'];
    dv.replaceChildren(el('div',{class:'luoi-the'}, ...(d.dich_vu.length ? d.dich_vu : [el('p',{class:'ghi-chu'},'Chưa có dịch vụ.')]).map((x,i) =>
      x.ten ? el('div',{class:'the-dv'},
        el('img',{class:'anh-dv',src:'/img/dv/'+tranh(x)+'.svg',alt:'',width:320,height:180,loading:'lazy'}),
        el('div',{class:'ten'}, x.ten),
        el('div',{class:'mo-ta-dv'}, x.mo_ta || MOTA[String(x.loai||'').toLowerCase()] || ''),
        el('div',{class:'gia'}, tien(x.gia)),
        el('a',{class:'nut chinh',href:'/dang-nhap.html?dang-ky=1','aria-label':'Đặt lịch ngay: ' + x.ten}, 'Đặt lịch ngay')) : x)));
    bs.replaceChildren(el('div',{class:'luoi-the'}, ...(d.bac_si.length ? d.bac_si : [el('p',{class:'ghi-chu'},'Chưa có bác sĩ.')]).map((x,i) =>
      x.ho_ten ? el('div',{class:'the-bs'},
        x.anh_dai_dien ? el('img',{class:'ava',src:x.anh_dai_dien,alt:'Ảnh bác sĩ '+x.ho_ten,loading:'lazy'})
          : el('div',{class:'ava','aria-hidden':'true',style:'background:'+MAUNEN[i%3]}, x.ho_ten.trim().split(/\s+/).pop().charAt(0).toUpperCase()),
        el('div',{class:'ten'}, 'Bs. ' + x.ho_ten),
        x.so_danh_gia ? el('div',{class:'diem-bs'}, Pethy.sao(x.diem_tb), el('span',{}, Number(x.diem_tb).toFixed(1) + ' (' + x.so_danh_gia + ' đánh giá)')) : null,
        x.chuyen_mon ? el('div',{class:'cm'}, x.chuyen_mon) : null,
        el('div',{class:'cm gt-ngan',id:'gt-' + i}, x.gioi_thieu || 'Bác sĩ chưa cập nhật phần giới thiệu.'),
        chiTiet(x),
        el('div',{class:'nut-bs'},
          (() => { const b = el('button',{class:'nut trang',type:'button','aria-expanded':'false','aria-label':'Xem thông tin bác sĩ ' + x.ho_ten}, 'Xem thông tin');
            b.addEventListener('click', () => { const c = b.closest('.the-bs'), mo = c.classList.toggle('mo'); b.setAttribute('aria-expanded', String(mo)); b.textContent = mo ? 'Thu gọn' : 'Xem thông tin'; });
            return b; })(),
          el('a',{class:'nut chinh',href:'/dang-nhap.html?dang-ky=1'}, 'Đặt lịch'))) : x)));
    if (d.danh_gia && d.danh_gia.length) {
      const g = d.danh_gia[0];
      document.getElementById('dg-tong').replaceChildren(Pethy.sao(g.diem_tb), ' ' + Number(g.diem_tb).toFixed(1) + ' trên 5, từ ' + g.tong + ' đánh giá của chủ nuôi sau khi khám.');
      document.getElementById('ds-danh-gia').replaceChildren(...d.danh_gia.map(x => el('figure',{class:'the-dg'},
        Pethy.sao(x.so_sao), el('blockquote',{}, x.nhan_xet),
        el('figcaption',{}, x.ten_hien_thi + ', ' + new Date(x.ngay).toLocaleDateString('vi-VN',{month:'2-digit',year:'numeric',timeZone:'Asia/Ho_Chi_Minh'})))));
      document.getElementById('danh-gia').hidden = false;
    }
    const n = d.cau_hinh.dat_truoc_toi_da_ngay;
    if (n) document.getElementById('dat-truoc').textContent = 'Nhận lịch hẹn trước tối đa ' + n + ' ngày.';
    if (d.cau_hinh.che_do_bao_tri === 'true') {
      document.getElementById('bao-tri-nd').textContent = d.cau_hinh.thong_bao_bao_tri || 'Hệ thống đang bảo trì.';
      document.getElementById('bao-tri').hidden = false;
    }
  } catch (e) {
    const loi = el('p',{class:'loi'}, 'Không tải được dữ liệu. Vui lòng tải lại trang.');
    dv.replaceChildren(loi.cloneNode(true)); bs.replaceChildren(loi);
  }
})();
