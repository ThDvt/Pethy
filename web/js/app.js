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
    // Chưa có phiên đăng nhập thì không cần hỏi máy chủ.
    try { const { data: { session } } = await db.auth.getSession(); if (!session) return null; } catch (_) { /* không đọc được phiên: cứ hỏi máy chủ */ }
    // Lỗi mạng chập chờn hoặc làm mới phiên giữa chừng không được đá người đang đăng nhập về trang đăng nhập: thử lại tối đa 3 lần.
    for (let lan = 0; lan < 3; lan++) {
      const { data, error } = await db.rpc('vai_tro_hieu_luc');
      if (!error) return data;   // null: chưa đăng nhập hoặc đang bảo trì
      if (lan < 2) await new Promise(r => setTimeout(r, 400 * (lan + 1)));
    }
    return null;
  }
  async function dangXuat(){ if (!await xacNhan('Đăng xuất?', 'Bạn sẽ cần đăng nhập lại để tiếp tục.', 'Đăng xuất', 'chinh', 'Ở lại')) return; try { sessionStorage.removeItem('pethy.menu'); } catch (e) {} if (db) await db.auth.signOut(); location.href = '/'; }

  // Dữ liệu mẫu để xem giao diện khi chưa nối Supabase (chỉ dùng trên máy cá nhân).
  const MAU = {
    dich_vu:[{id:'1',ten:'Khám tổng quát',loai:'kham',gia:150000,mo_ta:'Khám toàn diện: cân nặng, nhiệt độ, tim phổi, da lông, răng miệng. Bác sĩ tư vấn dinh dưỡng và lịch tiêm cho bé.'},{id:'2',ten:'Tiêm phòng',loai:'tiem',gia:50000,mo_ta:null},{id:'3',ten:'Tái khám',loai:'kham',gia:80000},{id:'4',ten:'Tắm và vệ sinh',loai:'khac',gia:120000,mo_ta:'Tắm, sấy, vệ sinh tai và cắt móng cho bé.'},{id:'5',ten:'Cắt tỉa lông',loai:'khac',gia:100000,mo_ta:'Cắt tỉa gọn gàng theo giống và theo mùa.'}],
    bac_si:[{id:'a',ho_ten:'Nguyễn Thị Lan',chuyen_mon:'Nội khoa chó mèo',trinh_do:'Bác sĩ thú y, Học viện Nông nghiệp Việt Nam (2016)',kinh_nghiem_nam:8,chung_chi:'Chứng chỉ hành nghề thú y\nChứng nhận chẩn đoán hình ảnh thú y\nChứng nhận tiêm phòng nâng cao',gioi_thieu:'Hơn 8 năm khám và điều trị nội khoa cho chó mèo. Ưu tiên giải thích rõ tình trạng của bé để chủ nuôi yên tâm.',anh_dai_dien:null,diem_tb:4.8,so_danh_gia:8,lich_lam_viec:[{thu:1,tu:'08:00',den:'12:00'},{thu:3,tu:'13:30',den:'17:30'},{thu:5,tu:'08:00',den:'12:00'}]},{id:'b',ho_ten:'Phạm Quốc Hưng',chuyen_mon:'Tiêm phòng và ngoại khoa nhỏ',gioi_thieu:null,anh_dai_dien:null,diem_tb:null,so_danh_gia:0,lich_lam_viec:[]}],
    danh_gia:[{id:'g1',so_sao:5,nhan_xet:'Bác sĩ khám kỹ, giải thích dễ hiểu. Bé nhà mình không sợ như mọi khi.',ten_hien_thi:'Hằng T.',ngay:new Date(Date.now()-48*3600e3).toISOString(),tong:12,diem_tb:4.8},{id:'g2',so_sao:5,nhan_xet:'Đặt lịch nhanh, đến đúng giờ là được khám ngay.',ten_hien_thi:'Khải L.',ngay:new Date(Date.now()-120*3600e3).toISOString(),tong:12,diem_tb:4.8},{id:'g3',so_sao:4,nhan_xet:'Phòng khám sạch sẽ, nhân viên thân thiện.',ten_hien_thi:'Nam Đ.',ngay:new Date(Date.now()-300*3600e3).toISOString(),tong:12,diem_tb:4.8}],
    bai_viet:[
      {id:'bv1',nhom:'tiem_phong',tieu_de:'Lịch tiêm phòng cơ bản cho chó con',tom_tat:'Mũi nào tiêm lúc mấy tuần tuổi, và những điều cần chuẩn bị trước ngày tiêm.',tac_gia:null,ngay_dang:new Date(Date.now()-3*86400e3).toISOString(),trang_thai:'da_dang',noi_dung:'Chó con thường bắt đầu tiêm từ khoảng 6 đến 8 tuần tuổi. Lịch cụ thể do bác sĩ quyết định theo tình trạng của bé.\n\n## Trước ngày tiêm\n- Bé ăn uống và đi vệ sinh bình thường\n- Không tắm trong 3 ngày trước đó\n- Mang theo sổ tiêm nếu đã có\n\n## Sau khi tiêm\nTheo dõi bé trong 24 giờ. Nếu bé bỏ ăn hoặc mệt kéo dài, hãy liên hệ phòng khám.'},
      {id:'bv2',nhom:'cham_soc',tieu_de:'Cách nhận biết mèo đang bị stress',tom_tat:null,tac_gia:'Bs. Nguyễn Thị Lan',ngay_dang:new Date(Date.now()-10*86400e3).toISOString(),trang_thai:'da_dang',noi_dung:'Mèo thường giấu cảm xúc, nên chủ nuôi cần để ý những thay đổi nhỏ trong sinh hoạt hằng ngày.\n\n## Dấu hiệu thường gặp\n- Liếm lông quá nhiều\n- Đi vệ sinh ngoài khay\n- Trốn ở chỗ kín, ăn ít hơn'},
      {id:'bv3',nhom:'benh',tieu_de:'Chó bị nôn: khi nào cần đi khám ngay?',tom_tat:'Phân biệt nôn một lần do ăn nhanh với nôn kéo dài cần can thiệp.',tac_gia:null,ngay_dang:new Date(Date.now()-20*86400e3).toISOString(),trang_thai:'da_dang',noi_dung:'Nôn một lần rồi bé vẫn vui vẻ, ăn uống bình thường thường không đáng lo. Hãy đưa bé đi khám nếu nôn nhiều lần trong ngày, có máu, hoặc bé lả đi.'},
      {id:'bv4',nhom:'phong_kham',tieu_de:'Lịch làm việc dịp nghỉ lễ',tom_tat:null,tac_gia:null,ngay_dang:new Date(Date.now()-30*86400e3).toISOString(),trang_thai:'da_dang',noi_dung:'Phòng khám vẫn mở cửa trong dịp lễ. Bạn nên đặt lịch trước để được sắp xếp giờ phù hợp.'}],
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
      s.setAttribute('fill', 'none'); s.setAttribute('stroke', 'currentColor'); s.setAttribute('stroke-width', '2');
      s.setAttribute('stroke-linecap', 'round'); s.setAttribute('stroke-linejoin', 'round'); s.setAttribute('aria-hidden', 'true');
      const them = ([t, at]) => { const e = document.createElementNS(NS, t); for (const k in at) e.setAttribute(k, at[k]); s.appendChild(e); };
      // Biểu tượng mắt và mắt gạch chéo từ bộ Lucide (ISC).
      const HINH = {"hien": [["path", {"d": "M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0"}], ["circle", {"cx": "12", "cy": "12", "r": "3"}]], "an": [["path", {"d": "M10.733 5.076a10.744 10.744 0 0 1 11.205 6.575 1 1 0 0 1 0 .696 10.747 10.747 0 0 1-1.444 2.49"}], ["path", {"d": "M14.084 14.158a3 3 0 0 1-4.242-4.242"}], ["path", {"d": "M17.479 17.499a10.75 10.75 0 0 1-15.417-5.151 1 1 0 0 1 0-.696 10.75 10.75 0 0 1 4.446-5.143"}], ["path", {"d": "m2 2 20 20"}]]};
      (hien ? HINH.hien : HINH.an).forEach(them);
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
  // Nhãn trạng thái có màu theo ý nghĩa: vàng = đang chờ, xanh dương = đã xác nhận, xanh lá = hoàn tất, cam = làm dở, đỏ = có vấn đề, xám = đã hủy hoặc ngừng.
  const MAU_TT = {cho_xac_nhan:'vang',da_xac_nhan:'xd',da_hoan_thanh:'xanh',da_huy:'xam',khong_den:'do',chua_thanh_toan:'vang',thanh_toan_mot_phan:'cam',da_thanh_toan:'xanh'};
  const tt = (ma, nhan) => el('span',{class:'tt ' + (MAU_TT[ma] || '')}, nhan);
  // Khi có thay đổi ở một trong các bảng đã nêu (qua thời gian thực, xem khu.js) thì chạy lại hàm tải của trang.
  // Hoãn lại nếu người dùng đang gõ vào ô nhập hoặc đang mở hộp thoại, để không làm mất chữ đang gõ.
  const khiDoi = (bang, fn) => {
    const ds = [].concat(bang); let cho = false;
    const dangGo = () => { const a = document.activeElement; return !!document.querySelector('dialog[open]') || (a && (a.tagName === 'TEXTAREA' || a.tagName === 'SELECT' || (a.tagName === 'INPUT' && !/^(checkbox|radio|button|submit)$/.test(a.type)))); };
    const chay = lan => { if (dangGo() && lan < 40) { setTimeout(() => chay(lan + 1), 1500); return; } cho = false; Promise.resolve().then(fn).catch(() => {}); };
    document.addEventListener('pethy:doi', e => { if (!ds.includes(e.detail.bang) || cho) return; cho = true; chay(0); });
  };
  window.Pethy = { khiDoi, db, thuc, el, tt, tien, gio, KHU, vaiTro, dangXuat, MAU, maSdt, xacNhan, matKhau };
})();
