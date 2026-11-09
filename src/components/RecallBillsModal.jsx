import { X, Clock, Play, Trash2 } from 'lucide-react';

export default function RecallBillsModal({ isOpen, onClose, suspendedBills, onRecall, onDelete }) {
  if (!isOpen) return null;

  const formatTimestamp = (isoString) => {
    try {
      const date = new Date(isoString);
      return date.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      }) + ' - ' + date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric'
      });
    } catch (e) {
      return isoString;
    }
  };

  const getItemsPreview = (items) => {
    return items.map(item => `${item.name} x${item.quantity}`).join(', ');
  };

  return (
    <div style={styles.overlay}>
      <div className="glass-panel" style={styles.modal}>
        {/* Header */}
        <div style={styles.header}>
          <div style={styles.titleContainer}>
            <Clock size={18} color="var(--accent-primary)" />
            <h3 style={styles.title}>Recall Suspended Bills</h3>
          </div>
          <button onClick={onClose} style={styles.closeBtn}>
            <X size={18} color="var(--text-muted)" />
          </button>
        </div>

        {/* Scrollable list */}
        <div style={styles.listContainer}>
          {suspendedBills.length === 0 ? (
            <div style={styles.emptyState}>
              <Clock size={36} style={{ opacity: 0.3, marginBottom: '8px' }} />
              <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>No suspended bills on hold.</div>
            </div>
          ) : (
            <div style={styles.list}>
              {suspendedBills.map((bill, index) => {
                const totalRiel = Math.round(bill.total * 4100);
                return (
                  <div key={bill.id || index} style={styles.billCard}>
                    <div style={styles.billInfo}>
                      <div style={styles.billHeader}>
                        <span style={styles.billRef}>{bill.reference}</span>
                        <span style={styles.billTime}>{formatTimestamp(bill.timestamp)}</span>
                      </div>
                      <div style={styles.billItems} title={getItemsPreview(bill.items)}>
                        {getItemsPreview(bill.items)}
                      </div>
                      <div style={styles.billPricing}>
                        <span style={styles.billTotal}>${bill.total.toFixed(2)}</span>
                        <span style={styles.billTotalRiel}>៛{totalRiel.toLocaleString()}</span>
                      </div>
                    </div>

                    <div style={styles.billActions}>
                      <button
                        onClick={() => onRecall(index)}
                        style={styles.recallBtn}
                        title="Recall to Active Cart"
                      >
                        <Play size={14} fill="currentColor" />
                        <span>Recall</span>
                      </button>
                      <button
                        onClick={() => onDelete(index)}
                        style={styles.deleteBtn}
                        title="Delete Hold Draft"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={styles.footer}>
          <button onClick={onClose} className="btn btn-secondary" style={styles.closeModalBtn}>
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
    width: '420px',
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
  listContainer: {
    maxHeight: '320px',
    overflowY: 'auto',
    marginBottom: '20px',
    paddingRight: '4px',
  },
  emptyState: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '40px 0',
    color: 'var(--text-muted)',
  },
  list: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  billCard: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    background: 'rgba(255, 255, 255, 0.02)',
    border: '1px solid var(--glass-border)',
    borderRadius: '12px',
    padding: '12px 14px',
    gap: '12px',
    transition: 'var(--transition-fast)',
  },
  billInfo: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
    minWidth: 0, // prevents overflow-ellipsis failing
  },
  billHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    gap: '8px',
  },
  billRef: {
    fontSize: '14px',
    fontWeight: '700',
    color: 'var(--text-primary)',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  billTime: {
    fontSize: '10px',
    color: 'var(--text-muted)',
    flexShrink: 0,
  },
  billItems: {
    fontSize: '12px',
    color: 'var(--text-secondary)',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  billPricing: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  billTotal: {
    fontSize: '13px',
    fontWeight: '700',
    color: 'var(--accent-primary)',
  },
  billTotalRiel: {
    fontSize: '11px',
    color: 'var(--text-muted)',
  },
  billActions: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },
  recallBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    background: 'var(--success-glow)',
    border: '1px solid var(--success)',
    borderRadius: '6px',
    padding: '6px 10px',
    color: 'white',
    fontSize: '11px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'var(--transition-fast)',
  },
  deleteBtn: {
    background: 'none',
    border: '1px solid var(--glass-border)',
    borderRadius: '6px',
    padding: '6px',
    color: 'var(--text-muted)',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'var(--transition-fast)',
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
