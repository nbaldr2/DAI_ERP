const { Settings, User } = require('../models');
const { validationResult } = require('express-validator');

class SettingsController {
  // GET /api/settings
  async getSettings(req, res) {
    try {
      // Fetch latest settings record
      const settings = await Settings.findOne({
        order: [['updated_at', 'DESC']],
        include: [{ model: User, as: 'updater', attributes: ['id', 'name', 'username'] }]
      });

      // Provide sensible defaults if none exist yet
      if (!settings) {
        return res.status(200).json({
          success: true,
          data: {
            company_name: 'Dai Trading Company',
            email: 'info@daitrading.qa',
            phone: '',
            address: '',
            logo_url: '/logo/dai.png',
            language: 'en',
            currency: 'QAR',
            cr_number: '',
            tax_rate: '0.00',
            updated_by: null,
            updated_at: new Date().toISOString()
          }
        });
      }

      return res.status(200).json({ success: true, data: settings });
    } catch (error) {
      console.error('Error fetching settings:', error);
      return res.status(500).json({ success: false, message: 'Failed to fetch settings', error: error.message });
    }
  }

  // PUT /api/settings
  async updateSettings(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, message: 'Validation failed', errors: errors.array() });
      }

      const payload = req.body || {};
      const userId = req.user?.id || null;

      // Either update latest or create new settings snapshot
      let settings = await Settings.findOne({ order: [['updated_at', 'DESC']] });
      if (!settings) {
        settings = await Settings.create({
          ...payload,
          updated_by: userId,
          updated_at: new Date(),
          created_at: new Date()
        });
      } else {
        Object.assign(settings, payload, { updated_by: userId, updated_at: new Date() });
        await settings.save();
      }

      return res.status(200).json({ success: true, message: 'Settings updated successfully', data: settings });
    } catch (error) {
      console.error('Error updating settings:', error);
      return res.status(500).json({ success: false, message: 'Failed to update settings', error: error.message });
    }
  }
}

module.exports = new SettingsController();