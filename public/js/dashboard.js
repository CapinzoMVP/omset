const formatter = new Intl.NumberFormat('id-ID', {
  style: 'currency',
  currency: 'IDR',
  maximumFractionDigits: 0
});

const elements = {
  form: document.querySelector('#reportForm'),
  fromDate: document.querySelector('#fromDate'),
  toDate: document.querySelector('#toDate'),
  statusText: document.querySelector('#statusText'),
  grandTotal: document.querySelector('#grandTotal'),
  porsiBilliard: document.querySelector('#porsiBilliard'),
  billiardBreakdown: document.querySelector('#billiardBreakdown'),
  totalBar: document.querySelector('#totalBar'),
  totalDapur: document.querySelector('#totalDapur'),
  minumanRows: document.querySelector('#minumanRows'),
  makananRows: document.querySelector('#makananRows')
};

function getDefaultDates() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');

  return {
    from: `${year}-${month}-01`,
    to: `${year}-${month}-${day}`
  };
}

function setStatus(message, isError = false) {
  elements.statusText.textContent = message;
  elements.statusText.classList.toggle('text-danger', isError);
  elements.statusText.classList.toggle('text-muted', !isError);
}

function renderRows(target, rows) {
  target.innerHTML = '';

  if (!rows.length) {
    target.innerHTML = '<tr><td colspan="3" class="text-muted">Belum ada data.</td></tr>';
    return;
  }

  for (const row of rows) {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${row.rank}</td>
      <td>${row.item_name}</td>
      <td class="text-end">${row.qty}</td>
    `;
    target.appendChild(tr);
  }
}

function renderReport(report) {
  elements.grandTotal.textContent = formatter.format(report.summary.grand_total);
  elements.porsiBilliard.textContent = formatter.format(report.summary.porsi_billiard);
  elements.billiardBreakdown.innerHTML = '';

  for (const item of report.summary.billiard_breakdown || []) {
    const div = document.createElement('div');
    div.textContent = `${item.cashier_name}: ${formatter.format(item.amount)}`;
    elements.billiardBreakdown.appendChild(div);
  }

  elements.totalBar.textContent = formatter.format(report.summary.total_bar);
  elements.totalDapur.textContent = formatter.format(report.summary.total_dapur);
  renderRows(elements.minumanRows, report.rankings.minuman);
  renderRows(elements.makananRows, report.rankings.makanan);
}

async function loadReport() {
  const params = new URLSearchParams({
    from: elements.fromDate.value,
    to: elements.toDate.value
  });

  setStatus('Mengambil laporan...');

  try {
    const response = await fetch(`/api/report?${params.toString()}`);
    const result = await response.json();

    if (!response.ok || !result.success) {
      throw new Error(result.message || 'Laporan gagal dimuat.');
    }

    renderReport(result.data);
    setStatus(`Laporan ${result.data.range.from} sampai ${result.data.range.to}. ${result.data.meta.row_count} baris diproses.`);
  } catch (error) {
    setStatus(error.message, true);
  }
}

elements.form.addEventListener('submit', event => {
  event.preventDefault();
  loadReport();
});

const defaults = getDefaultDates();
elements.fromDate.value = defaults.from;
elements.toDate.value = defaults.to;
