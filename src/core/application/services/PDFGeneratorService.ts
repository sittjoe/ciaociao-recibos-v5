import { Injectable } from '../../infrastructure/di/index.js';
import { Receipt } from '../../domain/entities/Receipt.js';
import { Quotation } from '../../domain/entities/Quotation.js';
import { Client } from '../../domain/entities/Client.js';

export interface PDFOptions {
  includeHeader?: boolean;
  includeLogo?: boolean;
  includeFooter?: boolean;
  includeWatermark?: boolean;
  fontSize?: 'small' | 'medium' | 'large';
  theme?: 'default' | 'minimal' | 'elegant';
}

export interface BusinessInfo {
  name: string;
  address: string;
  phone: string;
  email: string;
  website?: string;
  logo?: string;
  taxId?: string;
}

@Injectable()
export class PDFGeneratorService {
  private defaultBusinessInfo: BusinessInfo = {
    name: 'CiaoCiao Jewelry',
    address: '123 Main Street, City, State 12345',
    phone: '(555) 123-4567',
    email: 'info@ciaociaojewelry.com',
    website: 'www.ciaociaojewelry.com',
  };

  /**
   * Generate PDF for receipt
   */
  async generateReceiptPDF(
    receipt: Receipt,
    client: Client,
    options: PDFOptions = {},
    businessInfo?: Partial<BusinessInfo>
  ): Promise<Blob> {
    const business = { ...this.defaultBusinessInfo, ...businessInfo };
    const opts = this.mergeDefaultOptions(options);

    // Create PDF document structure
    const pdfContent = this.createReceiptContent(receipt, client, business, opts);
    
    // Convert to PDF using a PDF library (placeholder for actual implementation)
    return this.renderToPDF(pdfContent, opts);
  }

  /**
   * Generate PDF for quotation
   */
  async generateQuotationPDF(
    quotation: Quotation,
    client: Client,
    options: PDFOptions = {},
    businessInfo?: Partial<BusinessInfo>
  ): Promise<Blob> {
    const business = { ...this.defaultBusinessInfo, ...businessInfo };
    const opts = this.mergeDefaultOptions(options);

    // Create PDF document structure
    const pdfContent = this.createQuotationContent(quotation, client, business, opts);
    
    // Convert to PDF
    return this.renderToPDF(pdfContent, opts);
  }

  /**
   * Generate receipt HTML for preview
   */
  generateReceiptHTML(
    receipt: Receipt,
    client: Client,
    options: PDFOptions = {},
    businessInfo?: Partial<BusinessInfo>
  ): string {
    const business = { ...this.defaultBusinessInfo, ...businessInfo };
    const opts = this.mergeDefaultOptions(options);

    return this.createReceiptContent(receipt, client, business, opts);
  }

  /**
   * Generate quotation HTML for preview
   */
  generateQuotationHTML(
    quotation: Quotation,
    client: Client,
    options: PDFOptions = {},
    businessInfo?: Partial<BusinessInfo>
  ): string {
    const business = { ...this.defaultBusinessInfo, ...businessInfo };
    const opts = this.mergeDefaultOptions(options);

    return this.createQuotationContent(quotation, client, business, opts);
  }

