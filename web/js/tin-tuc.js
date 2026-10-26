(async function(){
  const { db, thuc, el, MAU } = Pethy, BV = Pethy.baiViet, CO = 9;
  const ds = document.getElementById('bv-ds'), loc = document.getElementById('bv-loc'), them = document.getElementById('bv-them');
  let nhom = '', dem = 0, het = false;
  const COT = 'id,tieu_de,nhom,tom_tat,noi_dung,ngay_dang,tac_gia';
  async function lay(tu){
    if (!thuc) { const a = (MAU.bai_viet || []).filter(x => !nhom || x.nhom === nhom); return { data: a.slice(tu, tu + CO + 1) }; }
    let q = db.from('bai_viet').select(COT).eq('trang_thai','da_dang').order('ngay_dang',{ascending:false});
    if (nhom) q = q.eq('nhom', nhom);
    return q.range(tu, tu + CO);   // lấy dư một bài để biết còn bài nữa không
  }
  async function tai(them_){
    if (!them_) { dem = 0; ds.replaceChildren(el('p',{class:'trang-thai-tai',role:'status'},'Đang tải…')); }
    const r = await lay(dem);
    if (r.error) { ds.replaceChildren(el('p',{class:'loi'},'Không tải được bài viết. Vui lòng tải lại trang.')); them.hidden = true; return; }
    const hang = r.data || []; het = hang.length <= CO;
    const the = hang.slice(0, CO).map(x => Pethy.baiVietThe(x));
    if (!them_) ds.replaceChildren(...(the.length ? the : [el('p',{class:'ghi-chu'},'Chưa có bài viết nào.')])); else ds.append(...the);
    dem += the.length; them.hidden = het;
  }
  const nut = (k, t) => { const b = el('button',{type:'button',class:'bv-chip','aria-pressed':String(nhom === k)}, t);
    b.addEventListener('click', () => { nhom = k; [...loc.children].forEach(c => c.setAttribute('aria-pressed', String(c === b))); tai(false); }); return b; };
  loc.replaceChildren(nut('', 'Tất cả'), ...Object.entries(BV.NHOM).map(([k, v]) => nut(k, v)));
  them.addEventListener('click', async () => { them.disabled = true; await tai(true); them.disabled = false; });
  await tai(false);
})();
