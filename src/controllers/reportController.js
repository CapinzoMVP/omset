const pool = require('../config/db');
const {
  generateReport,
  getBilliardCashiers,
  getCategories
} = require('../services/reportService');

function sendError(res, statusCode, message) {
  res.status(statusCode).json({
    success: false,
    message
  });
}

function isValidProductionArea(value) {
  return ['Bar', 'Dapur'].includes(value);
}

function isValidItemType(value) {
  return ['Minuman', 'Makanan'].includes(value);
}

async function getReport(req, res) {
  try {
    const report = await generateReport({
      from: req.query.from,
      to: req.query.to
    });

    res.json({
      success: true,
      data: report
    });
  } catch (error) {
    sendError(res, 502, error.message);
  }
}

async function listCategories(req, res) {
  try {
    const categories = await getCategories();
    res.json({
      success: true,
      data: categories
    });
  } catch (error) {
    sendError(res, 500, `Gagal mengambil kategori: ${error.message}`);
  }
}

async function createCategory(req, res) {
  try {
    const { olsera_group_id, category_name, production_area, item_type } = req.body;

    if (!olsera_group_id || !category_name || !isValidProductionArea(production_area) || !isValidItemType(item_type)) {
      return sendError(res, 400, 'Data kategori tidak lengkap atau tidak valid.');
    }

    const [result] = await pool.execute(
      `INSERT INTO categories (olsera_group_id, category_name, production_area, item_type)
       VALUES (?, ?, ?, ?)`,
      [olsera_group_id, category_name, production_area, item_type]
    );

    res.status(201).json({
      success: true,
      data: {
        id: result.insertId,
        olsera_group_id,
        category_name,
        production_area,
        item_type
      }
    });
  } catch (error) {
    sendError(res, 500, `Gagal menyimpan kategori: ${error.message}`);
  }
}

async function updateCategory(req, res) {
  try {
    const { id } = req.params;
    const { olsera_group_id, category_name, production_area, item_type } = req.body;

    if (!olsera_group_id || !category_name || !isValidProductionArea(production_area) || !isValidItemType(item_type)) {
      return sendError(res, 400, 'Data kategori tidak lengkap atau tidak valid.');
    }

    const [result] = await pool.execute(
      `UPDATE categories
       SET olsera_group_id = ?, category_name = ?, production_area = ?, item_type = ?
       WHERE id = ?`,
      [olsera_group_id, category_name, production_area, item_type, id]
    );

    if (result.affectedRows === 0) {
      return sendError(res, 404, 'Kategori tidak ditemukan.');
    }

    res.json({
      success: true,
      data: {
        id: Number(id),
        olsera_group_id,
        category_name,
        production_area,
        item_type
      }
    });
  } catch (error) {
    sendError(res, 500, `Gagal memperbarui kategori: ${error.message}`);
  }
}

async function deleteCategory(req, res) {
  try {
    const [result] = await pool.execute('DELETE FROM categories WHERE id = ?', [req.params.id]);

    if (result.affectedRows === 0) {
      return sendError(res, 404, 'Kategori tidak ditemukan.');
    }

    res.json({
      success: true,
      message: 'Kategori berhasil dihapus.'
    });
  } catch (error) {
    sendError(res, 500, `Gagal menghapus kategori: ${error.message}`);
  }
}

async function listBilliardCashiers(req, res) {
  try {
    const cashiers = await getBilliardCashiers();
    res.json({
      success: true,
      data: cashiers
    });
  } catch (error) {
    sendError(res, 500, `Gagal mengambil kasir billiard: ${error.message}`);
  }
}

function validateWorkerKey(req, res) {
  const workerKey = process.env.WORKER_KEY;
  const requestKey = req.get('X-Worker-Key');

  if (!workerKey) {
    sendError(res, 500, 'WORKER_KEY belum dikonfigurasi di .env.');
    return false;
  }

  if (!requestKey || requestKey !== workerKey) {
    sendError(res, 401, 'Worker key tidak valid.');
    return false;
  }

  return true;
}

async function getOlseraTokenStatus(req, res) {
  try {
    const [rows] = await pool.execute(
      `SELECT setting_key, last_updated,
              CASE
                WHEN setting_value IS NULL OR setting_value = '' THEN 0
                ELSE CHAR_LENGTH(setting_value)
              END AS token_length
       FROM app_settings
       WHERE setting_key = 'olsera_token'
       LIMIT 1`
    );

    res.json({
      success: true,
      data: rows[0] || {
        setting_key: 'olsera_token',
        token_length: 0,
        last_updated: null
      }
    });
  } catch (error) {
    sendError(res, 500, `Gagal mengambil status token Olsera: ${error.message}`);
  }
}

async function updateOlseraToken(req, res) {
  try {
    if (!validateWorkerKey(req, res)) {
      return;
    }

    const token = String(req.body.token || '').trim();

    if (!token || token.length < 20) {
      return sendError(res, 400, 'Token Olsera tidak valid atau terlalu pendek.');
    }

    await pool.execute(
      `INSERT INTO app_settings (setting_key, setting_value, last_updated)
       VALUES ('olsera_token', ?, NOW())
       ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value), last_updated = NOW()`,
      [token]
    );

    res.json({
      success: true,
      data: {
        setting_key: 'olsera_token',
        token_length: token.length
      }
    });
  } catch (error) {
    sendError(res, 500, `Gagal menyimpan token Olsera: ${error.message}`);
  }
}

async function createBilliardCashier(req, res) {
  try {
    const cashierName = String(req.body.cashier_name || '').trim();

    if (!cashierName) {
      return sendError(res, 400, 'Nama kasir wajib diisi.');
    }

    const [result] = await pool.execute(
      'INSERT INTO billiard_cashiers (cashier_name) VALUES (?)',
      [cashierName]
    );

    res.status(201).json({
      success: true,
      data: {
        id: result.insertId,
        cashier_name: cashierName
      }
    });
  } catch (error) {
    sendError(res, 500, `Gagal menyimpan kasir billiard: ${error.message}`);
  }
}

async function deleteBilliardCashier(req, res) {
  try {
    const [result] = await pool.execute('DELETE FROM billiard_cashiers WHERE id = ?', [req.params.id]);

    if (result.affectedRows === 0) {
      return sendError(res, 404, 'Kasir billiard tidak ditemukan.');
    }

    res.json({
      success: true,
      message: 'Kasir billiard berhasil dihapus.'
    });
  } catch (error) {
    sendError(res, 500, `Gagal menghapus kasir billiard: ${error.message}`);
  }
}

module.exports = {
  createBilliardCashier,
  createCategory,
  deleteBilliardCashier,
  deleteCategory,
  getReport,
  getOlseraTokenStatus,
  listBilliardCashiers,
  listCategories,
  updateOlseraToken,
  updateCategory
};
