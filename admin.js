/* ============================================================
   4D MART — Admin Panel v0.1.0
   ============================================================ */

const ADMIN = {
  SHEET_ID: '1wQn5TNnUWq7zHA-69pw1i3svSk_3qOL_cOCLvMe4NMY',
  SHEET_NAME: 'Products',
  APPS_SCRIPT_URL: 'https://script.google.com/macros/s/AKfycbxP21WXPKJmxLf2JxAJZopYpZmpWNMSM1NfXZUs2ZJGKc0zoxoTXnoVdV8pQ5-WvswWnQ/exec',
};

const $ = (s) => document.querySelector(s);
let products = [];

const formatRp = (n) =>
  new Intl.NumberFormat('id-ID', {
    style: 'currency', currency: 'IDR',
    minimumFractionDigits: 0, maximumFractionDigits: 0,
  }).format(n);

function showToast(msg, ms = 2400) {
  const t = $('#toast');
  $('#toastMsg').textContent = msg;
  t.hidden = false;
  clearTimeout(showToast._t);
  showToast._t = setTimeout(() => { t.hidden = true; }, ms);
}

async function fetchProducts() {
  try {
    const url = `https://docs.google.com/spreadsheets/d/${ADMIN.SHEET_ID}/gviz/tq?tqx=out:json&sheet=${ADMIN.SHEET_NAME}`;
    const res = await fetch(url);
    const txt = await res.text();
    const json = JSON.parse(txt.match(/setResponse\((.*)\)/s)[1]);
    const cols = json.table.cols.map((c) => c.label || c.id);

    return json.table.rows.map((row, i) => {
      const o = {};
      cols.forEach((c, j) => { o[c] = row.c[j] ? row.c[j].v : null; });
      const images = [o.image1, o.image2, o.image3].filter(Boolean);
      return {
        id: String(o.id || `p-${i}`),
        name: o.name || '',
        price: Number(o.price) || 0,
        stock: Number(o.stock) || 0,
        category: o.category || '',
        description: o.description || '',
        images: images.slice(0, 3),
        link: o.link || '',
      };
    });
  } catch (err) {
    console.error(err);
    showToast('Gagal memuat produk');
    return [];
  }
}

function renderTable() {
  const tbody = $('#tbody');
  if (!products.length) {
    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:32px;color:#9CA3AF;">Belum ada produk</td></tr>';
    return;
  }
  tbody.innerHTML = products.map((p) => {
    const status = p.stock > 0
      ? '<span style="color:var(--primary);font-weight:700;"><i class="fas fa-circle-check"></i> Tersedia</span>'
      : '<span style="color:var(--danger);font-weight:700;"><i class="fas fa-circle-xmark"></i> Habis</span>';
    return `
      <tr>
        <td style="font-weight:700;">${p.name}</td>
        <td>${p.category}</td>
        <td style="font-weight:800;color:var(--primary);">${formatRp(p.price)}</td>
        <td>${status}</td>
        <td class="actions">
          <button class="btn-sm btn-sm--edit" data-edit="${p.id}">
            <i class="fas fa-pen"></i> Edit
          </button>
          <button class="btn-sm btn-sm--del" data-del="${p.id}">
            <i class="fas fa-trash"></i> Hapus
          </button>
        </td>
      </tr>`;
  }).join('');
}

function fillForm(p) {
  $('#editId').value = p.id;
  $('#name').value = p.name;
  $('#category').value = p.category;
  $('#price').value = p.price;
  $('#stock').value = p.stock;
  $('#link').value = p.link || '';
  $('#description').value = p.description || '';
  $('#images').value = p.images.join(', ');
  $('#formTitle').innerHTML = '<i class="fas fa-pen"></i> Edit Produk';
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function resetForm() {
  $('#form').reset();
  $('#editId').value = '';
  $('#formTitle').innerHTML = '<i class="fas fa-plus-circle"></i> Tambah Produk Baru';
}

async function submitForm(e) {
  e.preventDefault();
  const id = $('#editId').value;
  const images = $('#images').value.split(',').map((s) => s.trim()).filter(Boolean).slice(0, 3);

  const payload = {
    action: id ? 'update' : 'create',
    id,
    name: $('#name').value.trim(),
    category: $('#category').value.trim(),
    price: Number($('#price').value),
    stock: Number($('#stock').value),
    link: $('#link').value.trim(),
    description: $('#description').value.trim(),
    image1: images[0] || '',
    image2: images[1] || '',
    image3: images[2] || '',
  };

  try {
    const res = await fetch(ADMIN.APPS_SCRIPT_URL, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    const result = await res.json();
    if (result.success) {
      showToast(id ? 'Produk diperbarui' : 'Produk ditambahkan');
      resetForm();
      await load();
    } else {
      showToast('Gagal: ' + (result.message || 'Unknown'));
    }
  } catch (err) {
    console.error(err);
    showToast('Gagal terhubung ke server');
  }
}

async function deleteProduct(id) {
  if (!confirm('Yakin hapus produk ini?')) return;
  try {
    const res = await fetch(ADMIN.APPS_SCRIPT_URL, {
      method: 'POST',
      body: JSON.stringify({ action: 'delete', id }),
    });
    const result = await res.json();
    if (result.success) {
      showToast('Produk dihapus');
      await load();
    } else {
      showToast('Gagal: ' + (result.message || 'Unknown'));
    }
  } catch (err) {
    console.error(err);
    showToast('Gagal terhubung ke server');
  }
}

function bind() {
  $('#form').addEventListener('submit', submitForm);
  $('#resetBtn').addEventListener('click', resetForm);

  $('#tbody').addEventListener('click', (e) => {
    const edit = e.target.closest('[data-edit]');
    const del = e.target.closest('[data-del]');
    if (edit) {
      const p = products.find((x) => x.id === edit.dataset.edit);
      if (p) fillForm(p);
    }
    if (del) deleteProduct(del.dataset.del);
  });
}

async function load() {
  products = await fetchProducts();
  renderTable();
}

async function init() {
  await load();
  bind();
}
init();