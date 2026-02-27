const express = require('express');
const router = express.Router();
const posController = require('../controllers/posController');
const { authenticateToken, authorize } = require('../middlewares/auth');

// All POS routes require authentication + ADMIN or SALES role
router.use(authenticateToken);
router.use(authorize('ADMIN', 'SALES'));

// ─── Dashboard & Analytics ────────────────────────────────────────────
router.get('/dashboard', posController.getDashboard);

// ─── Session Management ──────────────────────────────────────────────
router.get('/sessions', posController.listSessions);
router.post('/sessions/open', posController.openSession);
router.post('/sessions/:id/close', posController.closeSession);
router.get('/sessions/current', posController.getCurrentSession);
router.get('/sessions/:id/summary', posController.getSessionSummary);
router.get('/sessions/:id/orders', posController.getSessionOrders);

// ─── Products (for POS display) ──────────────────────────────────────
router.get('/products', posController.getProducts);

// ─── Orders ──────────────────────────────────────────────────────────
router.post('/orders', posController.completeSale);
router.post('/orders/:id/void', posController.voidOrder);
router.get('/orders/:id/receipt', posController.getReceipt);

// ─── Park / Resume ───────────────────────────────────────────────────
router.post('/orders/park', posController.parkOrder);
router.get('/orders/parked', posController.getParkedOrders);
router.get('/orders/parked/:id', posController.resumeParkedOrder);
router.delete('/orders/parked/:id', posController.deleteParkedOrder);

module.exports = router;
