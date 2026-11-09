import { X, Printer, CheckCircle } from 'lucide-react';

export default function ReceiptModal({ isOpen, onClose, transaction, closeLabel = 'New Order', isPast = false }) {
  if (!isOpen || !transaction) return null;

  const rielRate = 4100;
  const totalRiel = Math.round(transaction.total * rielRate);

  const handlePrint = () => {
    // Open a simple print window style or trigger default printing
    const printContent = document.getElementById('pos-receipt-print-area').innerHTML;
    const originalContent = document.body.innerHTML;

    // Create temporary printing environment
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <html>
        <head>
          <title>Receipt - ${transaction.id}</title>
          <style>
            body {
              font-family: 'Courier New', Courier, monospace;
              padding: 20px;
              color: #000;
              width: 300px;
              margin: 0 auto;
            }
            .text-center { text-align: center; }
            .text-right { text-align: right; }
            .divider { border-top: 1px dashed #000; margin: 10px 0; }
            .header { margin-bottom: 20px; }
            .title { font-size: 18px; font-weight: bold; margin-bottom: 4px; }
            .item-row { display: flex; justify-content: space-between; font-size: 14px; margin-bottom: 4px; }
            .item-qty { width: 30px; }
            .item-name { flex: 1; }
            .item-total { width: 80px; text-align: right; }
            .summary-row { display: flex; justify-content: space-between; font-size: 14px; margin-bottom: 4px; }
            .summary-label { font-weight: bold; }
            .total-row { font-size: 16px; font-weight: bold; margin-top: 6px; }
            .footer { margin-top: 25px; font-size: 12px; }
          </style>
        </head>
        <body onload="window.print(); window.close();">
          ${printContent}
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <div style={styles.overlay}>
      <div className="glass-panel" style={styles.modal}>
        {/* Success Banner */}
        <div style={styles.successHeader}>
          <CheckCircle size={24} color="var(--success)" />
          <span style={styles.successHeaderText}>{isPast ? 'Receipt Log Details' : 'Transaction Succeeded'}</span>
        </div>

        {/* Scrollable Receipt Viewer */}
        <div style={styles.receiptBody}>
          <div id="pos-receipt-print-area" style={styles.receiptPaper}>
            <div style={styles.textCenter}>
              <div style={styles.receiptBrand}>Seak CAFE</div>
              <div style={styles.receiptAddress}>123 Mao Tse Toung Blvd, Phnom Penh</div>
              <div style={styles.receiptPhone}>Tel: +855 23 999 888</div>
              <div style={styles.divider}></div>
            </div>

            <div style={styles.receiptMeta}>
              <div>Receipt ID: <span style={styles.bold}>{transaction.id}</span></div>
              <div>Date: {new Date(transaction.timestamp).toLocaleString()}</div>
              <div>Cashier: {transaction.cashier || 'Admin'}</div>
              <div>Payment: <span style={styles.bold}>{transaction.paymentMethod}</span></div>
            </div>

            <div style={styles.divider}></div>

            {/* Receipt Items List */}
            <div style={styles.itemsList}>
              <div style={styles.itemHeaderRow}>
                <span style={styles.itemHeaderName}>Item</span>
                <span style={styles.itemHeaderQty}>Qty</span>
                <span style={styles.itemHeaderTotal}>Price</span>
              </div>
              <div style={styles.miniDivider}></div>
              {transaction.items.map((item, idx) => (
                <div key={idx} style={styles.itemRow}>
                  <span style={styles.itemName}>{item.name}</span>
                  <span style={styles.itemQty}>x{item.quantity}</span>
                  <span style={styles.itemTotal}>${(item.price * item.quantity).toFixed(2)}</span>
                </div>
              ))}
            </div>

            <div style={styles.divider}></div>

            {/* Calculations Breakdown */}
            <div style={styles.summaryContainer}>
              <div style={styles.summaryRow}>
                <span>Subtotal:</span>
                <span>${transaction.subtotal.toFixed(2)}</span>
              </div>
              {transaction.discount > 0 && (
                <div style={styles.summaryRow}>
                  <span>Discount:</span>
                  <span style={{ color: 'var(--danger)' }}>-${transaction.discount.toFixed(2)}</span>
                </div>
              )}
              <div style={styles.summaryRow}>
                <span>VAT (10%):</span>
                <span>${transaction.tax.toFixed(2)}</span>
              </div>
              <div style={styles.miniDivider}></div>
              <div style={{ ...styles.summaryRow, ...styles.totalRow }}>
                <span>TOTAL USD:</span>
                <span>${transaction.total.toFixed(2)}</span>
              </div>
              <div style={{ ...styles.summaryRow, ...styles.totalRielRow }}>
                <span>TOTAL KHR:</span>
                <span>៛{totalRiel.toLocaleString()}</span>
              </div>
              {transaction.paymentMethod === 'Cash' && transaction.cashDetails && (
                <>
                  <div style={styles.miniDivider}></div>
                  <div style={styles.summaryRow}>
                    <span>Cash Tendered:</span>
                    <span>
                      {transaction.cashDetails.receivedUsd > 0 && `$${transaction.cashDetails.receivedUsd.toFixed(2)}`}
                      {transaction.cashDetails.receivedUsd > 0 && transaction.cashDetails.receivedKhr > 0 && ' + '}
                      {transaction.cashDetails.receivedKhr > 0 && `៛${transaction.cashDetails.receivedKhr.toLocaleString()}`}
                      {(!transaction.cashDetails.receivedUsd && !transaction.cashDetails.receivedKhr) && '$0.00'}
                    </span>
                  </div>
                  <div style={{ ...styles.summaryRow, fontWeight: '700', color: '#16a34a' }}>
                    <span>Change USD:</span>
                    <span>${transaction.cashDetails.changeUsd.toFixed(2)}</span>
                  </div>
                  {transaction.cashDetails.changeBreakdown && (transaction.cashDetails.changeBreakdown.usd > 0 || transaction.cashDetails.changeBreakdown.khr > 0) && (
                    <div style={{ ...styles.summaryRow, fontSize: '10px', color: '#4b5563', marginTop: '-2px' }}>
                      <span>Tender Return:</span>
                      <span>
                        {transaction.cashDetails.changeBreakdown.usd > 0 && `$${transaction.cashDetails.changeBreakdown.usd}.00`}
                        {transaction.cashDetails.changeBreakdown.usd > 0 && transaction.cashDetails.changeBreakdown.khr > 0 && ' + '}
                        {transaction.cashDetails.changeBreakdown.khr > 0 && `៛${transaction.cashDetails.changeBreakdown.khr.toLocaleString()}`}
                      </span>
                    </div>
                  )}
                </>
              )}
            </div>

            <div style={styles.divider}></div>

            <div style={styles.textCenter}>
              <div style={styles.footerNote}>Thank you for your business!</div>
              <div style={styles.footerNote}>Powered by AuraPos</div>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div style={styles.actionRow}>
          <button onClick={handlePrint} className="btn btn-secondary" style={styles.actionBtn}>
            <Printer size={16} />
            <span>Print Receipt</span>
          </button>
          <button onClick={onClose} className="btn btn-primary" style={styles.actionBtn}>
            <span>{closeLabel}</span>
          </button>
        </div>
      </div>
    </div>
  );
}

const styles = {
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    backdropFilter: 'blur(8px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 999,
  },
  modal: {
    width: '380px',
    padding: '24px',
    border: '1px solid rgba(255, 255, 255, 0.1)',
  },
  successHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    background: 'var(--success-glow)',
    border: '1px solid var(--success)',
    padding: '10px',
    borderRadius: '8px',
    marginBottom: '20px',
  },
  successHeaderText: {
    fontSize: '14px',
    fontWeight: '600',
    color: 'white',
  },
  receiptBody: {
    maxHeight: '400px',
    overflowY: 'auto',
    background: 'white',
    color: '#111827',
    borderRadius: '12px',
    padding: '16px',
    boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.1)',
    marginBottom: '20px',
  },
  receiptPaper: {
    fontFamily: 'Courier New, Courier, monospace',
    fontSize: '12px',
  },
  textCenter: {
    textAlign: 'center',
  },
  receiptBrand: {
    fontSize: '18px',
    fontWeight: '800',
    letterSpacing: '1px',
  },
  receiptAddress: {
    fontSize: '10px',
    color: '#4b5563',
  },
  receiptPhone: {
    fontSize: '10px',
    color: '#4b5563',
  },
  divider: {
    borderTop: '1px dashed #9ca3af',
    margin: '10px 0',
  },
  miniDivider: {
    borderTop: '1px solid #e5e7eb',
    margin: '6px 0',
  },
  receiptMeta: {
    display: 'flex',
    flexDirection: 'column',
    gap: '3px',
    color: '#374151',
  },
  bold: {
    fontWeight: '700',
  },
  itemsList: {
    margin: '10px 0',
  },
  itemHeaderRow: {
    display: 'flex',
    justifyContent: 'space-between',
    fontWeight: '700',
    color: '#1f2937',
  },
  itemHeaderName: { flex: 2 },
  itemHeaderQty: { flex: 1, textAlign: 'center' },
  itemHeaderTotal: { flex: 1, textAlign: 'right' },
  itemRow: {
    display: 'flex',
    justifyContent: 'space-between',
    margin: '4px 0',
    color: '#374151',
  },
  itemName: { flex: 2 },
  itemQty: { flex: 1, textAlign: 'center' },
  itemTotal: { flex: 1, textAlign: 'right' },
  summaryContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  summaryRow: {
    display: 'flex',
    justifyContent: 'space-between',
    color: '#4b5563',
  },
  totalRow: {
    fontWeight: '800',
    fontSize: '14px',
    color: '#111827',
  },
  totalRielRow: {
    fontWeight: '700',
    fontSize: '12px',
    color: '#4b5563',
  },
  footerNote: {
    fontSize: '10px',
    color: '#6b7280',
    marginTop: '4px',
  },
  actionRow: {
    display: 'flex',
    gap: '12px',
  },
  actionBtn: {
    flex: 1,
  }
};
