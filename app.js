/* ============================================================
   4D MART — App v0.1.0
   ============================================================ */

const CONFIG = {
  SHEET_ID: '1wQn5TNnUWq7zHA-69pw1i3svSk_3qOL_cOCLvMe4NMY',
  SHEET_NAME: 'Products',
  WA_NUMBER: '6285863710179',
  STORE_NAME: '4D Mart',
};

const state = {
  products: [],
  cart: loadCart(),
  category: 'Semua',
  query: '',
};

/* ---------- Helpers ---------- */
const $  = (s) => document.querySelector(s);
const $$ = (s) => document.querySelectorAll(s);

const formatRp = (n) =>
  new Intl.NumberFormat('id-ID', {
    style: 'currency', currency: 'IDR',
    minimumFractionDigits: 0, maximumFractionDigits: 0,
  }).format(n);

function showToast(msg, ms = 2200) {
  const t = $('#toast');
  $('#toastMsg').textContent = msg;
  t.hidden = false;
  clearTimeout(showToast._t);
  showToast._t = setTimeout(() => { t.hidden = true; }, ms);
}

function loadCart() {
  try { return JSON.parse(localStorage.getItem('4dmart_cart') || '[]'); }
  catch { return []; }
}
function saveCart() {
  localStorage.setItem('4dmart_cart', JSON.stringify(state.cart));
}

/* ---------- Fetch Products ---------- */
async function fetchProducts() {
  try {
    const url = `https://docs.google.com/spreadsheets/d/${CONFIG.SHEET_ID}/gviz/tq?tqx=out:json&sheet=${CONFIG.SHEET_NAME}`;
    const res = await fetch(url);
    const txt = await res.text();
    const json = JSON.parse(txt.match(/setResponse\((.*)\)/s)[1]);
    const cols = json.table.cols.map((c) => c.label || c.id);

    return json.table.rows.map((row, i) => {
      const o = {};
      cols.forEach((c, j) => { o[c] = row.c[j] ? row.c[j].v : null; });

      // Max 3 gambar
      const images = [o.image1, o.image2, o.image3].filter(Boolean);

      return {
        id: String(o.id || `p-${i}`),
        name: o.name || 'Tanpa Nama',
        price: Number(o.price) || 0,
        stock: Number(o.stock) || 0,
        category: o.category || 'Lainnya',
        description: o.description || '',
        images: images.length ? images.slice(0, 3) : ['https://placehold.co/600x600/F3F4F6/9CA3AF?text=No+Image'],
        link: o.link || '',
      };
    });
  } catch (err) {
    console.warn('Fallback ke products.json:', err);
    const res = await fetch('data/products.json');
    return res.json();
  }
}

/* ---------- Stock badge ---------- */
function stockStatus(stock) {
  return stock > 0
    ? { label: 'Tersedia', cls: 'ok', icon: 'fa-circle-check' }
    : { label: 'Habis',    cls: 'out', icon: 'fa-circle-xmark' };
}

/* ---------- Render Chips ---------- */
function renderChips() {
  const cats = ['Semua', ...new Set(state.products.map((p) => p.category))];
  const icons = {
    'Semua': 'fa-border-all',
    'Makanan': 'fa-utensils',
    'Minuman': 'fa-mug-hot',
    'Sembako': 'fa-basket-shopping',
    'Perawatan': 'fa-soap',
    'Snack': 'fa-cookie-bite',
  };
  $('#chips').innerHTML = cats.map((c) => `
    <button class="chip ${c === state.category ? 'chip--active' : ''}" data-cat="${c}">
      <i class="fas ${icons[c] || 'fa-tag'}"></i>
      ${c}
    </button>`).join('');
}

