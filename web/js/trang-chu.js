(async function(){
  const { db, thuc, el, tien, MAU } = Pethy;
  const dv = document.getElementById('ds-dich-vu'), bs = document.getElementById('ds-bac-si');

  async function lay(){
    if (!thuc) return { dich_vu: MAU.dich_vu, bac_si: MAU.bac_si, cau_hinh: MAU.cau_hinh, mau: true };
    const [a, b, c] = await Promise.all([
      db.from('dich_vu').select('id,ten,loai,gia').eq('dang_ap_dung', true).order('loai').order('ten'),
      db.from('bac_si_cong_khai').select('id,ho_ten,chuyen_mon,gioi_thieu,anh_dai_dien').order('ho_ten'),
      db.from('cau_hinh').select('khoa,gia_tri').eq('cong_khai', true)
    ]);
    if (a.error || b.error || c.error) throw new Error('Không tải được dữ liệu');
    return { dich_vu: a.data, bac_si: b.data, cau_hinh: Object.fromEntries(c.data.map(r => [r.khoa, r.gia_tri])) };
  }

  try {
    const d = await lay();
    dv.replaceChildren(...(d.dich_vu.length ? d.dich_vu : [el('p',{class:'ghi-chu'},'Chưa có dịch vụ.')]).map(x =>
      x.ten ? el('div',{class:'dong'},
        el('div',{style:'flex:1 1 320px'}, el('div',{style:'font-size:22px;font-weight:700'}, x.ten)),
        el('div',{class:'so',style:'font-size:20px;font-weight:500'}, tien(x.gia))) : x));
    bs.replaceChildren(...(d.bac_si.length ? d.bac_si : [el('p',{class:'ghi-chu'},'Chưa có bác sĩ.')]).map(x =>
      x.ho_ten ? el('div',{class:'bs'},
        x.anh_dai_dien ? el('img',{class:'anh',src:x.anh_dai_dien,alt:'Ảnh bác sĩ '+x.ho_ten,loading:'lazy'}) : el('div',{class:'anh','aria-hidden':'true'},'ảnh'),
        el('div',{style:'flex:1 1 280px'},
          el('div',{style:'font-size:22px;font-weight:800;letter-spacing:-.02em'}, 'Bs. ' + x.ho_ten),
          x.chuyen_mon ? el('div',{class:'ghi-chu',style:'margin-top:4px'}, x.chuyen_mon) : null,
          x.gioi_thieu ? el('p',{style:'margin:10px 0 0;max-width:460px'}, x.gioi_thieu) : null),
        el('a',{href:'/dang-nhap.html?dang-ky=1',style:'font-weight:700'}, 'Đặt lịch')) : x));
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
