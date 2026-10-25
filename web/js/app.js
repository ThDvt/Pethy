// Lõi dùng chung: khởi tạo Supabase, dựng DOM an toàn, định dạng, phân vai trò.
(function(){
  // Nếu Supabase đưa liên kết đặt lại mật khẩu về trang khác (Redirect URL chưa khai báo), chuyển sang trang đăng nhập.
  if (/[#&]type=recovery/.test(location.hash) && !/^\/dang-nhap(\.html)?\/?$/.test(location.pathname)) { location.replace('/dang-nhap.html' + location.hash); return; }
  const cfg = window.PETHY_CONFIG || {};
  const thuc = !!(cfg.SUPABASE_URL && cfg.SUPABASE_ANON_KEY && window.supabase);
  const db = thuc ? window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false }
  }) : null;

  // Dựng phần tử bằng textContent, không bao giờ chèn HTML từ dữ liệu.
  function el(tag, thuocTinh, ...con){
    const e = document.createElement(tag);
    for (const [k,v] of Object.entries(thuocTinh||{})){
      if (v === null || v === undefined || v === false) continue;
      if (k === 'class') e.className = v;
      else if (k.startsWith('on') && typeof v === 'function') e.addEventListener(k.slice(2), v);
      else e.setAttribute(k, v === true ? '' : v);
    }
    for (const c of con.flat()) if (c !== null && c !== undefined && c !== false) e.append(c.nodeType ? c : document.createTextNode(String(c)));
    return e;
  }
  const tien = n => new Intl.NumberFormat('vi-VN').format(n) + ' đ';
  const gio = iso => new Date(iso).toLocaleTimeString('vi-VN',{hour:'2-digit',minute:'2-digit',timeZone:'Asia/Ho_Chi_Minh'});

  // Vai trò -> trang chủ của khu vực. Trang thật sẽ được thêm dần.
  const KHU = { chu_nuoi:'/chu-nuoi/', le_tan:'/le-tan/', bac_si:'/bac-si/', thu_ngan:'/thu-ngan/', kho:'/kho/', admin:'/admin/' };

  async function vaiTro(){
    if (!db) return null;
    const { data, error } = await db.rpc('vai_tro_hieu_luc');
    return error ? null : data;   // null: chưa đăng nhập hoặc đang bảo trì
  }
  async function dangXuat(){ if (!await xacNhan('Đăng xuất?', 'Bạn sẽ cần đăng nhập lại để tiếp tục.', 'Đăng xuất', 'chinh', 'Ở lại')) return; try { sessionStorage.removeItem('pethy.menu'); } catch (e) {} if (db) await db.auth.signOut(); location.href = '/'; }

  // Dữ liệu mẫu để xem giao diện khi chưa nối Supabase (chỉ dùng trên máy cá nhân).
  const MAU = {
    dich_vu:[{id:'1',ten:'Khám tổng quát',loai:'kham',gia:150000,mo_ta:'Khám toàn diện: cân nặng, nhiệt độ, tim phổi, da lông, răng miệng. Bác sĩ tư vấn dinh dưỡng và lịch tiêm cho bé.'},{id:'2',ten:'Tiêm phòng',loai:'tiem',gia:50000,mo_ta:null},{id:'3',ten:'Tái khám',loai:'kham',gia:80000},{id:'4',ten:'Tắm và vệ sinh',loai:'khac',gia:120000,mo_ta:'Tắm, sấy, vệ sinh tai và cắt móng cho bé.'},{id:'5',ten:'Cắt tỉa lông',loai:'khac',gia:100000,mo_ta:'Cắt tỉa gọn gàng theo giống và theo mùa.'}],
    bac_si:[{id:'a',ho_ten:'Nguyễn Thị Lan',chuyen_mon:'Nội khoa chó mèo',gioi_thieu:'Hơn 8 năm khám và điều trị nội khoa cho chó mèo. Ưu tiên giải thích rõ tình trạng của bé để chủ nuôi yên tâm.',anh_dai_dien:null,diem_tb:4.8,so_danh_gia:8,lich_lam_viec:[{thu:1,tu:'08:00',den:'12:00'},{thu:3,tu:'13:30',den:'17:30'},{thu:5,tu:'08:00',den:'12:00'}]},{id:'b',ho_ten:'Phạm Quốc Hưng',chuyen_mon:'Tiêm phòng và ngoại khoa nhỏ',gioi_thieu:null,anh_dai_dien:null,diem_tb:null,so_danh_gia:0,lich_lam_viec:[]}],
    danh_gia:[{id:'g1',so_sao:5,nhan_xet:'Bác sĩ khám kỹ, giải thích dễ hiểu. Bé nhà mình không sợ như mọi khi.',ten_hien_thi:'Hằng T.',ngay:new Date(Date.now()-48*3600e3).toISOString(),tong:12,diem_tb:4.8},{id:'g2',so_sao:5,nhan_xet:'Đặt lịch nhanh, đến đúng giờ là được khám ngay.',ten_hien_thi:'Khải L.',ngay:new Date(Date.now()-120*3600e3).toISOString(),tong:12,diem_tb:4.8},{id:'g3',so_sao:4,nhan_xet:'Phòng khám sạch sẽ, nhân viên thân thiện.',ten_hien_thi:'Nam Đ.',ngay:new Date(Date.now()-300*3600e3).toISOString(),tong:12,diem_tb:4.8}],
    cau_hinh:{che_do_bao_tri:'false',dat_truoc_toi_da_ngay:'30'}
  };

  // Ô số điện thoại tự chia nhóm khi gõ: 0901 234 567 (số bắt đầu bằng + giữ nguyên).
  // Chỉ định dạng khi rời khỏi ô (không sửa giá trị lúc đang gõ, vì một số bàn phím điện thoại sẽ lặp ký tự).
  function maSdt(o){
    o.addEventListener('blur', () => {
      const v = o.value.trim();
      if (!v || v.startsWith('+')) return;
      const d = v.replace(/\D/g, '').slice(0, 10);
      o.value = d.replace(/^(\d{4})(\d{1,3})?(\d{1,3})?$/, (x, a, b, c) => [a, b, c].filter(Boolean).join(' '));
    });
  }
  // Hộp xác nhận thay cho confirm() của trình duyệt. Trả về true/false. kieu: 'nguy-hiem' (đỏ) hoặc 'chinh'.
  function xacNhan(tieuDe, moTa, nutTen, kieu, huyTen){
    return new Promise(xong => {
      const d = el('dialog',{class:'xac-nhan'});
      const dong = kq => { d.close(); d.remove(); xong(kq); };
      d.append(el('h2',{style:'margin:0 0 8px;font-size:20px'}, tieuDe),
        el('p',{class:'ghi-chu',style:'margin:0 0 20px'}, moTa || ''),
        el('div',{style:'display:flex;gap:12px;justify-content:flex-end'},
          el('button',{class:'nut phu',type:'button',onclick:() => dong(false)}, huyTen || ((kieu || 'nguy-hiem') === 'nguy-hiem' ? 'Không, giữ nguyên' : 'Quay lại')),
          el('button',{class:'nut ' + (kieu || 'nguy-hiem'),type:'button',onclick:() => dong(true)}, nutTen)));
      d.addEventListener('cancel', ev => { ev.preventDefault(); dong(false); });
      document.body.append(d); d.showModal();
    });
  }
  // Ô mật khẩu có nút hiện/ẩn (icon con mắt). Input giữ nguyên id nên nhãn <label for> vẫn hoạt động.
  function matKhau(o){
    if (!o || o.dataset.mk) return;
    o.dataset.mk = '1';
    const NS = 'http://www.w3.org/2000/svg';
    const ve = hien => {
      const s = document.createElementNS(NS, 'svg');
      s.setAttribute('viewBox', '0 0 24 24'); s.setAttribute('width', '20'); s.setAttribute('height', '20');
      s.setAttribute('fill', 'none'); s.setAttribute('stroke', 'currentColor'); s.setAttribute('stroke-width', '1.8');
      s.setAttribute('stroke-linecap', 'round'); s.setAttribute('stroke-linejoin', 'round'); s.setAttribute('aria-hidden', 'true');
      const p = d => { const e = document.createElementNS(NS, 'path'); e.setAttribute('d', d); s.appendChild(e); };
      p('M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z');
      if (hien) { const c = document.createElementNS(NS, 'circle'); c.setAttribute('cx', '12'); c.setAttribute('cy', '12'); c.setAttribute('r', '3'); s.appendChild(c); }
      else p('M4 4l16 16');
      return s;
    };
    const bao = document.createElement('div'); bao.className = 'o-mk';
    const nut = document.createElement('button'); nut.type = 'button'; nut.className = 'o-mk-nut';
    const capNhat = () => {
      const an = o.type === 'password';
      nut.replaceChildren(ve(an));
      nut.setAttribute('aria-label', an ? 'Hiện mật khẩu' : 'Ẩn mật khẩu');
      nut.setAttribute('aria-pressed', String(!an));
    };
    nut.addEventListener('click', () => { o.type = o.type === 'password' ? 'text' : 'password'; capNhat(); o.focus(); });
    o.replaceWith(bao); bao.append(o, nut); capNhat();
  }
  window.Pethy = { db, thuc, el, tien, gio, KHU, vaiTro, dangXuat, MAU, maSdt, xacNhan, matKhau };
})();