/* ---------- Render Grid ---------- */
function renderGrid() {
  const list = state.products.filter((p) => {
    const matchCat = state.category === 'Semua' || p.category === state.category;
    const matchQ = !state.query || p.name.toLowerCase().includes(state.query.toLowerCase());
    return matchCat && matchQ;
  });

  $('#countText').textContent = `${list.length} produk`;

  if (!list.length) {
    $('#grid').innerHTML = '';
    $('#empty').hidden = false;
    return;
  }
  $('#empty').hidden = true;

  $('#grid').innerHTML = list.map((p, i) => {
    const s = stockStatus(p.stock);
    const out = p.stock <= 0;

    let ribbon = '';
    if (out) ribbon = `<span class="card__ribbon card__ribbon--out"><i class="fas fa-ban"></i>Habis</span>`;

    return `
      <article class="card" data-id="${p.id}" style="animation-delay:${i * 0.03}s">
        <div class="card__img">
          <img src="${p.images[0]}" alt="${p.name}" loading="lazy" />
          ${ribbon}
        </div>
        <div class="card__body">
          <h3 class="card__name">${p.name}</h3>
          <p class="card__price">${formatRp(p.price)}</p>
          <span class="card__status card__status--${s.cls}">
            <i class="fas ${s.icon}"></i>${s.label}
          </span>
          <button class="card__btn" data-add="${p.id}" ${out ? 'disabled' : ''}>
            <i class="fas ${out ? 'fa-ban' : 'fa-cart-plus'}"></i>
            ${out ? 'Stok Habis' : 'Keranjang'}
          </button>
        </div>
      </article>`;
  }).join('');
}

/* ---------- Modal Detail ---------- */
function openDetail(id) {
  const p = state.products.find((x) => x.id === id);
  if (!p) return;

  const s = stockStatus(p.stock);
  const out = p.stock <= 0;

  const slides = p.images.map((img) => `
    <div class="pd__slide"><img src="${img}" alt="${p.name}" /></div>`).join('');

  const dots = p.images.length > 1
    ? `<div class="pd__dots" id="pdDots">${p.images.map((_, i) =>
        `<span class="pd__dot ${i === 0 ? 'pd__dot--active' : ''}"></span>`).join('')}</div>`
    : '';

  $('#modalContent').innerHTML = `
    <div class="pd__gallery">
      <div class="pd__track" id="pdTrack">${slides}</div>
      ${dots}
    </div>
    <div class="pd__body">
      <h2 class="pd__name">${p.name}</h2>
      <p class="pd__price">${formatRp(p.price)}</p>
      <div class="pd__stats">
        <div class="pd__stat">
          <span class="pd__stat-label">Status</span>
          <span class="pd__stat-value pd__stat-value--${s.cls}">
            <i class="fas ${s.icon}"></i>${s.label}
          </span>
        </div>
        <div class="pd__stat">
          <span class="pd__stat-label">Kategori</span>
          <span class="pd__stat-value">${p.category}</span>
        </div>
      </div>
      <div class="pd__section-title">Deskripsi</div>
      <p class="pd__desc">${p.description || 'Belum ada deskripsi produk.'}</p>
      <div class="pd__actions">
        <button class="btn btn--primary btn--full" data-add="${p.id}" ${out ? 'disabled' : ''}>
          <i class="fas ${out ? 'fa-ban' : 'fa-cart-plus'}"></i>
          ${out ? 'Stok Habis' : 'Tambah ke Keranjang'}
        </button>
      </div>
    </div>`;

  $('#modal').hidden = false;
  document.body.style.overflow = 'hidden';

  const track = $('#pdTrack');
  const dotEls = $$('#pdDots .pd__dot');
  if (track && dotEls.length) {
    track.addEventListener('scroll', () => {
      const idx = Math.round(track.scrollLeft / track.clientWidth);
      dotEls.forEach((d, i) => d.classList.toggle('pd__dot--active', i === idx));
    });
  }
}

function closeModal() {
  $('#modal').hidden = true;
  document.body.style.overflow = '';
}

