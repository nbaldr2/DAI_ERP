// Import jsPDF and autoTable
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';

// Company constants for DAI TRADING W.L.L
const COMPANY_INFO = {
  name_en: 'DAI TRADING W.L.L',
  name_ar: 'ضي للتجارة ذ.م.م',
  address: 'OFFICE 2, BUILDING 55, STREET 3098, ZONE 91, Doha, Qatar',
  cr: '116392',
  tel: '3000 8935',
  email: 'contact@dai-trading.com',
  iban: 'QA13QISB000000000152390820012',
  bank: 'QIB'
};

// Professional color palette
const COLORS = {
  primary: [31, 78, 94],        // Deep teal
  secondary: [45, 55, 72],      // Dark slate
  accent: [56, 161, 105],       // Fresh green
  light: [247, 250, 252],       // Light gray
  white: [255, 255, 255],
  text: [45, 55, 72],
  muted: [113, 128, 150],
  border: [226, 232, 240],
  gold: [180, 142, 75]          // Premium gold accent
};

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
 * Draw a styled header section for professional invoices
 */
const drawProfessionalHeader = (doc, invoice, logoUrl) => {
  const pageWidth = doc.internal.pageSize.getWidth();

  // Header background with gradient effect
  doc.setFillColor(...COLORS.primary);
  doc.rect(0, 0, pageWidth, 45, 'F');

  // Gold accent line
  doc.setFillColor(...COLORS.gold);
  doc.rect(0, 45, pageWidth, 2, 'F');

  // Try to add logo
  try {
    doc.addImage(logoUrl, 'PNG', 15, 8, 30, 28);
  } catch (e) {
    // Logo not available, skip
  }

  // Company name in header
  doc.setTextColor(...COLORS.white);
  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  doc.text(COMPANY_INFO.name_en, 50, 25);

  // Tagline instead of Arabic (jsPDF doesn't support Arabic fonts)
  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');

  doc.setFontSize(10);
  doc.text('Fresh Food Trading Company', 50, 36);

  // INVOICE label on the right
  doc.setFontSize(28);
  doc.setFont('helvetica', 'bold');
  doc.text('INVOICE', pageWidth - 15, 28, { align: 'right' });

  // Reset text color
  doc.setTextColor(...COLORS.text);
};

/**
 * Draw invoice details box
 */
const drawInvoiceDetails = (doc, invoice) => {
  const pageWidth = doc.internal.pageSize.getWidth();
  const boxX = pageWidth - 85;
  const boxY = 55;
  const boxWidth = 70;
  const boxHeight = 32;

  // Invoice details box with subtle shadow effect
  doc.setFillColor(...COLORS.light);
  doc.setDrawColor(...COLORS.border);
  doc.roundedRect(boxX, boxY, boxWidth, boxHeight, 3, 3, 'FD');

  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...COLORS.primary);

  const details = [
    { label: 'Invoice No:', value: invoice.invoice_number || 'N/A' },
    { label: 'Date:', value: invoice.invoice_date ? format(new Date(invoice.invoice_date), 'dd/MM/yyyy') : 'N/A' },
    { label: 'Due Date:', value: invoice.due_date ? format(new Date(invoice.due_date), 'dd/MM/yyyy') : 'N/A' }
  ];

  details.forEach((detail, index) => {
    const y = boxY + 8 + (index * 8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...COLORS.muted);
    doc.text(detail.label, boxX + 5, y);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...COLORS.text);
    doc.text(detail.value, boxX + 32, y);
  });
};

/**
 * Draw customer and payment info section
 */
const drawBillingSection = (doc, invoice, customer) => {
  // Bill To section
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...COLORS.primary);
  doc.text('BILL TO', 15, 60);

  // Underline
  doc.setDrawColor(...COLORS.accent);
  doc.setLineWidth(0.5);
  doc.line(15, 62, 50, 62);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...COLORS.text);
  doc.text(customer?.name || 'N/A', 15, 70);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...COLORS.muted);

  let yPos = 76;
  if (customer?.address) {
    const addressLines = customer.address.split('\n');
    addressLines.forEach((line) => {
      doc.text(line, 15, yPos);
      yPos += 5;
    });
  }

  if (customer?.phone) {
    doc.text(`Tel: ${customer.phone}`, 15, yPos);
    yPos += 5;
  }

  if (customer?.email) {
    doc.text(`Email: ${customer.email}`, 15, yPos);
  }

  // Payment method section (if specified)
  if (invoice.payment_mode) {
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...COLORS.primary);
    doc.text('PAYMENT METHOD', 15, 85);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...COLORS.text);
    doc.text(invoice.payment_mode, 15, 90);
  }
};

/**
 * Draw professional company footer
 */