  private createReceiptContent(
    receipt: Receipt,
    client: Client,
    business: BusinessInfo,
    options: Required<PDFOptions>
  ): string {
    const styles = this.getStyles(options.theme, options.fontSize);
    const header = options.includeHeader ? this.createHeader(business, options.includeLogo) : '';
    const footer = options.includeFooter ? this.createFooter(business) : '';
    
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Receipt #${receipt.receiptNumber}</title>
        <style>${styles}</style>
      </head>
      <body>
        ${header}
        
        <div class="document-content">
          <div class="document-title">
            <h1>RECEIPT</h1>
            <div class="receipt-info">
              <strong>Receipt #:</strong> ${receipt.receiptNumber}<br>
              <strong>Date:</strong> ${receipt.createdAt.toLocaleDateString()}<br>
              <strong>Status:</strong> ${receipt.status.toUpperCase()}
            </div>
          </div>

          <div class="client-info">
            <h3>Bill To:</h3>
            <div>
              <strong>${client.firstName} ${client.lastName}</strong><br>
              ${client.email}<br>
              ${client.phone}<br>
              ${this.formatAddress(client.address)}
            </div>
          </div>

          <table class="items-table">
            <thead>
              <tr>
                <th>Description</th>
                <th>Qty</th>
                <th>Unit Price</th>
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              ${receipt.items
                .map(
                  item => `
                <tr>
                  <td>
                    <strong>${item.description}</strong>
                    ${item.material ? `<br><small>Material: ${item.material}${item.karat ? ` ${item.karat}k` : ''}</small>` : ''}
                    ${item.weight ? `<br><small>Weight: ${item.weight}g</small>` : ''}
                  </td>
                  <td>${item.quantity}</td>
                  <td>$${item.unitPrice.toFixed(2)}</td>
                  <td>$${item.totalPrice.toFixed(2)}</td>
                </tr>
              `
                )
                .join('')}
            </tbody>
          </table>

          <div class="totals">
            <div class="total-row">
              <span>Subtotal:</span>
              <span>$${receipt.subtotal.toFixed(2)}</span>
            </div>
            <div class="total-row">
              <span>${receipt.tax.label} (${(receipt.tax.rate * 100).toFixed(1)}%):</span>
              <span>$${receipt.tax.amount.toFixed(2)}</span>
            </div>
            <div class="total-row total-final">
              <span><strong>Total:</strong></span>
              <span><strong>$${receipt.total.toFixed(2)}</strong></span>
            </div>
            
            ${receipt.payments.length > 0 ? `
              <div class="payment-info">
                <h4>Payments:</h4>
                ${receipt.payments
                  .map(
                    payment => `
                  <div class="payment-row">
                    <span>${payment.method.toUpperCase()} - ${payment.date.toLocaleDateString()}:</span>
                    <span>$${payment.amount.toFixed(2)}</span>
                  </div>
                `
                  )
                  .join('')}
                <div class="balance-row">
                  <span><strong>Balance Due:</strong></span>
                  <span><strong>$${receipt.getRemainingBalance().toFixed(2)}</strong></span>
                </div>
              </div>
            ` : ''}
          </div>

          ${receipt.notes ? `
            <div class="notes">
              <h4>Notes:</h4>
              <p>${receipt.notes}</p>
            </div>
          ` : ''}
        </div>
        
        ${footer}
      </body>
      </html>
    `;
  }

  private createQuotationContent(
    quotation: Quotation,
    client: Client,
    business: BusinessInfo,
    options: Required<PDFOptions>
  ): string {
    const styles = this.getStyles(options.theme, options.fontSize);
    const header = options.includeHeader ? this.createHeader(business, options.includeLogo) : '';
    const footer = options.includeFooter ? this.createFooter(business) : '';
    
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Quotation #${quotation.quotationNumber}</title>
        <style>${styles}</style>
      </head>
      <body>
        ${header}
        
        <div class="document-content">
          <div class="document-title">
            <h1>QUOTATION</h1>
            <div class="quotation-info">
              <strong>Quotation #:</strong> ${quotation.quotationNumber}<br>
              <strong>Date:</strong> ${quotation.createdAt.toLocaleDateString()}<br>
              <strong>Valid Until:</strong> ${quotation.validUntil.toLocaleDateString()}<br>
              <strong>Status:</strong> ${quotation.status.toUpperCase()}
            </div>
          </div>

          <div class="quotation-header">
            <h2>${quotation.title}</h2>
            ${quotation.description ? `<p>${quotation.description}</p>` : ''}
          </div>

          <div class="client-info">
            <h3>Quote For:</h3>
            <div>
              <strong>${client.firstName} ${client.lastName}</strong><br>
              ${client.email}<br>
              ${client.phone}<br>
              ${this.formatAddress(client.address)}
            </div>
          </div>

          <table class="items-table">
            <thead>
              <tr>
                <th>Description</th>
                <th>Qty</th>
                <th>Unit Price</th>
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              ${quotation.items
                .map(
                  item => `
                <tr>
                  <td>
                    <strong>${item.description}</strong>
                    ${item.material ? `<br><small>Material: ${item.material}${item.karat ? ` ${item.karat}k` : ''}</small>` : ''}
                    ${item.weight ? `<br><small>Weight: ${item.weight}g</small>` : ''}
                    ${item.laborCost ? `<br><small>Labor: $${item.laborCost.toFixed(2)}</small>` : ''}
                  </td>
                  <td>${item.quantity}</td>
                  <td>$${item.unitPrice.toFixed(2)}</td>
                  <td>$${item.totalPrice.toFixed(2)}</td>
                </tr>
              `
                )
                .join('')}
            </tbody>
          </table>

          <div class="totals">
            <div class="total-row">
              <span>Subtotal:</span>
              <span>$${quotation.subtotal.toFixed(2)}</span>
            </div>
            ${quotation.discount ? `
              <div class="total-row">
                <span>Discount (${quotation.discount.type === 'percentage' ? `${quotation.discount.value}%` : `$${quotation.discount.value}`}):</span>
                <span>-$${quotation.discountAmount.toFixed(2)}</span>
              </div>
            ` : ''}
            <div class="total-row total-final">
              <span><strong>Total:</strong></span>
              <span><strong>$${quotation.total.toFixed(2)}</strong></span>
            </div>
          </div>

          ${quotation.notes ? `
            <div class="notes">
              <h4>Notes:</h4>
              <p>${quotation.notes}</p>
            </div>
          ` : ''}

          <div class="terms">
            <h4>Terms & Conditions:</h4>
            <p>This quotation is valid until ${quotation.validUntil.toLocaleDateString()}.</p>
            <p>Prices are subject to change based on material costs.</p>
            <p>50% deposit required to begin work.</p>
          </div>
        </div>
        
        ${footer}
      </body>
      </html>
    `;
  }