/* ---------- Cart ---------- */
function addToCart(id, qty = 1) {
  const p = state.products.find((x) => x.id === id);
  if (!p || p.stock <= 0) return showToast('Stok habis 😔');

  const item = state.cart.find((x) => x.id === id);
  if (item) item.qty = Math.min(item.qty + qty, p.stock);
  else state.cart.push({
    id: p.id, name: p.name, price: p.price,
    image: p.images[0], link: p.link, qty: Math.min(qty, p.stock),
  });

  saveCart();
  updateCartUI();
  showToast(`${p.name} ditambahkan`);
}

function changeQty(id, delta) {
  const item = state.cart.find((x) => x.id === id);
  const p = state.products.find((x) => x.id === id);
  if (!item) return;
  const max = p ? p.stock : 99;
  item.qty = Math.max(1, Math.min(item.qty + delta, max));
  saveCart();
  updateCartUI();
}

function removeItem(id) {
  state.cart = state.cart.filter((x) => x.id !== id);
  saveCart();
  updateCartUI();
  showToast('Item dihapus');
}

const cartCount = () => state.cart.reduce((s, i) => s + i.qty, 0);
const cartTotal = () => state.cart.reduce((s, i) => s + i.price * i.qty, 0);

function updateCartUI() {
  const count = cartCount();

  const appBadge = $('#cartBadge');
  appBadge.textContent = count;
  appBadge.hidden = count === 0;

  const navBadge = $('#navBadge');
  if (navBadge) {
    navBadge.textContent = count;
    navBadge.hidden = count === 0;
  }

  const body = $('#cartBody');
  const foot = $('#cartFoot');

  if (!state.cart.length) {
    body.innerHTML = `
      <div class="cart-empty">
        <div class="cart-empty__icon"><i class="fas fa-bag-shopping"></i></div>
        <p class="cart-empty__text">Keranjang masih kosong</p>
        <p class="cart-empty__hint">Yuk pilih produk dulu</p>
      </div>`;
    foot.hidden = true;
    return;
  }

  body.innerHTML = state.cart.map((i) => `
    <div class="ci">
      <div class="ci__img"><img src="${i.image}" alt="${i.name}" /></div>
      <div class="ci__info">
        <div class="ci__name">${i.name}</div>
        <div class="ci__price">${formatRp(i.price)}</div>
        <div class="ci__ctrls">
          <button class="ci__qty-btn" data-dec="${i.id}"><i class="fas fa-minus"></i></button>
          <span class="ci__qty">${i.qty}</span>
          <button class="ci__qty-btn" data-inc="${i.id}"><i class="fas fa-plus"></i></button>
          <button class="ci__remove" data-del="${i.id}">Hapus</button>
        </div>
      </div>
    </div>`).join('');

  $('#cartTotal').textContent = formatRp(cartTotal());
  foot.hidden = false;
}

/* ---------- Checkout ---------- */
function checkout() {
  if (!state.cart.length) return showToast('Keranjang kosong');

  const lines = [
    `Halo *${CONFIG.STORE_NAME}*, saya mau pesan:`,
    '',
  ];

  state.cart.forEach((i, idx) => {
    const sub = i.price * i.qty;
    lines.push(`${idx + 1}. *${i.name}*`);
    lines.push(`   ${i.qty} × ${formatRp(i.price)} = ${formatRp(sub)}`);
    if (i.link) lines.push(`   Link: ${i.link}`);
    lines.push('');
  });

  lines.push('━━━━━━━━━━━━━━━');
  lines.push(`*TOTAL: ${formatRp(cartTotal())}*`);
  lines.push('━━━━━━━━━━━━━━━');
  lines.push('');
  lines.push('Mohon konfirmasi pesanan saya. Terima kasih 🙏');

  const url = `https://wa.me/${CONFIG.WA_NUMBER}?text=${encodeURIComponent(lines.join('\n'))}`;
  window.open(url, '_blank');
}

