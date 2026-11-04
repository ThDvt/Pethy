// "Quay lại" về đúng trang trước đó nếu người dùng đến từ một trang của Pethy; mở thẳng thì về trang chủ.
document.getElementById('quay-lai').addEventListener('click', e => {
  let tuPethy = false;
  try { tuPethy = !!document.referrer && new URL(document.referrer).origin === location.origin; } catch (x) { /* bỏ qua */ }
  if (tuPethy && history.length > 1) { e.preventDefault(); history.back(); }
});
