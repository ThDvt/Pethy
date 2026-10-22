(async function(){
  const { db, el } = Pethy, A = Pethy.admin, $ = A.$;
  if (!await A.boot('/admin/lich-lam-viec.html')) return;
  const THU = {1:'Thứ hai',2:'Thứ ba',3:'Thứ tư',4:'Thứ năm',5:'Thứ sáu',6:'Thứ bảy',7:'Chủ nhật'};
  const gio = s => String(s).slice(0, 5);
  async function tai(){
    const [bs, ca] = await Promise.all([db.from('tai_khoan').select('id,ho_ten').eq('vai_tro','bac_si').eq('trang_thai','hoat_dong').order('ho_ten'),
      db.from('lich_lam_viec').select('id,bac_si_id,thu_trong_tuan,gio_bat_dau,gio_ket_thuc').order('thu_trong_tuan').order('gio_bat_dau')]);
    if (bs.error || ca.error) return A.baoLoi('Không tải được lịch làm việc.');
    $('vung').replaceChildren(...((bs.data || []).length ? bs.data.map(b => {
      const cs = (ca.data || []).filter(c => c.bac_si_id === b.id);
      return el('section',{class:'muc'}, el('h2',{style:'display:flex;justify-content:space-between;align-items:baseline'}, el('span',{style:'color:var(--muc);font-size:16px'}, b.ho_ten),
        el('button',{class:'lien-ket',type:'button',onclick:() => them(b)}, 'Thêm ca')),
        ...(cs.length ? cs.map(c => el('div',{class:'hang'}, el('div',{class:'ten',style:'font-weight:500'}, THU[c.thu_trong_tuan]), el('div',{class:'so'}, gio(c.gio_bat_dau) + ' đến ' + gio(c.gio_ket_thuc)),
          el('button',{class:'lien-ket',type:'button',onclick:async () => { if (!await Pethy.xacNhan('Xóa ca này?', 'Ca làm việc sẽ bị xóa khỏi lịch.', 'Xóa ca')) return; const { error } = await db.from('lich_lam_viec').delete().eq('id', c.id); A.baoLoi(error ? 'Không xóa được ca.' : ''); await tai(); }}, 'Xóa'))) : [A.rong('Chưa có ca nào, bác sĩ này chưa nhận được lịch đặt.')]));
    }) : [A.rong('Chưa có tài khoản bác sĩ nào. Hãy phân vai bác sĩ ở trang Tài khoản.')]));
  }
  function them(b){
    const thu = el('select',{id:'c-t'}, Object.entries(THU).map(([k, v]) => el('option',{value:k}, v))), tu = el('input',{id:'c-a',type:'time',value:'08:00'}), den = el('input',{id:'c-b',type:'time',value:'12:00'});
    A.hop('Thêm ca làm việc', b.ho_ten, [A.o('c-t','Thứ',thu), A.o('c-a','Từ giờ',tu), A.o('c-b','Đến giờ',den)], 'Thêm', async () => {
      if (!tu.value || !den.value || den.value <= tu.value) return 'Giờ kết thúc phải sau giờ bắt đầu.';
      const { error } = await db.from('lich_lam_viec').insert({ bac_si_id: b.id, thu_trong_tuan: Number(thu.value), gio_bat_dau: tu.value, gio_ket_thuc: den.value });
      return error ? (error.code === '23505' ? 'Ca bắt đầu giờ này đã tồn tại.' : 'Không thêm được ca.') : null; }, tai);
  }
  await tai();
})();
