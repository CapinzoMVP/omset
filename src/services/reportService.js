const pool = require('../config/db');
const { fetchMasterSalesData } = require('./apiService');

function toNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function normalizeText(value) {
  return String(value || '').trim();
}

function getDefaultRange() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');

  return {
    from: `${year}-${month}-01`,
    to: `${year}-${month}-${day}`
  };
}

async function getCategories() {
  const [rows] = await pool.execute(
    `SELECT id, olsera_group_id, category_name, production_area, item_type
     FROM categories
     ORDER BY category_name ASC`
  );

  return rows;
}

async function getBilliardCashiers() {
  const [rows] = await pool.execute(
    'SELECT id, cashier_name FROM billiard_cashiers ORDER BY cashier_name ASC'
  );

  return rows;
}

function buildTopTen(rankMap, itemType) {
  return Array.from(rankMap.values())
    .filter(item => item.item_type === itemType)
    .sort((a, b) => b.qty - a.qty)
    .slice(0, 10)
    .map((item, index) => ({
      rank: index + 1,
      item_name: item.item_name,
      qty: item.qty
    }));
}

function aggregateReport({ masterData, categories, billiardCashiers }) {
  const categoryByName = new Map(
    categories.map(category => [normalizeText(category.category_name).toLowerCase(), category])
  );
  const categoryByGroupId = new Map(
    categories.map(category => [normalizeText(category.olsera_group_id).toLowerCase(), category])
  );
  const billiardCashierSet = new Set(
    billiardCashiers.map(cashier => normalizeText(cashier.cashier_name).toLowerCase())
  );
  const rankMap = new Map();

  const summary = {
    grand_total: 0,
    porsi_billiard: 0,
    total_bar: 0,
    total_dapur: 0
  };

  for (const row of masterData) {
    const amount = toNumber(row.amount || row.total || row.net_sales);
    const qty = toNumber(row.qty || row.quantity);
    const cashierName = normalizeText(row.sales_name || row.cashier_name || row.cashier);
    const itemName = normalizeText(row.item_name || row.name || 'Tanpa Nama');
    const groupKey = normalizeText(row.item_group || row.group_name || row.category_name).toLowerCase();
    const groupIdKey = normalizeText(row.group_id || row.item_group_id || row.olsera_group_id).toLowerCase();
    const category = categoryByName.get(groupKey) || categoryByGroupId.get(groupIdKey);

    summary.grand_total += amount;

    if (billiardCashierSet.has(cashierName.toLowerCase())) {
      summary.porsi_billiard += amount;
    }

    if (category?.production_area === 'Bar') {
      summary.total_bar += amount;
    }

    if (category?.production_area === 'Dapur') {
      summary.total_dapur += amount;
    }

    if (category) {
      const rankKey = itemName.toLowerCase();
      const current = rankMap.get(rankKey) || {
        item_name: itemName,
        item_type: category.item_type,
        qty: 0
      };
      current.qty += qty;
      rankMap.set(rankKey, current);
    }
  }

  return {
    summary,
    rankings: {
      minuman: buildTopTen(rankMap, 'Minuman'),
      makanan: buildTopTen(rankMap, 'Makanan')
    },
    meta: {
      row_count: masterData.length,
      category_count: categories.length,
      billiard_cashier_count: billiardCashiers.length
    }
  };
}

async function generateReport({ from, to }) {
  const defaultRange = getDefaultRange();
  const range = {
    from: from || defaultRange.from,
    to: to || defaultRange.to
  };
  const categories = await getCategories();
  const billiardCashiers = await getBilliardCashiers();
  const masterData = await fetchMasterSalesData({
    from: range.from,
    to: range.to,
    categories
  });

  return {
    range,
    ...aggregateReport({ masterData, categories, billiardCashiers })
  };
}

module.exports = {
  aggregateReport,
  generateReport,
  getBilliardCashiers,
  getCategories,
  getDefaultRange
};
