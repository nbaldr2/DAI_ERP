// Import jsPDF and autoTable
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';

// Resolve a meaningful product name from various possible shapes
const resolveInvoiceProductName = (item) => {
  const product = item?.product || {};
  const placeholderPattern = /^\(?\s*Product\s*#\d+\s*\)?$/i;
  const isValid = (v) => typeof v === 'string' && v.trim() && !placeholderPattern.test(v.trim());
  const candidates = [
    item?.product_name,
    item?.name,
    product?.name,
    product?.name_en,
    product?.name_ar,
    item?.title
  ];
  const picked = candidates.find(isValid);
  return picked ? picked.trim() : '';
};

/**
 * Service for generating PDF invoices and purchase orders
 */
const pdfService = {
  /**
   * Generate a PDF invoice from invoice data
   * @param {Object} invoice - The invoice data including items
   * @param {Object} customer - The customer data
   * @returns {Blob} - The PDF file as a Blob
   */
  generateInvoicePDF: (invoice, customer, settings = null) => {
    // Create a new PDF document
    const doc = new jsPDF();
    
    // Company info (from settings with sensible defaults)
    const companyName = settings?.company_name || 'DAI TRADING';
    const companyAddress = settings?.address || '123 Business Street\nDoha, Qatar';
    const companyPhone = settings?.phone || '+974 1234 5678';
    const companyEmail = settings?.email || 'info@dai-trading.com';
    const logoUrl = settings?.logo_url || '/logo/dai.png';

    // Add company logo above company name
    doc.addImage(logoUrl, 'PNG', 20, 10, 40, 20);
    
    // Add company info (below the logo)
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text(companyName, 20, 35);
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    const addressLines = companyAddress.split('\n');
    addressLines.forEach((line, idx) => {
      doc.text(line, 20, 45 + (idx * 5));
    });
    const baseY = 45 + (addressLines.length * 5);
    doc.text(`Phone: ${companyPhone}`, 20, baseY);
    doc.text(`Email: ${companyEmail}`, 20, baseY + 5);
    
    // Add invoice details
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('INVOICE', 150, 20);
 
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Invoice Number: ${invoice.invoice_number || 'N/A'}`, 150, 30);
    doc.text(`Date: ${invoice.invoice_date ? format(new Date(invoice.invoice_date), 'dd/MM/yyyy') : 'N/A'}`, 150, 35);
    doc.text(`Due Date: ${invoice.due_date ? format(new Date(invoice.due_date), 'dd/MM/yyyy') : 'N/A'}`, 150, 40);
    doc.text(`Status: ${invoice.status ? invoice.status.toUpperCase() : 'N/A'}`, 150, 45);
    
    // Add customer info
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Bill To:', 20, 75);
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(customer?.name || 'N/A', 20, 80);
    if (customer?.address) {
      const addressLines = customer.address.split('\n');
      addressLines.forEach((line, index) => {
        doc.text(line, 20, 85 + (index * 5));
      });
    }
    
    // Add payment info
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Payment Method:', 150, 75);
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(invoice.payment_mode || 'Not specified', 150, 80);
    
    // Add items table
    autoTable(doc, {
      startY: 110,
      head: [['Item', 'Description', 'Quantity', 'Rate', 'Discount', 'Amount']],
      body: (invoice.items || []).map(item => {
        const name = resolveInvoiceProductName(item);
        const description = item.description || '';
        const quantity = (item.quantity || 0).toString();
        const currency = invoice.currency || settings?.currency || 'QAR';
        const rate = `${currency} ${parseFloat(item.rate || 0).toFixed(2)}`;
        const discount = `${parseFloat(item.discount || 0).toFixed(2)}`;
        const amount = `${currency} ${parseFloat(item.amount || 0).toFixed(2)}`;
        return [name, description, quantity, rate, discount, amount];
      }),
      theme: 'grid',
      headStyles: { fillColor: [76, 175, 80], textColor: [255, 255, 255] },
      foot: [
        ['', '', '', '', 'Subtotal:', `${invoice.currency || settings?.currency || 'QAR'} ${parseFloat(invoice.subtotal || 0).toFixed(2)}`],
        ['', '', '', '', 'Total Discount:', `${invoice.currency || settings?.currency || 'QAR'} ${parseFloat(invoice.total_discount || 0).toFixed(2)}`],
        ['', '', '', '', 'Total:', `${invoice.currency || settings?.currency || 'QAR'} ${parseFloat(invoice.total || 0).toFixed(2)}`]
      ],
      footStyles: { fillColor:[255, 255, 255]  , textColor: [76, 175, 80]}
    });
    
    // Add notes
    // Safely get the final Y position after the table
    let finalY = 120; // Default position
    if (doc.lastAutoTable && doc.lastAutoTable.finalY) {
      finalY = doc.lastAutoTable.finalY + 10;
    }
    
    if (invoice.client_note) {
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text('Notes:', 20, finalY);
      
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text(invoice.client_note, 20, finalY + 5, { maxWidth: 170 });
    }
    
    if (invoice.terms) {
      const termsY = invoice.client_note ? finalY + 20 : finalY;
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text('Terms & Conditions:', 20, termsY);
      
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text(invoice.terms, 20, termsY + 5, { maxWidth: 170 });
    }
    
    // Add footer
    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      const currentDate = new Date();
      const formattedDate = !isNaN(currentDate.getTime()) ? 
        format(currentDate, 'dd/MM/yyyy HH:mm') : 'Invalid Date';
      doc.text(
        `Page ${i} of ${pageCount} - Generated on ${formattedDate}`,
        doc.internal.pageSize.getWidth() / 2,
        doc.internal.pageSize.getHeight() - 10,
        { align: 'center' }
      );
    }
    
    // Return the PDF as a blob
    return doc.output('blob');
  },
  
  /**
   * Generate a PDF purchase order from purchase data
   * @param {Object} purchase - The purchase data including items
   * @param {Object} supplier - The supplier data
   * @returns {Blob} - The PDF file as a Blob
   */
  generatePurchaseOrderPDF: (purchase, supplier, settings = null) => {
    // Create a new PDF document
    const doc = new jsPDF('p', 'mm', 'a4');
    const supplierInfo = supplier || purchase?.supplier || {};
    const purchaseItems = Array.isArray(purchase?.items) ? purchase.items : [];
    const currency = purchase?.currency || settings?.currency || 'QAR';
    const formatAmount = (value) => `${currency} ${(parseFloat(value) || 0).toFixed(2)}`;
    const formatQuantity = (value) => {
      const quantity = parseFloat(value) || 0;
      return Number.isInteger(quantity) ? quantity.toString() : quantity.toFixed(2);
    };
    const subtotal = purchaseItems.reduce((sum, item) => {
      const total = parseFloat(item?.total_price);
      if (!isNaN(total)) {
        return sum + total;
      }
      const qty = parseFloat(item?.quantity ?? item?.qty ?? 0) || 0;
      const price = parseFloat(item?.unit_price ?? item?.price ?? 0) || 0;
      return sum + qty * price;
    }, 0);
    const grandTotal = parseFloat(purchase?.total);
    const resolvedGrandTotal = !isNaN(grandTotal) ? grandTotal : subtotal;

    // Add company logo above company name
    const logoUrl = '/logo/dai.png';
    doc.addImage(logoUrl, 'PNG', 20, 10, 40, 20);
    
    // Add company info (below the logo)
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text('DAI TRADING', 20, 35);

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text('123 Business Street', 20, 45);
    doc.text('Doha, Qatar', 20, 50);
    doc.text('Phone: +974 1234 5678', 20, 55);
    doc.text('Email: info@dai-trading.com', 20, 60);

    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('PURCHASE ORDER', 150, 20);

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`PO Number: ${purchase?.po_number || `PO-${purchase?.id}` || 'N/A'}`, 150, 30);
    doc.text(`Date: ${purchase?.order_date ? format(new Date(purchase.order_date), 'dd/MM/yyyy') : 'N/A'}`, 150, 35);
    doc.text(`Expected Date: ${purchase?.expected_date ? format(new Date(purchase.expected_date), 'dd/MM/yyyy') : 'N/A'}`, 150, 40);
    doc.text(`Status: ${purchase?.status ? purchase.status.toUpperCase() : 'N/A'}`, 150, 45);

    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Supplier:', 20, 80);

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(supplierInfo?.name || 'N/A', 20, 85);
    if (supplierInfo?.address) {
      supplierInfo.address.split('\n').forEach((line, index) => {
        doc.text(line, 20, 90 + index * 5);
      });
    }

    if (supplierInfo?.email || supplierInfo?.phone) {
      if (supplierInfo?.email) {
        doc.text(`Email: ${supplierInfo.email}`, 20, 105);
      }
      if (supplierInfo?.phone) {
        doc.text(`Phone: ${supplierInfo.phone}`, 20, 110);
      }
    }

    autoTable(doc, {
      startY: 120,
      head: [['Item', 'Description', 'Quantity', 'Unit Price', 'Total']],
      body: purchaseItems.map((item) => {
        const product = item?.product || {};
        const productName = item?.product_name || product?.name_en || product?.name_ar || product?.name || 'Unnamed Product';
        const descriptionParts = [];
        if (product?.category) {
          descriptionParts.push(product.category);
        }
        if (product?.origin) {
          descriptionParts.push(product.origin);
        }
        if (product?.unit) {
          descriptionParts.push(`Unit: ${product.unit}`);
        }
        const quantityValue = item?.quantity ?? item?.qty ?? 0;
        const unitPriceValue = item?.unit_price ?? item?.price ?? 0;
        const totalPriceValue = item?.total_price ?? parseFloat(quantityValue || 0) * parseFloat(unitPriceValue || 0);
        return [
          productName,
          descriptionParts.length > 0 ? descriptionParts.join(' | ') : '-',
          formatQuantity(quantityValue),
          formatAmount(unitPriceValue),
          formatAmount(totalPriceValue)
        ];
      }),
      theme: 'grid',
      headStyles: { fillColor: [76, 175, 80], textColor: [76, 175, 80]},
      foot: [
        ['', '', '', 'Subtotal:', formatAmount(subtotal)],
        ['', '', '', 'Grand Total:', formatAmount(resolvedGrandTotal)]
      ],
      footStyles: { fillColor: [240, 240, 240] }
    });

    let finalY = 130;
    if (doc.lastAutoTable && doc.lastAutoTable.finalY) {
      finalY = doc.lastAutoTable.finalY + 10;
    }

    if (purchase?.notes) {
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text('Notes:', 20, finalY);

      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text(purchase.notes, 20, finalY + 5, { maxWidth: 170 });
    }

    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      const currentDate = new Date();
      const formattedDate = !isNaN(currentDate.getTime()) ? format(currentDate, 'dd/MM/yyyy HH:mm') : 'Invalid Date';
      doc.text(
        `Page ${i} of ${pageCount} - Generated on ${formattedDate}`,
        doc.internal.pageSize.getWidth() / 2,
        doc.internal.pageSize.getHeight() - 10,
        { align: 'center' }
      );
    }

    return doc.output('blob');
  },
  
  /**
   * Preview an invoice PDF in a new browser tab
   * @param {Object} invoice - The invoice data including items
   * @param {Object} customer - The customer data
   */
  previewInvoicePDF: (invoice, customer, settings = null) => {
    const pdfBlob = pdfService.generateInvoicePDF(invoice, customer, settings);
    const pdfUrl = URL.createObjectURL(pdfBlob);
    window.open(pdfUrl, '_blank');
  },
  
  /**
   * Preview a purchase order PDF in a new browser tab
   * @param {Object} purchase - The purchase data including items
   * @param {Object} supplier - The supplier data
   */
  previewPurchaseOrderPDF: (purchase, supplier, settings = null) => {
    const pdfBlob = pdfService.generatePurchaseOrderPDF(purchase, supplier, settings);
    const pdfUrl = URL.createObjectURL(pdfBlob);
    window.open(pdfUrl, '_blank');
  }
};

export default pdfService;