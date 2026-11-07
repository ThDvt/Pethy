(async function(){
  const { db, el } = Pethy, A = Pethy.admin, $ = A.$;
  if (!await A.boot('/admin/lich-lam-viec.html')) return;
  const THU = {1:'Thứ hai',2:'Thứ ba',3:'Thứ tư',4:'Thứ năm',5:'Thứ sáu',6:'Thứ bảy',7:'Chủ nhật'};
  const NGAN = {1:'T2',2:'T3',3:'T4',4:'T5',5:'T6',6:'T7',7:'CN'};
  const gio = s => String(s).slice(0, 5);
  let dsCa = [];
  async function tai(){
    const [bs, ca] = await Promise.all([db.from('tai_khoan').select('id,ho_ten').eq('vai_tro','bac_si').eq('trang_thai','hoat_dong').order('ho_ten'),
      db.from('lich_lam_viec').select('id,bac_si_id,thu_trong_tuan,gio_bat_dau,gio_ket_thuc').order('thu_trong_tuan').order('gio_bat_dau')]);
    if (bs.error || ca.error) return A.baoLoi('Không tải được lịch làm việc.');
    dsCa = ca.data || [];
    $('vung').replaceChildren(...((bs.data || []).length ? bs.data.map(b => {
      const cs = (ca.data || []).filter(c => c.bac_si_id === b.id);
      return el('section',{class:'muc'}, el('h2',{style:'display:flex;justify-content:space-between;align-items:baseline'}, el('span',{style:'color:var(--muc);font-size:16px'}, b.ho_ten),
        el('button',{class:'lien-ket',type:'button',onclick:() => them(b)}, 'Thêm ca')),
        ...(cs.length ? cs.map(c => el('div',{class:'hang'}, el('div',{class:'ten',style:'font-weight:500'}, THU[c.thu_trong_tuan]), el('div',{class:'so'}, gio(c.gio_bat_dau) + ' đến ' + gio(c.gio_ket_thuc)),
          el('div',{style:'display:flex;gap:16px'}, el('button',{class:'lien-ket',type:'button',onclick:() => sua(b, c)}, 'Sửa'),
          el('button',{class:'lien-ket',type:'button',onclick:async () => { if (!await Pethy.xacNhan('Xóa ca này?', 'Ca làm việc sẽ bị xóa khỏi lịch.', 'Xóa ca')) return; const { error } = await db.from('lich_lam_viec').delete().eq('id', c.id); A.baoLoi(error ? 'Không xóa được ca.' : ''); await tai(); }}, 'Xóa')))) : [A.rong('Chưa có ca nào, bác sĩ này chưa nhận được lịch đặt.')]));
    }) : [A.rong('Chưa có tài khoản bác sĩ nào. Hãy phân vai bác sĩ ở trang Tài khoản.')]));
  }
  // Thêm ca cho nhiều thứ cùng lúc: tích các thứ cần làm, chọn giờ, một lần bấm là xong cả tuần.
  function them(b){
    const ds = el('div',{class:'thu-chon',role:'group','aria-label':'Các thứ làm việc'},
      Object.keys(THU).map(k => el('label',{}, el('input',{type:'checkbox',value:k,'aria-label':THU[k]}), el('span',{'aria-hidden':'true'}, NGAN[k]))));
    const dat = f => () => ds.querySelectorAll('input').forEach(i => { i.checked = f(Number(i.value)); });
    const nhanh = el('div',{class:'thu-nhanh'},
      el('button',{class:'lien-ket',type:'button',onclick:dat(t => t <= 5)}, 'Thứ hai đến thứ sáu'),
      el('button',{class:'lien-ket',type:'button',onclick:dat(t => t <= 6)}, 'Thứ hai đến thứ bảy'),
      el('button',{class:'lien-ket',type:'button',onclick:dat(() => true)}, 'Cả tuần'),
      el('button',{class:'lien-ket',type:'button',onclick:dat(() => false)}, 'Bỏ chọn'));
    const tu = el('input',{id:'c-a',type:'time',value:'08:00'}), den = el('input',{id:'c-b',type:'time',value:'17:00'});
    A.hop('Thêm ca làm việc', b.ho_ten, [el('div',{class:'truong'}, el('label',{}, 'Các thứ trong tuần'), ds, nhanh), A.o('c-a','Từ giờ',tu), A.o('c-b','Đến giờ',den)], 'Thêm', async () => {
      const thus = [...ds.querySelectorAll('input:checked')].map(i => Number(i.value));
      if (!thus.length) return 'Chọn ít nhất một thứ.';
      if (!tu.value || !den.value || den.value <= tu.value) return 'Giờ kết thúc phải sau giờ bắt đầu.';
      const trung = thus.filter(t => dsCa.some(c => c.bac_si_id === b.id && c.thu_trong_tuan === t && gio(c.gio_bat_dau) === tu.value));
      if (trung.length) return 'Đã có ca bắt đầu lúc ' + tu.value + ' vào ' + trung.map(t => THU[t]).join(', ') + '. Bỏ chọn các thứ đó hoặc đổi giờ bắt đầu.';
      const { error } = await db.from('lich_lam_viec').insert(thus.map(t => ({ bac_si_id: b.id, thu_trong_tuan: t, gio_bat_dau: tu.value, gio_ket_thuc: den.value })));
      return error ? (error.code === '23505' ? 'Có ca bắt đầu giờ này đã tồn tại.' : 'Không thêm được ca.') : null; }, tai);
  }
  // Sửa giờ của một ca đã có, khỏi phải xóa rồi thêm lại.
  function sua(b, c){
    const tu = el('input',{id:'c-a',type:'time',value:gio(c.gio_bat_dau)}), den = el('input',{id:'c-b',type:'time',value:gio(c.gio_ket_thuc)});
    A.hop('Sửa ca làm việc', b.ho_ten + ', ' + THU[c.thu_trong_tuan], [A.o('c-a','Từ giờ',tu), A.o('c-b','Đến giờ',den)], 'Lưu', async () => {
      if (!tu.value || !den.value || den.value <= tu.value) return 'Giờ kết thúc phải sau giờ bắt đầu.';
      const { error } = await db.from('lich_lam_viec').update({ gio_bat_dau: tu.value, gio_ket_thuc: den.value }).eq('id', c.id);
      return error ? (error.code === '23505' ? 'Đã có ca khác bắt đầu giờ này trong ngày.' : 'Không lưu được ca.') : null; }, tai);
  }
  await tai();
  Pethy.khiDoi(['lich_lam_viec', 'tai_khoan'], tai);
})();
