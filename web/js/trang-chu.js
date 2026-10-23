(async function(){
  const { db, thuc, el, tien, MAU } = Pethy;
  const dv = document.getElementById('ds-dich-vu'), bs = document.getElementById('ds-bac-si');

  async function lay(){
    if (!thuc) return { dich_vu: MAU.dich_vu, bac_si: MAU.bac_si, cau_hinh: MAU.cau_hinh, mau: true };
    const [a, b, c] = await Promise.all([
      db.from('dich_vu').select('id,ten,loai,gia,mo_ta').eq('dang_ap_dung', true).order('loai').order('ten'),
      db.from('bac_si_cong_khai').select('id,ho_ten,chuyen_mon,gioi_thieu,anh_dai_dien,lich_lam_viec').order('ho_ten'),
      db.from('cau_hinh').select('khoa,gia_tri').eq('cong_khai', true)
    ]);
    if (a.error || b.error || c.error) throw new Error('Không tải được dữ liệu');
    return { dich_vu: a.data, bac_si: b.data, cau_hinh: Object.fromEntries(c.data.map(r => [r.khoa, r.gia_tri])) };
  }

  try {
    const d = await lay();
    const ICON = { kham:'icon-kham', tiem:'icon-tiem' };
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
        el('img',{src:'/img/'+(ICON[String(x.loai||'').toLowerCase()]||'icon-chung')+'.svg',alt:'',width:56,height:56}),
        el('div',{class:'ten'}, x.ten),
        el('div',{class:'mo-ta-dv'}, x.mo_ta || MOTA[String(x.loai||'').toLowerCase()] || ''),
        el('div',{class:'gia'}, tien(x.gia)),
        el('a',{class:'nut chinh',href:'/dang-nhap.html?dang-ky=1','aria-label':'Đặt lịch ngay: ' + x.ten}, 'Đặt lịch ngay')) : x)));
    bs.replaceChildren(el('div',{class:'luoi-the'}, ...(d.bac_si.length ? d.bac_si : [el('p',{class:'ghi-chu'},'Chưa có bác sĩ.')]).map((x,i) =>
      x.ho_ten ? el('div',{class:'the-bs'},
        x.anh_dai_dien ? el('img',{class:'ava',src:x.anh_dai_dien,alt:'Ảnh bác sĩ '+x.ho_ten,loading:'lazy'})
          : el('div',{class:'ava','aria-hidden':'true',style:'background:'+MAUNEN[i%3]}, x.ho_ten.trim().split(/\s+/).pop().charAt(0).toUpperCase()),
        el('div',{class:'ten'}, 'Bs. ' + x.ho_ten),
        x.chuyen_mon ? el('div',{class:'cm'}, x.chuyen_mon) : null,
        el('div',{class:'cm gt-ngan',id:'gt-' + i}, x.gioi_thieu || 'Bác sĩ chưa cập nhật phần giới thiệu.'),
        chiTiet(x),
        el('div',{class:'nut-bs'},
          (() => { const b = el('button',{class:'nut trang',type:'button','aria-expanded':'false','aria-label':'Xem thông tin bác sĩ ' + x.ho_ten}, 'Xem thông tin');
            b.addEventListener('click', () => { const c = b.closest('.the-bs'), mo = c.classList.toggle('mo'); b.setAttribute('aria-expanded', String(mo)); b.textContent = mo ? 'Thu gọn' : 'Xem thông tin'; });
            return b; })(),
          el('a',{class:'nut chinh',href:'/dang-nhap.html?dang-ky=1'}, 'Đặt lịch'))) : x)));
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