  private createHeader(business: BusinessInfo, includeLogo: boolean): string {
    return `
      <div class="document-header">
        ${includeLogo && business.logo ? `<img src="${business.logo}" alt="Logo" class="logo" />` : ''}
        <div class="business-info">
          <h1>${business.name}</h1>
          <div>${business.address}</div>
          <div>Phone: ${business.phone}</div>
          <div>Email: ${business.email}</div>
          ${business.website ? `<div>Web: ${business.website}</div>` : ''}
          ${business.taxId ? `<div>Tax ID: ${business.taxId}</div>` : ''}
        </div>
      </div>
    `;
  }

  private createFooter(business: BusinessInfo): string {
    return `
      <div class="document-footer">
        <p>Thank you for your business!</p>
        <p>${business.name} | ${business.phone} | ${business.email}</p>
      </div>
    `;
  }

  private formatAddress(address: any): string {
    if (!address) return '';
    
    const parts = [
      address.street,
      address.city,
      address.state,
      address.zipCode,
      address.country
    ].filter(Boolean);
    
    return parts.join(', ');
  }

  private getStyles(theme: string, fontSize: string): string {
    const fontSizes = {
      small: '12px',
      medium: '14px',
      large: '16px',
    };

    const baseStyles = `
      * { box-sizing: border-box; }
      body {
        font-family: 'Arial', sans-serif;
        font-size: ${fontSizes[fontSize as keyof typeof fontSizes]};
        line-height: 1.6;
        color: #333;
        margin: 0;
        padding: 20px;
      }
      .document-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        border-bottom: 2px solid #333;
        padding-bottom: 20px;
        margin-bottom: 30px;
      }
      .logo { max-height: 60px; }
      .business-info { text-align: right; }
      .business-info h1 { margin: 0; font-size: 24px; }
      .document-title { 
        display: flex; 
        justify-content: space-between; 
        align-items: center; 
        margin-bottom: 30px;
      }
      .document-title h1 { margin: 0; font-size: 28px; }
      .client-info { margin-bottom: 30px; }
      .items-table {
        width: 100%;
        border-collapse: collapse;
        margin-bottom: 30px;
      }
      .items-table th,
      .items-table td {
        padding: 12px;
        text-align: left;
        border-bottom: 1px solid #ddd;
      }
      .items-table th {
        background-color: #f8f9fa;
        font-weight: bold;
      }
      .totals {
        max-width: 400px;
        margin-left: auto;
        margin-bottom: 30px;
      }
      .total-row {
        display: flex;
        justify-content: space-between;
        padding: 8px 0;
      }
      .total-final {
        border-top: 2px solid #333;
        font-size: 18px;
        padding-top: 12px;
      }
      .payment-info, .notes, .terms {
        margin-top: 30px;
        padding: 20px;
        background-color: #f8f9fa;
        border-radius: 4px;
      }
      .payment-row, .balance-row {
        display: flex;
        justify-content: space-between;
        padding: 4px 0;
      }
      .document-footer {
        text-align: center;
        margin-top: 40px;
        padding-top: 20px;
        border-top: 1px solid #ddd;
        color: #666;
      }
    `;

    // Theme-specific styles
    const themeStyles = {
      default: '',
      minimal: `
        .document-header { border-bottom: 1px solid #ddd; }
        .items-table th { background-color: transparent; }
        .total-final { border-top: 1px solid #ddd; }
      `,
      elegant: `
        body { font-family: 'Georgia', serif; }
        .document-header { border-bottom: 3px double #333; }
        .document-title h1 { font-family: 'Georgia', serif; }
        .total-final { border-top: 3px double #333; }
      `,
    };

    return baseStyles + (themeStyles[theme as keyof typeof themeStyles] || '');
  }

  private mergeDefaultOptions(options: PDFOptions): Required<PDFOptions> {
    return {
      includeHeader: true,
      includeLogo: false,
      includeFooter: true,
      includeWatermark: false,
      fontSize: 'medium',
      theme: 'default',
      ...options,
    };
  }

  private async renderToPDF(htmlContent: string, _options: Required<PDFOptions>): Promise<Blob> {
    // This is a placeholder - in a real implementation, you would use a library like:
    // - Puppeteer (for Node.js)
    // - jsPDF with html2canvas (for browser)
    // - @react-pdf/renderer (for React)
    // - html2pdf.js (for browser)
    
    // For demonstration, returning a blob with the HTML content
    return new Blob([htmlContent], { type: 'text/html' });
  }
}
