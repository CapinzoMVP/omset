const express = require('express');
const controller = require('./controllers/reportController');

const router = express.Router();

router.get('/report', controller.getReport);

router.get('/settings/categories', controller.listCategories);
router.post('/settings/categories', controller.createCategory);
router.put('/settings/categories/:id', controller.updateCategory);
router.delete('/settings/categories/:id', controller.deleteCategory);

router.get('/settings/olsera-token/status', controller.getOlseraTokenStatus);
router.post('/settings/olsera-token', controller.updateOlseraToken);

router.get('/settings/billiard-cashiers', controller.listBilliardCashiers);
router.post('/settings/billiard-cashiers', controller.createBilliardCashier);
router.delete('/settings/billiard-cashiers/:id', controller.deleteBilliardCashier);

module.exports = router;
