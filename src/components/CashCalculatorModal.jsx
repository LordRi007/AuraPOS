import { useState, useEffect } from 'react';
import { X, Delete, Check } from 'lucide-react';

export default function CashCalculatorModal({ isOpen, onClose, total, onConfirm }) {
  if (!isOpen) return null;

  const exchangeRate = 4100;
  const totalKhr = Math.round(total * exchangeRate);

  const [receivedUsd, setReceivedUsd] = useState('');
  const [receivedKhr, setReceivedKhr] = useState('');
  const [activeField, setActiveField] = useState('usd'); // 'usd' or 'khr'

  // Calculations
  const numUsd = parseFloat(receivedUsd) || 0;
  const numKhr = parseFloat(receivedKhr) || 0;
  const totalReceivedUsd = numUsd + (numKhr / exchangeRate);
  const totalReceivedKhr = Math.round(totalReceivedUsd * exchangeRate);
  
  const changeUsd = totalReceivedUsd - total;
  const isSufficient = totalReceivedUsd >= (total - 0.005); // allow minor floating point rounding buffer

  // Cambodian change breakdown (whole dollars, remaining fraction in Riels rounded to nearest 100 Riels)
  const getCambodianChange = (changeVal) => {
    if (changeVal <= 0) return { usd: 0, khr: 0 };
    const usdWhole = Math.floor(changeVal);
    const usdFraction = changeVal - usdWhole;
    const khrFraction = Math.round(usdFraction * exchangeRate / 100) * 100;
    return { usd: usdWhole, khr: khrFraction };
  };

  const changeBreakdown = getCambodianChange(changeUsd);

  // Set initial focus
  useEffect(() => {
    setReceivedUsd('');
    setReceivedKhr('');
    setActiveField('usd');
  }, [isOpen]);

  const handleKeypress = (key) => {
    const currentVal = activeField === 'usd' ? receivedUsd : receivedKhr;

    if (key === 'CLEAR') {
      if (activeField === 'usd') setReceivedUsd('');
      else setReceivedKhr('');
      return;
    }

    if (key === 'BACKSPACE') {
      const newVal = currentVal.toString().slice(0, -1);
      if (activeField === 'usd') setReceivedUsd(newVal);
      else setReceivedKhr(newVal);
      return;
    }

    if (key === '.') {
      if (activeField === 'khr') return; // Riels don't use decimals
      if (currentVal.toString().includes('.')) return;
      const newVal = currentVal === '' ? '0.' : currentVal + '.';
      setReceivedUsd(newVal);
      return;
    }

    // Number keys
    const newVal = currentVal.toString() + key;
    if (activeField === 'usd') {
      // Limit to 2 decimal places
      if (newVal.includes('.') && newVal.split('.')[1].length > 2) return;
      // Prevent leading double zeros
      if (newVal.startsWith('00')) return;
      setReceivedUsd(newVal);
    } else {
      // KHR limits
      if (newVal.startsWith('0')) return;
      setReceivedKhr(newVal);
    }
  };

  const handleExactAmount = () => {
    if (activeField === 'usd') {
      setReceivedUsd(total.toFixed(2));
      setReceivedKhr('');
    } else {
      setReceivedKhr(totalKhr.toString());
      setReceivedUsd('');
    }
  };

  const handleQuickCash = (amount) => {
    if (activeField === 'usd') {
      setReceivedUsd(amount.toString());
      setReceivedKhr('');
    } else {
      setReceivedKhr(amount.toString());
      setReceivedUsd('');
    }
  };

  const handleConfirm = () => {
    if (!isSufficient) return;
    onConfirm({
      receivedUsd: numUsd,
      receivedKhr: numKhr,
      totalReceivedUsd: totalReceivedUsd,
      changeUsd: Math.max(0, changeUsd),
      changeBreakdown: changeBreakdown
    });
  };

  const usdQuickNotes = [1, 5, 10, 20, 50, 100];
  const khrQuickNotes = [5000, 10000, 20000, 50000, 100000];

  return (
    <div style={styles.overlay}>
      <style>{`
        .calculator-modal {
          width: 650px;
          display: grid;
          grid-template-columns: 1fr 1.1fr;
          gap: 20px;
          border: 1px solid var(--glass-border);
          position: relative;
          max-width: 95vw;
          animation: scaleUp 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
        }
        @keyframes scaleUp {
          from { transform: scale(0.9); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
        .calc-input-box {
          background: rgba(0, 0, 0, 0.2);
          border: 1.5px solid var(--glass-border);
          border-radius: 10px;
          padding: 12px;
          cursor: pointer;
          transition: all 0.2s;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .calc-input-box.active {
          border-color: var(--accent-primary);
          background: rgba(170, 85, 255, 0.05);
          box-shadow: 0 0 10px var(--accent-glow);
        }
        .keypad-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 8px;
        }
        .key-btn {
          background: var(--glass-bg);
          border: 1px solid var(--glass-border);
          border-radius: 8px;
          padding: 14px;
          font-size: 16px;
          font-weight: 600;
          color: var(--text-primary);
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.15s;
        }
        .key-btn:hover {
          background: var(--glass-bg-hover);
          border-color: var(--text-secondary);
        }
        .key-btn:active {
          transform: scale(0.95);
        }
        .quick-note-pill {
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid var(--glass-border);
          padding: 8px;
          border-radius: 6px;
          font-size: 11px;
          font-weight: bold;
          cursor: pointer;
          text-align: center;
          color: var(--text-secondary);
          transition: all 0.15s;
        }
        .quick-note-pill:hover {
          background: var(--accent-primary);
          color: white;
          border-color: transparent;
        }
      `}</style>

      <div className="glass-panel calculator-modal" style={styles.modal}>
        {/* Close Button */}
        <button onClick={onClose} style={styles.closeBtn}>
          <X size={16} />
        </button>

        {/* Left Side: Inputs & Change Calculation */}
        <div style={styles.leftCol}>
          <h2 style={styles.title}>Cash Register</h2>
          <span style={styles.subtitle}>Tender dual-currency cash</span>

          {/* Bill Summary */}
          <div style={styles.billDueContainer}>
            <div style={styles.billDueRow}>
              <span style={styles.billDueLabel}>Amount Due USD:</span>
              <span style={styles.billDueValUsd}>${total.toFixed(2)}</span>
            </div>
            <div style={styles.billDueRow}>
              <span style={styles.billDueLabel}>Amount Due KHR:</span>
              <span style={styles.billDueValKhr}>៛{totalKhr.toLocaleString()}</span>
            </div>
          </div>

          {/* Input Fields */}
          <div style={styles.inputsSection}>
            <div 
              className={`calc-input-box ${activeField === 'usd' ? 'active' : ''}`}
              onClick={() => setActiveField('usd')}
            >
              <div>
                <span style={styles.inputLabel}>Received Cash (USD)</span>
                <div style={styles.inputValueUsd}>
                  ${receivedUsd || '0.00'}
                </div>
              </div>
              <span style={activeField === 'usd' ? styles.inputIndicatorActive : styles.inputIndicator}>$</span>
            </div>

            <div 
              className={`calc-input-box ${activeField === 'khr' ? 'active' : ''}`}
              onClick={() => setActiveField('khr')}
            >
              <div>
                <span style={styles.inputLabel}>Received Cash (KHR)</span>
                <div style={styles.inputValueKhr}>
                  ៛{(parseInt(receivedKhr) || 0).toLocaleString()}
                </div>
              </div>
              <span style={activeField === 'khr' ? styles.inputIndicatorActive : styles.inputIndicator}>៛</span>
            </div>
          </div>

          {/* Change calculation */}
          <div style={styles.changeCard}>
            {isSufficient ? (
              <div>
                <span style={styles.changeTitle}>Change Due</span>
                <div style={styles.changeValBig}>
                  ${changeUsd.toFixed(2)}
                </div>
                <div style={styles.changeBreakdownText}>
                  Change: <span style={{fontWeight: 'bold', color: 'var(--success)'}}>${changeBreakdown.usd}.00</span>
                  {changeBreakdown.khr > 0 && (
                    <> + <span style={{fontWeight: 'bold', color: 'var(--success)'}}>៛{changeBreakdown.khr.toLocaleString()}</span></>
                  )}
                </div>
              </div>
            ) : (
              <div>
                <span style={{...styles.changeTitle, color: 'var(--danger)'}}>Amount Remaining</span>
                <div style={{...styles.changeValBig, color: 'var(--danger)'}}>
                  ${Math.abs(changeUsd).toFixed(2)}
                </div>
                <div style={styles.changeBreakdownText}>
                  Required: <span style={{fontWeight: 'bold'}}>៛{Math.round(Math.abs(changeUsd) * exchangeRate).toLocaleString()}</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Side: Keypad & Quick tender */}
        <div style={styles.rightCol}>
          {/* Quick Tender Panel */}
          <div style={styles.quickTenders}>
            <span style={styles.quickTendersTitle}>
              {activeField === 'usd' ? 'Quick USD Cash Notes' : 'Quick KHR Cash Notes'}
            </span>
            <div style={styles.quickTendersGrid}>
              {activeField === 'usd' 
                ? usdQuickNotes.map(amount => (
                    <div 
                      key={amount} 
                      onClick={() => handleQuickCash(amount)} 
                      className="quick-note-pill"
                    >
                      ${amount}
                    </div>
                  ))
                : khrQuickNotes.map(amount => (
                    <div 
                      key={amount} 
                      onClick={() => handleQuickCash(amount)} 
                      className="quick-note-pill"
                    >
                      ៛{amount.toLocaleString()}
                    </div>
                  ))
              }
            </div>
          </div>

          {/* Digital Keypad */}
          <div className="keypad-grid">
            {['7', '8', '9', '4', '5', '6', '1', '2', '3'].map(num => (
              <button 
                key={num} 
                onClick={() => handleKeypress(num)} 
                className="key-btn"
              >
                {num}
              </button>
            ))}
            <button onClick={() => handleKeypress('.')} className="key-btn">.</button>
            <button onClick={() => handleKeypress('0')} className="key-btn">0</button>
            <button onClick={() => handleKeypress('BACKSPACE')} className="key-btn" style={{color: 'var(--warning)'}}>
              <Delete size={18} />
            </button>
          </div>

          <div style={styles.keypadActions}>
            <button 
              onClick={() => handleKeypress('CLEAR')} 
              className="key-btn" 
              style={{flex: 1, padding: '10px', fontSize: '13px', background: 'rgba(255,255,255,0.02)'}}
            >
              Clear
            </button>
            <button 
              onClick={handleExactAmount} 
              className="key-btn" 
              style={{flex: 1.5, padding: '10px', fontSize: '13px', background: 'rgba(0,150,255,0.05)', borderColor: 'rgba(0,150,255,0.2)'}}
            >
              Exact Amount
            </button>
          </div>

          {/* Confirm Payment Action */}
          <button 
            disabled={!isSufficient} 
            onClick={handleConfirm}
            className="btn btn-primary"
            style={{
              width: '100%', 
              marginTop: '16px', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              gap: '8px', 
              padding: '14px',
              borderRadius: '10px',
              border: 'none',
              background: isSufficient ? 'var(--gradient-accent)' : 'rgba(255,255,255,0.03)',
              color: isSufficient ? 'white' : 'var(--text-muted)',
              fontWeight: 'bold',
              cursor: isSufficient ? 'pointer' : 'not-allowed',
              boxShadow: isSufficient ? '0 4px 14px var(--accent-glow)' : 'none'
            }}
          >
            <Check size={18} />
            <span>Confirm Cash Payment</span>
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
    padding: '30px 24px 24px 24px',
    borderRadius: '16px',
  },
  closeBtn: {
    position: 'absolute',
    top: '14px',
    right: '14px',
    background: 'none',
    border: 'none',
    color: 'var(--text-muted)',
    cursor: 'pointer',
  },
  leftCol: {
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    height: '100%',
  },
  rightCol: {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
  },
  title: {
    fontSize: '20px',
    fontWeight: '700',
    color: 'var(--text-primary)',
    marginBottom: '2px',
  },
  subtitle: {
    fontSize: '12px',
    color: 'var(--text-muted)',
    marginBottom: '16px',
  },
  billDueContainer: {
    background: 'rgba(255, 255, 255, 0.02)',
    border: '1px dashed var(--glass-border)',
    borderRadius: '10px',
    padding: '12px',
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
    marginBottom: '16px',
  },
  billDueRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  billDueLabel: {
    fontSize: '12px',
    color: 'var(--text-secondary)',
  },
  billDueValUsd: {
    fontSize: '16px',
    fontWeight: '700',
    color: 'var(--accent-primary)',
  },
  billDueValKhr: {
    fontSize: '14px',
    fontWeight: '600',
    color: 'var(--text-primary)',
  },
  inputsSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    marginBottom: '16px',
  },
  inputLabel: {
    fontSize: '10px',
    color: 'var(--text-muted)',
    textTransform: 'uppercase',
    fontWeight: '600',
    letterSpacing: '0.05em',
  },
  inputValueUsd: {
    fontSize: '18px',
    fontWeight: '800',
    color: 'white',
    marginTop: '2px',
  },
  inputValueKhr: {
    fontSize: '16px',
    fontWeight: '700',
    color: 'white',
    marginTop: '2px',
  },
  inputIndicator: {
    fontSize: '16px',
    fontWeight: 'bold',
    color: 'var(--text-muted)',
  },
  inputIndicatorActive: {
    fontSize: '16px',
    fontWeight: 'bold',
    color: 'var(--accent-primary)',
  },
  changeCard: {
    background: 'rgba(255,255,255,0.02)',
    border: '1px solid var(--glass-border)',
    borderRadius: '12px',
    padding: '16px',
    textAlign: 'center',
  },
  changeTitle: {
    fontSize: '11px',
    color: 'var(--text-muted)',
    textTransform: 'uppercase',
    fontWeight: '600',
    display: 'block',
    marginBottom: '4px',
  },
  changeValBig: {
    fontSize: '28px',
    fontWeight: '800',
    color: 'var(--success)',
    lineHeight: '1.1',
    marginBottom: '8px',
  },
  changeBreakdownText: {
    fontSize: '12px',
    color: 'var(--text-secondary)',
  },
  quickTenders: {
    marginBottom: '14px',
  },
  quickTendersTitle: {
    fontSize: '11px',
    color: 'var(--text-muted)',
    fontWeight: '600',
    display: 'block',
    marginBottom: '6px',
  },
  quickTendersGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(5, 1fr)',
    gap: '6px',
  },
  keypadActions: {
    display: 'flex',
    gap: '8px',
    marginTop: '8px',
  }
};
