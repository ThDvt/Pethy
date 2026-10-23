(async function(){
  const { db, el } = Pethy, { loiRpc, khoiDong } = Pethy.khu, { MUC, ngay, TRANG_THAI } = Pethy.chuNuoi;
  const $ = id => document.getElementById(id);
  if (!await khoiDong('chu_nuoi', 'Chủ nuôi', MUC, '/chu-nuoi/')) return;

  const [cfg, bs] = await Promise.all([
    db.from('cau_hinh').select('khoa,gia_tri').eq('khoa','huy_doi_truoc_gio'),
    db.from('bac_si_cong_khai').select('id,ho_ten')
  ]);
  const hanGio = (Number((cfg.data||[])[0]?.gia_tri) || 2);
  const tenBs = Object.fromEntries((bs.data||[]).map(b => [b.id, b.ho_ten]));

  async function taiLich(){
    const r = await db.from('lich_hen')
      .select('id,thoi_gian,trang_thai,bac_si_id,thu_cung(ten),dich_vu(ten)')
      .in('trang_thai',['cho_xac_nhan','da_xac_nhan']).gte('thoi_gian', new Date().toISOString()).order('thoi_gian',{ascending:true});
    if (r.error) { $('ds-lich').replaceChildren(el('p',{class:'loi'},'Không tải được lịch.')); return; }
    if (!r.data.length) { $('ds-lich').replaceChildren(el('p',{class:'ghi-chu'},'Bạn chưa có lịch sắp tới. Bấm "Đặt lịch mới" để bắt đầu.')); return; }
    $('ds-lich').replaceChildren(...r.data.map((l, i) => {
      const con = new Date(l.thoi_gian) - Date.now() >= hanGio * 3600e3;
      return el('div',{class:'lich' + (i === 0 ? ' dau-tien' : '')},
        el('div',{class:'gio-lon'}, Pethy.gio(l.thoi_gian)),
        el('div',{style:'margin-top:2px;font-weight:700'}, ngay(l.thoi_gian)),
        el('div',{style:'margin-top:6px'}, el('b',{}, l.thu_cung?.ten), ', ' + (l.dich_vu?.ten || '').toLowerCase()),
        tenBs[l.bac_si_id] ? el('div',{class:'ghi-chu'}, 'Bác sĩ ' + tenBs[l.bac_si_id]) : null,
        el('div',{class:'ghi-chu',style:'margin-top:4px'}, TRANG_THAI[l.trang_thai]),
        el('div',{class:'hanh-dong'},
          con ? el('a',{href:'/chu-nuoi/dat-lich.html?doi=' + encodeURIComponent(l.id)},'Đổi lịch') : null,
          con ? el('button',{class:'lien-ket',type:'button',onclick:() => moHuy(l)},'Hủy lịch')
              : el('span',{class:'ghi-chu'},'Còn dưới ' + hanGio + ' giờ nữa nên không đổi hoặc hủy được, vui lòng gọi phòng khám.')));
    }));
  }

  async function taiTiem(){
    const hom = new Date().toISOString().slice(0,10);
    const r = await db.from('mui_tiem').select('id,ngay_tiem_tiep,thu_cung(ten),thuoc(ten)')
      .not('ngay_tiem_tiep','is',null).gte('ngay_tiem_tiep', hom).order('ngay_tiem_tiep',{ascending:true}).limit(5);
    if (r.error || !r.data.length) { $('ds-tiem').replaceChildren(el('p',{class:'ghi-chu'}, r.error ? 'Không tải được.' : 'Chưa có mũi tiêm nào sắp đến hạn.')); return; }
    $('ds-tiem').replaceChildren(...r.data.map(m => el('div',{class:'dong'},
      el('div',{}, 'Tiêm ' + m.thuoc?.ten + ' cho ' + m.thu_cung?.ten),
      el('div',{class:'so'}, m.ngay_tiem_tiep.split('-').reverse().join('/')))));
  }

  async function taiDaKham(){
    const [r, dg] = await Promise.all([
      db.from('lich_hen').select('id,thoi_gian,trang_thai,bac_si_id,thu_cung(ten),dich_vu(ten)').eq('trang_thai','da_hoan_thanh').order('thoi_gian',{ascending:false}).limit(5),
      db.from('danh_gia').select('lich_hen_id,so_sao,nhan_xet')
    ]);
    const vung = $('ds-da-kham');
    const ds = (r.data || []).filter(l => l.trang_thai === 'da_hoan_thanh');
    if (r.error) { vung.replaceChildren(el('p',{class:'ghi-chu'},'Không tải được.')); return; }
    if (!ds.length) { vung.replaceChildren(el('p',{class:'ghi-chu'},'Chưa có lần khám nào hoàn thành.')); return; }
    const theoLich = Object.fromEntries((dg.data || []).map(x => [x.lich_hen_id, x]));
    vung.replaceChildren(...ds.map(l => {
      const cu = theoLich[l.id], ten = tenBs[l.bac_si_id];
      const lich = { id: l.id, thu_cung_ten: l.thu_cung?.ten, dich_vu_ten: l.dich_vu?.ten, bac_si_ten: ten };
      return el('div',{class:'dong'},
        el('div',{}, el('b',{}, l.thu_cung?.ten), ', ' + (l.dich_vu?.ten || '').toLowerCase(),
          el('div',{class:'ghi-chu'}, ngay(l.thoi_gian) + (ten ? ', Bs. ' + ten : ''))),
        el('div',{style:'display:flex;align-items:center;gap:12px'},
          cu ? Pethy.sao(cu.so_sao) : null,
          el('button',{class:cu ? 'lien-ket' : 'nut chinh',type:'button',style:cu ? '' : 'padding:8px 18px;min-height:0',onclick:() => Pethy.hopDanhGia(lich, cu, taiDaKham)}, cu ? 'Sửa' : 'Đánh giá')));
    }));
  }

  let dangHuy = null;
  const hop = $('hop-huy');
  function moHuy(l){
    dangHuy = l; $('ly-do').value = ''; $('huy-loi').hidden = true;
    $('huy-mo-ta').textContent = l.thu_cung?.ten + ', ' + ngay(l.thoi_gian) + ' lúc ' + Pethy.gio(l.thoi_gian);
    hop.showModal();
  }
  $('huy-dong').onclick = () => hop.close();
  $('form-huy').addEventListener('submit', async ev => {
    ev.preventDefault(); $('huy-xn').disabled = true;
    const { error } = await db.rpc('huy_lich', { p_lich: dangHuy.id, p_ly_do: $('ly-do').value.trim() || null });
    $('huy-xn').disabled = false;
    if (error) { $('huy-loi').textContent = loiRpc(error); $('huy-loi').hidden = false; return; }
    hop.close(); await taiLich();
  });

  await Promise.all([taiLich(), taiTiem(), taiDaKham()]);
})();
