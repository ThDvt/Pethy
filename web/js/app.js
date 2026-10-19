// Lõi dùng chung: khởi tạo Supabase, dựng DOM an toàn, định dạng, phân vai trò.
(function(){
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
  async function dangXuat(){ try { sessionStorage.removeItem('pethy.menu'); } catch (e) {} if (db) await db.auth.signOut(); location.href = '/'; }

  // Dữ liệu mẫu để xem giao diện khi chưa nối Supabase (chỉ dùng trên máy cá nhân).
  const MAU = {
    dich_vu:[{id:'1',ten:'Khám tổng quát',loai:'kham',gia:150000},{id:'2',ten:'Tiêm phòng',loai:'tiem',gia:50000},{id:'3',ten:'Tái khám',loai:'kham',gia:80000}],
    bac_si:[{id:'a',ho_ten:'Nguyễn Thị Lan',chuyen_mon:'Nội khoa chó mèo',gioi_thieu:null,anh_dai_dien:null},{id:'b',ho_ten:'Phạm Quốc Hưng',chuyen_mon:'Tiêm phòng và ngoại khoa nhỏ',gioi_thieu:null,anh_dai_dien:null}],
    cau_hinh:{che_do_bao_tri:'false',dat_truoc_toi_da_ngay:'30'}
  };

  window.Pethy = { db, thuc, el, tien, gio, KHU, vaiTro, dangXuat, MAU };
})();
