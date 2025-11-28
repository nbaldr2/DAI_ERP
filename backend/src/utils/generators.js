const Purchase = require('../models/Purchase');

/**
 * Generate a unique purchase order number
 * Format: PO-YYYYMMDD-XXXX where XXXX is a sequential number
 * @returns {Promise<string>} The generated PO number
 */
exports.generatePONumber = async () => {
  const today = new Date();
  const dateStr = today.getFullYear().toString().slice(-2);
  
  // Find the latest PO number with today's date prefix
  const prefix = `PO-${dateStr}`;
  
  try {
    const latestPO = await Purchase.findOne({
      where: {
        po_number: {
          [require('sequelize').Op.like]: `${prefix}-%`
        }
      },
      order: [['po_number', 'DESC']]
    });
    
    let sequentialNumber = 1;
    
    if (latestPO) {
      // Extract the sequential number from the latest PO number
      const match = latestPO.po_number.match(/-(\d+)$/);
      if (match && match[1]) {
        sequentialNumber = parseInt(match[1], 10) + 1;
      }
    }
    
    // Format the sequential number with leading zeros
    const sequentialStr = sequentialNumber.toString().padStart(4, '0');
    
    return `${prefix}-${sequentialStr}`;
  } catch (error) {
    console.error('Error generating PO number:', error);
    // Fallback to a timestamp-based number if there's an error
    return `${prefix}-${Date.now().toString().slice(-4)}`;
  }
};