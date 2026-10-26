(async function(){
  const { db, thuc, el, MAU } = Pethy, BV = Pethy.baiViet, goc = document.getElementById('bv-nd');
  const id = new URLSearchParams(location.search).get('id');
  const khongCo = () => { document.title = 'Không tìm thấy bài viết - Pethy'; goc.replaceChildren(el('h1',{},'Không tìm thấy bài viết'), el('p',{class:'ghi-chu'},'Bài viết không tồn tại hoặc đã được gỡ.'), el('a',{class:'nut chinh',href:'/tin-tuc.html'},'Xem các bài khác')); };
  if (!id) return khongCo();
  let x = null;
  if (!thuc) x = (MAU.bai_viet || []).find(b => b.id === id) || null;
  else { const r = await db.from('bai_viet').select('id,tieu_de,nhom,tom_tat,noi_dung,tac_gia,trang_thai,ngay_dang').eq('id', id).maybeSingle();
    if (r.error) { goc.replaceChildren(el('p',{class:'loi'},'Không tải được bài viết. Vui lòng tải lại trang.')); return; } x = r.data; }
  if (!x) return khongCo();
  document.title = x.tieu_de + ' - Pethy';
  const mota = document.querySelector('meta[name=description]'); if (mota) mota.setAttribute('content', BV.trich(x, 160));
  const nhap = x.trang_thai === 'nhap';
  goc.replaceChildren(...[
    el('a',{class:'bv-ve',href:'/tin-tuc.html'}, '← Tất cả bài viết'),
    nhap ? el('p',{class:'bv-nhap',role:'status'},'Bài nháp: chỉ quản trị viên xem được.') : null,
    el('div',{class:'bv-nhom'}, BV.NHOM[x.nhom] || ''),
    el('h1',{}, x.tieu_de),
    el('div',{class:'bv-meta'}, (x.tac_gia || BV.TAC_GIA) + (x.ngay_dang ? ' · ' + BV.ngay(x.ngay_dang) : '')),
    el('div',{class:'bv-nd'}, ...BV.noiDung(x.noi_dung)),
    el('div',{class:'bv-cta'}, el('div',{}, el('b',{},'Bé nhà bạn cần được khám?'), el('div',{class:'ghi-chu'},'Đặt lịch với bác sĩ của Pethy trong một phút.')), el('a',{class:'nut chinh',href:'/dang-nhap.html?dang-ky=1'},'Đặt lịch khám'))].filter(Boolean));
})();
