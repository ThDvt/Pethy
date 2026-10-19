(async function(){
  const { db, el } = Pethy, A = Pethy.admin, { loiRpc } = Pethy.khu, $ = A.$;
  if (!await A.boot('/admin/tai-khoan.html')) return;
  const me = (await db.auth.getUser()).data?.user?.id;
  async function tai(){
    const r = await db.from('tai_khoan').select('id,ho_ten,so_dien_thoai,vai_tro,trang_thai,created_at').order('created_at');
    if (r.error) return A.baoLoi('Không tải được danh sách tài khoản.');
    const goi = async (ten, tham, hoi) => { if (hoi && !confirm(hoi)) return; A.baoLoi(''); const { error } = await db.rpc(ten, tham); if (error) A.baoLoi(loiRpc(error)); await tai(); };
    $('vung').replaceChildren(el('div',{style:'border-top:2px solid var(--muc);margin-top:20px'}, ...(r.data || []).map(t => {
      const minh = t.id === me, khoa = t.trang_thai === 'khoa';
      const sel = el('select',{class:'nho','aria-label':'Vai trò của ' + t.ho_ten,disabled:minh}, Object.entries(A.VAI).map(([k, v]) => el('option',{value:k,selected:k === t.vai_tro}, v)));
      sel.addEventListener('change', () => { if (!confirm('Đổi vai trò của ' + t.ho_ten + ' thành ' + A.VAI[sel.value] + '?')) { sel.value = t.vai_tro; return; } goi('dat_vai_tro', { p_tai_khoan: t.id, p_vai_tro: sel.value }); });
      return el('div',{class:'hang'},
        el('div',{class:'ten'}, t.ho_ten + (minh ? ' (bạn)' : ''), el('div',{class:'nho',style:'font-weight:400'}, (t.so_dien_thoai || 'Chưa có số điện thoại') + ', tạo ' + A.ngay(t.created_at))),
        khoa ? el('span',{class:'tt do'}, 'Đã khóa') : el('span'), sel,
        minh ? el('span') : el('button',{class:'lien-ket',type:'button',onclick:() => goi('khoa_tai_khoan', { p_tai_khoan: t.id, p_khoa: !khoa }, khoa ? null : 'Khóa tài khoản ' + t.ho_ten + '? Người này sẽ không đăng nhập dùng được nữa.')}, khoa ? 'Mở khóa' : 'Khóa'),
        minh ? el('span') : el('button',{class:'lien-ket',type:'button',style:'color:var(--loi)',onclick:() => goi('xoa_tai_khoan', { p_tai_khoan: t.id }, 'Xóa vĩnh viễn tài khoản ' + t.ho_ten + '? Không thể hoàn tác.')}, 'Xóa'));
    })));
  }
  await tai();
})();