const drawCompanyFooter = (doc, pageNum, totalPages) => {
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const footerY = pageHeight - 28;

  // Footer background
  doc.setFillColor(...COLORS.primary);
  doc.rect(0, footerY, pageWidth, 28, 'F');

  // Gold accent line at top of footer
  doc.setFillColor(...COLORS.gold);
  doc.rect(0, footerY, pageWidth, 1, 'F');

  // Company name
  doc.setTextColor(...COLORS.white);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text(COMPANY_INFO.name_en, pageWidth / 2, footerY + 6, { align: 'center' });

  // Address
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.text(COMPANY_INFO.address, pageWidth / 2, footerY + 12, { align: 'center' });

  // Contact details
  const contactLine = `C.R: ${COMPANY_INFO.cr}  |  TEL: ${COMPANY_INFO.tel}  |  EMAIL: ${COMPANY_INFO.email}`;
  doc.text(contactLine, pageWidth / 2, footerY + 17, { align: 'center' });

  // IBAN
  const ibanLine = `IBAN: ${COMPANY_INFO.iban} (${COMPANY_INFO.bank})`;
  doc.text(ibanLine, pageWidth / 2, footerY + 22, { align: 'center' });

  // Page number (small, in corner)
  doc.setFontSize(6);
  doc.text(`Page ${pageNum} of ${totalPages}`, pageWidth - 10, footerY + 24, { align: 'right' });
};

/**
 * Draw totals section
 */
const drawTotalsSection = (doc, invoice, settings, finalY) => {
  const pageWidth = doc.internal.pageSize.getWidth();
  const currency = invoice.currency || settings?.currency || 'QAR';
  const boxWidth = 80;
  const boxX = pageWidth - boxWidth - 15;
  const boxY = finalY - 20;

  // Total box with border

  const subtotal = parseFloat(invoice.subtotal || 0);
  const discount = parseFloat(invoice.total_discount || 0);
  const total = parseFloat(invoice.total || 0);

  doc.setFontSize(9);


  // Divider line
  doc.setDrawColor(...COLORS.border);
  doc.line(boxX + 5, boxY + 22, boxX + boxWidth - 5, boxY + 22);

  // Total (highlighted)
  doc.setFillColor(...COLORS.accent);
  doc.roundedRect(boxX + 2, boxY + 24, boxWidth - 4, 9, 1, 1, 'F');

  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...COLORS.white);
  doc.text('TOTAL:', boxX + 7, boxY + 30);
  doc.text(`${currency} ${total.toFixed(2)}`, boxX + boxWidth - 7, boxY + 30, { align: 'right' });

  return boxY + 40;
};

/**
 * Draw Signature and Stamp section
 * @param {Object} doc - The jsPDF document
 * @param {number} y - The Y position to start drawing
 * @param {string} creatorName - Optional creator name to display above the stamp
 */
