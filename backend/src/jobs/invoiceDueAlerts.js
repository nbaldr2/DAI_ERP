const cron = require('node-cron');
const { Invoice, Customer } = require('../models');
const notificationService = require('../services/notificationService');
const { Op } = require('sequelize');

// Run daily at 8 AM
const CRON_SCHEDULE = process.env.INVOICE_DUE_CRON_SCHEDULE || '0 8 * * *';

/**
 * Check for invoices due date and generate alerts
 */
async function checkInvoiceDueDates() {
    try {
        console.log('🔍 Running invoice due date check...');

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const threeDaysFromNow = new Date(today);
        threeDaysFromNow.setDate(today.getDate() + 3);

        // 1. Check for invoices due within the next 3 days
        const upcomingInvoices = await Invoice.findAll({
            where: {
                status: { [Op.in]: ['PENDING', 'PARTIAL'] },
                due_date: {
                    [Op.gte]: today,
                    [Op.lte]: threeDaysFromNow
                }
            },
            include: [{ model: Customer, as: 'customer', attributes: ['name'] }]
        });

        for (const invoice of upcomingInvoices) {
            const daysUntilDue = Math.ceil((new Date(invoice.due_date) - today) / (1000 * 60 * 60 * 24));

            await notificationService.notifyRole({
                type: 'INFO',
                title: 'Invoice Due Soon',
                message: `Invoice #${invoice.invoice_number} for ${invoice.customer.name} is due in ${daysUntilDue} days.`,
                reference_id: invoice.id,
                reference_type: 'INVOICE'
            }, ['ADMIN', 'ACCOUNTANT']);
        }

        // 2. Check for overdue invoices
        const overdueInvoices = await Invoice.findAll({
            where: {
                status: { [Op.in]: ['PENDING', 'PARTIAL'] },
                due_date: {
                    [Op.lt]: today
                }
            },
            include: [{ model: Customer, as: 'customer', attributes: ['name'] }]
        });

        for (const invoice of overdueInvoices) {
            // Only trigger one notification per overdue check? Or maybe we can check if a notification was already sent recently (out of scope for now, simple implementation)
            // For now, to avoid spam, we might only check invoices due YESTERDAY, or just spam every day until paid.
            // Let's go with every day for now as it motivates payment.

            const overdueDays = Math.ceil((today - new Date(invoice.due_date)) / (1000 * 60 * 60 * 24));

            await notificationService.notifyRole({
                type: 'ERROR',
                title: 'Invoice Overdue',
                message: `Invoice #${invoice.invoice_number} for ${invoice.customer.name} is OVERDUE by ${overdueDays} days.`,
                reference_id: invoice.id,
                reference_type: 'INVOICE'
            }, ['ADMIN', 'ACCOUNTANT']);
        }

        console.log(`✅ Invoice check complete. Upcoming: ${upcomingInvoices.length}, Overdue: ${overdueInvoices.length}`);

    } catch (error) {
        console.error('❌ Error checking invoice due dates:', error);
    }
}

// Schedule the job
const job = cron.schedule(CRON_SCHEDULE, checkInvoiceDueDates, {
    scheduled: true,
    timezone: "Asia/Qatar"
});

console.log(`✅ Invoice due alert cron job scheduled: ${CRON_SCHEDULE}`);

module.exports = {
    job,
    checkInvoiceDueDates
};
