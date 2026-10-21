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
    const ICON = { kham:'icon-kham', tiem:'icon-tiem' };
    const MAUNEN = ['var(--hong)','var(--bac)','var(--kem2)'];
    dv.replaceChildren(el('div',{class:'luoi-the'}, ...(d.dich_vu.length ? d.dich_vu : [el('p',{class:'ghi-chu'},'Chưa có dịch vụ.')]).map((x,i) =>
      x.ten ? el('div',{class:'the-dv'},
        el('img',{src:'/img/'+(ICON[String(x.loai||'').toLowerCase()]||'icon-chung')+'.svg',alt:'',width:56,height:56}),
        el('div',{class:'ten'}, x.ten),
        el('div',{class:'gia'}, tien(x.gia))) : x)));
    bs.replaceChildren(el('div',{class:'luoi-the'}, ...(d.bac_si.length ? d.bac_si : [el('p',{class:'ghi-chu'},'Chưa có bác sĩ.')]).map((x,i) =>
      x.ho_ten ? el('div',{class:'the-bs'},
        x.anh_dai_dien ? el('img',{class:'ava',src:x.anh_dai_dien,alt:'Ảnh bác sĩ '+x.ho_ten,loading:'lazy'})
          : el('div',{class:'ava','aria-hidden':'true',style:'background:'+MAUNEN[i%3]}, x.ho_ten.trim().split(/\s+/).pop().charAt(0).toUpperCase()),
        el('div',{class:'ten'}, 'Bs. ' + x.ho_ten),
        x.chuyen_mon ? el('div',{class:'cm'}, x.chuyen_mon) : null,
        x.gioi_thieu ? el('div',{class:'cm'}, x.gioi_thieu) : null,
        el('a',{class:'nut trang',href:'/dang-nhap.html?dang-ky=1'}, 'Đặt lịch với bác sĩ')) : x)));
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
