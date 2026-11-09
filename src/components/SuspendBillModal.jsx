import { useState, useEffect } from 'react';
import { X, Pause } from 'lucide-react';

export default function SuspendBillModal({ isOpen, onClose, onSuspend, defaultReference }) {
  const [reference, setReference] = useState('');

  useEffect(() => {
    if (isOpen) {
      setReference(defaultReference || '');
    }
  }, [isOpen, defaultReference]);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!reference.trim()) return;
    onSuspend(reference.trim());
    setReference('');
  };

  return (
    <div style={styles.overlay}>
      <div className="glass-panel" style={styles.modal}>
        {/* Header */}
        <div style={styles.header}>
          <div style={styles.titleContainer}>
            <Pause size={18} color="var(--warning)" />
            <h3 style={styles.title}>Suspend Current Bill</h3>
          </div>
          <button onClick={onClose} style={styles.closeBtn}>
            <X size={18} color="var(--text-muted)" />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={styles.body}>
          <p style={styles.description}>
            This will save the current cart items as a draft and clear the active cart, allowing you to process other transactions.
          </p>

          <div style={styles.inputGroup}>
            <label style={styles.label}>Bill Reference / Table Name</label>
            <input
              type="text"
              required
              placeholder="e.g. Table 5, Customer A"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              style={styles.input}
              autoFocus
            />
          </div>

          <div style={styles.actions}>
            <button type="button" onClick={onClose} className="btn btn-secondary" style={styles.btn}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" style={{ ...styles.btn, background: 'var(--warning)', borderColor: 'transparent', boxShadow: '0 4px 10px rgba(245, 158, 11, 0.2)' }}>
              Suspend Bill
            </button>
          </div>
        </form>
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
    textAlign: 'left',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
    paddingBottom: '14px',
    marginBottom: '20px',
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
  body: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  description: {
    fontSize: '13px',
    color: 'var(--text-secondary)',
    lineHeight: '1.4',
    margin: 0,
  },
  inputGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  label: {
    fontSize: '12px',
    fontWeight: '600',
    color: 'var(--text-muted)',
  },
  input: {
    background: 'rgba(0, 0, 0, 0.2)',
    border: '1px solid var(--glass-border)',
    borderRadius: '8px',
    padding: '10px 14px',
    color: 'white',
    fontSize: '14px',
    outline: 'none',
    transition: 'var(--transition-fast)',
  },
  actions: {
    display: 'flex',
    gap: '12px',
    marginTop: '8px',
  },
  btn: {
    flex: 1,
    padding: '10px 16px',
    fontSize: '13px',
    fontWeight: '600',
    borderRadius: '8px',
    cursor: 'pointer',
  }
};
