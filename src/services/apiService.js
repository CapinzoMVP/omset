const axios = require('axios');
const pool = require('../config/db');
const { scrapeOlseraToken } = require('./scraperService');

const TOKEN_SETTING_KEY = 'olsera_token';

function getApiClient(token) {
  return axios.create({
    baseURL: process.env.OLSERA_API_BASE_URL || 'https://api.olsera.com',
    timeout: 60000,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json'
    }
  });
}

async function getStoredToken() {
  const [rows] = await pool.execute(
    'SELECT setting_value FROM app_settings WHERE setting_key = ? LIMIT 1',
    [TOKEN_SETTING_KEY]
  );

  return rows[0]?.setting_value || null;
}

async function validateToken(token) {
  if (!token) {
    return false;
  }

  try {
    const testPath = process.env.OLSERA_API_TEST_PATH || '/api/open-api/v1/en/salesitemsbydate?page=1&per_page=1';
    await getApiClient(token).get(testPath);
    return true;
  } catch (error) {
    const status = error.response?.status;
    if (status === 401 || status === 403) {
      return false;
    }

    return false;
  }
}

async function getValidToken() {
  try {
    const storedToken = await getStoredToken();
    const isValid = await validateToken(storedToken);

    if (isValid) {
      return storedToken;
    }

    return await scrapeOlseraToken();
  } catch (error) {
    throw new Error(`Autentikasi Olsera gagal: ${error.message}`);
  }
}

function normalizeSalesRows(payload) {
  if (Array.isArray(payload)) {
    return payload;
  }

  if (Array.isArray(payload?.data)) {
    return payload.data;
  }

  if (Array.isArray(payload?.data?.data)) {
    return payload.data.data;
  }

  if (Array.isArray(payload?.result)) {
    return payload.result;
  }

  return [];
}

async function fetchSalesItemsByCategory({ from, to, category, token }) {
  try {
    const client = getApiClient(token);
    const salesItemsPath = process.env.OLSERA_SALES_ITEMS_PATH || '/api/open-api/v1/en/salesitemsbydate';
    const response = await client.get(salesItemsPath, {
      params: {
        page: 1,
        per_page: 1000,
        from,
        to,
        group_id: category.olsera_group_id
      }
    });

    return normalizeSalesRows(response.data);
  } catch (error) {
    throw new Error(`Gagal mengambil data kategori ${category.category_name}: ${error.message}`);
  }
}

async function fetchMasterSalesData({ from, to, categories }) {
  try {
    const token = await getValidToken();
    const results = await Promise.all(
      categories.map(category => fetchSalesItemsByCategory({ from, to, category, token }))
    );

    return results.flat();
  } catch (error) {
    throw new Error(`Gagal mengambil data Olsera: ${error.message}`);
  }
}

module.exports = {
  fetchMasterSalesData,
  getValidToken,
  normalizeSalesRows
};
