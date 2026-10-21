(async function(){
  const { db, el } = Pethy, A = Pethy.admin, { loiRpc, khoiDong } = Pethy.khu, $ = A.$;
  if (!await khoiDong('le_tan', 'Lễ tân', [], '/le-tan/khach-hang.html')) return;
  const sdt = s => s ? s.replace(/^(\d{4})(\d{3})(\d+)$/, '$1 $2 $3') : '';
  const ngaySinh = s => s ? A.ngay(s + 'T00:00:00+07:00') : 'Chưa rõ ngày sinh';
  const o = el('input',{id:'tim',type:'search',maxlength:'60',placeholder:'Tên hoặc số điện thoại',style:'max-width:360px'});
  const ds = el('div',{style:'border-top:2px solid var(--muc);margin-top:16px'});
  let chon = null;
  const loc = s => s.replace(/[%,()*\\]/g, ' ').trim();   // bỏ ký tự đặc biệt của bộ lọc PostgREST

  async function tim(){
    A.baoLoi('');
    let q = db.from('chu_nuoi').select('id,ho_ten,so_dien_thoai,dia_chi,tai_khoan_id').order('ho_ten').limit(30);
    const t = loc(o.value);
    if (t) q = q.or('ho_ten.ilike.%' + t + '%,so_dien_thoai.ilike.%' + t + '%');
    const r = await q; if (r.error) return A.baoLoi('Không tìm được khách. Vui lòng thử lại.');
    ds.replaceChildren(...((r.data || []).length ? r.data.map(c => el('div',{class:'hang'},
      el('div',{class:'ten'}, c.ho_ten, el('div',{class:'nho so',style:'font-weight:400'}, sdt(c.so_dien_thoai) + (c.dia_chi ? ', ' + c.dia_chi : ''))),
      c.tai_khoan_id ? el('span',{class:'tt'}, 'Có tài khoản') : el('span',{class:'nho'}, 'Khách trực tiếp'),
      el('button',{class:'nut',type:'button',onclick:() => moKhach(c)}, 'Mở'))) : [A.rong(t ? 'Không có khách nào khớp.' : 'Chưa có khách nào.')]));
  }

  async function moKhach(c){
    chon = c;
    const r = await db.from('thu_cung').select('id,ten,loai,ngay_sinh').eq('chu_nuoi_id', c.id).order('ten');
    if (r.error) return A.baoLoi('Không tải được thú cưng của khách.');
    const pets = r.data || [];
    $('hop-nd').replaceChildren(
      el('h2',{style:'margin:0;font-size:22px'}, c.ho_ten), el('div',{class:'nho so',style:'margin:4px 0 16px'}, sdt(c.so_dien_thoai)),
      el('div',{style:'border-top:2px solid var(--muc)'}, ...(pets.length ? pets.map(p => el('div',{class:'hang'},
        el('div',{class:'ten'}, p.ten, el('div',{class:'nho',style:'font-weight:400'}, p.loai + ', ' + ngaySinh(p.ngay_sinh))),
        el('a',{class:'nut chinh',href:'/le-tan/dat-lich.html?thu_cung=' + encodeURIComponent(p.id)}, 'Đặt lịch'))) : [A.rong('Khách chưa có thú cưng nào.')])),
      el('div',{style:'display:flex;justify-content:space-between;align-items:center;margin-top:20px'},
        el('button',{class:'lien-ket',type:'button',onclick:() => themThuCung(c)}, 'Thêm thú cưng'),
        el('button',{class:'lien-ket',type:'button',onclick:() => $('hop').close()}, 'Đóng')));
    if (!$('hop').open) $('hop').showModal();
  }

  function themThuCung(c){
    const ten = el('input',{id:'p-t',placeholder:'Ví dụ: Mít',maxlength:'60'}), loai = el('input',{id:'p-l',maxlength:'40',placeholder:'Chó, mèo, thỏ...'}), ns = el('input',{id:'p-n',type:'date',max:A.homNay()});
    A.hop('Thêm thú cưng', 'Khách: ' + c.ho_ten, [A.o('p-t','Tên',ten), A.o('p-l','Loài',loai), A.o('p-n','Ngày sinh (nếu biết)',ns)], 'Thêm', async () => {
      if (!ten.value.trim() || !loai.value.trim()) return 'Vui lòng nhập tên và loài.';
      const { error } = await db.from('thu_cung').insert({ chu_nuoi_id: c.id, ten: ten.value.trim(), loai: loai.value.trim(), ngay_sinh: ns.value || null });
      return error ? 'Không thêm được thú cưng. Vui lòng kiểm tra lại.' : null; }, () => moKhach(c));
  }

  function themKhach(){
    const ten = el('input',{id:'k-t',placeholder:'Ví dụ: Nguyễn Văn An',maxlength:'80'}), dt = el('input',{id:'k-d',inputmode:'tel',maxlength:'12',placeholder:'0901234567'}), dc = el('input',{id:'k-a',maxlength:'200',placeholder:'Số nhà, phường, quận (không bắt buộc)'});
    A.hop('Thêm khách đến trực tiếp', 'Tạo hồ sơ cho khách chưa có tài khoản.', [A.o('k-t','Họ tên',ten), A.o('k-d','Số điện thoại',dt), A.o('k-a','Địa chỉ (không bắt buộc)',dc)], 'Thêm khách', async () => {
      const d = dt.value.replace(/[\s.]/g, '');
      if (!ten.value.trim()) return 'Vui lòng nhập họ tên.';
      if (!/^(\+84|0)[0-9]{9}$/.test(d)) return 'Số điện thoại không hợp lệ (ví dụ 0901234567).';
      const { error } = await db.from('chu_nuoi').insert({ ho_ten: ten.value.trim(), so_dien_thoai: d, dia_chi: dc.value.trim() || null });
      return error ? 'Không thêm được khách. Vui lòng kiểm tra lại.' : null; }, tim);
  }

  let h; o.addEventListener('input', () => { clearTimeout(h); h = setTimeout(tim, 300); });
  $('vung').replaceChildren(el('div',{style:'display:flex;flex-wrap:wrap;gap:12px 20px;align-items:flex-end;margin-top:20px;justify-content:space-between'},
    el('div',{class:'truong',style:'margin:0;flex:1 1 300px'}, el('label',{for:'tim'},'Tìm khách'), o),
    el('button',{class:'nut chinh',type:'button',onclick:themKhach}, 'Thêm khách mới')), ds);
  await tim();
})();