/* ---------- Bottom Nav ---------- */
function bindBottomNav() {
  $$('.nav-item').forEach((item) => {
    item.addEventListener('click', () => {
      const nav = item.dataset.nav;
      if (nav === 'cart') {
        openDrawer();
      } else if (nav === 'wa') {
        const wa = `https://wa.me/${CONFIG.WA_NUMBER}?text=${encodeURIComponent('Halo 4D Mart 👋')}`;
        window.open(wa, '_blank');
      } else if (nav === 'category') {
        // Scroll ke chips
        $('#chips').scrollIntoView({ behavior: 'smooth', block: 'start' });
      } else {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
      // Update active state (kecuali category yang scroll)
      if (nav === 'home') {
        $$('.nav-item').forEach((n) => n.classList.remove('nav-item--active'));
        item.classList.add('nav-item--active');
      }
    });
  });
}

/* ---------- Drawer ---------- */
function openDrawer() {
  $('#drawer').hidden = false;
  document.body.style.overflow = 'hidden';
  updateCartUI();
}
function closeDrawer() {
  $('#drawer').hidden = true;
  document.body.style.overflow = '';
}

/* ---------- Events ---------- */
function bind() {
  // Appbar scroll shadow
  const appbar = $('#appbar');
  window.addEventListener('scroll', () => {
    appbar.classList.toggle('appbar--scrolled', window.scrollY > 8);
  }, { passive: true });

  // Search
  const searchInput = $('#searchInput');
  const searchClear = $('#searchClear');
  searchInput.addEventListener('input', (e) => {
    state.query = e.target.value.trim();
    searchClear.hidden = !state.query;
    renderGrid();
  });
  searchClear.addEventListener('click', () => {
    searchInput.value = '';
    state.query = '';
    searchClear.hidden = true;
    renderGrid();
    searchInput.focus();
  });

  // Chips
  $('#chips').addEventListener('click', (e) => {
    const c = e.target.closest('[data-cat]');
    if (!c) return;
    state.category = c.dataset.cat;
    renderChips();
    renderGrid();
  });

  // Grid card click & add btn
  $('#grid').addEventListener('click', (e) => {
    const addBtn = e.target.closest('[data-add]');
    if (addBtn) { e.stopPropagation(); addToCart(addBtn.dataset.add); return; }

    const card = e.target.closest('.card');
    if (card) openDetail(card.dataset.id);
  });

  // Modal add
  $('#modalContent').addEventListener('click', (e) => {
    const addBtn = e.target.closest('[data-add]');
    if (addBtn) { addToCart(addBtn.dataset.add); closeModal(); }
  });

  // Close handlers
  $$('[data-close]').forEach((el) =>
    el.addEventListener('click', () => {
      closeModal();
      closeDrawer();
    })
  );

  // Cart open
  $('#cartBtn').addEventListener('click', openDrawer);

  // Cart item controls
  $('#cartBody').addEventListener('click', (e) => {
    const inc = e.target.closest('[data-inc]');
    const dec = e.target.closest('[data-dec]');
    const del = e.target.closest('[data-del]');
    if (inc) changeQty(inc.dataset.inc, +1);
    if (dec) changeQty(dec.dataset.dec, -1);
    if (del) removeItem(del.dataset.del);
  });

  // Checkout
  $('#checkoutBtn').addEventListener('click', checkout);

  // ESC
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeModal();
      closeDrawer();
    }
  });

  // Bottom nav
  bindBottomNav();
}

/* ---------- PWA Service Worker ---------- */
function registerSW() {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('service-worker.js').catch((err) => {
        console.warn('SW registration failed:', err);
      });
    });
  }
}

/* ---------- Init ---------- */
async function init() {
  $('#grid').innerHTML = '<p style="grid-column:1/-1;text-align:center;padding:40px;color:#9CA3AF;">Memuat produk...</p>';

  state.products = await fetchProducts();
  renderChips();
  renderGrid();
  updateCartUI();
  bind();
  registerSW();
}

init();