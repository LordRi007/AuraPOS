import { useState, useEffect } from 'react';
import { QrCode, ShieldCheck, CheckCircle2, AlertCircle, Loader2, X } from 'lucide-react';
import { api } from '../services/api';
import QRCode from 'qrcode';

export default function KHQRModal({ isOpen, onClose, total, onPaymentSuccess }) {
  const [timer, setTimer] = useState(120); // 2 minutes countdown
  const [status, setStatus] = useState('loading'); // loading, pending, success, expired, error
  const [qrString, setQrString] = useState('');
  const [qrBase64, setQrBase64] = useState('');
  const [md5, setMd5] = useState('');
  const [error, setError] = useState('');
  const [convertedAmount, setConvertedAmount] = useState(0);
  const [convertedCurrency, setConvertedCurrency] = useState('USD');

  // Convert the raw KHQR string to a Base64 QR code image
  useEffect(() => {
    if (qrString) {
      QRCode.toDataURL(qrString, {
        margin: 1,
        width: 256,
        errorCorrectionLevel: 'H',
        color: {
          dark: '#000000',
          light: '#ffffff',
        }
      })
      .then(url => {
        setQrBase64(url);
      })
      .catch(err => {
        console.error('Failed to generate Base64 QR code:', err);
      });
    } else {
      setQrBase64('');
    }
  }, [qrString]);

  // Manual Hash verification states
  const [showHashInput, setShowHashInput] = useState(false);
  const [hashValue, setHashValue] = useState('');
  const [verifyingHash, setVerifyingHash] = useState(false);
  const [hashError, setHashError] = useState('');

  // Request a new KHQR from the backend
  const generatePaymentQR = async () => {
    try {
      setStatus('loading');
      setError('');
      const res = await api.generateKHQR(total);
      if (res && res.success) {
        setQrString(res.qr);
        setMd5(res.md5);
        setConvertedAmount(res.amount);
        setConvertedCurrency(res.currency);
        setTimer(120); // reset countdown
        setStatus('pending');
      } else {
        throw new Error(res.message || 'Failed to generate QR');
      }
    } catch (err) {
      console.error('KHQR generation failed:', err);
      setError(err.message || 'Error connecting to payment gateway.');
      setStatus('error');
    }
  };

  // Verify the payment manually using a transaction hash
  const handleVerifyByHash = async () => {
    if (!hashValue.trim()) return;
    try {
      setVerifyingHash(true);
      setHashError('');
      const res = await api.checkKHQRPaymentByHash(hashValue.trim());
      if (res && res.success) {
        setStatus('success');
        setTimeout(() => {
          onPaymentSuccess();
        }, 1500);
      } else {
        setHashError(res.message || 'Transaction not found for this hash.');
      }
    } catch (err) {
      console.error(err);
      setHashError(err.message || 'Error checking transaction by hash.');
    } finally {
      setVerifyingHash(false);
    }
  };

  useEffect(() => {
    if (!isOpen) return;

    generatePaymentQR();
  }, [isOpen, total]);

  useEffect(() => {
    if (!isOpen || status !== 'pending') return;

    // 1. Countdown timer
    const countdown = setInterval(() => {
      setTimer((prev) => {
        if (prev <= 1) {
          clearInterval(countdown);
          setStatus('expired');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    // 2. Poll payment status every 3 seconds
    let statusPoll = null;
    if (md5) {
      statusPoll = setInterval(async () => {
        try {
          const res = await api.checkKHQRPayment(md5);
          if (res && res.success && res.paid === true) {
            clearInterval(countdown);
            clearInterval(statusPoll);
            setStatus('success');
            setTimeout(() => {
              onPaymentSuccess();
            }, 1500); // success screen duration
          }
        } catch (err) {
          console.warn('Payment check polling warning:', err);
        }
      }, 3000);
    }

    return () => {
      clearInterval(countdown);
      if (statusPoll) clearInterval(statusPoll);
    };
  }, [isOpen, status, md5, onPaymentSuccess]);

  if (!isOpen) return null;

  const formatTimer = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const formattedAmount = convertedCurrency === 'KHR' 
    ? `៛${convertedAmount.toLocaleString()}` 
    : `$${convertedAmount.toFixed(2)}`;

  return (
    <div style={styles.overlay}>
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .spin {
          animation: spin 1s linear infinite;
        }
        .scale-up {
          animation: scaleUp 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
        }
        @keyframes scaleUp {
          from { transform: scale(0.6); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
      `}</style>
      <div className="glass-panel" style={styles.modal}>
        {/* Header */}
        <div style={styles.header}>
          <div style={styles.brandTitle}>
            <span style={styles.kh}>KH</span>
            <span style={styles.qr}>QR</span>
            <span style={styles.merchantLabel}>Merchant Pay</span>
          </div>
          <button onClick={onClose} style={styles.closeBtn}>
            <X size={18} color="var(--text-muted)" />
          </button>
        </div>

        {/* Loading State */}
        {status === 'loading' && (
          <div style={{...styles.content, padding: '40px 0'}}>
            <Loader2 size={40} className="spin" style={{color: 'var(--accent-primary)', marginBottom: '16px'}} />
            <div style={{color: 'var(--text-secondary)', fontSize: '14px'}}>Generating KHQR code...</div>
          </div>
        )}

        {/* Error State */}
        {status === 'error' && (
          <div style={styles.successContent}>
            <AlertCircle size={48} color="var(--danger)" style={{marginBottom: '16px'}} />
            <h3 style={{...styles.successTitle, color: 'var(--danger)'}}>Gateway Error</h3>
            <p style={{...styles.successDesc, margin: '8px 24px 20px 24px'}}>{error}</p>
            <button 
              onClick={generatePaymentQR} 
              style={styles.retryBtn}
            >
              Try Again
            </button>
          </div>
        )}

        {/* QR Pending Scan State */}
        {status === 'pending' && (
          <div style={styles.content}>
            <div style={styles.amountBox}>
              <div style={styles.usdTotal}>{formattedAmount}</div>
              {convertedCurrency === 'KHR' && (
                <div style={styles.rielTotal}>Equivalent to ${total.toFixed(2)} USD</div>
              )}
            </div>

            {/* QR Wrapper */}
            <div style={styles.qrContainer}>
              <div style={styles.qrOuterBorder}>
                <div style={styles.khqrFrame}>
                  {/* Real QR Code image generated locally as Base64 data URI */}
                  {qrBase64 ? (
                    <img 
                      src={qrBase64} 
                      alt="KHQR Code"
                      style={{
                        width: '168px',
                        height: '168px',
                        borderRadius: '4px',
                        border: '6px solid white',
                        display: 'block'
                      }}
                    />
                  ) : (
                    <div style={{ width: '168px', height: '168px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'white', borderRadius: '4px' }}>
                      <Loader2 size={24} className="spin" style={{ color: 'var(--accent-primary)' }} />
                    </div>
                  )}
                  
                  {/* Central Bakong Logo Badge */}
                  <div style={styles.bakongCenterBadge}>
                    <span style={{fontSize: '7px', fontWeight: '900', color: 'white'}}>KHQR</span>
                  </div>
                </div>
              </div>
            </div>

            <div style={styles.timerBox}>
              <span>Scan QR to Complete Payment</span>
              <div style={styles.timerValue}>
                <ClockIcon />
                <span>{formatTimer(timer)}</span>
              </div>
            </div>

            <div style={styles.footerShield}>
              <ShieldCheck size={14} color="var(--success)" />
              <span>Secured by National Bank of Cambodia (NBC)</span>
            </div>


          </div>
        )}

        {/* Success Verified State */}
        {status === 'success' && (
          <div style={styles.successContent}>
            <div style={styles.successRing}>
              <CheckCircle2 size={64} color="var(--success)" className="scale-up" />
            </div>
            <h3 style={styles.successTitle}>Payment Verified</h3>
            <p style={styles.successDesc}>Transaction Completed via Bakong App</p>
            <div style={styles.successAmount}>{formattedAmount}</div>
          </div>
        )}

        {/* Expired State */}
        {status === 'expired' && (
          <div style={styles.successContent}>
            <AlertCircle size={64} color="var(--danger)" />
            <h3 style={{...styles.successTitle, color: 'var(--danger)'}}>QR Expired</h3>
            <p style={styles.successDesc}>The payment request timed out.</p>
            <button 
              onClick={generatePaymentQR} 
              style={styles.retryBtn}
            >
              Regenerate QR
            </button>
          </div>
        )}
      </div>
    </div>
  );
}


// Inline clock icon for simplicity
function ClockIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{marginRight: '4px'}}>
      <circle cx="12" cy="12" r="10"></circle>
      <polyline points="12 6 12 12 16 14"></polyline>
    </svg>
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
    textAlign: 'center',
    border: '1px solid rgba(255, 255, 255, 0.1)',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
    paddingBottom: '14px',
    marginBottom: '20px',
  },
  brandTitle: {
    display: 'flex',
    alignItems: 'center',
    gap: '3px',
    fontSize: '18px',
    fontWeight: '800',
  },
  kh: {
    color: '#e53935', // Red Bakong banner color
  },
  qr: {
    color: '#1e88e5', // Blue Bakong banner color
  },
  merchantLabel: {
    fontSize: '11px',
    color: 'var(--text-secondary)',
    marginLeft: '6px',
    fontWeight: '400',
    borderLeft: '1px solid rgba(255,255,255,0.2)',
    paddingLeft: '6px',
  },
  closeBtn: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
  },
  content: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  },
  amountBox: {
    marginBottom: '16px',
  },
  usdTotal: {
    fontSize: '32px',
    fontWeight: '800',
    color: 'white',
  },
  rielTotal: {
    fontSize: '16px',
    color: 'var(--text-secondary)',
    fontWeight: '500',
    marginTop: '2px',
  },
  qrContainer: {
    background: 'white',
    padding: '16px',
    borderRadius: '16px',
    boxShadow: '0 10px 25px rgba(0,0,0,0.5)',
    marginBottom: '20px',
  },
  qrOuterBorder: {
    border: '2px solid #e0e0e0',
    padding: '4px',
    borderRadius: '12px',
  },
  khqrFrame: {
    width: '180px',
    height: '180px',
    background: '#15171e', // Dark theme background inside the QR box for styling contrast
    borderRadius: '8px',
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mockQrMatrix: {
    width: '100%',
    height: '100%',
    position: 'relative',
    padding: '16px',
  },
  qrAnchor: {
    position: 'absolute',
    width: '28px',
    height: '28px',
    border: '4px solid white',
    borderRadius: '4px',
    background: 'transparent',
  },
  bakongCenterBadge: {
    position: 'absolute',
    top: 'calc(50% - 10px)',
    left: 'calc(50% - 15px)',
    width: '30px',
    height: '20px',
    background: 'linear-gradient(135deg, #e53935 0%, #1e88e5 100%)',
    borderRadius: '3px',
    border: '1.5px solid #15171e',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 5,
  },
  qrNoiseLines: {
    marginTop: '25px',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    height: 'calc(100% - 30px)',
  },
  timerBox: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '6px',
    fontSize: '12px',
    color: 'var(--text-secondary)',
    marginBottom: '20px',
  },
  timerValue: {
    display: 'flex',
    alignItems: 'center',
    background: 'rgba(255, 255, 255, 0.05)',
    padding: '4px 10px',
    borderRadius: '20px',
    color: 'white',
    fontFamily: 'monospace',
    fontWeight: '600',
    border: '1px solid rgba(255,255,255,0.05)',
  },
  footerShield: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    fontSize: '10px',
    color: 'var(--text-muted)',
    borderTop: '1px solid rgba(255,255,255,0.06)',
    paddingTop: '12px',
    width: '100%',
  },

  successContent: {
    padding: '24px 0',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  },
  successRing: {
    width: '90px',
    height: '90px',
    borderRadius: '50%',
    background: 'var(--success-glow)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: '16px',
  },
  successTitle: {
    fontSize: '20px',
    fontWeight: '700',
    color: 'white',
    marginBottom: '6px',
  },
  successDesc: {
    fontSize: '12px',
    color: 'var(--text-secondary)',
    marginBottom: '20px',
  },
  successAmount: {
    fontSize: '28px',
    fontWeight: '800',
    color: 'var(--success)',
  },
  retryBtn: {
    background: 'var(--gradient-accent)',
    color: 'white',
    border: 'none',
    padding: '8px 16px',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '13px',
    fontWeight: '600',
  },
  copyBtn: {
    background: 'rgba(255, 255, 255, 0.08)',
    color: 'white',
    border: '1px solid rgba(255, 255, 255, 0.15)',
    padding: '6px 12px',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '11px',
    fontWeight: '600',
    marginTop: '10px',
    outline: 'none',
    transition: 'background 0.2s',
  },
  hashSection: {
    marginTop: '16px',
    paddingTop: '12px',
    borderTop: '1px dashed rgba(255,255,255,0.06)',
    width: '100%',
    textAlign: 'center',
    marginBottom: '16px',
  },
  hashLinkBtn: {
    background: 'none',
    border: 'none',
    color: 'var(--accent-primary)',
    fontSize: '11px',
    textDecoration: 'underline',
    cursor: 'pointer',
  },
  hashInputRow: {
    display: 'flex',
    gap: '6px',
    marginTop: '6px',
    justifyContent: 'center',
    alignItems: 'center',
  },
  hashInput: {
    flex: 1,
    background: 'rgba(0,0,0,0.2)',
    border: '1px solid var(--glass-border)',
    borderRadius: '6px',
    padding: '6px 10px',
    color: 'white',
    fontSize: '11px',
    outline: 'none',
  },
  hashVerifyBtn: {
    background: 'var(--gradient-accent)',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    padding: '6px 12px',
    fontSize: '11px',
    fontWeight: 'bold',
    cursor: 'pointer',
  },
  hashCancelBtn: {
    background: 'rgba(255,255,255,0.05)',
    color: 'var(--text-secondary)',
    border: '1px solid var(--glass-border)',
    borderRadius: '6px',
    padding: '6px 10px',
    fontSize: '11px',
    cursor: 'pointer',
  },
  hashErrorText: {
    color: 'var(--danger)',
    fontSize: '10px',
    marginTop: '6px',
    textAlign: 'left',
  }
};
