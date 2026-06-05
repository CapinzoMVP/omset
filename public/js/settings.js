const state = {
  categories: [],
  cashiers: []
};

const elements = {
  status: document.querySelector('#settingsStatus'),
  olseraToken: document.querySelector('#olseraToken'),
  tokenStatus: document.querySelector('#tokenStatus'),
  workerKey: document.querySelector('#workerKey'),
  saveTokenButton: document.querySelector('#saveTokenButton'),
  categoryForm: document.querySelector('#categoryForm'),
  categoryId: document.querySelector('#categoryId'),
  groupId: document.querySelector('#groupId'),
  categoryName: document.querySelector('#categoryName'),
  productionArea: document.querySelector('#productionArea'),
  itemType: document.querySelector('#itemType'),
  resetCategoryButton: document.querySelector('#resetCategoryButton'),
  categoryRows: document.querySelector('#categoryRows'),
  cashierForm: document.querySelector('#cashierForm'),
  cashierName: document.querySelector('#cashierName'),
  cashierRows: document.querySelector('#cashierRows')
};

function setStatus(message, isError = false) {
  elements.status.textContent = message;
  elements.status.classList.toggle('text-danger', isError);
  elements.status.classList.toggle('text-muted', !isError);
}

async function requestJson(url, options = {}) {
  const response = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {})
    },
    ...options
  });
  const result = await response.json();

  if (!response.ok || !result.success) {
    throw new Error(result.message || 'Request gagal.');
  }

  return result.data;
}

function resetCategoryForm() {
  elements.categoryId.value = '';
  elements.groupId.value = '';
  elements.categoryName.value = '';
  elements.productionArea.value = 'Bar';
  elements.itemType.value = 'Minuman';
}

function editCategory(id) {
  const category = state.categories.find(item => item.id === id);

  if (!category) {
    return;
  }

  elements.categoryId.value = category.id;
  elements.groupId.value = category.olsera_group_id;
  elements.categoryName.value = category.category_name;
  elements.productionArea.value = category.production_area;
  elements.itemType.value = category.item_type;
}

async function deleteCategory(id) {
  if (!confirm('Hapus kategori ini?')) {
    return;
  }

  try {
    await requestJson(`/api/settings/categories/${id}`, { method: 'DELETE' });
    setStatus('Kategori dihapus.');
    await loadCategories();
  } catch (error) {
    setStatus(error.message, true);
  }
}

async function deleteCashier(id) {
  if (!confirm('Hapus kasir billiard ini?')) {
    return;
  }

  try {
    await requestJson(`/api/settings/billiard-cashiers/${id}`, { method: 'DELETE' });
    setStatus('Kasir billiard dihapus.');
    await loadCashiers();
  } catch (error) {
    setStatus(error.message, true);
  }
}

function renderCategories() {
  elements.categoryRows.innerHTML = '';

  if (!state.categories.length) {
    elements.categoryRows.innerHTML = '<tr><td colspan="5" class="text-muted">Belum ada kategori.</td></tr>';
    return;
  }

  for (const category of state.categories) {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${category.olsera_group_id}</td>
      <td>${category.category_name}</td>
      <td>${category.production_area}</td>
      <td>${category.item_type}</td>
      <td class="text-end">
        <button class="btn btn-sm btn-outline-primary" data-action="edit-category" data-id="${category.id}" type="button">Edit</button>
        <button class="btn btn-sm btn-outline-danger" data-action="delete-category" data-id="${category.id}" type="button">Hapus</button>
      </td>
    `;
    elements.categoryRows.appendChild(tr);
  }
}

function renderCashiers() {
  elements.cashierRows.innerHTML = '';

  if (!state.cashiers.length) {
    elements.cashierRows.innerHTML = '<tr><td colspan="2" class="text-muted">Belum ada kasir billiard.</td></tr>';
    return;
  }

  for (const cashier of state.cashiers) {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${cashier.cashier_name}</td>
      <td class="text-end">
        <button class="btn btn-sm btn-outline-danger" data-action="delete-cashier" data-id="${cashier.id}" type="button">Hapus</button>
      </td>
    `;
    elements.cashierRows.appendChild(tr);
  }
}

async function loadCategories() {
  state.categories = await requestJson('/api/settings/categories');
  renderCategories();
}

async function loadCashiers() {
  state.cashiers = await requestJson('/api/settings/billiard-cashiers');
  renderCashiers();
}

async function loadTokenStatus() {
  const status = await requestJson('/api/settings/olsera-token/status');
  const updatedAt = status.last_updated ? `Terakhir update: ${status.last_updated}` : 'Belum pernah diisi';
  elements.tokenStatus.textContent = `${updatedAt}. Panjang token: ${status.token_length || 0} karakter.`;
}

async function saveOlseraToken() {
  const token = elements.olseraToken.value.trim();
  const workerKey = elements.workerKey.value.trim();

  if (!token || !workerKey) {
    setStatus('Token dan Worker Key wajib diisi.', true);
    return;
  }

  try {
    await requestJson('/api/settings/olsera-token', {
      method: 'POST',
      headers: {
        'X-Worker-Key': workerKey
      },
      body: JSON.stringify({ token })
    });
    elements.olseraToken.value = '';
    setStatus('Token Olsera disimpan.');
    await loadTokenStatus();
  } catch (error) {
    setStatus(error.message, true);
  }
}

elements.categoryForm.addEventListener('submit', async event => {
  event.preventDefault();

  const id = elements.categoryId.value;
  const payload = {
    olsera_group_id: elements.groupId.value.trim(),
    category_name: elements.categoryName.value.trim(),
    production_area: elements.productionArea.value,
    item_type: elements.itemType.value
  };

  try {
    await requestJson(id ? `/api/settings/categories/${id}` : '/api/settings/categories', {
      method: id ? 'PUT' : 'POST',
      body: JSON.stringify(payload)
    });
    resetCategoryForm();
    setStatus('Kategori disimpan.');
    await loadCategories();
  } catch (error) {
    setStatus(error.message, true);
  }
});

elements.cashierForm.addEventListener('submit', async event => {
  event.preventDefault();

  try {
    await requestJson('/api/settings/billiard-cashiers', {
      method: 'POST',
      body: JSON.stringify({
        cashier_name: elements.cashierName.value.trim()
      })
    });
    elements.cashierName.value = '';
    setStatus('Kasir billiard disimpan.');
    await loadCashiers();
  } catch (error) {
    setStatus(error.message, true);
  }
});

elements.resetCategoryButton.addEventListener('click', resetCategoryForm);
elements.saveTokenButton.addEventListener('click', saveOlseraToken);

elements.categoryRows.addEventListener('click', event => {
  const button = event.target.closest('button');

  if (!button) {
    return;
  }

  const id = Number(button.dataset.id);

  if (button.dataset.action === 'edit-category') {
    editCategory(id);
  }

  if (button.dataset.action === 'delete-category') {
    deleteCategory(id);
  }
});

elements.cashierRows.addEventListener('click', event => {
  const button = event.target.closest('button');

  if (button?.dataset.action === 'delete-cashier') {
    deleteCashier(Number(button.dataset.id));
  }
});

Promise.all([loadTokenStatus(), loadCategories(), loadCashiers()])
  .then(() => setStatus('Settings siap.'))
  .catch(error => setStatus(error.message, true));
