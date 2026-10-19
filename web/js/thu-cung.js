(async function(){
  const { db, el } = Pethy, { loiRpc, khoiDong } = Pethy.khu, { MUC } = Pethy.chuNuoi;
  const $ = id => document.getElementById(id);
  if (!await khoiDong('chu_nuoi', 'Chủ nuôi', MUC, '/chu-nuoi/thu-cung.html')) return;

  const cn = await db.from('chu_nuoi').select('id').limit(1);
  const chuId = cn.data && cn.data[0] && cn.data[0].id;
  if (!chuId) { $('ds').replaceChildren(el('p',{class:'loi'},'Tài khoản chưa có hồ sơ chủ nuôi. Vui lòng liên hệ phòng khám.')); $('form').hidden = true; return; }

  async function tai(){
    const r = await db.from('thu_cung').select('id,ten,loai,ngay_sinh').order('ten');
    if (r.error) { $('ds').replaceChildren(el('p',{class:'loi'},'Không tải được danh sách.')); return; }
    if (!r.data.length) { $('ds').replaceChildren(el('p',{class:'ghi-chu'},'Bạn chưa thêm thú cưng nào.')); return; }
    $('ds').replaceChildren(...r.data.map(t => el('div',{class:'dong'},
      el('div',{style:'font-size:20px;font-weight:700'}, t.ten),
      el('div',{class:'ghi-chu'}, t.loai + (t.ngay_sinh ? ', sinh ngày ' + t.ngay_sinh.split('-').reverse().join('/') : '')))));
  }
  $('form').addEventListener('submit', async ev => {
    ev.preventDefault(); $('loi').hidden = true;
    const ten = $('ten').value.trim(), loai = $('loai').value.trim(), ns = $('ngay-sinh').value || null;
    if (!ten || !loai) { $('loi').textContent = 'Vui lòng nhập tên và loài.'; $('loi').hidden = false; return; }
    if (ns && ns > new Date().toISOString().slice(0,10)) { $('loi').textContent = 'Ngày sinh không thể ở tương lai.'; $('loi').hidden = false; return; }
    $('gui').disabled = true;
    const { error } = await db.from('thu_cung').insert({ chu_nuoi_id: chuId, ten, loai, ngay_sinh: ns });
    $('gui').disabled = false;
    if (error) { $('loi').textContent = 'Không thêm được thú cưng. Vui lòng thử lại.'; $('loi').hidden = false; return; }
    $('form').reset(); await tai();
  });
  await tai();
})();
