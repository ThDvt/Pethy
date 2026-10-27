(async function(){
  const { db, thuc, el, tien, MAU } = Pethy;
  const dv = document.getElementById('ds-dich-vu'), bs = document.getElementById('ds-bac-si');

  async function lay(){
    if (!thuc) return { dich_vu: MAU.dich_vu, bac_si: MAU.bac_si, cau_hinh: MAU.cau_hinh, danh_gia: MAU.danh_gia, mau: true };
    const [a, b, c, e] = await Promise.all([
      db.from('dich_vu').select('id,ten,loai,gia,mo_ta').eq('dang_ap_dung', true).order('loai').order('ten'),
      db.from('bac_si_cong_khai').select('id,ho_ten,chuyen_mon,gioi_thieu,anh_dai_dien,lich_lam_viec,diem_tb,so_danh_gia,trinh_do,kinh_nghiem_nam,chung_chi').order('ho_ten'),
      db.from('cau_hinh').select('khoa,gia_tri').eq('cong_khai', true),
      db.from('danh_gia_cong_khai').select('id,so_sao,nhan_xet,ten_hien_thi,ngay,tong,diem_tb').not('nhan_xet','is',null).order('ngay',{ascending:false}).limit(6)
    ]);
    if (a.error || b.error || c.error) throw new Error('Không tải được dữ liệu');
    // Lỗi khi tải đánh giá (ví dụ chưa cập nhật cơ sở dữ liệu) không làm hỏng cả trang chủ.
    return { dich_vu: a.data, bac_si: b.data, cau_hinh: Object.fromEntries(c.data.map(r => [r.khoa, r.gia_tri])), danh_gia: e.error ? [] : e.data };
  }

  try {
    const d = await lay();
    // Tranh minh họa do chủ dự án vẽ, chọn theo tên dịch vụ (không dấu). Dịch vụ chưa có tranh thì thẻ không hiện ảnh.
    const bo = t => ' ' + String(t || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd') + ' ';
    const TRANH = [[/ (tai kham|kiem tra lai)/, 'tai-kham'], [/ (tiem|vaccine|vac xin)/, 'tiem'], [/ kham/, 'kham']];
    const tranh = x => { const g = TRANH.find(r => r[0].test(bo(x.ten))); return g ? g[1] : null; };
    const MOTA = { kham:'Bác sĩ khám lâm sàng, tư vấn hướng điều trị và dặn dò cách chăm sóc bé tại nhà.',
                   tiem:'Tiêm vaccine phòng bệnh đúng lịch. Mũi tiêm được ghi vào sổ tiêm điện tử và web nhắc bạn mũi tiếp theo.' };
    const THU = ['', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy', 'Chủ nhật'];
    const lichTheoThu = l => { const m = new Map(); (l || []).forEach(c => { if (!m.has(c.thu)) m.set(c.thu, []); m.get(c.thu).push(c.tu + ' đến ' + c.den); }); return [...m].sort((a, b) => a[0] - b[0]); };
    const dongChungChi = x => String(x.chung_chi || '').split('\n').map(s => s.trim()).filter(Boolean);
    const chiTiet = x => { const l = lichTheoThu(x.lich_lam_viec), cc = dongChungChi(x);
      return el('div',{class:'bs-ct'},
        x.trinh_do ? el('div',{class:'bs-muc'}, el('h3',{}, 'Trình độ'), el('p',{}, x.trinh_do)) : null,
        x.kinh_nghiem_nam != null ? el('div',{class:'bs-muc'}, el('h3',{}, 'Kinh nghiệm'), el('p',{}, x.kinh_nghiem_nam + ' năm')) : null,
        cc.length ? el('div',{class:'bs-muc'}, el('h3',{}, 'Chứng chỉ và chứng nhận'), el('ul',{class:'bs-cc'}, cc.map(t => el('li',{}, t)))) : null,
        el('h3',{}, 'Lịch làm việc'),
        l.length ? el('ul',{class:'bs-lich'}, l.map(([t, g]) => el('li',{}, el('b',{}, THU[t]), g.join(', '))))
                 : el('p',{class:'cm'}, 'Chưa có lịch cố định. Giờ trống hiện ở bước chọn giờ khi đặt lịch.')); };
    // Khung trượt ngang: cuộn mượt bằng CSS scroll-snap, mũi tên cuộn đúng một thẻ, chuột kéo được, màn hình cảm ứng vuốt tự nhiên.
    function khungTruot(cacThe, danhTu = 'dịch vụ', lopThe = '.the-dv'){
      const lui = el('button',{type:'button',class:'truot-nut','aria-label':'Xem ' + danhTu + ' trước'}, '‹');
      const toi = el('button',{type:'button',class:'truot-nut','aria-label':'Xem ' + danhTu + ' tiếp theo'}, '›');
      const dai = el('div',{class:'truot-dai',tabindex:'0',role:'region','aria-label':'Danh sách ' + danhTu + ', cuộn ngang để xem thêm'}, ...cacThe);
      const goc = el('div',{class:'truot'}, dai, lui, toi);
      const the1 = () => dai.querySelector(lopThe);
      const buoc = () => { const t = the1(); return t ? t.getBoundingClientRect().width + parseFloat(getComputedStyle(dai).columnGap || 20) : dai.clientWidth; };
      const giam = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
      const cap = () => { const du = dai.scrollWidth - dai.clientWidth > 4; lui.hidden = toi.hidden = !du;
        lui.disabled = dai.scrollLeft <= 2; toi.disabled = dai.scrollLeft >= dai.scrollWidth - dai.clientWidth - 2;};
      let cho = 0; dai.addEventListener('scroll', () => { cancelAnimationFrame(cho); cho = requestAnimationFrame(cap); }, { passive:true });
      addEventListener('resize', cap);
      const di = h => dai.scrollBy({ left:h * buoc(), behavior: giam() ? 'auto' : 'smooth' });
      lui.addEventListener('click', () => di(-1)); toi.addEventListener('click', () => di(1));
      dai.addEventListener('keydown', e => { if (e.key === 'ArrowRight') { e.preventDefault(); di(1); } else if (e.key === 'ArrowLeft') { e.preventDefault(); di(-1); } });
      // chuột kéo; cảm ứng đã vuốt được sẵn
      let x0 = 0, s0 = 0, keo = false, daKeo = false;
      dai.addEventListener('pointerdown', e => { if (e.pointerType !== 'mouse' || e.button !== 0) return; keo = true; daKeo = false; x0 = e.clientX; s0 = dai.scrollLeft; });
      addEventListener('pointermove', e => { if (!keo) return; const dx = e.clientX - x0; if (!daKeo && Math.abs(dx) > 5) { daKeo = true; dai.classList.add('dang-keo'); } if (daKeo) dai.scrollLeft = s0 - dx; });
      addEventListener('pointerup', () => { if (!keo) return; keo = false; if (!daKeo) return; const b = buoc(), dich = Math.round(dai.scrollLeft / b) * b;
        dai.classList.remove('dang-keo'); dai.scrollTo({ left:dich, behavior: giam() ? 'auto' : 'smooth' }); setTimeout(() => { daKeo = false; }, 0); });
      dai.addEventListener('click', e => { if (daKeo) { e.preventDefault(); e.stopPropagation(); } }, true);
      requestAnimationFrame(cap); return goc;
    }
    const MAUNEN = ['var(--hong)','var(--bac)','var(--kem2)'];
    // Nút trên thẻ nhớ lựa chọn của khách để trang đặt lịch chọn sẵn (lưu tạm trong trình duyệt, 7 ngày).
    const nho = o => () => { try { localStorage.setItem('pethy_y_dinh', JSON.stringify({ ...o, t: Date.now() })); } catch (_) {} };
    // Mọi dịch vụ đang áp dụng. Vừa 3 thẻ thì chia đều chiều ngang; nhiều hơn thì trượt ngang (kéo, vuốt hoặc bấm mũi tên).
    const chinh = (d.dich_vu || []).filter(x => x.ten);
    const the = (chinh.length ? chinh : [el('p',{class:'ghi-chu'},'Chưa có dịch vụ.')]).map((x,i) =>
      x.ten ? el('div',{class:'the-dv'},
        tranh(x) ? el('img',{class:'anh-dv',src:'/img/dv/'+tranh(x)+'.jpg',alt:'Minh họa dịch vụ '+x.ten,width:560,height:560,loading:'lazy'}) : null,
        el('div',{class:'ten'}, x.ten),
        el('div',{class:'mo-ta-dv'}, x.mo_ta || MOTA[String(x.loai||'').toLowerCase()] || ''),
        el('div',{class:'gia'}, tien(x.gia)),
        el('a',{class:'nut trang',href:'/dang-nhap.html?dang-ky=1',onclick:nho({ dv:x.id }),'aria-label':'Chọn dịch vụ ' + x.ten + ' và đặt lịch'}, 'Chọn dịch vụ này ', el('span',{'aria-hidden':'true'}, '→'))) : x);
    dv.replaceChildren(khungTruot(the));
    bs.replaceChildren(khungTruot((d.bac_si.length ? d.bac_si : [el('p',{class:'ghi-chu'},'Chưa có bác sĩ.')]).map((x,i) =>
      x.ho_ten ? el('div',{class:'the-bs'},
        x.anh_dai_dien ? el('img',{class:'ava',src:x.anh_dai_dien,alt:'Ảnh bác sĩ '+x.ho_ten,loading:'lazy'})
          : el('div',{class:'ava','aria-hidden':'true',style:'background:'+MAUNEN[i%3]}, x.ho_ten.trim().split(/\s+/).pop().charAt(0).toUpperCase()),
        el('div',{class:'ten'}, 'Bs. ' + x.ho_ten),
        x.so_danh_gia ? el('div',{class:'diem-bs'}, Pethy.sao(x.diem_tb), el('span',{}, Number(x.diem_tb).toFixed(1) + ' (' + x.so_danh_gia + ' đánh giá)')) : null,
        (x.chuyen_mon || x.kinh_nghiem_nam != null) ? el('div',{class:'cm'}, [x.chuyen_mon, x.kinh_nghiem_nam != null ? x.kinh_nghiem_nam + ' năm kinh nghiệm' : null].filter(Boolean).join(' · ')) : null,
        el('div',{class:'cm gt-ngan',id:'gt-' + i}, x.gioi_thieu || 'Bác sĩ chưa cập nhật phần giới thiệu.'),
        chiTiet(x),
        el('div',{class:'nut-bs'},
          (() => { const b = el('button',{class:'lien-ket',type:'button','aria-expanded':'false','aria-label':'Xem thông tin bác sĩ ' + x.ho_ten}, 'Xem thông tin');
            b.addEventListener('click', () => { const c = b.closest('.the-bs'), dai = c.closest('.truot-dai');
              // Các thẻ cùng hàng bị kéo cao bằng nhau; ghi nhớ chiều cao lúc đóng để thẻ khác không giãn theo thẻ đang mở.
              if (dai && !dai.querySelector('.the-bs.mo')) dai.style.setProperty('--cao-dong', c.getBoundingClientRect().height + 'px');
              const mo = c.classList.toggle('mo'); if (dai) dai.classList.toggle('co-mo', !!dai.querySelector('.the-bs.mo')); b.setAttribute('aria-expanded', String(mo)); b.textContent = mo ? 'Thu gọn' : 'Xem thông tin'; });
            return b; })(),
          el('a',{class:'nut trang',href:'/dang-nhap.html?dang-ky=1',onclick:nho({ bs:x.id }),'aria-label':'Đặt lịch với bác sĩ ' + x.ho_ten}, 'Đặt lịch ', el('span',{'aria-hidden':'true'}, '→')))) : x), 'bác sĩ', '.the-bs'));
    // Góc thú y: tối đa 3 bài mới nhất; lỗi hoặc chưa có bài thì ẩn cả mục, không ảnh hưởng phần còn lại của trang chủ.
    try {
      const bv = !thuc ? (MAU.bai_viet || []).slice(0, 3)
        : (await db.from('bai_viet').select('id,tieu_de,nhom,tom_tat,noi_dung,anh_bia,ngay_dang').eq('trang_thai','da_dang').order('ngay_dang',{ascending:false}).limit(3)).data || [];
      if (bv.length) { document.getElementById('ds-bai-viet').replaceChildren(khungTruot(bv.map(Pethy.baiVietThe), 'bài viết', '.the-bv')); document.getElementById('goc-thu-y').hidden = false; }
    } catch (_) {}
    if (d.danh_gia && d.danh_gia.length) {
      const g = d.danh_gia[0];
      document.getElementById('dg-tong').replaceChildren(Pethy.sao(g.diem_tb), ' ' + Number(g.diem_tb).toFixed(1) + ' trên 5, từ ' + g.tong + ' đánh giá của chủ nuôi sau khi khám.');
      document.getElementById('ds-danh-gia').replaceChildren(...d.danh_gia.map(x => el('figure',{class:'the-dg'},
        Pethy.sao(x.so_sao), el('blockquote',{}, x.nhan_xet),
        el('figcaption',{}, x.ten_hien_thi + ', ' + new Date(x.ngay).toLocaleDateString('vi-VN',{month:'2-digit',year:'numeric',timeZone:'Asia/Ho_Chi_Minh'})))));
      document.getElementById('danh-gia').hidden = false;
    }
    // Ca làm việc của bác sĩ trong hôm nay (lấy từ lịch làm việc công khai; giờ còn trống chỉ xem được sau khi đăng nhập).
    const hn = new Date(), thuVN = { Mon:1, Tue:2, Wed:3, Thu:4, Fri:5, Sat:6, Sun:7 }[hn.toLocaleDateString('en-US', { weekday:'short', timeZone:'Asia/Ho_Chi_Minh' })];
    const ngayVN = hn.toLocaleDateString('vi-VN', { weekday:'long', day:'2-digit', month:'2-digit', timeZone:'Asia/Ho_Chi_Minh' });
    const homNay = (d.bac_si || []).map(b => ({ ten:b.ho_ten, ca:(b.lich_lam_viec || []).filter(c => c.thu === thuVN) })).filter(b => b.ca.length);
    document.getElementById('hn-ngay').textContent = homNay.length ? 'Ca làm việc ' + ngayVN + '. Đăng nhập để xem giờ còn trống và chọn giờ.' : 'Hôm nay (' + ngayVN + ') chưa có bác sĩ trực. Bạn vẫn đặt được lịch cho những ngày tới.';
    document.getElementById('hn-ds').replaceChildren(...homNay.map(b => el('li',{}, el('span',{}, 'Bs. ' + b.ten), el('span',{class:'so'}, b.ca.map(c => c.tu + ' đến ' + c.den).join(', ')))));
    const n = d.cau_hinh.dat_truoc_toi_da_ngay;
    if (n) document.getElementById('dat-truoc').textContent = 'Nhận lịch hẹn trước tối đa ' + n + ' ngày.';
    if (d.cau_hinh.che_do_bao_tri === 'true') {
      document.getElementById('bao-tri-nd').textContent = d.cau_hinh.thong_bao_bao_tri || 'Hệ thống đang bảo trì.';
      document.getElementById('bao-tri').hidden = false;
    }
  } catch (e) {
    const loi = el('p',{class:'loi'}, 'Không tải được dữ liệu. Vui lòng tải lại trang.');
    dv.replaceChildren(loi.cloneNode(true)); bs.replaceChildren(loi);
  }
})();
