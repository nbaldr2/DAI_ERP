const { SystemSetting, User } = require('../models');
const { validationResult } = require('express-validator');
const AuditLog = require('../models/AuditLog');

// Get current system settings
exports.getSettings = async (req, res) => {
  try {
    // Get the first (and only) settings record
    let settings = await SystemSetting.findOne({
      include: [{
        model: User,
        as: 'updater',
        attributes: ['id', 'username', 'name']
      }]
    });

    // If no settings exist, create default settings
    if (!settings) {
      settings = await SystemSetting.create({
        company_name: 'Dai Trading Company',
        email: 'info@daitrading.com',
        phone: '+974 1234 5678',
        address: 'Doha, Qatar',
        pobox: '12345',
        cr_number: '1234567890',
        language: 'en',
        currency: 'QAR',
        updated_by: req.user.id
      });
    }

    res.status(200).json({
      success: true,
      data: settings
    });
  } catch (error) {
    console.error('Error fetching system settings:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch system settings',
      error: error.message
    });
  }
};

// Update system settings
exports.updateSettings = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const {
      company_name,
      email,
      phone,
      address,
      pobox,
      cr_number,
      logo_url,
      language,
      currency
    } = req.body;

    // Check if settings exist
    let settings = await SystemSetting.findOne();

    const settingsData = {
      company_name,
      email,
      phone,
      address,
      pobox,
      cr_number,
      logo_url: logo_url || null,
      language,
      currency,
      updated_by: req.user.id
    };

    if (settings) {
      // Update existing settings
      const oldValue = { ...settings.toJSON() };
      await settings.update(settingsData);
      const newValue = { ...settings.toJSON() };

      // Log the update
      await AuditLog.logChange({
        entity_type: 'system_settings',
        entity_id: settings.id,
        action: 'UPDATE',
        old_value: oldValue,
        new_value: newValue,
        performed_by: req.user.id,
        notes: 'System settings updated'
      });

      res.status(200).json({
        success: true,
        message: 'System settings updated successfully',
        data: settings
      });
    } else {
      // Create new settings
      settings = await SystemSetting.create(settingsData);

      // Log the creation
      await AuditLog.logChange({
        entity_type: 'system_settings',
        entity_id: settings.id,
        action: 'CREATE',
        old_value: null,
        new_value: settings.toJSON(),
        performed_by: req.user.id,
        notes: 'System settings created'
      });

      res.status(201).json({
        success: true,
        message: 'System settings created successfully',
        data: settings
      });
    }
  } catch (error) {
    console.error('Error updating system settings:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update system settings',
      error: error.message
    });
  }
};