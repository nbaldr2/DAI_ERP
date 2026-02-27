const express = require('express');
const router = express.Router();
const deliveryNoteController = require('../controllers/deliveryNoteController');
const { authenticateToken } = require('../middlewares/auth');

// All routes require authentication
router.use(authenticateToken);

// GET /api/delivery-notes - List all delivery notes
router.get('/', deliveryNoteController.list);

// GET /api/delivery-notes/:id - Get a single delivery note
router.get('/:id', deliveryNoteController.get);

// POST /api/delivery-notes - Create a new delivery note
router.post('/', deliveryNoteController.create);

// PATCH /api/delivery-notes/:id/status - Update delivery note status
router.patch('/:id/status', deliveryNoteController.updateStatus);

// DELETE /api/delivery-notes/:id - Delete a delivery note
router.delete('/:id', deliveryNoteController.delete);

module.exports = router;
