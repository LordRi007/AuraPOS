import { useState, useEffect } from 'react';
import { X, Calendar, Printer, Save, ChevronLeft, ChevronRight, Info } from 'lucide-react';

// Static Helpers defined outside the component scope to prevent variable reference/hoisting errors
const getMonday = (d) => {
  try {
    if (!d) return null;
    const date = new Date(d);
    if (isNaN(date.getTime())) return null;
    const day = date.getDay();
    const diff = date.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is sunday
    return new Date(date.setDate(diff));
  } catch (err) {
    console.error('Error calculating Monday date:', err);
    return null;
  }
};

const formatDateString = (dateObj) => {
  try {
    if (!dateObj || isNaN(dateObj.getTime())) return '';
    return dateObj.toISOString().split('T')[0];
  } catch (err) {
    console.error('Error formatting date string:', err);
    return '';
  }
};

const formatDateDMY = (dateStr) => {
  if (!dateStr || typeof dateStr !== 'string') return '';
  const parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr;
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
};

export default function JobScheduleModal({ isOpen, onClose, users = [] }) {
  // Safe State Initialization with self-contained functions
  const [selectedDate, setSelectedDate] = useState(() => {
    const today = new Date();
    return formatDateString(today) || today.toISOString().split('T')[0];
  });
  
  const [mondayDate, setMondayDate] = useState(() => {
    const today = new Date();
    const mon = getMonday(today);
    return formatDateString(mon) || today.toISOString().split('T')[0];
  });
  
  // Custom print fields matching the image template
  const [area, setArea] = useState('Area K0');
  const [branch, setBranch] = useState('Branch 30124 ORKH KAKAB');
  const [companyName, setCompanyName] = useState('CP ALL (CAMBODIA) CO., LTD.');
  const [agency, setAgency] = useState('agency 7-Eleven');
  const [reportCode, setReportCode] = useState('TM_R0001');

  // Schedule grid state: { [userId]: { Mon: '1', Tue: '1', ... } }
  const [scheduleData, setScheduleData] = useState({});
  const [message, setMessage] = useState(null);
  const [messageType, setMessageType] = useState('success');

  // Load schedule whenever mondayDate or users change
  useEffect(() => {
    if (!isOpen) return;
    loadSchedule();
  }, [mondayDate, users, isOpen]);

  // Recalculate Monday date when selectedDate changes
  useEffect(() => {
    if (!selectedDate) return;
    const mon = getMonday(new Date(selectedDate));
    if (mon && !isNaN(mon.getTime())) {
      const monStr = formatDateString(mon);
      if (monStr) setMondayDate(monStr);
    }
  }, [selectedDate]);

  // Load meta data on mount
  useEffect(() => {
    if (!isOpen) return;
    loadMeta();
  }, [isOpen]);

  if (!isOpen) return null;

  const loadSchedule = () => {
    if (!mondayDate) return;
    const storageKey = `job_schedule_${mondayDate}`;
    const saved = localStorage.getItem(storageKey);
    let initialData = {};

    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === 'object') {
          initialData = parsed;
        }
      } catch (e) {
        console.error('Error parsing saved schedule:', e);
      }
    }

    // Ensure all users have a schedule row. If missing, initialize defaults
    const updatedData = { ...initialData };
    const safeUsers = Array.isArray(users) ? users : [];
    
    safeUsers.forEach(usr => {
      if (usr && usr.id && !updatedData[usr.id]) {
        // Default shifts: Mon-Fri = '1' (Morning), Sat-Sun = 'Off'
        updatedData[usr.id] = {
          Mon: '1',
          Tue: '1',
          Wed: '1',
          Thu: '1',
          Fri: '1',
          Sat: 'Off',
          Sun: 'Off'
        };
      }
    });

    setScheduleData(updatedData);
  };

  const handleShiftChange = (userId, day, value) => {
    if (!userId || !day) return;
    setScheduleData(prev => ({
      ...prev,
      [userId]: {
        ...prev[userId],
        [day]: value
      }
    }));
  };

  const handleSave = () => {
    if (!mondayDate) return;
    const storageKey = `job_schedule_${mondayDate}`;
    localStorage.setItem(storageKey, JSON.stringify(scheduleData));
    
    // Save metadata of branch/company too
    const metaData = { area, branch, companyName, agency, reportCode };
    localStorage.setItem('job_schedule_meta', JSON.stringify(metaData));

    showNotification('Schedule saved successfully!', 'success');
  };

  const loadMeta = () => {
    try {
      const savedMeta = localStorage.getItem('job_schedule_meta');
      if (savedMeta) {
        const meta = JSON.parse(savedMeta);
        if (meta && typeof meta === 'object') {
          if (meta.area) setArea(meta.area);
          if (meta.branch) setBranch(meta.branch);
          if (meta.companyName) setCompanyName(meta.companyName);
          if (meta.agency) setAgency(meta.agency);
          if (meta.reportCode) setReportCode(meta.reportCode);
        }
      }
    } catch (e) {
      console.error('Failed to load schedule metadata:', e);
    }
  };

  const showNotification = (msg, type) => {
    setMessage(msg);
    setMessageType(type);
    setTimeout(() => setMessage(null), 3000);
  };

  const navigateWeek = (weeksOffset) => {
    if (!mondayDate) return;
    const currentMon = new Date(mondayDate);
    if (isNaN(currentMon.getTime())) return;
    currentMon.setDate(currentMon.getDate() + weeksOffset * 7);
    const newMonStr = formatDateString(currentMon);
    if (newMonStr) {
      setSelectedDate(newMonStr);
      setMondayDate(newMonStr);
    }
  };

  const getDayOfMonth = (offset) => {
    if (!mondayDate) return '';
    const d = new Date(mondayDate);
    if (isNaN(d.getTime())) return '';
    d.setDate(d.getDate() + offset);
    return d.getDate();
  };

  const getSundayDateStr = () => {
    if (!mondayDate) return '';
    const d = new Date(mondayDate);
    if (isNaN(d.getTime())) return '';
    d.setDate(d.getDate() + 6);
    return formatDateString(d);
  };

  const handlePrint = () => {
    window.print();
  };

  const getFormattedPrintTimestamp = () => {
    try {
      const now = new Date();
      const day = String(now.getDate()).padStart(2, '0');
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const year = now.getFullYear();
      const hours = String(now.getHours()).padStart(2, '0');
      const minutes = String(now.getMinutes()).padStart(2, '0');
      const seconds = String(now.getSeconds()).padStart(2, '0');
      return `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`;
    } catch (err) {
      return '';
    }
  };

  const weekdays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  // Count employees per shift for each weekday
  const getShiftCount = (day, shiftValue) => {
    let count = 0;
    if (!scheduleData || typeof scheduleData !== 'object') return 0;
    Object.keys(scheduleData).forEach(userId => {
      if (scheduleData[userId] && scheduleData[userId][day] === shiftValue) {
        count++;
      }
    });
    return count;
  };

  const safeUsersList = Array.isArray(users) ? users : [];

  return (
    <div style={styles.overlay} className="no-print-overlay">
      <div className="glass-panel" style={styles.modal}>
        {/* Header (App UI) */}
        <div style={styles.header} className="no-print">
          <div style={styles.titleContainer}>
            <Calendar size={20} color="var(--accent-primary)" />
            <h3 style={styles.title}>Weekly Job Schedule Planner</h3>
          </div>
          <button onClick={onClose} style={styles.closeBtn}>
            <X size={18} color="var(--text-muted)" />
          </button>
        </div>

        {/* Action Toolbar (App UI) */}
        <div style={styles.toolbar} className="no-print">
          {/* Week Selector Navigation */}
          <div style={styles.weekNav}>
            <button onClick={() => navigateWeek(-1)} style={styles.navBtn} title="Previous Week">
              <ChevronLeft size={16} />
            </button>
            <div style={styles.datePickerWrapper}>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                style={styles.dateInput}
              />
            </div>
            <button onClick={() => navigateWeek(1)} style={styles.navBtn} title="Next Week">
              <ChevronRight size={16} />
            </button>
            <span style={styles.weekLabel}>
              Week of {formatDateDMY(mondayDate)} — {formatDateDMY(getSundayDateStr())}
            </span>
          </div>

          <div style={styles.actionButtons}>
            <button onClick={handleSave} className="btn btn-primary" style={styles.actionBtn}>
              <Save size={14} />
              <span>Save Schedule</span>
            </button>
            <button onClick={handlePrint} className="btn btn-secondary" style={styles.actionBtn}>
              <Printer size={14} />
              <span>Print Schedule</span>
            </button>
          </div>
        </div>

        {/* Custom Metadata Forms Drawer (App UI) */}
        <div style={styles.metaForm} className="no-print">
          <div style={styles.metaGrid}>
            <div style={styles.formGroup}>
              <label style={styles.label}>Company Name</label>
              <input type="text" value={companyName} onChange={e => setCompanyName(e.target.value)} style={styles.input} />
            </div>
            <div style={styles.formGroup}>
              <label style={styles.label}>Area</label>
              <input type="text" value={area} onChange={e => setArea(e.target.value)} style={styles.input} />
            </div>
            <div style={styles.formGroup}>
              <label style={styles.label}>Branch Code & Name</label>
              <input type="text" value={branch} onChange={e => setBranch(e.target.value)} style={styles.input} />
            </div>
            <div style={styles.formGroup}>
              <label style={styles.label}>Agency</label>
              <input type="text" value={agency} onChange={e => setAgency(e.target.value)} style={styles.input} />
            </div>
            <div style={styles.formGroup}>
              <label style={styles.label}>Report Code</label>
              <input type="text" value={reportCode} onChange={e => setReportCode(e.target.value)} style={styles.input} />
            </div>
          </div>
        </div>

        {message && (
          <div style={messageType === 'success' ? styles.successAlert : styles.errorAlert} className="no-print">
            <span>{message}</span>
          </div>
        )}

        {/* Main Schedule Container (Shared for Screen Display and Printout Layout) */}
        <div id="print-layout-container" style={styles.printContainer}>
          {/* PRINT-ONLY HEADER TEXTS */}
          <div style={styles.printHeader}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
              <div style={{ textAlign: 'left', lineHeight: '1.4' }}>
                <div>{area}</div>
                <div>{branch}</div>
              </div>
              <div style={{ textAlign: 'center', lineHeight: '1.4' }}>
                <div style={{ fontSize: '13px', fontWeight: 'bold' }}>{companyName}</div>
                <div style={{ fontSize: '10px' }}>
                  Job Schedule Period of Date: {formatDateDMY(mondayDate)}-{formatDateDMY(getSundayDateStr())}
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                1 of 1
              </div>
            </div>
            <div style={{ borderBottom: '1px solid black', paddingBottom: '3px', fontWeight: 'bold', textAlign: 'left' }}>
              {agency}
            </div>
          </div>

          {/* Core Planner Table */}
          <table className="print-table" style={styles.table}>
            <thead>
              <tr style={styles.tableHeadRow}>
                <th style={{ ...styles.th, textAlign: 'left', width: '150px' }}>First Name - Last Name</th>
                <th style={{ ...styles.th, textAlign: 'left', width: '110px' }}>Position</th>
                <th style={{ ...styles.th, textAlign: 'center', width: '100px' }}>Tel.</th>
                {weekdays.map((day, idx) => (
                  <th key={day} style={{ ...styles.th, textAlign: 'center' }}>
                    {day}-{getDayOfMonth(idx)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {safeUsersList.map(usr => {
                if (!usr) return null;
                const usrSchedule = (scheduleData && scheduleData[usr.id]) || {};
                return (
                  <tr key={usr.id} style={styles.tableRow}>
                    <td className="text-left" style={{ ...styles.td, textAlign: 'left', fontWeight: '500' }}>
                      {usr.name}
                    </td>
                    <td className="text-left" style={{ ...styles.td, textAlign: 'left', color: 'var(--text-secondary)' }}>
                      {usr.position || 'Employee'}
                    </td>
                    <td style={{ ...styles.td, fontFamily: 'monospace' }}>
                      {usr.tel || 'N/A'}
                    </td>
                    {weekdays.map(day => (
                      <td key={day} style={styles.td}>
                        <select
                          className="print-select"
                          value={usrSchedule[day] || '1'}
                          onChange={(e) => handleShiftChange(usr.id, day, e.target.value)}
                          style={styles.cellSelect}
                        >
                          <option value="1">1</option>
                          <option value="2">2</option>
                          <option value="3">3</option>
                          <option value="Off">Off</option>
                        </select>
                      </td>
                    ))}
                  </tr>
                );
              })}
              {safeUsersList.length === 0 && (
                <tr>
                  <td colSpan="10" style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>
                    No staff members registered.
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          {/* Legend and Summary Table Wrapper */}
          <div style={styles.summarySection}>
            <div style={styles.legendBlock}>
              1 = Morning Shift, 2=Afternoon Shift, 3= Night Shift
            </div>
            
            {/* Shift Counters Grid */}
            <div style={styles.summaryTableWrapper}>
              <div style={styles.summaryLeftLabel}>
                Total Employee Per Shift (Employee):
              </div>
              <table className="print-summary-table" style={styles.summaryTable}>
                <tbody>
                  <tr>
                    <td style={{ ...styles.summaryTh, width: '100px', fontWeight: 'bold' }}>Morning Shift</td>
                    {weekdays.map(day => (
                      <td key={day} style={styles.summaryTd}>
                        {getShiftCount(day, '1')}
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td style={{ ...styles.summaryTh, fontWeight: 'bold' }}>Afternoon Shift</td>
                    {weekdays.map(day => (
                      <td key={day} style={styles.summaryTd}>
                        {getShiftCount(day, '2')}
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td style={{ ...styles.summaryTh, fontWeight: 'bold' }}>Night Shift</td>
                    {weekdays.map(day => (
                      <td key={day} style={styles.summaryTd}>
                        {getShiftCount(day, '3')}
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* PRINT-ONLY FOOTER TEXTS */}
          <div style={styles.printFooter}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '16px', borderTop: '0.5px solid #ccc', paddingTop: '8px', fontSize: '9px', color: '#555' }}>
              <div>{getFormattedPrintTimestamp()}</div>
              <div>.......End of Report.......</div>
              <div>{reportCode}</div>
            </div>
          </div>
        </div>

        {/* Footer (App UI) */}
        <div style={styles.footer} className="no-print">
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: 'var(--text-muted)' }}>
            <Info size={14} />
            <span>Select week, assign shifts, then print. Fits a single A4 page landscape format.</span>
          </div>
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
    width: '950px',
    maxWidth: '95%',
    padding: '24px',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    textAlign: 'left',
    maxHeight: '92vh',
    overflowY: 'auto',
    display: 'flex',
    flexDirection: 'column',
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
  toolbar: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    background: 'rgba(255, 255, 255, 0.02)',
    border: '1px solid var(--glass-border)',
    borderRadius: '10px',
    padding: '10px 14px',
    marginBottom: '16px',
    gap: '12px',
    flexWrap: 'wrap',
  },
  weekNav: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  navBtn: {
    background: 'rgba(255, 255, 255, 0.04)',
    border: '1px solid var(--glass-border)',
    borderRadius: '6px',
    width: '28px',
    height: '28px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: 'var(--text-primary)',
    cursor: 'pointer',
    transition: 'var(--transition-fast)',
  },
  datePickerWrapper: {
    position: 'relative',
  },
  dateInput: {
    padding: '4px 8px',
    background: 'rgba(255, 255, 255, 0.04)',
    border: '1px solid var(--glass-border)',
    borderRadius: '6px',
    color: 'var(--text-primary)',
    fontSize: '13px',
    colorScheme: 'dark',
    outline: 'none',
  },
  weekLabel: {
    fontSize: '13px',
    fontWeight: '600',
    color: 'var(--text-secondary)',
    marginLeft: '6px',
  },
  actionButtons: {
    display: 'flex',
    gap: '8px',
  },
  actionBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    padding: '8px 14px',
    fontSize: '13px',
  },
  metaForm: {
    background: 'rgba(0, 0, 0, 0.15)',
    border: '1px solid var(--glass-border)',
    borderRadius: '10px',
    padding: '12px 16px',
    marginBottom: '16px',
  },
  metaGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
    gap: '12px',
  },
  formGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  label: {
    fontSize: '11px',
    fontWeight: '600',
    color: 'var(--text-muted)',
    textTransform: 'uppercase',
  },
  input: {
    padding: '6px 10px',
    background: 'rgba(255, 255, 255, 0.02)',
    border: '1px solid var(--glass-border)',
    borderRadius: '6px',
    color: 'var(--text-primary)',
    fontSize: '12px',
    outline: 'none',
  },
  successAlert: {
    background: 'rgba(16, 185, 129, 0.1)',
    border: '1px solid var(--success)',
    color: 'var(--success)',
    padding: '8px 12px',
    borderRadius: '6px',
    fontSize: '12px',
    marginBottom: '16px',
  },
  errorAlert: {
    background: 'rgba(239, 68, 68, 0.1)',
    border: '1px solid var(--danger)',
    color: 'var(--danger)',
    padding: '8px 12px',
    borderRadius: '6px',
    fontSize: '12px',
    marginBottom: '16px',
  },
  printContainer: {
    background: 'rgba(255, 255, 255, 0.01)',
    border: '1px solid var(--glass-border)',
    borderRadius: '12px',
    padding: '20px',
    color: 'var(--text-primary)',
    maxHeight: '400px',
    overflowY: 'auto',
  },
  printHeader: {
    display: 'none',
  },
  printFooter: {
    display: 'none',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: '12px',
    marginBottom: '16px',
  },
  tableHeadRow: {
    background: 'rgba(255, 255, 255, 0.03)',
    borderBottom: '1px solid var(--glass-border)',
  },
  th: {
    padding: '10px 8px',
    fontWeight: '700',
    color: 'var(--text-secondary)',
    border: '1px solid var(--glass-border)',
  },
  tableRow: {
    borderBottom: '1px solid var(--glass-border)',
    transition: 'var(--transition-fast)',
  },
  td: {
    padding: '6px 8px',
    textAlign: 'center',
    border: '1px solid var(--glass-border)',
  },
  cellSelect: {
    background: 'rgba(255, 255, 255, 0.02)',
    border: '1px solid var(--glass-border)',
    borderRadius: '4px',
    color: 'var(--text-primary)',
    padding: '2px 6px',
    fontSize: '12px',
    outline: 'none',
    textAlign: 'center',
    cursor: 'pointer',
  },
  summarySection: {
    marginTop: '16px',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  legendBlock: {
    fontSize: '11px',
    color: 'var(--text-muted)',
    fontStyle: 'italic',
    textAlign: 'left',
  },
  summaryTableWrapper: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '16px',
    flexWrap: 'wrap',
  },
  summaryLeftLabel: {
    width: '150px',
    fontSize: '11px',
    fontWeight: '700',
    color: 'var(--text-secondary)',
    lineHeight: '1.4',
    textAlign: 'left',
    marginTop: '6px',
  },
  summaryTable: {
    flex: 1,
    borderCollapse: 'collapse',
    minWidth: '400px',
  },
  summaryTh: {
    padding: '6px 10px',
    fontSize: '11px',
    color: 'var(--text-secondary)',
    background: 'rgba(255, 255, 255, 0.02)',
    border: '1px solid var(--glass-border)',
    textAlign: 'left',
  },
  summaryTd: {
    padding: '6px 8px',
    fontSize: '11px',
    fontWeight: '700',
    color: 'var(--text-primary)',
    border: '1px solid var(--glass-border)',
    textAlign: 'center',
  },
  footer: {
    borderTop: '1px solid rgba(255, 255, 255, 0.08)',
    paddingTop: '14px',
    marginTop: '16px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: '12px',
  },
  closeModalBtn: {
    padding: '8px 16px',
    fontSize: '13px',
  }
};
