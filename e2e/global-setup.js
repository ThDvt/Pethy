import { createClient } from '@supabase/supabase-js';
import { CFG, TK, VAI, kiemTraKhongPhaiHeThongThat } from './helpers.js';

// Chuẩn bị tài khoản thử (chạy lại nhiều lần vẫn an toàn): tạo nếu chưa có, rồi admin gán vai trò.
// Cần: project thử đã chạy db/01..10, TẮT "Confirm email" ở Authentication > Providers > Email, và admin thử đã được nâng quyền bằng SQL một lần.
export default async function(){
  kiemTraKhongPhaiHeThongThat();
  const tao = () => createClient(CFG.url, CFG.anon, { auth: { persistSession: false, autoRefreshToken: false } });
  const admin = tao();
  const dn = await admin.auth.signInWithPassword({ email: TK.admin.email, password: TK.admin.matKhau });
  if (dn.error) throw new Error('Admin thử không đăng nhập được: ' + dn.error.message);
  const vt = await admin.rpc('vai_tro_hieu_luc');
  if (vt.data !== 'admin') throw new Error('Tài khoản E2E_ADMIN_EMAIL chưa có vai trò admin. Chạy SQL nâng quyền một lần (docs/kiem-thu-tu-dong.md).');
  for (const v of VAI) {
    const t = TK[v], c = tao();
    let r = await c.auth.signInWithPassword({ email: t.email, password: t.matKhau });
    if (r.error) {
      r = await c.auth.signUp({ email: t.email, password: t.matKhau, options: { data: { ho_ten: t.ten, so_dien_thoai: '0901234567' } } });
      if (r.error) throw new Error(`Không tạo được tài khoản thử ${v}: ${r.error.message}`);
      if (!r.data.session) throw new Error('Supabase yêu cầu xác nhận email. Hãy TẮT "Confirm email" ở project thử.');
    }
    const id = r.data.user.id;
    if (v !== 'chu_nuoi') {
      const g = await admin.rpc('dat_vai_tro', { p_tai_khoan: id, p_vai_tro: v });
      if (g.error && !/KHONG_THAY_DOI/.test(g.error.message + (g.error.details || ''))) throw new Error(`Không gán được vai trò ${v}: ${g.error.message}`);
    }
  }
}
