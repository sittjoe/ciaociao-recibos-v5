/**
 * PDF Generation Service using jsPDF
 * Provides concrete implementation for PDF generation
 */

import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

export interface PDFGenerationOptions {
  format?: 'a4' | 'letter' | 'a3';
  orientation?: 'portrait' | 'landscape';
  margin?: number;
  fontSize?: number;
  lineHeight?: number;
}

export interface PDFDocument {
  title: string;
  content: string;
  metadata?: {
    author?: string;
    subject?: string;
    keywords?: string;
    creator?: string;
  };
}

/**
 * PDFService - Concrete implementation for PDF generation
 */
export class PDFService {
  private defaultOptions: Required<PDFGenerationOptions> = {
    format: 'a4',
    orientation: 'portrait',
    margin: 20,
    fontSize: 12,
    lineHeight: 1.5,
  };

  /**
   * Generate PDF from HTML content
   */
  async generateFromHTML(
    htmlContent: string,
    filename: string = 'document.pdf',
    options: PDFGenerationOptions = {}
  ): Promise<Blob> {
    const opts = { ...this.defaultOptions, ...options };

    try {
      // Create a temporary container for the HTML
      const container = this.createTempContainer(htmlContent);
      document.body.appendChild(container);

      // Convert HTML to canvas
      const canvas = await html2canvas(container, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
      });

      // Remove the temporary container
      document.body.removeChild(container);

      // Create PDF
      const pdf = new jsPDF({
        orientation: opts.orientation,
        unit: 'mm',
        format: opts.format,
      });

      const imgData = canvas.toDataURL('image/png');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();

      const imgWidth = pdfWidth - opts.margin * 2;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      let heightLeft = imgHeight;
      let position = opts.margin;

      // Add first page
      pdf.addImage(imgData, 'PNG', opts.margin, position, imgWidth, imgHeight);
      heightLeft -= pdfHeight - opts.margin * 2;

      // Add additional pages if needed
      while (heightLeft >= 0) {
        position = heightLeft - imgHeight + opts.margin;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', opts.margin, position, imgWidth, imgHeight);
        heightLeft -= pdfHeight - opts.margin * 2;
      }

      // Return as blob
      return pdf.output('blob');
    } catch (error) {
      console.error('Error generating PDF:', error);
      throw new Error('Failed to generate PDF');
    }
  }

  /**
   * Generate PDF from structured document data
   */
  async generateFromDocument(
    document: PDFDocument,
    filename: string = 'document.pdf',
    options: PDFGenerationOptions = {}
  ): Promise<Blob> {
    const opts = { ...this.defaultOptions, ...options };
    const pdf = new jsPDF({
      orientation: opts.orientation,
      unit: 'mm',
      format: opts.format,
    });

    // Set metadata
    if (document.metadata) {
      if (document.metadata.author) pdf.setProperties({ author: document.metadata.author });
      if (document.metadata.subject) pdf.setProperties({ subject: document.metadata.subject });
      if (document.metadata.keywords) pdf.setProperties({ keywords: document.metadata.keywords });
      if (document.metadata.creator) pdf.setProperties({ creator: document.metadata.creator });
    }

    pdf.setProperties({ title: document.title });

    // Set font and size
    pdf.setFontSize(opts.fontSize);

    // Add title
    pdf.setFontSize(18);
    pdf.text(document.title, opts.margin, opts.margin + 10);

    // Add content
    pdf.setFontSize(opts.fontSize);
    const splitContent = pdf.splitTextToSize(
      document.content,
      pdf.internal.pageSize.getWidth() - opts.margin * 2
    );

    pdf.text(splitContent, opts.margin, opts.margin + 25);

    return pdf.output('blob');
  }

  /**
   * Generate receipt PDF with formatted layout
   */
  async generateReceiptPDF(receiptData: any, options: PDFGenerationOptions = {}): Promise<Blob> {
    const opts = { ...this.defaultOptions, ...options };
    const pdf = new jsPDF({
      orientation: opts.orientation,
      unit: 'mm',
      format: opts.format,
    });

    const margin = opts.margin;
    let yPosition = margin;

    // Company header
    pdf.setFontSize(20);
    pdf.text('CiaoCiao Jewelry', margin, yPosition);
    yPosition += 10;

    pdf.setFontSize(10);
    pdf.text('123 Main Street, Dublin, Ireland', margin, yPosition);
    yPosition += 5;
    pdf.text('Phone: +353 1 234 5678 | Email: info@ciaociao.ie', margin, yPosition);
    yPosition += 15;

    // Receipt title and number
    pdf.setFontSize(16);
    pdf.text('RECEIPT', margin, yPosition);
    
    pdf.setFontSize(10);
    const receiptInfo = [
      `Receipt #: ${receiptData.receiptNumber || 'R-001'}`,
      `Date: ${receiptData.date || new Date().toLocaleDateString()}`,
      `Status: ${receiptData.status || 'Paid'}`,
    ];
    
    const rightMargin = pdf.internal.pageSize.getWidth() - margin;
    receiptInfo.forEach((info, index) => {
      pdf.text(info, rightMargin, yPosition + (index * 5), { align: 'right' });
    });
    
    yPosition += 25;

    // Client information
    if (receiptData.client) {
      pdf.setFontSize(12);
      pdf.text('Bill To:', margin, yPosition);
      yPosition += 7;
      
      pdf.setFontSize(10);
      pdf.text(`${receiptData.client.firstName} ${receiptData.client.lastName}`, margin, yPosition);
      yPosition += 5;
      pdf.text(receiptData.client.email, margin, yPosition);
      yPosition += 5;
      pdf.text(receiptData.client.phone, margin, yPosition);
      yPosition += 15;
    }

    // Items table header
    pdf.setFontSize(10);
    const tableTop = yPosition;
    const itemCol = margin;
    const qtyCol = margin + 80;
    const priceCol = margin + 110;
    const totalCol = margin + 140;

    // Draw table header
    pdf.rect(margin, tableTop, pdf.internal.pageSize.getWidth() - margin * 2, 8);
    pdf.text('Description', itemCol + 2, tableTop + 5);
    pdf.text('Qty', qtyCol + 2, tableTop + 5);
    pdf.text('Price', priceCol + 2, tableTop + 5);
    pdf.text('Total', totalCol + 2, tableTop + 5);
    
    yPosition = tableTop + 12;

    // Items
    let subtotal = 0;
    if (receiptData.items) {
      receiptData.items.forEach((item: any) => {
        pdf.text(item.description || 'Item', itemCol + 2, yPosition);
        pdf.text(item.quantity?.toString() || '1', qtyCol + 2, yPosition);
        pdf.text(`€${(item.unitPrice || 0).toFixed(2)}`, priceCol + 2, yPosition);
        const itemTotal = (item.unitPrice || 0) * (item.quantity || 1);
        pdf.text(`€${itemTotal.toFixed(2)}`, totalCol + 2, yPosition);
        subtotal += itemTotal;
        yPosition += 7;
      });
    }

    yPosition += 10;

    // Totals
    const totalsX = pdf.internal.pageSize.getWidth() - margin - 60;
    pdf.text(`Subtotal: €${subtotal.toFixed(2)}`, totalsX, yPosition);
    yPosition += 7;

    const tax = subtotal * 0.23; // 23% VAT
    pdf.text(`VAT (23%): €${tax.toFixed(2)}`, totalsX, yPosition);
    yPosition += 7;

    const total = subtotal + tax;
    pdf.setFontSize(12);
    pdf.text(`Total: €${total.toFixed(2)}`, totalsX, yPosition);

    return pdf.output('blob');
  }

  /**
   * Generate quotation PDF with formatted layout
   */
  async generateQuotationPDF(quotationData: any, options: PDFGenerationOptions = {}): Promise<Blob> {
    const opts = { ...this.defaultOptions, ...options };
    const pdf = new jsPDF({
      orientation: opts.orientation,
      unit: 'mm',
      format: opts.format,
    });

    const margin = opts.margin;
    let yPosition = margin;

    // Company header
    pdf.setFontSize(20);
    pdf.text('CiaoCiao Jewelry', margin, yPosition);
    yPosition += 10;

    pdf.setFontSize(10);
    pdf.text('123 Main Street, Dublin, Ireland', margin, yPosition);
    yPosition += 5;
    pdf.text('Phone: +353 1 234 5678 | Email: info@ciaociao.ie', margin, yPosition);
    yPosition += 15;

    // Quotation title and info
    pdf.setFontSize(16);
    pdf.text('QUOTATION', margin, yPosition);
    
    pdf.setFontSize(10);
    const quotationInfo = [
      `Quotation #: ${quotationData.quotationNumber || 'Q-001'}`,
      `Date: ${quotationData.date || new Date().toLocaleDateString()}`,
      `Valid Until: ${quotationData.validUntil || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString()}`,
    ];
    
    const rightMargin = pdf.internal.pageSize.getWidth() - margin;
    quotationInfo.forEach((info, index) => {
      pdf.text(info, rightMargin, yPosition + (index * 5), { align: 'right' });
    });
    
    yPosition += 25;

    // Title and description
    if (quotationData.title) {
      pdf.setFontSize(14);
      pdf.text(quotationData.title, margin, yPosition);
      yPosition += 10;
    }

    if (quotationData.description) {
      pdf.setFontSize(10);
      const splitDescription = pdf.splitTextToSize(quotationData.description, pdf.internal.pageSize.getWidth() - margin * 2);
      pdf.text(splitDescription, margin, yPosition);
      yPosition += splitDescription.length * 5 + 10;
    }

    // Client information
    if (quotationData.client) {
      pdf.setFontSize(12);
      pdf.text('Quote For:', margin, yPosition);
      yPosition += 7;
      
      pdf.setFontSize(10);
      pdf.text(`${quotationData.client.firstName} ${quotationData.client.lastName}`, margin, yPosition);
      yPosition += 5;
      pdf.text(quotationData.client.email, margin, yPosition);
      yPosition += 5;
      pdf.text(quotationData.client.phone, margin, yPosition);
      yPosition += 15;
    }

    // Items table (similar to receipt)
    pdf.setFontSize(10);
    const tableTop = yPosition;
    const itemCol = margin;
    const qtyCol = margin + 80;
    const priceCol = margin + 110;
    const totalCol = margin + 140;

    pdf.rect(margin, tableTop, pdf.internal.pageSize.getWidth() - margin * 2, 8);
    pdf.text('Description', itemCol + 2, tableTop + 5);
    pdf.text('Qty', qtyCol + 2, tableTop + 5);
    pdf.text('Price', priceCol + 2, tableTop + 5);
    pdf.text('Total', totalCol + 2, tableTop + 5);
    
    yPosition = tableTop + 12;

    let subtotal = 0;
    if (quotationData.items) {
      quotationData.items.forEach((item: any) => {
        pdf.text(item.description || 'Item', itemCol + 2, yPosition);
        pdf.text(item.quantity?.toString() || '1', qtyCol + 2, yPosition);
        pdf.text(`€${(item.unitPrice || 0).toFixed(2)}`, priceCol + 2, yPosition);
        const itemTotal = (item.unitPrice || 0) * (item.quantity || 1);
        pdf.text(`€${itemTotal.toFixed(2)}`, totalCol + 2, yPosition);
        subtotal += itemTotal;
        yPosition += 7;
      });
    }

    yPosition += 10;

    // Totals
    const totalsX = pdf.internal.pageSize.getWidth() - margin - 60;
    pdf.text(`Subtotal: €${subtotal.toFixed(2)}`, totalsX, yPosition);
    yPosition += 7;

    if (quotationData.discount) {
      const discountAmount = quotationData.discount.type === 'percentage' 
        ? subtotal * (quotationData.discount.value / 100)
        : quotationData.discount.value;
      pdf.text(`Discount: -€${discountAmount.toFixed(2)}`, totalsX, yPosition);
      subtotal -= discountAmount;
      yPosition += 7;
    }

    pdf.setFontSize(12);
    pdf.text(`Total: €${subtotal.toFixed(2)}`, totalsX, yPosition);

    // Terms and conditions
    yPosition += 20;
    pdf.setFontSize(10);
    pdf.text('Terms & Conditions:', margin, yPosition);
    yPosition += 7;
    
    const terms = [
      '• This quotation is valid for 30 days from the date issued.',
      '• 50% deposit required to begin work.',
      '• Prices may vary based on current material costs.',
      '• Estimated completion time will be provided upon order confirmation.',
    ];
    
    terms.forEach(term => {
      pdf.text(term, margin, yPosition);
      yPosition += 5;
    });

    return pdf.output('blob');
  }

  /**
   * Download PDF file
   */
  downloadPDF(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  /**
   * Preview PDF in new window
   */
  previewPDF(blob: Blob): void {
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank');
  }

  /**
   * Create temporary container for HTML rendering
   */
  private createTempContainer(htmlContent: string): HTMLElement {
    const container = document.createElement('div');
    container.innerHTML = htmlContent;
    container.style.position = 'absolute';
    container.style.left = '-9999px';
    container.style.top = '-9999px';
    container.style.width = '210mm'; // A4 width
    container.style.backgroundColor = 'white';
    container.style.padding = '20px';
    container.style.fontFamily = 'Arial, sans-serif';
    container.style.fontSize = '12px';
    container.style.lineHeight = '1.5';
    container.style.color = '#333';
    
    return container;
  }
}