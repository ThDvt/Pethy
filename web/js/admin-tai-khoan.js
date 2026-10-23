(async function(){
  const { db, el } = Pethy, A = Pethy.admin, { loiRpc } = Pethy.khu, $ = A.$;
  if (!await A.boot('/admin/tai-khoan.html')) return;
  const me = (await db.auth.getUser()).data?.user?.id;
  async function tai(){
    const r = await db.from('tai_khoan').select('id,ho_ten,so_dien_thoai,vai_tro,trang_thai,created_at').order('created_at');
    if (r.error) return A.baoLoi('Không tải được danh sách tài khoản.');
    const goi = async (ten, tham, hoi) => { if (hoi && !await Pethy.xacNhan('Bạn chắc chắn chứ?', hoi, 'Tiếp tục')) return; A.baoLoi(''); const { error } = await db.rpc(ten, tham); if (error) A.baoLoi(loiRpc(error)); await tai(); };
    $('vung').replaceChildren(el('div',{style:'border-top:2px solid var(--muc);margin-top:20px'}, ...(r.data || []).map(t => {
      const minh = t.id === me, khoa = t.trang_thai === 'khoa';
      const sel = el('select',{class:'nho','aria-label':'Vai trò của ' + t.ho_ten,disabled:minh}, Object.entries(A.VAI).map(([k, v]) => el('option',{value:k,selected:k === t.vai_tro}, v)));
      sel.addEventListener('change', async () => { if (!await Pethy.xacNhan('Đổi vai trò', 'Đổi vai trò của ' + t.ho_ten + ' thành ' + A.VAI[sel.value] + '?', 'Đổi vai trò', 'chinh')) { sel.value = t.vai_tro; return; } goi('dat_vai_tro', { p_tai_khoan: t.id, p_vai_tro: sel.value }); });
      return el('div',{class:'hang'},
        el('div',{class:'ten'}, t.ho_ten + (minh ? ' (bạn)' : ''), el('div',{class:'nho',style:'font-weight:400'}, (t.so_dien_thoai || 'Chưa có số điện thoại') + ', tạo ' + A.ngay(t.created_at))),
        khoa ? el('span',{class:'tt do'}, 'Đã khóa') : el('span'), sel,
        t.vai_tro === 'bac_si' ? el('button',{class:'lien-ket',type:'button',onclick:() => hoSoBs(t)}, 'Hồ sơ') : el('span'),
        minh ? el('span') : el('button',{class:'lien-ket',type:'button',onclick:() => goi('khoa_tai_khoan', { p_tai_khoan: t.id, p_khoa: !khoa }, khoa ? null : 'Khóa tài khoản ' + t.ho_ten + '? Người này sẽ không đăng nhập dùng được nữa.')}, khoa ? 'Mở khóa' : 'Khóa'),
        minh ? el('span') : el('button',{class:'lien-ket',type:'button',style:'color:var(--loi)',onclick:() => goi('xoa_tai_khoan', { p_tai_khoan: t.id }, 'Xóa vĩnh viễn tài khoản ' + t.ho_ten + '? Không thể hoàn tác.')}, 'Xóa'));
    })));
  }
  // Hồ sơ công khai của bác sĩ (hiện ở trang chủ): chuyên môn và giới thiệu.
  async function hoSoBs(tk){
    const r = await db.from('ho_so_bac_si').select('chuyen_mon,gioi_thieu').eq('tai_khoan_id', tk.id).maybeSingle();
    if (r.error) return A.baoLoi('Không đọc được hồ sơ bác sĩ.');
    const cm = el('input',{id:'bs-cm',type:'text',maxlength:'120',placeholder:'Ví dụ: Nội khoa chó mèo'}); cm.value = (r.data && r.data.chuyen_mon) || '';
    const gt = el('textarea',{id:'bs-gt',rows:'5',maxlength:'600',placeholder:'Ví dụ: Hơn 8 năm khám và điều trị nội khoa cho chó mèo.'}); gt.value = (r.data && r.data.gioi_thieu) || '';
    A.hop('Hồ sơ Bs. ' + tk.ho_ten, 'Khách xem thông tin này khi bấm "Xem thông tin" ở trang chủ.', [A.o('bs-cm','Chuyên môn',cm), A.o('bs-gt','Giới thiệu (tối đa 600 ký tự)',gt)], 'Lưu hồ sơ', async () => {
      const { error } = await db.from('ho_so_bac_si').update({ chuyen_mon: cm.value.trim() || null, gioi_thieu: gt.value.trim() || null }).eq('tai_khoan_id', tk.id);
      return error ? 'Không lưu được hồ sơ.' : null; }, tai);
  }
  // Tạo tài khoản nhân viên: đăng ký bằng client riêng (không lưu phiên) để admin không bị đăng xuất,
  // rồi nâng vai trò bằng RPC dat_vai_tro (vai trò chỉ đổi được qua quản trị viên).
  const matKhauTam = () => { const b = new Uint32Array(12); crypto.getRandomValues(b); const kt = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789'; return Array.from(b, x => kt[x % kt.length]).join(''); };
  function themNV(){
    const ten = el('input',{id:'nv-ten',type:'text',placeholder:'Ví dụ: Trần Thị Hoa',maxlength:'100',autocomplete:'off'});
    const mail = el('input',{id:'nv-mail',type:'email',placeholder:'nhanvien@email.com',autocomplete:'off'});
    const vt = el('select',{id:'nv-vt'}, ['bac_si','le_tan','thu_ngan','kho'].map(k => el('option',{value:k}, A.VAI[k])));
    const mk = el('input',{id:'nv-mk',type:'text',value:matKhauTam(),readonly:true,class:'mono'});
    A.hop('Thêm nhân viên', 'Hệ thống tạo mật khẩu tạm. Hãy gửi cho nhân viên và nhắc đổi sau khi đăng nhập.',
      [A.o('nv-ten','Họ tên',ten), A.o('nv-mail','Email đăng nhập',mail), A.o('nv-vt','Vai trò',vt), A.o('nv-mk','Mật khẩu tạm (chỉ hiện lần này)',mk)],
      'Tạo tài khoản', async () => {
        const hoTen = ten.value.trim(), email = mail.value.trim().toLowerCase();
        if (hoTen.length < 2) return 'Nhập họ tên nhân viên.';
        if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return 'Email chưa đúng định dạng.';
        let id;
        if (window.supabase && window.PETHY_CONFIG && window.PETHY_CONFIG.SUPABASE_URL && !location.search.includes("mau=1")) {
          const c = window.supabase.createClient(window.PETHY_CONFIG.SUPABASE_URL, window.PETHY_CONFIG.SUPABASE_ANON_KEY, { auth:{ persistSession:false, autoRefreshToken:false, detectSessionInUrl:false, storageKey:'pethy-tao-nv' } });
          const r = await Promise.race([c.auth.signUp({ email, password: mk.value, options:{ data:{ ho_ten: hoTen } } }),
            new Promise(x => setTimeout(() => x({ error:{ message:'qua-lau' } }), 20000))]);
          if (r.error && r.error.message === 'qua-lau') return 'Supabase phản hồi quá lâu (thường do gửi thư xác nhận chậm). Tài khoản có thể đã được tạo, hãy đóng hộp này và kiểm tra danh sách trước khi tạo lại.';
          if (r.error) return /rate|limit/i.test(r.error.message) ? 'Đã tạo quá nhiều tài khoản trong thời gian ngắn, thử lại sau ít phút.' : 'Không tạo được tài khoản: ' + r.error.message;
          if (!r.data.user || (r.data.user.identities || []).length === 0) return 'Email này đã có tài khoản.';
          id = r.data.user.id;
        }
        const { error } = await db.rpc('dat_vai_tro', { p_tai_khoan: id, p_vai_tro: vt.value });
        if (error) return 'Đã tạo tài khoản nhưng chưa gán được vai trò: ' + loiRpc(error);
        await Pethy.xacNhan('Đã tạo tài khoản', 'Email: ' + email + '\nMật khẩu tạm: ' + mk.value + '\nHãy sao chép ngay, mật khẩu không hiện lại. Nếu Supabase bật xác nhận email, nhân viên cần bấm liên kết trong thư trước khi đăng nhập.', 'Đã ghi lại', 'chinh');
        return null;
      }, tai);
  }
  $('vung').before(el('button',{class:'nut chinh',type:'button',id:'them-nv',onclick:themNV}, '+ Thêm nhân viên'));
  await tai();
})();
