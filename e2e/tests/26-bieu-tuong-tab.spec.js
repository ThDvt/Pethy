import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

// Mọi trang đều phải khai báo biểu tượng thẻ trình duyệt, nếu không trình duyệt hiện logo trái đất xám.
test('mọi trang HTML đều có biểu tượng thẻ trình duyệt', () => {
  const goc = new URL('../../web/', import.meta.url).pathname;
  const ds = [];
  (function duyet(d){ for (const f of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, f.name);
    if (f.isDirectory()) duyet(p); else if (f.name.endsWith('.html')) ds.push(p);
  } })(goc);
  expect(ds.length).toBeGreaterThan(20);
  const thieu = ds.filter(p => !/<link[^>]+rel="icon"[^>]*href="\/img\/logo\.svg"/.test(fs.readFileSync(p, 'utf8'))).map(p => path.relative(goc, p));
  expect(thieu).toEqual([]);
});
