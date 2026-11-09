import { useState } from 'react';
import { X, Search, RotateCcw, AlertTriangle, CheckCircle, Receipt, User, Clock, CreditCard, Banknote, QrCode } from 'lucide-react';
import { api } from '../services/api';

export default function RefundModal({ isOpen, onClose, onRefundSuccess }) {
  const [receiptNumber, setReceiptNumber] = useState('');
  const [searching, setSearching] = useState(false);
  const [foundTransaction, setFoundTransaction] = useState(null);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);
  const [refundLoading, setRefundLoading] = useState(false);

  if (!isOpen) return null;

  const handleSearch = async (e) => {
    if (e) e.preventDefault();
    const query = receiptNumber.trim();
    if (!query) {
      setError('Please enter a receipt number');
      setFoundTransaction(null);
      return;
    }

    setSearching(true);
    setError(null);
    setSuccessMessage(null);
    setFoundTransaction(null);

    try {
      const transactions = await api.getTransactions();
      
      // Look for match (exact match, case-insensitive match, or numeric part match)
      const found = transactions.find(t => {
        const idLower = t.id.toLowerCase();
        const queryLower = query.toLowerCase();
        
        if (idLower === queryLower) return true;
        if (idLower.replace('txn-', '') === queryLower) return true;
        return false;
      });

      if (found) {
        setFoundTransaction(found);
      } else {
        setError(`No transaction found for "${query}"`);
      }
    } catch (err) {
      console.error('Error fetching transactions:', err);
      setError('Failed to search transactions. Please try again.');
    } finally {
      setSearching(false);
    }
  };

  const handleRefund = async () => {
    if (!foundTransaction) return;
    
    const confirmRefund = window.confirm(
      `Are you sure you want to refund Receipt ${foundTransaction.id} for $${foundTransaction.total.toFixed(2)}?\n\nThis will restore stock count for all items.`
    );
    
    if (!confirmRefund) return;

    setRefundLoading(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const updatedTxn = await api.refundTransaction(foundTransaction.id);
      setSuccessMessage(`Transaction ${foundTransaction.id} refunded successfully!`);
      
      // Update local transaction view
      setFoundTransaction(updatedTxn);
      
      // Trigger callback to reload products / update state in parent POS
      if (onRefundSuccess) {
        onRefundSuccess();
      }
    } catch (err) {
      console.error('Refund failed:', err);
      setError(err.message || 'Refund failed. Please try again.');
    } finally {
      setRefundLoading(false);
    }
  };

  const getPaymentIcon = (method) => {
    switch (method) {
      case 'Cash':
        return <Banknote size={16} color="var(--success)" />;
      case 'KHQR':
        return <QrCode size={16} color="#e53935" />;
      default:
        return <CreditCard size={16} color="var(--accent-primary)" />;
    }
  };

  const formatTimestamp = (isoString) => {
    try {
      const date = new Date(isoString);
      return date.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      }) + ' - ' + date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });
    } catch (e) {
      return isoString;
    }
  };

  const handleClose = () => {
    // Reset state on close
    setReceiptNumber('');
    setFoundTransaction(null);
    setError(null);
    setSuccessMessage(null);
    onClose();
  };

  return (
    <div style={styles.overlay}>
      <div className="glass-panel" style={styles.modal}>
        {/* Header */}
        <div style={styles.header}>
          <div style={styles.titleContainer}>
            <RotateCcw size={18} color="var(--danger)" />
            <h3 style={styles.title}>Refund Transaction</h3>
          </div>
          <button onClick={handleClose} style={styles.closeBtn}>
            <X size={18} color="var(--text-muted)" />
          </button>
        </div>

        {/* Search Input Box */}
        <form onSubmit={handleSearch} style={styles.searchBox}>
          <div style={styles.inputWrapper}>
            <Search size={16} style={styles.searchIcon} />
            <input
              type="text"
              placeholder="Enter receipt number (e.g. TXN-1001)..."
              value={receiptNumber}
              onChange={(e) => setReceiptNumber(e.target.value)}
              style={styles.input}
              disabled={searching || refundLoading}
            />
          </div>
          <button
            type="submit"
            className="btn btn-primary"
            style={styles.searchBtn}
            disabled={searching || refundLoading}
          >
            {searching ? 'Searching...' : 'Search'}
          </button>
        </form>

        {/* Message Notifications */}
        {error && (
          <div style={styles.errorAlert}>
            <AlertTriangle size={16} />
            <span>{error}</span>
          </div>
        )}

        {successMessage && (
          <div style={styles.successAlert}>
            <CheckCircle size={16} />
            <span>{successMessage}</span>
          </div>
        )}

        {/* Transaction Content Panel */}
        <div style={styles.contentArea}>
          {foundTransaction ? (
            <div style={styles.txnCard}>
              {/* Receipt metadata header */}
              <div style={styles.txnHeader}>
                <div style={styles.txnMetaItem}>
                  <Receipt size={14} color="var(--text-muted)" />
                  <span style={styles.txnId}>{foundTransaction.id}</span>
                </div>
                <div style={styles.statusBadge(foundTransaction.status)}>
                  {foundTransaction.status ? foundTransaction.status.toUpperCase() : 'COMPLETED'}
                </div>
              </div>

              <div style={styles.txnDetailsGrid}>
                <div style={styles.txnDetailRow}>
                  <div style={styles.txnDetailLabel}>
                    <User size={12} style={{ marginRight: '4px' }} /> Cashier:
                  </div>
                  <div style={styles.txnDetailVal}>{foundTransaction.cashier}</div>
                </div>
                <div style={styles.txnDetailRow}>
                  <div style={styles.txnDetailLabel}>
                    <Clock size={12} style={{ marginRight: '4px' }} /> Date:
                  </div>
                  <div style={styles.txnDetailVal}>{formatTimestamp(foundTransaction.timestamp)}</div>
                </div>
                <div style={styles.txnDetailRow}>
                  <div style={styles.txnDetailLabel}>
                    <span style={{ marginRight: '4px', display: 'flex', alignItems: 'center' }}>
                      {getPaymentIcon(foundTransaction.paymentMethod)}
                    </span> 
                    Method:
                  </div>
                  <div style={styles.txnDetailVal}>{foundTransaction.paymentMethod}</div>
                </div>
              </div>

              {/* Items Table list */}
              <div style={styles.itemsSection}>
                <h4 style={styles.sectionTitle}>Transaction Items</h4>
                <div style={styles.itemsList}>
                  {foundTransaction.items.map((item, idx) => (
                    <div key={item.id || idx} style={styles.itemRow}>
                      <div style={styles.itemName}>
                        {item.name} <span style={styles.itemQty}>x{item.quantity}</span>
                      </div>
                      <div style={styles.itemPrice}>
                        ${(item.price * item.quantity).toFixed(2)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* pricing calculation details */}
              <div style={styles.summaryBox}>
                <div style={styles.summaryRow}>
                  <span>Subtotal:</span>
                  <span>${foundTransaction.subtotal.toFixed(2)}</span>
                </div>
                {foundTransaction.discount > 0 && (
                  <div style={styles.summaryRow}>
                    <span>Discount:</span>
                    <span style={{ color: 'var(--danger)' }}>-${foundTransaction.discount.toFixed(2)}</span>
                  </div>
                )}
                {foundTransaction.tax > 0 && (
                  <div style={styles.summaryRow}>
                    <span>VAT (10%):</span>
                    <span>${foundTransaction.tax.toFixed(2)}</span>
                  </div>
                )}
                <div style={styles.summaryRowTotal}>
                  <span>Total Refundable:</span>
                  <span style={foundTransaction.status === 'refunded' ? styles.strikethrough : {}}>
                    ${foundTransaction.total.toFixed(2)}
                  </span>
                </div>
              </div>

              {/* Refund execution trigger */}
              {foundTransaction.status !== 'refunded' ? (
                <button
                  onClick={handleRefund}
                  style={styles.refundBtn}
                  disabled={refundLoading}
                >
                  <RotateCcw size={16} />
                  <span>{refundLoading ? 'Processing Refund...' : 'Process Refund'}</span>
                </button>
              ) : (
                <div style={styles.refundedBanner}>
                  <CheckCircle size={16} color="var(--success)" />
                  <span>This transaction has been refunded and inventory has been returned.</span>
                </div>
              )}
            </div>
          ) : (
            !searching && (
              <div style={styles.emptyState}>
                <Receipt size={40} style={{ opacity: 0.2, marginBottom: '10px' }} />
                <span>Search for a receipt number to process a refund.</span>
              </div>
            )
          )}

          {searching && (
            <div style={styles.searchingState}>
              <div className="spinner" style={styles.spinner}></div>
              <span>Searching transaction records...</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={styles.footer}>
          <button onClick={handleClose} className="btn btn-secondary" style={styles.closeModalBtn}>
            Close
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
    width: '460px',
    padding: '24px',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    textAlign: 'left',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
    paddingBottom: '14px',
    marginBottom: '16px',
  },
  titleContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  title: {
    fontSize: '18px',
    fontWeight: '700',
    color: 'var(--text-primary)',
    margin: 0,
  },
  closeBtn: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: '4px',
    display: 'flex',
    alignItems: 'center',
  },
  searchBox: {
    display: 'flex',
    gap: '8px',
    marginBottom: '16px',
  },
  inputWrapper: {
    position: 'relative',
    flex: 1,
  },
  searchIcon: {
    position: 'absolute',
    left: '12px',
    top: '50%',
    transform: 'translateY(-50%)',
    color: 'var(--text-muted)',
    pointerEvents: 'none',
  },
  input: {
    width: '100%',
    padding: '10px 12px 10px 38px',
    borderRadius: '8px',
    border: '1px solid var(--glass-border)',
    background: 'rgba(255, 255, 255, 0.03)',
    color: 'var(--text-primary)',
    fontSize: '13px',
    outline: 'none',
    transition: 'var(--transition-fast)',
  },
  searchBtn: {
    padding: '0 16px',
    fontSize: '13px',
    borderRadius: '8px',
  },
  errorAlert: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    background: 'rgba(239, 68, 68, 0.1)',
    border: '1px solid var(--danger)',
    color: 'var(--danger)',
    padding: '10px 14px',
    borderRadius: '8px',
    fontSize: '13px',
    marginBottom: '16px',
  },
  successAlert: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    background: 'rgba(16, 185, 129, 0.1)',
    border: '1px solid var(--success)',
    color: 'var(--success)',
    padding: '10px 14px',
    borderRadius: '8px',
    fontSize: '13px',
    marginBottom: '16px',
  },
  contentArea: {
    minHeight: '150px',
    maxHeight: '380px',
    overflowY: 'auto',
    marginBottom: '20px',
    paddingRight: '2px',
  },
  emptyState: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '40px 0',
    color: 'var(--text-muted)',
    fontSize: '13px',
  },
  searchingState: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '40px 0',
    color: 'var(--text-muted)',
    fontSize: '13px',
    gap: '12px',
  },
  spinner: {
    width: '24px',
    height: '24px',
    border: '2px solid rgba(255, 255, 255, 0.1)',
    borderTopColor: 'var(--accent-primary)',
    borderRadius: '50%',
    animation: 'spin 0.8s linear infinite',
  },
  txnCard: {
    background: 'rgba(255, 255, 255, 0.01)',
    border: '1px solid var(--glass-border)',
    borderRadius: '12px',
    padding: '16px',
    display: 'flex',
    flexDirection: 'column',
    gap: '14px',
  },
  txnHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
    paddingBottom: '10px',
  },
  txnMetaItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },
  txnId: {
    fontWeight: '700',
    fontSize: '15px',
    color: 'var(--text-primary)',
  },
  statusBadge: (status) => {
    const isRefunded = status === 'refunded';
    return {
      padding: '4px 8px',
      borderRadius: '6px',
      fontSize: '10px',
      fontWeight: '700',
      letterSpacing: '0.05em',
      background: isRefunded ? 'rgba(239, 68, 68, 0.15)' : 'rgba(16, 185, 129, 0.15)',
      color: isRefunded ? 'var(--danger)' : 'var(--success)',
      border: `1px solid ${isRefunded ? 'var(--danger)' : 'var(--success)'}`,
    };
  },
  txnDetailsGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '8px 16px',
    background: 'rgba(255, 255, 255, 0.02)',
    padding: '10px 12px',
    borderRadius: '8px',
    fontSize: '12px',
  },
  txnDetailRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  txnDetailLabel: {
    color: 'var(--text-muted)',
    display: 'flex',
    alignItems: 'center',
  },
  txnDetailVal: {
    color: 'var(--text-primary)',
    fontWeight: '600',
  },
  itemsSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  sectionTitle: {
    margin: 0,
    fontSize: '12px',
    fontWeight: '700',
    color: 'var(--text-secondary)',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  },
  itemsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
    maxHeight: '120px',
    overflowY: 'auto',
    background: 'rgba(0, 0, 0, 0.1)',
    padding: '8px 10px',
    borderRadius: '8px',
  },
  itemRow: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '12px',
    color: 'var(--text-primary)',
  },
  itemName: {
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    marginRight: '8px',
  },
  itemQty: {
    color: 'var(--text-muted)',
    marginLeft: '4px',
    fontWeight: '600',
  },
  itemPrice: {
    fontWeight: '600',
    flexShrink: 0,
  },
  summaryBox: {
    borderTop: '1px solid rgba(255, 255, 255, 0.05)',
    paddingTop: '10px',
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
    fontSize: '12px',
  },
  summaryRow: {
    display: 'flex',
    justifyContent: 'space-between',
    color: 'var(--text-secondary)',
  },
  summaryRowTotal: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '14px',
    fontWeight: '700',
    color: 'var(--text-primary)',
    borderTop: '1px dashed rgba(255, 255, 255, 0.1)',
    paddingTop: '6px',
    marginTop: '4px',
  },
  strikethrough: {
    textDecoration: 'line-through',
    opacity: 0.6,
  },
  refundBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    background: 'var(--danger-glow)',
    border: '1px solid var(--danger)',
    borderRadius: '8px',
    padding: '12px',
    color: 'white',
    fontSize: '13px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'var(--transition-fast)',
    marginTop: '6px',
  },
  refundedBanner: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    background: 'rgba(16, 185, 129, 0.05)',
    border: '1px solid rgba(16, 185, 129, 0.2)',
    borderRadius: '8px',
    padding: '12px',
    color: 'var(--text-secondary)',
    fontSize: '12px',
    lineHeight: '1.4',
    marginTop: '6px',
  },
  footer: {
    borderTop: '1px solid rgba(255, 255, 255, 0.08)',
    paddingTop: '14px',
    display: 'flex',
    justifyContent: 'flex-end',
  },
  closeModalBtn: {
    padding: '8px 16px',
    fontSize: '13px',
  }
};