const drawSignatureSection = (doc, y, creatorName = null) => {
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const boxWidth = 80;
  const boxHeight = creatorName ? 42 : 35; // Taller box if creator name is provided
  const footerClearance = 34;
  let startY = y;

  if (startY + boxHeight + footerClearance > pageHeight) {
    doc.addPage();
    startY = 30;
  }

  const boxX = pageWidth - boxWidth - 15;

  doc.setFillColor(...COLORS.light);
  doc.setDrawColor(...COLORS.border);
  doc.roundedRect(boxX, startY, boxWidth, boxHeight, 2, 2, 'FD');

  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...COLORS.primary);
  doc.text('Signature & Company Stamp', boxX + boxWidth / 2, startY + 8, { align: 'center' });

  // Display creator name above the stamp if provided
  if (creatorName) {
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...COLORS.text);
    doc.text(`${creatorName}`, boxX + boxWidth / 2, startY + 15, { align: 'center' });
  }

  // Add stamp image overlay
  try {
    // Position stamp in the center of the signature area
    const stampWidth = 30;
    const stampHeight = 22;
    const stampX = boxX + (boxWidth - stampWidth) / 2;
    const stampY = creatorName ? startY + 17 : startY + 10;
    doc.addImage('/logo/stamp.png', 'PNG', stampX, stampY, stampWidth, stampHeight);
  } catch (e) {
    // Stamp image not available, draw placeholder line
    const lineY = creatorName ? startY + 32 : startY + 25;
    doc.setDrawColor(...COLORS.muted);
    doc.setLineWidth(0.3);
    doc.line(boxX + 10, lineY, boxX + boxWidth - 10, lineY);

    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...COLORS.muted);
    const textY = creatorName ? startY + 38 : startY + 31;
    doc.text('Sign & stamp here', boxX + boxWidth / 2, textY, { align: 'center' });
  }

  return startY + boxHeight + 10;
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
    const pageWidth = doc.internal.pageSize.getWidth();

    const logoUrl = settings?.logo_url || '/logo/dai.png';
    const currency = invoice.currency || settings?.currency || 'QAR';

    // Draw professional header
    drawProfessionalHeader(doc, invoice, logoUrl);

    // Draw invoice details box
    drawInvoiceDetails(doc, invoice);

    // Draw billing section
    drawBillingSection(doc, invoice, customer);

    // Add items table with professional styling (no discount column)
    autoTable(doc, {
      startY: 95,
      head: [['#', 'Item', 'Description', 'Qty', 'Rate', 'Amount']],
      body: (invoice.items || []).map((item, index) => {
        const name = resolveInvoiceProductName(item);
        const description = item.description || '-';
        const quantity = (item.quantity || 0).toString();
        const rate = `${currency} ${parseFloat(item.rate || 0).toFixed(2)}`;
        const amount = `${currency} ${parseFloat(item.amount || 0).toFixed(2)}`;
        return [index + 1, name, description, quantity, rate, amount];
      }),
      theme: 'plain',
      headStyles: {
        fillColor: COLORS.primary,
        textColor: COLORS.white,
        fontSize: 9,
        fontStyle: 'bold',
        halign: 'center',
        cellPadding: 4
      },
      bodyStyles: {
        fontSize: 8,
        cellPadding: 3,
        textColor: COLORS.text
      },
      columnStyles: {
        0: { halign: 'center', cellWidth: 12 },
        1: { cellWidth: 30 },
        2: { cellWidth: 60, textColor: COLORS.muted },
        3: { halign: 'center', cellWidth: 20 },
        4: { halign: 'right', cellWidth: 28 },
        5: { halign: 'right', cellWidth: 30, fontStyle: 'bold' }
      },
      alternateRowStyles: {
        fillColor: [250, 250, 252]
      },
      tableLineColor: COLORS.border,
      tableLineWidth: 0.1,
      margin: { left: 15, right: 15 }
    });

    // Get final Y position after table
    let finalY = 130;
    if (doc.lastAutoTable && doc.lastAutoTable.finalY) {
      finalY = doc.lastAutoTable.finalY;
    }

    // Draw totals section
    const afterTotalsY = drawTotalsSection(doc, invoice, settings, finalY);

    // Add notes section if exists
    if (invoice.client_note) {
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...COLORS.primary);
      doc.text('Notes:', 15, afterTotalsY);

      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...COLORS.muted);
      doc.text(invoice.client_note, 15, afterTotalsY + 6, { maxWidth: 100 });
    }

    // Add terms section if exists
    if (invoice.terms) {
      const termsY = invoice.client_note ? afterTotalsY + 20 : afterTotalsY;
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...COLORS.primary);
      doc.text('Terms & Conditions:', 15, termsY);

      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...COLORS.muted);
      doc.text(invoice.terms, 15, termsY + 6, { maxWidth: 100 });
    }

    // Add Signature & Stamp section
    let signatureY = Math.max(
      afterTotalsY,
      invoice.client_note ? afterTotalsY + 20 : 0,
      invoice.terms ? (invoice.client_note ? afterTotalsY + 40 : afterTotalsY + 20) : 0
    );

    // Ensure at least some spacing from total box if no notes/terms
    if (signatureY === afterTotalsY) signatureY += 5;

    drawSignatureSection(doc, signatureY);

    // Draw company footer on all pages
    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      drawCompanyFooter(doc, i, pageCount);
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

    const pageWidth = doc.internal.pageSize.getWidth();
    const logoUrl = '/logo/dai.png';

    // Draw professional header for Purchase Order
    doc.setFillColor(...COLORS.primary);
    doc.rect(0, 0, pageWidth, 45, 'F');

    // Gold accent line
    doc.setFillColor(...COLORS.gold);
    doc.rect(0, 45, pageWidth, 2, 'F');

    // Try to add logo
    try {
      doc.addImage(logoUrl, 'PNG', 15, 8, 30, 28);
    } catch (e) {
      // Logo not available, skip
    }

    // Company name in header
    doc.setTextColor(...COLORS.white);
    doc.setFontSize(22);
    doc.setFont('helvetica', 'bold');
    doc.text(COMPANY_INFO.name_en, 50, 22);

    // Arabic name
    doc.setFontSize(14);
    doc.setFont('helvetica', 'normal');
    doc.text(COMPANY_INFO.name_ar, 50, 32);

    // PURCHASE ORDER label on the right
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text('PURCHASE ORDER', pageWidth - 15, 28, { align: 'right' });

    // Reset text color
    doc.setTextColor(...COLORS.text);

    // PO Details box
    const boxX = pageWidth - 85;
    const boxY = 55;
    const boxWidth = 70;
    const boxHeight = 40;

    doc.setFillColor(...COLORS.light);
    doc.setDrawColor(...COLORS.border);
    doc.roundedRect(boxX, boxY, boxWidth, boxHeight, 3, 3, 'FD');

    const poDetails = [
      { label: 'PO Number:', value: purchase?.po_number || `PO-${purchase?.id}` || 'N/A' },
      { label: 'Date:', value: purchase?.order_date ? format(new Date(purchase.order_date), 'dd/MM/yyyy') : 'N/A' },
      { label: 'Expected:', value: purchase?.expected_date ? format(new Date(purchase.expected_date), 'dd/MM/yyyy') : 'N/A' },
      { label: 'Status:', value: purchase?.status ? purchase.status.toUpperCase() : 'N/A' }
    ];

    doc.setFontSize(9);
    poDetails.forEach((detail, index) => {
      const y = boxY + 8 + (index * 8);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...COLORS.muted);
      doc.text(detail.label, boxX + 5, y);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...COLORS.text);
      doc.text(detail.value, boxX + 32, y);
    });

    // Supplier section
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...COLORS.primary);
    doc.text('SUPPLIER', 15, 60);

    // Underline
    doc.setDrawColor(...COLORS.accent);
    doc.setLineWidth(0.5);
    doc.line(15, 62, 55, 62);

    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...COLORS.text);
    doc.text(supplierInfo?.name || 'N/A', 15, 70);

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...COLORS.muted);

    let yPos = 76;
    if (supplierInfo?.address) {
      supplierInfo.address.split('\n').forEach((line) => {
        doc.text(line, 15, yPos);
        yPos += 5;
      });
    }

    if (supplierInfo?.email) {
      doc.text(`Email: ${supplierInfo.email}`, 15, yPos);
      yPos += 5;
    }
    if (supplierInfo?.phone) {
      doc.text(`Tel: ${supplierInfo.phone}`, 15, yPos);
    }

    // Items table with professional styling
    autoTable(doc, {
      startY: 115,
      head: [['#', 'Item', 'Description', 'Qty', 'Unit Price', 'Total']],
      body: purchaseItems.map((item, index) => {
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
          index + 1,
          productName,
          descriptionParts.length > 0 ? descriptionParts.join(' | ') : '-',
          formatQuantity(quantityValue),
          formatAmount(unitPriceValue),
          formatAmount(totalPriceValue)
        ];
      }),
      theme: 'plain',
      headStyles: {
        fillColor: COLORS.primary,
        textColor: COLORS.white,
        fontSize: 9,
        fontStyle: 'bold',
        halign: 'center',
        cellPadding: 4
      },
      bodyStyles: {
        fontSize: 8,
        cellPadding: 3,
        textColor: COLORS.text
      },
      columnStyles: {
        0: { halign: 'center', cellWidth: 10 },
        1: { cellWidth: 40 },
        2: { cellWidth: 50, textColor: COLORS.muted },
        3: { halign: 'center', cellWidth: 20 },
        4: { halign: 'right', cellWidth: 30 },
        5: { halign: 'right', cellWidth: 30, fontStyle: 'bold' }
      },
      alternateRowStyles: {
        fillColor: [250, 250, 252]
      },
      tableLineColor: COLORS.border,
      tableLineWidth: 0.1,
      margin: { left: 15, right: 15 }
    });

    let finalY = 130;
    if (doc.lastAutoTable && doc.lastAutoTable.finalY) {
      finalY = doc.lastAutoTable.finalY;
    }

    // Totals section
    const totalsBoxWidth = 80;
    const totalsBoxX = pageWidth - totalsBoxWidth - 15;
    const totalsBoxY = finalY + 5;

    doc.setFillColor(...COLORS.light);
    doc.setDrawColor(...COLORS.border);
    doc.roundedRect(totalsBoxX, totalsBoxY, totalsBoxWidth, 25, 2, 2, 'FD');

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...COLORS.muted);
    doc.text('Subtotal:', totalsBoxX + 5, totalsBoxY + 8);
    doc.setTextColor(...COLORS.text);
    doc.text(formatAmount(subtotal), totalsBoxX + totalsBoxWidth - 5, totalsBoxY + 8, { align: 'right' });

    // Divider line
    doc.setDrawColor(...COLORS.border);
    doc.line(totalsBoxX + 5, totalsBoxY + 12, totalsBoxX + totalsBoxWidth - 5, totalsBoxY + 12);

    // Grand Total (highlighted)
    doc.setFillColor(...COLORS.accent);
    doc.roundedRect(totalsBoxX + 2, totalsBoxY + 14, totalsBoxWidth - 4, 9, 1, 1, 'F');

    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...COLORS.white);
    doc.text('TOTAL:', totalsBoxX + 7, totalsBoxY + 20);
    doc.text(formatAmount(resolvedGrandTotal), totalsBoxX + totalsBoxWidth - 7, totalsBoxY + 20, { align: 'right' });

    const afterTotalsY = totalsBoxY + 30;

    if (purchase?.notes) {
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...COLORS.primary);
      doc.text('Notes:', 15, afterTotalsY);

      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...COLORS.muted);
      doc.text(purchase.notes, 15, afterTotalsY + 6, { maxWidth: 100 });
    }

    // Add Signature & Stamp section
    let signatureY = purchase?.notes ? afterTotalsY + 25 : afterTotalsY + 5;
    drawSignatureSection(doc, signatureY);

    // Draw company footer on all pages
    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      drawCompanyFooter(doc, i, pageCount);
    }

    return doc.output('blob');
  },

  /**
   * Generate a PDF quotation
   * @param {Object} quotation - The quotation data including items
   * @param {Object} customer - The customer data
   * @returns {Blob} - The PDF file as a Blob
   */
  generateQuotationPDF: (quotation, customer, settings = null) => {
    // Create a new PDF document
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();

    const logoUrl = settings?.logo_url || '/logo/dai.png';
    const currency = quotation.currency || settings?.currency || 'QAR';

    // -- Header --
    doc.setFillColor(...COLORS.primary);
    doc.rect(0, 0, pageWidth, 45, 'F');
    doc.setFillColor(...COLORS.gold);
    doc.rect(0, 45, pageWidth, 2, 'F');

    try {
      doc.addImage(logoUrl, 'PNG', 15, 8, 30, 28);
    } catch (e) {
      // no logo
    }

    doc.setTextColor(...COLORS.white);
    doc.setFontSize(22);
    doc.setFont('helvetica', 'bold');
    doc.text(COMPANY_INFO.name_en, 50, 25);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text('Fresh Food Trading Company', 50, 36);

    doc.setFontSize(28);
    doc.setFont('helvetica', 'bold');
    doc.text('QUOTATION', pageWidth - 15, 28, { align: 'right' });
    doc.setTextColor(...COLORS.text);

    // -- Details Box --
    const boxX = pageWidth - 85;
    const boxY = 55;
    const boxWidth = 70;
    const boxHeight = 32;

    doc.setFillColor(...COLORS.light);
    doc.setDrawColor(...COLORS.border);
    doc.roundedRect(boxX, boxY, boxWidth, boxHeight, 3, 3, 'FD');

    const details = [
      { label: 'Quotation No:', value: quotation.quotation_number || 'N/A' },
      { label: 'Date:', value: quotation.quotation_date ? format(new Date(quotation.quotation_date), 'dd/MM/yyyy') : 'N/A' },
      { label: 'Valid Until:', value: quotation.valid_until ? format(new Date(quotation.valid_until), 'dd/MM/yyyy') : 'N/A' }
    ];

    doc.setFontSize(9);
    details.forEach((detail, index) => {
      const y = boxY + 8 + (index * 8);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...COLORS.muted);
      doc.text(detail.label, boxX + 5, y);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...COLORS.text);
      doc.text(detail.value, boxX + 32, y);
    });

    // -- Customer Section --
    drawBillingSection(doc, quotation, customer);

    // -- Items Table --
    autoTable(doc, {
      startY: 95,
      head: [['#', 'Item', 'Description', 'Qty', 'Rate', 'Amount']],
      body: (quotation.items || []).map((item, index) => {
        const name = resolveInvoiceProductName(item);
        const description = item.description || '-';
        const quantity = (item.quantity || 0).toString();
        const rate = `${currency} ${parseFloat(item.unit_price || 0).toFixed(2)}`;
        const amount = `${currency} ${parseFloat(item.total_price || 0).toFixed(2)}`;
        return [index + 1, name, description, quantity, rate, amount];
      }),
      theme: 'plain',
      headStyles: {
        fillColor: COLORS.primary,
        textColor: COLORS.white,
        fontSize: 9,
        fontStyle: 'bold',
        halign: 'center',
        cellPadding: 4
      },
      bodyStyles: {
        fontSize: 8,
        cellPadding: 3,
        textColor: COLORS.text
      },
      columnStyles: {
        0: { halign: 'center', cellWidth: 12 },
        1: { cellWidth: 30 },
        2: { cellWidth: 60, textColor: COLORS.muted },
        3: { halign: 'center', cellWidth: 20 },
        4: { halign: 'right', cellWidth: 28 },
        5: { halign: 'right', cellWidth: 30, fontStyle: 'bold' }
      },
      alternateRowStyles: {
        fillColor: [250, 250, 252]
      },
      tableLineColor: COLORS.border,
      tableLineWidth: 0.1,
      margin: { left: 15, right: 15 }
    });

    let finalY = 130;
    if (doc.lastAutoTable && doc.lastAutoTable.finalY) {
      finalY = doc.lastAutoTable.finalY;
    }

    // -- Totals --
    const totalsBoxWidth = 80;
    const totalsBoxX = pageWidth - totalsBoxWidth - 15;
    const totalsBoxY = finalY + 5;

    doc.setFillColor(...COLORS.light);
    doc.setDrawColor(...COLORS.border);
    doc.roundedRect(totalsBoxX, totalsBoxY, totalsBoxWidth, 25, 2, 2, 'FD');

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...COLORS.muted);
    doc.text('Subtotal:', totalsBoxX + 5, totalsBoxY + 8);
    doc.setTextColor(...COLORS.text);
    doc.text(`${currency} ${parseFloat(quotation.subtotal || 0).toFixed(2)}`, totalsBoxX + totalsBoxWidth - 5, totalsBoxY + 8, { align: 'right' });

    doc.setDrawColor(...COLORS.border);
    doc.line(totalsBoxX + 5, totalsBoxY + 12, totalsBoxX + totalsBoxWidth - 5, totalsBoxY + 12);

    doc.setFillColor(...COLORS.accent);
    doc.roundedRect(totalsBoxX + 2, totalsBoxY + 14, totalsBoxWidth - 4, 9, 1, 1, 'F');

    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...COLORS.white);
    doc.text('TOTAL:', totalsBoxX + 7, totalsBoxY + 20);
    doc.text(`${currency} ${parseFloat(quotation.total_gross || 0).toFixed(2)}`, totalsBoxX + totalsBoxWidth - 7, totalsBoxY + 20, { align: 'right' });

    let afterTotalsY = totalsBoxY + 30;

    // Notes
    if (quotation.notes) {
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...COLORS.primary);
      doc.text('Notes:', 15, afterTotalsY);

      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...COLORS.muted);
      doc.text(quotation.notes, 15, afterTotalsY + 6, { maxWidth: 100 });
    }

    // Signature - include creator name
    let signatureY = quotation.notes ? afterTotalsY + 25 : afterTotalsY + 10;
    if (signatureY < afterTotalsY + 10) signatureY = afterTotalsY + 10;
    const creatorName = quotation.creator?.name || quotation.created_by_name || null;
    drawSignatureSection(doc, signatureY, creatorName);

    // Footer
    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      drawCompanyFooter(doc, i, pageCount);
    }

    return doc.output('blob');
  },

  /**
   * Preview an invoice PDF in a new browser tab
   * @param {Object} invoice - The invoice data including items
   * @param {Object} customer - The customer data
   * @returns {void}
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
  },

  /**
   * Generate a professional expense report PDF
   * @param {Array} expenses - List of expenses
   * @param {Object} filters - Applied filters (date range, etc.)
   * @param {Object} settings - App settings
   * @returns {Blob} - The PDF file as a Blob
   */
  generateExpenseReportPDF: (expenses, filters = {}, settings = null) => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const logoUrl = settings?.logo_url || '/logo/dai.png';
    const currency = settings?.currency || 'QAR';

    // -- Header --
    doc.setFillColor(...COLORS.primary);
    doc.rect(0, 0, pageWidth, 45, 'F');
    doc.setFillColor(...COLORS.gold);
    doc.rect(0, 45, pageWidth, 2, 'F');

    try {
      doc.addImage(logoUrl, 'PNG', 15, 8, 30, 28);
    } catch (e) {
      // skip logo
    }

    doc.setTextColor(...COLORS.white);
    doc.setFontSize(22);
    doc.setFont('helvetica', 'bold');
    doc.text(COMPANY_INFO.name_en, 50, 25);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text('Fresh Food Trading Company', 50, 36);

    doc.setFontSize(24);
    doc.setFont('helvetica', 'bold');
    doc.text('EXPENSE REPORT', pageWidth - 15, 28, { align: 'right' });
    doc.setTextColor(...COLORS.text);

    // -- Report Info Box --
    const boxX = 15;
    const boxY = 60;
    const boxWidth = pageWidth - 30;
    const boxHeight = 25;

    doc.setFillColor(...COLORS.light);
    doc.setDrawColor(...COLORS.border);
    doc.roundedRect(boxX, boxY, boxWidth, boxHeight, 2, 2, 'FD');

    // Report Details
    const reportDate = format(new Date(), 'dd/MM/yyyy HH:mm');
    const dateRangeStr = (filters.startDate && filters.endDate)
      ? `${format(new Date(filters.startDate), 'dd/MM/yyyy')} - ${format(new Date(filters.endDate), 'dd/MM/yyyy')}`
      : 'All Time';

    // Totals Calculation
    const totalAmount = expenses.reduce((sum, item) => sum + parseFloat(item.amount || 0), 0);
    const pendingCount = expenses.filter(e => e.status === 'PENDING').length;
    const approvedCount = expenses.filter(e => e.status === 'APPROVED').length;

    // Line 1
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...COLORS.primary);
    doc.text('Report Date:', boxX + 5, boxY + 8);
    doc.setTextColor(...COLORS.text);
    doc.setFont('helvetica', 'normal');
    doc.text(reportDate, boxX + 30, boxY + 8);

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...COLORS.primary);
    doc.text('Period:', boxX + 80, boxY + 8);
    doc.setTextColor(...COLORS.text);
    doc.setFont('helvetica', 'normal');
    doc.text(dateRangeStr, boxX + 100, boxY + 8);

    // Line 2 (Totals)
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...COLORS.primary);
    doc.text('Total Expenses:', boxX + 5, boxY + 18);
    doc.setTextColor(...COLORS.accent); // Green for money
    doc.setFontSize(12);
    doc.text(`${currency} ${totalAmount.toFixed(2)}`, boxX + 35, boxY + 18);

    doc.setFontSize(10);
    doc.setTextColor(...COLORS.primary);
    doc.text(`(Pending: ${pendingCount} | Approved: ${approvedCount})`, boxX + 80, boxY + 18);

    // -- Table --
    autoTable(doc, {
      startY: boxY + boxHeight + 10,
      head: [['Date', 'Category', 'Description', 'Supplier', 'Status', 'Method', 'Amount']],
      body: expenses.map((item) => {
        return [
          item.expense_date,
          item.category,
          item.description || '-',
          item.supplier?.name || '-',
          item.status,
          item.payment_method,
          `${currency} ${parseFloat(item.amount || 0).toFixed(2)}`
        ];
      }),
      theme: 'plain',
      headStyles: {
        fillColor: COLORS.primary,
        textColor: COLORS.white,
        fontSize: 9,
        fontStyle: 'bold',
        halign: 'center',
        cellPadding: 4
      },
      bodyStyles: {
        fontSize: 8,
        cellPadding: 3,
        textColor: COLORS.text
      },
      columnStyles: {
        0: { cellWidth: 25 },
        1: { cellWidth: 25 },
        2: { cellWidth: 40 },
        3: { cellWidth: 30 },
        4: { cellWidth: 20, halign: 'center' },
        5: { cellWidth: 20, halign: 'center' },
        6: { cellWidth: 20, halign: 'right', fontStyle: 'bold' }
      },
      alternateRowStyles: {
        fillColor: [250, 250, 252]
      },
      tableLineColor: COLORS.border,
      tableLineWidth: 0.1,
      margin: { left: 15, right: 15 }
    });

    // -- Footer --
    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      drawCompanyFooter(doc, i, pageCount);
    }

    return doc.output('blob');
  },

  /**
   * Generate a professional delivery note PDF from invoice data
   * @param {Object} invoice - The invoice data including items
   * @param {Object} customer - The customer data
   * @returns {Blob} - The PDF file as a Blob
   */
  generateDeliveryNotePDF: (invoice, customer, settings = null) => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const logoUrl = settings?.logo_url || '/logo/dai.png';

    // Draw professional header for Delivery Note
    doc.setFillColor(...COLORS.primary);
    doc.rect(0, 0, pageWidth, 45, 'F');

    // Gold accent line
    doc.setFillColor(...COLORS.gold);
    doc.rect(0, 45, pageWidth, 2, 'F');

    // Try to add logo
    try {
      doc.addImage(logoUrl, 'PNG', 15, 8, 30, 28);
    } catch (e) {
      // Logo not available, skip
    }

    // Company name in header
    doc.setTextColor(...COLORS.white);
    doc.setFontSize(22);
    doc.setFont('helvetica', 'bold');
    doc.text(COMPANY_INFO.name_en, 50, 25);

    // Tagline
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text('Fresh Food Trading Company', 50, 34);

    // DELIVERY NOTE label on the right
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text('DELIVERY NOTE', pageWidth - 15, 28, { align: 'right' });

    // Reset text color
    doc.setTextColor(...COLORS.text);

    // Delivery details box
    const boxX = pageWidth - 85;
    const boxY = 55;
    const boxWidth = 70;
    const boxHeight = 32;

    doc.setFillColor(...COLORS.light);
    doc.setDrawColor(...COLORS.border);
    doc.roundedRect(boxX, boxY, boxWidth, boxHeight, 3, 3, 'FD');

    const deliveryNumber = `DN-${invoice.invoice_number?.replace('INV-', '') || invoice.id}`;
    const deliveryDate = format(new Date(), 'dd/MM/yyyy');
    const invoiceRef = invoice.invoice_number || `INV-${invoice.id}`;

    const details = [
      { label: 'D/N No:', value: deliveryNumber },
      { label: 'Date:', value: deliveryDate },
      { label: 'Invoice Ref:', value: invoiceRef }
    ];

    doc.setFontSize(9);
    details.forEach((detail, index) => {
      const y = boxY + 8 + (index * 8);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...COLORS.muted);
      doc.text(detail.label, boxX + 5, y);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...COLORS.text);
      doc.text(detail.value, boxX + 30, y);
    });

    // DELIVER TO section
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...COLORS.primary);
    doc.text('DELIVER TO', 15, 60);

    // Underline
    doc.setDrawColor(...COLORS.accent);
    doc.setLineWidth(0.5);
    doc.line(15, 62, 55, 62);

    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...COLORS.text);
    doc.text(customer?.name || 'N/A', 15, 70);

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...COLORS.muted);

    let yPos = 76;
    if (customer?.address) {
      const addressLines = customer.address.split('\n');
      addressLines.forEach((line) => {
        doc.text(line, 15, yPos);
        yPos += 5;
      });
    }

    if (customer?.phone) {
      doc.text(`Tel: ${customer.phone}`, 15, yPos);
      yPos += 5;
    }

    if (customer?.email) {
      doc.text(`Email: ${customer.email}`, 15, yPos);
    }

    // Items table (without prices - delivery note style)
    autoTable(doc, {
      startY: 90,
      head: [['#', 'Item Description', 'Unit', 'Qty Ordered', 'Qty Delivered']],
      body: (invoice.items || []).map((item, index) => {
        const name = resolveInvoiceProductName(item);
        let displayDescription = name || item.description || `Item #${index + 1}`;

        // If we have both name and description, combine them intelligently
        if (name && item.description) {
          // If description already starts with or contains the name, don't repeat it
          if (item.description.toLowerCase().includes(name.toLowerCase())) {
            displayDescription = item.description;
          } else {
            displayDescription = `${name} - ${item.description}`;
          }
        }

        const unit = item.product?.unit || item.unit || 'pcs';
        const quantity = (item.quantity || 0).toString();
        return [index + 1, displayDescription, unit, quantity, quantity]; // Qty delivered = Qty ordered by default
      }),
      theme: 'plain',
      headStyles: {
        fillColor: COLORS.primary,
        textColor: COLORS.white,
        fontSize: 9,
        fontStyle: 'bold',
        halign: 'center',
        cellPadding: 3
      },
      bodyStyles: {
        fontSize: 9,
        cellPadding: 3,
        textColor: COLORS.text
      },
      columnStyles: {
        0: { halign: 'center', cellWidth: 12 },
        1: { cellWidth: 87 },
        2: { halign: 'center', cellWidth: 25 },
        3: { halign: 'center', cellWidth: 28 },
        4: { halign: 'center', cellWidth: 28 }
      },
      alternateRowStyles: {
        fillColor: [250, 250, 252]
      },
      tableLineColor: COLORS.border,
      tableLineWidth: 0.1,
      margin: { left: 15, right: 15 }
    });

    // Get final Y position after table
    let finalY = 130;
    if (doc.lastAutoTable && doc.lastAutoTable.finalY) {
      finalY = doc.lastAutoTable.finalY + 5;
    }

    // Total items summary
    const totalItems = (invoice.items || []).length;
    const totalQty = (invoice.items || []).reduce((sum, item) => sum + parseFloat(item.quantity || 0), 0);

    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...COLORS.primary);
    doc.text(`Total Items: ${totalItems}`, 15, finalY);
    doc.text(`Total Quantity: ${totalQty}`, 80, finalY);

    // Notes section
    if (invoice.client_note || invoice.notes) {
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...COLORS.primary);
      doc.text('Delivery Notes:', 15, finalY + 12);

      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...COLORS.muted);
      doc.text(invoice.client_note || invoice.notes || '', 15, finalY + 18, { maxWidth: 180 });
    }

    const pageHeight = doc.internal.pageSize.getHeight();
    const notesOffset = invoice.client_note || invoice.notes ? 32 : 20;
    let signatureY = finalY + notesOffset;
    const signatureHeight = 35;
    const footerClearance = 34;

    if (signatureY + signatureHeight + footerClearance > pageHeight) {
      doc.addPage();
      signatureY = 30;
    }

    // Driver signature box
    doc.setFillColor(...COLORS.light);
    doc.setDrawColor(...COLORS.border);
    doc.roundedRect(15, signatureY, 80, 35, 2, 2, 'FD');

    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...COLORS.primary);
    doc.text('Issued By & Comp. Stamp:', 20, signatureY + 8);

    doc.setDrawColor(...COLORS.muted);
    doc.setLineWidth(0.3);
    doc.line(20, signatureY + 25, 90, signatureY + 25);

    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...COLORS.muted);
    doc.text('Name & Signature', 45, signatureY + 31);

    // Receiver signature box
    doc.setFillColor(...COLORS.light);
    doc.roundedRect(110, signatureY, 80, 35, 2, 2, 'FD');

    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...COLORS.primary);
    doc.text('Received By:', 115, signatureY + 8);

    doc.line(115, signatureY + 25, 185, signatureY + 25);

    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...COLORS.muted);
    doc.text('Name, Signature & Stamp', 130, signatureY + 31);

    // Draw company footer on all pages
    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      drawCompanyFooter(doc, i, pageCount);
    }

    return doc.output('blob');
  }
};

export default pdfService;
