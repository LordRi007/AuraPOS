import React, { useState, useEffect, Component } from 'react';
import {
  LayoutDashboard, Database, History, BarChart3,
  Plus, Edit2, Trash2, RefreshCw, AlertTriangle,
  DollarSign, ShoppingBag, Receipt, Search, ArrowLeft,
  ChevronLeft, ChevronRight, Calendar, User, Users, CreditCard, Box, Download, Folder
} from 'lucide-react';
import { api } from '../services/api';
import ReceiptModal from '../components/ReceiptModal';
import JobScheduleModal from '../components/JobScheduleModal';
import '../styles/Admin.css';

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught an error", error, errorInfo);
    this.setState({ errorInfo });
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '20px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid var(--danger)', borderRadius: '8px', margin: '20px', color: 'var(--text-primary)' }}>
          <h3 style={{ color: 'var(--danger)', fontWeight: 'bold', fontSize: '15px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <AlertTriangle size={18} /> Something went wrong in the Scheduler.
          </h3>
          <p style={{ fontSize: '13px', marginTop: '6px', color: 'var(--text-secondary)' }}>Please share this error trace with the administrator:</p>
          <details style={{ whiteSpace: 'pre-wrap', marginTop: '10px', fontSize: '11px', fontFamily: 'monospace', background: 'rgba(0,0,0,0.2)', padding: '10px', borderRadius: '6px', border: '1px solid var(--glass-border)' }}>
            {this.state.error && this.state.error.toString()}
            <br />
            {this.state.errorInfo && this.state.errorInfo.componentStack}
          </details>
          <button onClick={() => this.setState({ hasError: false, error: null, errorInfo: null })} className="btn btn-primary" style={{ marginTop: '12px', fontSize: '12px', padding: '6px 12px' }}>
            Dismiss
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function Admin() {
  const [activeSection, setActiveSection] = useState('overview'); // 'overview', 'inventory', 'transactions', 'analytics', 'users'
  const [stats, setStats] = useState(null);
  const [products, setProducts] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [users, setUsers] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  // Search and Filter states
  const [productSearch, setProductSearch] = useState('');
  const [productCategory, setProductCategory] = useState('All');
  const [txnSearch, setTxnSearch] = useState('');
  const [txnMethod, setTxnMethod] = useState('All');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [sortOrder, setSortOrder] = useState('desc'); // 'desc' for newest first, 'asc' for oldest first
  const [userSearch, setUserSearch] = useState('');
  const [categorySearch, setCategorySearch] = useState('');

  // Analytics Filter and Tab states
  const [analyticsTimeRange, setAnalyticsTimeRange] = useState('7days');
  const [analyticsStartDate, setAnalyticsStartDate] = useState('');
  const [analyticsEndDate, setAnalyticsEndDate] = useState('');
  const [analyticsCashier, setAnalyticsCashier] = useState('All');
  const [analyticsCategory, setAnalyticsCategory] = useState('All');
  const [activeReportTab, setActiveReportTab] = useState('products'); // 'products', 'categories', 'cashiers', 'targets', 'calendar'
  const [calendarMonth, setCalendarMonth] = useState(new Date().getMonth());
  const [calendarYear, setCalendarYear] = useState(new Date().getFullYear());
  const [selectedCalendarDay, setSelectedCalendarDay] = useState(new Date().getDate());

  // Receipt Log Viewer Modal State
  const [selectedTxn, setSelectedTxn] = useState(null);
  const [isReceiptOpen, setIsReceiptOpen] = useState(false);

  // Category CRUD Modal State
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [categoryFormState, setCategoryFormState] = useState({
    name: '',
  });

  // Product CRUD Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [formState, setFormState] = useState({
    name: '',
    category: '',
    price: '',
    stock: '',
    sku: '',
    description: '',
    image: '',
  });

  // User CRUD Modal State
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [userFormState, setUserFormState] = useState({
    name: '',
    username: '',
    password: '',
    role: 'cashier',
    position: '',
    tel: '',
  });

  // Target Sales Planning State
  const [targetSalesPerDay, setTargetSalesPerDay] = useState(() => {
    const saved = localStorage.getItem('pos_target_sales_per_day');
    return saved ? parseFloat(saved) : 200;
  });

  const handleTargetSalesChange = (val) => {
    const parsed = parseFloat(val) || 0;
    setTargetSalesPerDay(parsed);
    localStorage.setItem('pos_target_sales_per_day', parsed.toString());
  };

  useEffect(() => {
    loadAllData();
  }, []);

  useEffect(() => {
    const handlePaste = (e) => {
      if (!isModalOpen) return;
      const items = e.clipboardData?.items;
      if (items) {
        for (let i = 0; i < items.length; i++) {
          if (items[i].type.indexOf('image') !== -1) {
            const file = items[i].getAsFile();
            if (file) {
              if (file.size > 1.5 * 1024 * 1024) {
                alert("Pasted image size is too large. Please paste an image under 1.5MB.");
                return;
              }
              const reader = new FileReader();
              reader.onloadend = () => {
                setFormState(prev => ({ ...prev, image: reader.result }));
              };
              reader.readAsDataURL(file);
              e.preventDefault();
              break;
            }
          }
        }
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => {
      window.removeEventListener('paste', handlePaste);
    };
  }, [isModalOpen]);

  const loadAllData = async () => {
    try {
      setLoading(true);
      const [dashboardStats, productList, txnList, userList, categoryList] = await Promise.all([
        api.getDashboardStats(),
        api.getProducts(),
        api.getTransactions(),
        api.getUsers(),
        api.getCategories()
      ]);

      setStats(dashboardStats);
      setProducts(productList);
      setTransactions(txnList);
      setUsers(userList);
      setCategories(categoryList);
    } catch (err) {
      console.error('Failed to load admin data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleViewReceipt = (txn) => {
    setSelectedTxn(txn);
    setIsReceiptOpen(true);
  };

  const handleRefundTransaction = async (txnId) => {
    if (window.confirm(`Are you sure you want to refund transaction ${txnId}? This will restore its items back to stock and mark it as REFUNDED.`)) {
      try {
        setLoading(true);
        await api.refundTransaction(txnId);
        alert(`Transaction ${txnId} was successfully refunded.`);
        await loadAllData();
      } catch (err) {
        console.error('Failed to refund transaction:', err);
        alert(err.message || 'Failed to refund transaction. Please try again.');
      } finally {
        setLoading(false);
      }
    }
  };

  // User CRUD Handlers
  const handleUserInputChange = (e) => {
    const { name, value } = e.target;
    setUserFormState(prev => ({ ...prev, [name]: value }));
  };

  const handleOpenAddUserModal = () => {
    setEditingUser(null);
    setUserFormState({
      name: '',
      username: '',
      password: '',
      role: 'cashier',
      position: '',
      tel: '',
    });
    setIsUserModalOpen(true);
  };

  const handleOpenEditUserModal = (usr) => {
    setEditingUser(usr);
    setUserFormState({
      name: usr.name,
      username: usr.username,
      password: '',
      role: usr.role,
      position: usr.position || '',
      tel: usr.tel || '',
    });
    setIsUserModalOpen(true);
  };

  const handleCloseUserModal = () => {
    setIsUserModalOpen(false);
    setEditingUser(null);
  };

  const handleSubmitUser = async (e) => {
    e.preventDefault();
    if (!userFormState.name || !userFormState.username || (!editingUser && !userFormState.password)) return;

    try {
      if (editingUser) {
        const payload = { ...userFormState };
        if (!payload.password) delete payload.password;
        await api.updateUser(editingUser.id, payload);
      } else {
        await api.createUser(userFormState);
      }
      handleCloseUserModal();
      loadAllData();
    } catch (err) {
      console.error('Failed to save user:', err);
    }
  };

  const handleDeleteUser = async (id) => {
    if (!window.confirm('Are you sure you want to delete this user account?')) return;
    try {
      await api.deleteUser(id);
      loadAllData();
    } catch (err) {
      console.error('Failed to delete user:', err);
      alert(err.message || 'Failed to delete user account');
    }
  };

  // Category CRUD Handlers
  const handleCategoryInputChange = (e) => {
    const { name, value } = e.target;
    setCategoryFormState(prev => ({ ...prev, [name]: value }));
  };

  const handleOpenAddCategoryModal = () => {
    setEditingCategory(null);
    setCategoryFormState({ name: '' });
    setIsCategoryModalOpen(true);
  };

  const handleOpenEditCategoryModal = (cat) => {
    setEditingCategory(cat);
    setCategoryFormState({ name: cat.name });
    setIsCategoryModalOpen(true);
  };

  const handleCloseCategoryModal = () => {
    setIsCategoryModalOpen(false);
    setEditingCategory(null);
  };

  const handleSubmitCategory = async (e) => {
    e.preventDefault();
    if (!categoryFormState.name.trim()) return;

    try {
      if (editingCategory) {
        await api.updateCategory(editingCategory.id, { name: categoryFormState.name.trim() });
      } else {
        await api.createCategory({ name: categoryFormState.name.trim() });
      }
      handleCloseCategoryModal();
      loadAllData();
    } catch (err) {
      console.error('Failed to save category:', err);
      alert(err.message || 'Failed to save category');
    }
  };

  const handleDeleteCategory = async (id) => {
    if (!window.confirm('Are you sure you want to delete this category? Products in this category will not be deleted.')) return;
    try {
      await api.deleteCategory(id);
      loadAllData();
    } catch (err) {
      console.error('Failed to delete category:', err);
      alert(err.message || 'Failed to delete category');
    }
  };

  // CRUD Handlers
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormState(prev => ({ ...prev, [name]: value }));
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 1.5 * 1024 * 1024) {
        alert("Image size is too large. Please select an image under 1.5MB.");
        e.target.value = null;
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormState(prev => ({ ...prev, image: reader.result }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveImage = () => {
    setFormState(prev => ({ ...prev, image: '' }));
  };

  const handleOpenAddModal = () => {
    setEditingProduct(null);
    setFormState({
      name: '',
      category: '',
      price: '',
      stock: '',
      sku: '',
      description: '',
      image: '',
    });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (product) => {
    setEditingProduct(product);
    setFormState({
      name: product.name,
      category: product.category,
      price: product.price.toString(),
      stock: product.stock.toString(),
      sku: product.sku,
      description: product.description || '',
      image: product.image || '',
    });
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingProduct(null);
  };

  const handleSubmitProduct = async (e) => {
    e.preventDefault();
    if (!formState.name || !formState.price || !formState.stock || !formState.sku) return;

    try {
      if (editingProduct) {
        await api.updateProduct(editingProduct.id, formState);
      } else {
        await api.createProduct(formState);
      }
      handleCloseModal();
      loadAllData();
    } catch (err) {
      console.error('Failed to save product:', err);
    }
  };

  const handleDeleteProduct = async (id) => {
    if (!window.confirm('Are you sure you want to delete this product from inventory?')) return;
    try {
      await api.deleteProduct(id);
      loadAllData();
    } catch (err) {
      console.error('Failed to delete product:', err);
    }
  };

  const handleExportExcel = () => {
    if (filteredTransactions.length === 0) {
      alert("No transaction logs available in the current filter to export");
      return;
    }

    // Define columns headers
    const headers = ["Bill ID", "Date & Time", "Items Purchased", "Payment Method", "Cashier", "Total Bill (USD)"];

    // Format rows data
    const rows = filteredTransactions.map(txn => [
      txn.id,
      new Date(txn.timestamp).toLocaleString(),
      txn.items.map(i => `${i.name} (x${i.quantity})`).join('; '),
      txn.paymentMethod,
      txn.cashier || 'Admin',
      txn.total.toFixed(2)
    ]);

    // Construct CSV text content
    const csvContent = [
      headers.join(","),
      ...rows.map(row => row.map(val => {
        // Escape existing double quotes and wrap value in double quotes
        const strVal = String(val).replace(/"/g, '""');
        return `"${strVal}"`;
      }).join(","))
    ].join("\r\n");

    // Add Byte Order Mark (BOM) for UTF-8 Excel support
    const blob = new Blob(["\ufeff" + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);

    // Create meaningful file name with current date
    const dateStr = new Date().toISOString().slice(0, 10);
    link.setAttribute("download", `Billing_Ledger_Logs_${dateStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading && !stats) {
    return (
      <div style={{ display: 'flex', flex: 1, height: '80vh', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)' }}>
        <style>{`
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
        `}</style>
        <div style={{ textAlign: 'center' }}>
          <RefreshCw size={32} style={{ margin: '0 auto 16px', color: 'var(--accent-primary)', animation: 'spin 1.5s linear infinite' }} />
          <p>Loading management system...</p>
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div style={{ display: 'flex', flex: 1, height: '80vh', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
        <div className="glass-panel" style={{ maxWidth: '450px', width: '100%', padding: '30px', textAlign: 'center', border: '1px solid rgba(255, 68, 68, 0.2)' }}>
          <AlertTriangle size={48} color="var(--danger)" style={{ margin: '0 auto 16px' }} />
          <h3 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '10px', color: 'var(--text-primary)' }}>Connection Failed</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '14px', lineHeight: '1.5', marginBottom: '24px' }}>
            Unable to fetch data from the backend. Please make sure your Laravel server is running at <code style={{ background: 'rgba(255,255,255,0.07)', padding: '2px 6px', borderRadius: '4px', fontFamily: 'monospace' }}>http://127.0.0.1:8000</code>.
          </p>
          <button
            onClick={loadAllData}
            className="btn btn-primary"
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              padding: '12px',
              borderRadius: '8px',
              border: 'none',
              background: 'var(--gradient-accent)',
              color: 'white',
              cursor: 'pointer',
              fontWeight: 'bold',
              boxShadow: '0 4px 12px var(--accent-glow)'
            }}
          >
            <RefreshCw size={16} /> Try Again
          </button>
        </div>
      </div>
    );
  }

  // --- Calculations for SVG Area Chart (Sales History) ---
  const salesHistory = stats.salesHistory || [];
  const maxAmount = Math.max(...salesHistory.map(h => h.amount), 10);

  // Chart dimensions
  const cWidth = 550;
  const cHeight = 180;
  const cPadding = { left: 45, right: 20, top: 20, bottom: 25 };

  // Calculate points
  const points = salesHistory.map((item, idx) => {
    const x = cPadding.left + (idx / Math.max(1, salesHistory.length - 1)) * (cWidth - cPadding.left - cPadding.right);
    const y = cHeight - cPadding.bottom - (item.amount / maxAmount) * (cHeight - cPadding.top - cPadding.bottom);
    return { x, y, day: item.day, amount: item.amount };
  });

  // Create line path string (M x0 y0 L x1 y1 ...)
  const linePath = points.map((p, idx) => `${idx === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
  // Create area path string (extends to bottom of chart)
  const areaPath = points.length > 0
    ? `${linePath} L ${points[points.length - 1].x} ${cHeight - cPadding.bottom} L ${points[0].x} ${cHeight - cPadding.bottom} Z`
    : '';

  // --- Calculations for SVG Donut Chart (Payment Split) ---
  const cashSales = transactions.filter(t => t.paymentMethod === 'Cash').reduce((sum, t) => sum + t.total, 0);
  const khqrSales = transactions.filter(t => t.paymentMethod === 'KHQR').reduce((sum, t) => sum + t.total, 0);
  const cardSales = transactions.filter(t => t.paymentMethod === 'Card').reduce((sum, t) => sum + t.total, 0);
  const totalSalesFromTxns = Math.max(cashSales + khqrSales + cardSales, 1);

  const cashPct = cashSales / totalSalesFromTxns;
  const khqrPct = khqrSales / totalSalesFromTxns;
  const cardPct = cardSales / totalSalesFromTxns;

  // Donut geometry (radius = 35, circumference = 2 * PI * r = 219.9)
  const donutR = 30;
  const donutCirc = 2 * Math.PI * donutR;

  const cashOffset = 0;
  const khqrOffset = cashPct * donutCirc;
  const cardOffset = (cashPct + khqrPct) * donutCirc;

  // Filtering Inventory
  const filteredProducts = products.filter(product => {
    const matchesCategory = productCategory === 'All' || product.category === productCategory;
    const matchesSearch = product.name.toLowerCase().includes(productSearch.toLowerCase()) ||
      product.sku.toLowerCase().includes(productSearch.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  // Filtering Transactions
  const filteredTransactions = transactions.filter(txn => {
    const matchesMethod = txnMethod === 'All' || txn.paymentMethod === txnMethod;
    const matchesSearch = txn.id.toLowerCase().includes(txnSearch.toLowerCase()) ||
      (txn.cashier && txn.cashier.toLowerCase().includes(txnSearch.toLowerCase()));

    // Date Range Matcher
    let matchesDate = true;
    if (startDate) {
      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0);
      const txnDate = new Date(txn.timestamp);
      if (txnDate < start) matchesDate = false;
    }
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      const txnDate = new Date(txn.timestamp);
      if (txnDate > end) matchesDate = false;
    }

    return matchesMethod && matchesSearch && matchesDate;
  }).sort((a, b) => {
    const timeA = new Date(a.timestamp).getTime();
    const timeB = new Date(b.timestamp).getTime();
    return sortOrder === 'desc' ? timeB - timeA : timeA - timeB;
  });

  // ==========================================================================
  // Enhanced Analytics Report Computations
  // ==========================================================================

  // 1. Filtered Transactions for Analytics Tab
  const analyticsTransactions = transactions.filter(t => {
    // Exclude refunded transactions from sales calculations
    if (t.status === 'refunded') {
      return false;
    }

    // A. Cashier Filter
    if (analyticsCashier !== 'All' && t.cashier !== analyticsCashier) {
      return false;
    }

    // B. Date Range Filter
    const txnDate = new Date(t.timestamp);
    const now = new Date();

    if (analyticsTimeRange === '7days') {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(now.getDate() - 7);
      if (txnDate < sevenDaysAgo) return false;
    } else if (analyticsTimeRange === '30days') {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(now.getDate() - 30);
      if (txnDate < thirtyDaysAgo) return false;
    } else if (analyticsTimeRange === 'thisMonth') {
      if (txnDate.getMonth() !== now.getMonth() || txnDate.getFullYear() !== now.getFullYear()) {
        return false;
      }
    } else if (analyticsTimeRange === 'thisYear') {
      if (txnDate.getFullYear() !== now.getFullYear()) {
        return false;
      }
    } else if (analyticsTimeRange === 'custom') {
      if (analyticsStartDate) {
        const start = new Date(analyticsStartDate);
        start.setHours(0, 0, 0, 0);
        if (txnDate < start) return false;
      }
      if (analyticsEndDate) {
        const end = new Date(analyticsEndDate);
        end.setHours(23, 59, 59, 999);
        if (txnDate > end) return false;
      }
    }

    // C. Category Filter
    if (analyticsCategory !== 'All') {
      const hasCategoryItem = t.items.some(item => {
        const product = products.find(p => p.id === item.id || p.sku === item.sku);
        const catName = product ? product.category : '';
        return catName === analyticsCategory;
      });
      if (!hasCategoryItem) return false;
    }

    return true;
  });

  // 2. Summary stats for active filters
  const filteredSalesTotal = analyticsTransactions.reduce((sum, t) => {
    if (analyticsCategory === 'All') {
      return sum + t.total;
    } else {
      return sum + t.items.reduce((innerSum, item) => {
        const product = products.find(p => p.id === item.id || p.sku === item.sku);
        const catName = product ? product.category : '';
        if (catName === analyticsCategory) {
          return innerSum + (item.price * item.quantity);
        }
        return innerSum;
      }, 0);
    }
  }, 0);

  const filteredItemsSold = analyticsTransactions.reduce((sum, t) => {
    return sum + t.items.reduce((innerSum, item) => {
      if (analyticsCategory === 'All') {
        return innerSum + item.quantity;
      } else {
        const product = products.find(p => p.id === item.id || p.sku === item.sku);
        const catName = product ? product.category : '';
        if (catName === analyticsCategory) {
          return innerSum + item.quantity;
        }
        return innerSum;
      }
    }, 0);
  }, 0);

  const filteredTxnsCount = analyticsTransactions.length;
  const filteredAtv = filteredTxnsCount > 0 ? (filteredSalesTotal / filteredTxnsCount) : 0;

  const filteredDiscountTotal = analyticsTransactions.reduce((sum, t) => {
    if (analyticsCategory === 'All') {
      return sum + t.discount;
    } else {
      const txnSubtotal = t.items.reduce((sub, item) => sub + (item.price * item.quantity), 0);
      if (txnSubtotal === 0) return sum;

      const catSubtotal = t.items.reduce((innerSum, item) => {
        const product = products.find(p => p.id === item.id || p.sku === item.sku);
        const catName = product ? product.category : '';
        if (catName === analyticsCategory) {
          return innerSum + (item.price * item.quantity);
        }
        return innerSum;
      }, 0);
      return sum + ((catSubtotal / txnSubtotal) * t.discount);
    }
  }, 0);

  // 3. SVG Line Chart Points (grouped dynamically)
  const getAnalyticsChartData = () => {
    const dataPoints = [];
    const now = new Date();

    if (analyticsTimeRange === '7days') {
      for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(now.getDate() - i);
        dataPoints.push({
          label: d.toLocaleDateString('en-US', { weekday: 'short' }),
          key: d.toDateString(),
          amount: 0,
          fullLabel: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
        });
      }
    } else if (analyticsTimeRange === '30days') {
      for (let i = 29; i >= 0; i--) {
        const d = new Date();
        d.setDate(now.getDate() - i);
        dataPoints.push({
          label: d.toLocaleDateString('en-US', { day: 'numeric' }),
          key: d.toDateString(),
          amount: 0,
          fullLabel: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
        });
      }
    } else if (analyticsTimeRange === 'thisMonth') {
      const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
      for (let i = 1; i <= daysInMonth; i++) {
        const d = new Date(now.getFullYear(), now.getMonth(), i);
        dataPoints.push({
          label: `${i}`,
          key: d.toDateString(),
          amount: 0,
          fullLabel: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
        });
      }
    } else if (analyticsTimeRange === 'thisYear') {
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      months.forEach((m, idx) => {
        dataPoints.push({
          label: m,
          key: `${now.getFullYear()}-${idx}`,
          amount: 0,
          fullLabel: `${m} ${now.getFullYear()}`
        });
      });
    } else if (analyticsTimeRange === 'custom') {
      const start = analyticsStartDate ? new Date(analyticsStartDate) : new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      const end = analyticsEndDate ? new Date(analyticsEndDate) : new Date();
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);

      const diffTime = Math.abs(end - start);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays <= 45) {
        for (let i = 0; i < diffDays; i++) {
          const d = new Date(start.getTime() + i * 24 * 60 * 60 * 1000);
          dataPoints.push({
            label: d.toLocaleDateString('en-US', { day: 'numeric' }),
            key: d.toDateString(),
            amount: 0,
            fullLabel: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
          });
        }
      } else {
        const startYear = start.getFullYear();
        const startMonth = start.getMonth();
        const endYear = end.getFullYear();
        const endMonth = end.getMonth();

        let currYear = startYear;
        let currMonth = startMonth;

        while (currYear < endYear || (currYear === endYear && currMonth <= endMonth)) {
          const mLabel = new Date(currYear, currMonth, 1).toLocaleDateString('en-US', { month: 'short' });
          dataPoints.push({
            label: `${mLabel} '${String(currYear).slice(2)}`,
            key: `${currYear}-${currMonth}`,
            amount: 0,
            fullLabel: new Date(currYear, currMonth, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
          });
          currMonth++;
          if (currMonth > 11) {
            currMonth = 0;
            currYear++;
          }
        }
      }
    }

    analyticsTransactions.forEach(t => {
      const tDate = new Date(t.timestamp);
      let matchedPoint = null;

      if (analyticsTimeRange === 'thisYear') {
        const year = tDate.getFullYear();
        const monthIdx = tDate.getMonth();
        if (year === now.getFullYear()) {
          matchedPoint = dataPoints.find(dp => dp.key === `${year}-${monthIdx}`);
        }
      } else if (analyticsTimeRange === 'custom' && dataPoints.some(dp => dp.key.includes('-'))) {
        const year = tDate.getFullYear();
        const monthIdx = tDate.getMonth();
        matchedPoint = dataPoints.find(dp => dp.key === `${year}-${monthIdx}`);
      } else {
        matchedPoint = dataPoints.find(dp => dp.key === tDate.toDateString());
      }

      if (matchedPoint) {
        if (analyticsCategory === 'All') {
          matchedPoint.amount += t.total;
        } else {
          matchedPoint.amount += t.items.reduce((innerSum, item) => {
            const product = products.find(p => p.id === item.id || p.sku === item.sku);
            const catName = product ? product.category : '';
            if (catName === analyticsCategory) {
              return innerSum + (item.price * item.quantity);
            }
            return innerSum;
          }, 0);
        }
      }
    });

    dataPoints.forEach(dp => {
      dp.amount = parseFloat(dp.amount.toFixed(2));
    });

    return dataPoints;
  };

  const analyticsChartData = getAnalyticsChartData();
  const analyticsMaxAmount = Math.max(...analyticsChartData.map(dp => dp.amount), 10);

  const analyticsPoints = analyticsChartData.map((dp, idx) => {
    const x = cPadding.left + (idx / Math.max(1, analyticsChartData.length - 1)) * (cWidth - cPadding.left - cPadding.right);
    const y = cHeight - cPadding.bottom - (dp.amount / analyticsMaxAmount) * (cHeight - cPadding.top - cPadding.bottom);
    return { x, y, label: dp.label, amount: dp.amount, fullLabel: dp.fullLabel };
  });

  const analyticsLinePath = analyticsPoints.map((p, idx) => `${idx === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
  const analyticsAreaPath = analyticsPoints.length > 0
    ? `${analyticsLinePath} L ${analyticsPoints[analyticsPoints.length - 1].x} ${cHeight - cPadding.bottom} L ${analyticsPoints[0].x} ${cHeight - cPadding.bottom} Z`
    : '';

  // 4. Tender Types Split for Analytics (based on filtered transactions)
  const filteredCashSales = analyticsTransactions.reduce((sum, t) => {
    if (analyticsCategory === 'All') {
      return sum + (t.paymentMethod === 'Cash' ? t.total : 0);
    } else {
      return sum + t.items.reduce((innerSum, item) => {
        const product = products.find(p => p.id === item.id || p.sku === item.sku);
        const catName = product ? product.category : '';
        if (catName === analyticsCategory && t.paymentMethod === 'Cash') {
          return innerSum + (item.price * item.quantity);
        }
        return innerSum;
      }, 0);
    }
  }, 0);

  const filteredKhqrSales = analyticsTransactions.reduce((sum, t) => {
    if (analyticsCategory === 'All') {
      return sum + (t.paymentMethod === 'KHQR' ? t.total : 0);
    } else {
      return sum + t.items.reduce((innerSum, item) => {
        const product = products.find(p => p.id === item.id || p.sku === item.sku);
        const catName = product ? product.category : '';
        if (catName === analyticsCategory && t.paymentMethod === 'KHQR') {
          return innerSum + (item.price * item.quantity);
        }
        return innerSum;
      }, 0);
    }
  }, 0);

  const filteredCardSales = analyticsTransactions.reduce((sum, t) => {
    if (analyticsCategory === 'All') {
      return sum + (t.paymentMethod === 'Card' ? t.total : 0);
    } else {
      return sum + t.items.reduce((innerSum, item) => {
        const product = products.find(p => p.id === item.id || p.sku === item.sku);
        const catName = product ? product.category : '';
        if (catName === analyticsCategory && t.paymentMethod === 'Card') {
          return innerSum + (item.price * item.quantity);
        }
        return innerSum;
      }, 0);
    }
  }, 0);

  const filteredTotalSalesFromTxns = Math.max(filteredCashSales + filteredKhqrSales + filteredCardSales, 0.01);
  const filteredCashPct = filteredCashSales / filteredTotalSalesFromTxns;
  const filteredKhqrPct = filteredKhqrSales / filteredTotalSalesFromTxns;
  const filteredCardPct = filteredCardSales / filteredTotalSalesFromTxns;

  const filteredKhqrOffset = filteredCashPct * donutCirc;
  const filteredCardOffset = (filteredCashPct + filteredKhqrPct) * donutCirc;

  // 5. Category Contribution Breakdown
  const categorySalesMap = {};
  categories.forEach(cat => {
    categorySalesMap[cat.name] = { revenue: 0, itemsCount: 0 };
  });

  analyticsTransactions.forEach(t => {
    t.items.forEach(item => {
      const product = products.find(p => p.id === item.id || p.sku === item.sku);
      const catName = product ? product.category : 'Uncategorized';

      if (!categorySalesMap[catName]) {
        categorySalesMap[catName] = { revenue: 0, itemsCount: 0 };
      }
      categorySalesMap[catName].revenue += item.price * item.quantity;
      categorySalesMap[catName].itemsCount += item.quantity;
    });
  });

  const categorySalesList = Object.keys(categorySalesMap).map(name => ({
    name,
    revenue: categorySalesMap[name].revenue,
    itemsCount: categorySalesMap[name].itemsCount
  })).sort((a, b) => b.revenue - a.revenue);

  const totalCatRevenue = Math.max(categorySalesList.reduce((sum, c) => sum + c.revenue, 0), 0.01);

  // 6. Top Products Breakdown
  const productSalesMap = {};
  analyticsTransactions.forEach(t => {
    t.items.forEach(item => {
      const key = item.id || item.sku;
      if (!productSalesMap[key]) {
        const prod = products.find(p => p.id === item.id || p.sku === item.sku);
        productSalesMap[key] = {
          name: item.name,
          sku: item.sku || (prod ? prod.sku : 'N/A'),
          category: prod ? prod.category : 'Uncategorized',
          price: item.price,
          unitsSold: 0,
          revenue: 0
        };
      }
      productSalesMap[key].unitsSold += item.quantity;
      productSalesMap[key].revenue += item.price * item.quantity;
    });
  });

  const topProductsList = Object.values(productSalesMap)
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 10);

  // 7. Cashier Sales Breakdown
  const cashierSalesMap = {};
  analyticsTransactions.forEach(t => {
    const key = t.cashier || 'System';
    if (!cashierSalesMap[key]) {
      cashierSalesMap[key] = {
        name: key,
        transactionsCount: 0,
        discountsGiven: 0,
        totalSales: 0
      };
    }
    cashierSalesMap[key].transactionsCount += 1;
    cashierSalesMap[key].discountsGiven += t.discount;
    cashierSalesMap[key].totalSales += t.total;
  });

  const cashierSalesList = Object.values(cashierSalesMap).sort((a, b) => b.totalSales - a.totalSales);

  // 8. Extraction of Cashier list for select dropdown
  const cashierOptions = ['All', ...new Set(transactions.map(t => t.cashier).filter(Boolean))];

  // --- Target Sales Planning calculations ---
  const getPeriodDaysCount = () => {
    const now = new Date();
    if (analyticsTimeRange === '7days') return 7;
    if (analyticsTimeRange === '30days') return 30;
    if (analyticsTimeRange === 'thisMonth') {
      return new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    }
    if (analyticsTimeRange === 'thisYear') {
      const nextYear = new Date(now.getFullYear() + 1, 0, 1);
      const currYear = new Date(now.getFullYear(), 0, 1);
      return Math.round((nextYear - currYear) / (1000 * 60 * 60 * 24));
    }
    if (analyticsTimeRange === 'custom') {
      const start = analyticsStartDate ? new Date(analyticsStartDate) : new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      const end = analyticsEndDate ? new Date(analyticsEndDate) : new Date();
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
      const diffTime = Math.abs(end - start);
      return Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
    }
    return 7;
  };

  const periodDaysCount = getPeriodDaysCount();
  const totalPeriodTarget = periodDaysCount * targetSalesPerDay;
  const periodGap = filteredSalesTotal - totalPeriodTarget;
  const periodAchievementRate = totalPeriodTarget > 0 ? (filteredSalesTotal / totalPeriodTarget) * 100 : 0;

  const isDailyBreakdown = analyticsTimeRange !== 'thisYear' && !(analyticsTimeRange === 'custom' && periodDaysCount > 45);
  const detailedBreakdownData = analyticsChartData.map(dp => {
    let target = targetSalesPerDay;
    if (!isDailyBreakdown) {
      if (dp.key && dp.key.includes('-')) {
        const [year, monthIdx] = dp.key.split('-').map(Number);
        const daysInMonth = new Date(year, monthIdx + 1, 0).getDate();
        target = targetSalesPerDay * daysInMonth;
      } else {
        target = targetSalesPerDay * 30;
      }
    }
    return {
      periodLabel: dp.fullLabel,
      target: target,
      actual: dp.amount
    };
  });

  const getYearlyBreakdown = () => {
    const yearsMap = {};
    transactions.filter(t => t.status !== 'refunded').forEach(t => {
      const year = new Date(t.timestamp).getFullYear();
      if (!yearsMap[year]) {
        yearsMap[year] = 0;
      }
      yearsMap[year] += t.total;
    });

    const currentYear = new Date().getFullYear();
    if (!yearsMap[currentYear]) {
      yearsMap[currentYear] = 0;
    }

    return Object.keys(yearsMap).map(Number).sort((a, b) => b - a).map(year => {
      const nextYear = new Date(year + 1, 0, 1);
      const currYear = new Date(year, 0, 1);
      const days = Math.round((nextYear - currYear) / (1000 * 60 * 60 * 24));
      const target = days * targetSalesPerDay;
      return {
        year: year,
        days: days,
        target: target,
        actual: yearsMap[year]
      };
    });
  };

  const yearlyBreakdownData = getYearlyBreakdown();

  // --- Sales Calendar Calculations ---
  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  const daysInCalendarMonth = new Date(calendarYear, calendarMonth + 1, 0).getDate();
  const startDayOfWeek = new Date(calendarYear, calendarMonth, 1).getDay();
  const activeCalendarDay = selectedCalendarDay > daysInCalendarMonth ? daysInCalendarMonth : selectedCalendarDay;

  const calendarDays = [];
  for (let d = 1; d <= daysInCalendarMonth; d++) {
    calendarDays.push({
      day: d,
      actualSales: 0,
      transactions: [],
    });
  }

  transactions.filter(t => t.status !== 'refunded').forEach(t => {
    const tDate = new Date(t.timestamp);
    if (tDate.getFullYear() === calendarYear && tDate.getMonth() === calendarMonth) {
      const dayNum = tDate.getDate();
      if (dayNum >= 1 && dayNum <= daysInCalendarMonth) {
        calendarDays[dayNum - 1].actualSales += t.total;
        calendarDays[dayNum - 1].transactions.push(t);
      }
    }
  });

  const monthlyTotalSales = calendarDays.reduce((sum, d) => sum + d.actualSales, 0);
  const monthlyDailyAverage = daysInCalendarMonth > 0 ? monthlyTotalSales / daysInCalendarMonth : 0;
  const monthlyTargetMetDays = calendarDays.filter(d => d.actualSales >= targetSalesPerDay).length;
  const monthlyTotalTarget = daysInCalendarMonth * targetSalesPerDay;
  const monthlyAchievementRate = monthlyTotalTarget > 0 ? (monthlyTotalSales / monthlyTotalTarget) * 100 : 0;

  const selectedDayTransactions = activeCalendarDay && activeCalendarDay <= daysInCalendarMonth
    ? calendarDays[activeCalendarDay - 1].transactions
    : [];

  const selectedDayTotalSales = activeCalendarDay && activeCalendarDay <= daysInCalendarMonth
    ? calendarDays[activeCalendarDay - 1].actualSales
    : 0;

  const handlePrevMonth = () => {
    if (calendarMonth === 0) {
      setCalendarMonth(11);
      setCalendarYear(prev => prev - 1);
    } else {
      setCalendarMonth(prev => prev - 1);
    }
  };

  const handleNextMonth = () => {
    if (calendarMonth === 11) {
      setCalendarMonth(0);
      setCalendarYear(prev => prev + 1);
    } else {
      setCalendarMonth(prev => prev + 1);
    }
  };

  return (
    <div className="admin-layout-shell">
      {/* Sidebar Navigation */}
      <aside className="admin-sidebar glass-panel">
        <div className="sidebar-brand">
          <div className="sidebar-logo">
            <LayoutDashboard size={20} color="white" />
          </div>
          <div>
            <h2 className="brand-name">AuraPos</h2>
            <span className="brand-mode">Management Console</span>
          </div>
        </div>

        <nav className="sidebar-nav-links">
          <button
            onClick={() => setActiveSection('overview')}
            className={`sidebar-link ${activeSection === 'overview' ? 'active' : ''}`}
          >
            <LayoutDashboard size={18} />
            <span>Overview</span>
          </button>
          <button
            onClick={() => setActiveSection('inventory')}
            className={`sidebar-link ${activeSection === 'inventory' ? 'active' : ''}`}
          >
            <Database size={18} />
            <span>Inventory Catalog</span>
          </button>
          <button
            onClick={() => setActiveSection('transactions')}
            className={`sidebar-link ${activeSection === 'transactions' ? 'active' : ''}`}
          >
            <History size={18} />
            <span>Billing Logs</span>
          </button>
          <button
            onClick={() => setActiveSection('analytics')}
            className={`sidebar-link ${activeSection === 'analytics' ? 'active' : ''}`}
          >
            <BarChart3 size={18} />
            <span>Analytics Reports</span>
          </button>
          <button
            onClick={() => setActiveSection('categories')}
            className={`sidebar-link ${activeSection === 'categories' ? 'active' : ''}`}
          >
            <Folder size={18} />
            <span>Categories</span>
          </button>
          <button
            onClick={() => setActiveSection('users')}
            className={`sidebar-link ${activeSection === 'users' ? 'active' : ''}`}
          >
            <Users size={18} />
            <span>User Accounts</span>
          </button>
        </nav>

        <div className="sidebar-footer">
          <div className="admin-profile-badge">
            <div className="profile-icon">
              <User size={14} color="var(--accent-primary)" />
            </div>
            <div className="profile-info">
              <span className="profile-role">System Admin</span>
              <span className="profile-name">Administrator</span>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Workspace Area */}
      <main className="admin-content-workspace">
        {/* OVERVIEW SECTION */}
        {activeSection === 'overview' && (
          <div className="workspace-tab-fade">
            <div className="workspace-header">
              <div>
                <h1 className="workspace-title">Welcome back, Admin</h1>
                <p className="workspace-subtitle">Here is the active system overview for today.</p>
              </div>
              <button onClick={loadAllData} className="btn btn-secondary flex-btn">
                <RefreshCw size={14} /> Refresh Data
              </button>
            </div>

            {/* Overview Stats Cards */}
            <div className="stats-row">
              <div className="glass-panel stat-card">
                <div className="stat-icon-box" style={{ background: 'var(--success-glow)', border: '1px solid var(--success)' }}>
                  <DollarSign size={22} color="var(--success)" />
                </div>
                <div className="stat-details">
                  <span className="stat-label">Total Revenue</span>
                  <h3 className="stat-value">${stats.totalSales.toFixed(2)}</h3>
                </div>
              </div>

              <div className="glass-panel stat-card">
                <div className="stat-icon-box" style={{ background: 'rgba(170, 85, 255, 0.1)', border: '1px solid var(--accent-primary)' }}>
                  <ShoppingBag size={22} color="var(--accent-primary)" />
                </div>
                <div className="stat-details">
                  <span className="stat-label">Items Sold</span>
                  <h3 className="stat-value">{stats.itemsSold} items</h3>
                </div>
              </div>

              <div className="glass-panel stat-card">
                <div className="stat-icon-box" style={{ background: 'rgba(0, 150, 255, 0.1)', border: '1px solid var(--info)' }}>
                  <Receipt size={22} color="var(--info)" />
                </div>
                <div className="stat-details">
                  <span className="stat-label">Transactions</span>
                  <h3 className="stat-value">{stats.totalTransactions} bills</h3>
                </div>
              </div>

              <div className="glass-panel stat-card">
                <div className="stat-icon-box" style={{
                  background: stats.lowStockCount > 0 ? 'var(--danger-glow)' : 'rgba(255, 255, 255, 0.03)',
                  border: stats.lowStockCount > 0 ? '1px solid var(--danger)' : '1px solid var(--glass-border)'
                }}>
                  <AlertTriangle size={22} color={stats.lowStockCount > 0 ? 'var(--danger)' : 'var(--text-muted)'} />
                </div>
                <div className="stat-details">
                  <span className="stat-label">Low Stock Alerts</span>
                  <h3 className="stat-value" style={{ color: stats.lowStockCount > 0 ? 'var(--danger)' : 'var(--text-primary)' }}>
                    {stats.lowStockCount} SKUs
                  </h3>
                </div>
              </div>
            </div>

            {/* Overview Visual Grids */}
            <div className="overview-visual-grid" style={{ marginTop: '24px' }}>
              {/* SVG Area Chart Panel */}
              <div className="glass-panel graph-card">
                <div className="panel-header">
                  <h3 className="panel-title">Sales Revenue Performance</h3>
                  <span className="panel-badge">Last 7 Days</span>
                </div>
                <div className="chart-wrapper">
                  <svg viewBox={`0 0 ${cWidth} ${cHeight}`} className="dashboard-svg-chart">
                    <defs>
                      <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" className="chart-grad-stop-0" stopOpacity="0.4" />
                        <stop offset="100%" className="chart-grad-stop-0" stopOpacity="0.0" />
                      </linearGradient>
                    </defs>

                    {/* Y-Axis Gridlines */}
                    {[0, 0.25, 0.5, 0.75, 1].map((ratio, idx) => {
                      const yVal = cPadding.top + ratio * (cHeight - cPadding.top - cPadding.bottom);
                      const amtLabel = Math.round(maxAmount * (1 - ratio));
                      return (
                        <g key={idx}>
                          <line x1={cPadding.left} y1={yVal} x2={cWidth - cPadding.right} y2={yVal} className="chart-gridline" strokeDasharray="3" />
                          <text x={cPadding.left - 10} y={yVal + 4} className="chart-grid-text" textAnchor="end">${amtLabel}</text>
                        </g>
                      );
                    })}

                    {/* Area under the path */}
                    {areaPath && <path d={areaPath} fill="url(#chartGradient)" />}

                    {/* Line path */}
                    {linePath && <path d={linePath} className="chart-line" />}

                    {/* Glowing dots & Hover labels */}
                    {points.map((p, idx) => (
                      <g key={idx} className="chart-dot-group">
                        <circle cx={p.x} cy={p.y} r="4" className="chart-dot" />
                        <circle cx={p.x} cy={p.y} r="8" fill="var(--accent-primary)" opacity="0.15" className="pulse-circle" />
                        <text x={p.x} y={cHeight - 8} fill="var(--text-muted)" fontSize="10" fontWeight="500" textAnchor="middle">{p.day}</text>
                        {/* Value Tooltip Hover */}
                        <g className="chart-tooltip" transform={`translate(${p.x - 30}, ${p.y - 32})`}>
                          <rect width="60" height="22" rx="4" fill="black" stroke="var(--glass-border)" strokeWidth="1" />
                          <text x="30" y="14" fill="white" fontSize="9" fontWeight="bold" textAnchor="middle">${p.amount.toFixed(0)}</text>
                        </g>
                      </g>
                    ))}
                  </svg>
                </div>
              </div>

              {/* Quick Alerts and Stock Panel */}
              <div className="glass-panel system-alerts-card">
                <div className="panel-header">
                  <h3 className="panel-title">Low Stock Warnings</h3>
                  <span className="alert-count-pill">{stats.lowStockCount} items</span>
                </div>
                <div className="low-stock-warnings-list">
                  {products.filter(p => p.stock <= 10).length === 0 ? (
                    <div className="empty-stock-warnings">
                      <Box size={24} style={{ opacity: 0.3, marginBottom: '8px' }} />
                      <p>All products have sufficient stock levels.</p>
                    </div>
                  ) : (
                    products.filter(p => p.stock <= 10).slice(0, 5).map(prod => (
                      <div key={prod.id} className="warning-item">
                        <div>
                          <span className="warning-sku">{prod.sku}</span>
                          <h4 className="warning-name">{prod.name}</h4>
                        </div>
                        <div className="warning-stock-badge">
                          <span>{prod.stock} left</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* INVENTORY SECTION */}
        {activeSection === 'inventory' && (
          <div className="workspace-tab-fade">
            <div className="workspace-header">
              <div>
                <h1 className="workspace-title">Inventory Catalog</h1>
                <p className="workspace-subtitle">Manage store products, stock counts, and SKU details.</p>
              </div>
              <button onClick={handleOpenAddModal} className="btn btn-primary flex-btn">
                <Plus size={16} /> Add New Product
              </button>
            </div>

            {/* Filters Row */}
            <div className="filters-search-row glass-panel">
              <div className="search-box-wrapper">
                <Search size={16} />
                <input
                  type="text"
                  placeholder="Search products by name, SKU..."
                  value={productSearch}
                  onChange={(e) => setProductSearch(e.target.value)}
                  className="search-input-field"
                />
              </div>

              <div className="filter-select-wrapper">
                <span className="filter-label">Category:</span>
                <select
                  value={productCategory}
                  onChange={(e) => setProductCategory(e.target.value)}
                  className="filter-select-field"
                >
                  <option value="All">All Categories</option>
                  {categories.map(cat => (
                    <option key={cat.id} value={cat.name}>{cat.name}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Inventory Table */}
            <div className="glass-panel table-panel" style={{ marginTop: '20px' }}>
              <div className="table-wrapper">
                <table className="pos-table">
                  <thead>
                    <tr>
                      <th>SKU</th>
                      <th>Product Name</th>
                      <th>Category</th>
                      <th>Price</th>
                      <th>Stock Level</th>
                      <th style={{ textAlign: 'right' }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredProducts.map(product => {
                      const isLowStock = product.stock <= 10;
                      const isOutOfStock = product.stock === 0;

                      return (
                        <tr key={product.id}>
                          <td style={{ fontFamily: 'monospace', fontWeight: 'bold' }}>{product.sku}</td>
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                              {product.image ? (
                                <img
                                  src={product.image}
                                  alt={product.name}
                                  style={{
                                    width: '32px',
                                    height: '32px',
                                    borderRadius: '6px',
                                    objectFit: 'cover',
                                    border: '1px solid var(--glass-border)'
                                  }}
                                />
                              ) : (
                                <div style={{
                                  width: '32px',
                                  height: '32px',
                                  borderRadius: '6px',
                                  background: 'rgba(255, 255, 255, 0.05)',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  border: '1px solid var(--glass-border)',
                                  color: 'var(--text-muted)'
                                }}>
                                  <Box size={14} />
                                </div>
                              )}
                              <span>{product.name}</span>
                            </div>
                          </td>
                          <td>{product.category}</td>
                          <td style={{ fontWeight: '600', color: 'var(--accent-primary)' }}>${product.price.toFixed(2)}</td>
                          <td>
                            <span style={{
                              color: isOutOfStock ? 'var(--danger)' : isLowStock ? 'var(--warning)' : 'var(--success)',
                              fontWeight: '600',
                              fontSize: '12px'
                            }}>
                              {isOutOfStock ? 'OUT OF STOCK' : isLowStock ? `LOW STOCK (${product.stock})` : `${product.stock} units`}
                            </span>
                          </td>
                          <td style={{ textAlign: 'right' }}>
                            <div className="action-buttons-cell" style={{ justifyContent: 'flex-end' }}>
                              <button
                                onClick={() => handleOpenEditModal(product)}
                                className="table-icon-btn edit"
                                title="Edit Product"
                              >
                                <Edit2 size={14} />
                              </button>
                              <button
                                onClick={() => handleDeleteProduct(product.id)}
                                className="table-icon-btn delete"
                                title="Delete Product"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                    {filteredProducts.length === 0 && (
                      <tr>
                        <td colSpan="6" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                          No products match the search filter.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* BILLING LOGS SECTION */}
        {activeSection === 'transactions' && (
          <div className="workspace-tab-fade">
            <div className="workspace-header">
              <div>
                <h1 className="workspace-title">Billing Ledger Logs</h1>
                <p className="workspace-subtitle">View and audit cashier sales records.</p>
              </div>
            </div>

            {/* Filters Row */}
            <div className="filters-search-row glass-panel" style={{ flexWrap: 'wrap', gap: '16px' }}>
              <div className="search-box-wrapper" style={{ minWidth: '240px' }}>
                <Search size={16} />
                <input
                  type="text"
                  placeholder="Search bills by ID, cashier name..."
                  value={txnSearch}
                  onChange={(e) => setTxnSearch(e.target.value)}
                  className="search-input-field"
                />
              </div>

              <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
                <div className="filter-select-wrapper">
                  <span className="filter-label">From:</span>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="filter-select-field"
                    style={{ colorScheme: 'dark' }}
                  />
                </div>

                <div className="filter-select-wrapper">
                  <span className="filter-label">To:</span>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="filter-select-field"
                    style={{ colorScheme: 'dark' }}
                  />
                </div>

                <div className="filter-select-wrapper">
                  <span className="filter-label">Method:</span>
                  <select
                    value={txnMethod}
                    onChange={(e) => setTxnMethod(e.target.value)}
                    className="filter-select-field"
                  >
                    <option value="All">All Methods</option>
                    <option value="Cash">Cash Payment</option>
                    <option value="Card">Card Terminal</option>
                    <option value="KHQR">KHQR Pay</option>
                  </select>
                </div>

                <div className="filter-select-wrapper">
                  <span className="filter-label">Sort:</span>
                  <select
                    value={sortOrder}
                    onChange={(e) => setSortOrder(e.target.value)}
                    className="filter-select-field"
                  >
                    <option value="desc">Newest First</option>
                    <option value="asc">Oldest First</option>
                  </select>
                </div>

                {(startDate || endDate) && (
                  <button
                    onClick={() => { setStartDate(''); setEndDate(''); }}
                    className="btn btn-secondary"
                    style={{ padding: '8px 12px', fontSize: '12px', borderRadius: '8px' }}
                  >
                    Reset Dates
                  </button>
                )}
              </div>

              <button
                onClick={handleExportExcel}
                className="btn btn-primary flex-btn"
                style={{ marginLeft: 'auto', padding: '8px 14px', borderRadius: '8px' }}
              >
                <Download size={14} />
                <span>Export Excel</span>
              </button>
            </div>

            {/* Transactions Table */}
            <div className="glass-panel table-panel" style={{ marginTop: '20px' }}>
              <div className="table-wrapper">
                <table className="pos-table">
                  <thead>
                    <tr>
                      <th>Bill ID</th>
                      <th>Date & Time</th>
                      <th>Items Purchased</th>
                      <th>Mode</th>
                      <th>Cashier</th>
                      <th>Total Bill</th>
                      <th style={{ textAlign: 'right' }}>Receipt</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredTransactions.map(txn => {
                      const badgeClass = txn.paymentMethod === 'Cash'
                        ? 'badge badge-cash'
                        : txn.paymentMethod === 'Card'
                          ? 'badge badge-card'
                          : 'badge badge-khqr';

                      return (
                        <tr key={txn.id}>
                          <td style={{ fontFamily: 'monospace', fontWeight: 'bold' }}>{txn.id}</td>
                          <td>{new Date(txn.timestamp).toLocaleString()}</td>
                          <td>
                            {txn.items.map(i => `${i.name} (x${i.quantity})`).join(', ')}
                          </td>
                          <td>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'flex-start' }}>
                              <span className={badgeClass}>{txn.paymentMethod}</span>
                              {txn.status === 'refunded' && (
                                <span className="badge badge-khqr" style={{ fontSize: '9px', padding: '1px 6px' }}>Refunded</span>
                              )}
                            </div>
                          </td>
                          <td>{txn.cashier || 'Admin'}</td>
                          <td className="txn-total-amount" style={{ textDecoration: txn.status === 'refunded' ? 'line-through' : 'none', opacity: txn.status === 'refunded' ? 0.6 : 1 }}>
                            ${txn.total.toFixed(2)}
                          </td>
                          <td style={{ textAlign: 'right' }}>
                            <div style={{ display: 'inline-flex', gap: '8px', justifyContent: 'flex-end', alignItems: 'center', width: '100%' }}>
                              <button
                                onClick={() => handleViewReceipt(txn)}
                                className="btn btn-secondary"
                                style={{ padding: '6px 12px', fontSize: '11px', borderRadius: '6px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                              >
                                <Receipt size={12} />
                                <span>View Detail</span>
                              </button>
                              {txn.status !== 'refunded' ? (
                                <button
                                  onClick={() => handleRefundTransaction(txn.id)}
                                  className="btn btn-secondary"
                                  style={{
                                    padding: '6px 12px',
                                    fontSize: '11px',
                                    borderRadius: '6px',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '4px',
                                    borderColor: 'var(--danger)',
                                    color: 'var(--danger)',
                                    background: 'transparent'
                                  }}
                                  onMouseOver={(e) => {
                                    e.currentTarget.style.backgroundColor = 'var(--danger-glow)';
                                  }}
                                  onMouseOut={(e) => {
                                    e.currentTarget.style.backgroundColor = 'transparent';
                                  }}
                                >
                                  <AlertTriangle size={12} />
                                  <span>Refund</span>
                                </button>
                              ) : (
                                <span
                                  style={{
                                    fontSize: '11px',
                                    fontWeight: 'bold',
                                    color: 'var(--text-muted)',
                                    padding: '6px 12px',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    userSelect: 'none'
                                  }}
                                >
                                  Refunded
                                </span>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                    {filteredTransactions.length === 0 && (
                      <tr>
                        <td colSpan="7" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                          No billing logs match the query.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ANALYTICS SECTION */}
        {activeSection === 'analytics' && (
          <div className="workspace-tab-fade">
            <div className="workspace-header">
              <div>
                <h1 className="workspace-title">Analytics Reports</h1>
                <p className="workspace-subtitle">Analyze real-time sales trends, payment method breakdowns, and category performance.</p>
              </div>
            </div>

            {/* Dynamic Analytics Filters Row */}
            <div className="filters-search-row glass-panel" style={{ flexWrap: 'wrap', gap: '16px', marginBottom: '20px' }}>
              <div className="filter-select-wrapper">
                <span className="filter-label">Time Range:</span>
                <select
                  value={analyticsTimeRange}
                  onChange={(e) => setAnalyticsTimeRange(e.target.value)}
                  className="filter-select-field"
                >
                  <option value="7days">Last 7 Days</option>
                  <option value="30days">Last 30 Days</option>
                  <option value="thisMonth">This Month</option>
                  <option value="thisYear">This Year</option>
                  <option value="custom">Custom Date Range</option>
                </select>
              </div>

              {analyticsTimeRange === 'custom' && (
                <>
                  <div className="filter-select-wrapper">
                    <span className="filter-label">From:</span>
                    <input
                      type="date"
                      value={analyticsStartDate}
                      onChange={(e) => setAnalyticsStartDate(e.target.value)}
                      className="filter-select-field"
                      style={{ colorScheme: 'dark' }}
                    />
                  </div>
                  <div className="filter-select-wrapper">
                    <span className="filter-label">To:</span>
                    <input
                      type="date"
                      value={analyticsEndDate}
                      onChange={(e) => setAnalyticsEndDate(e.target.value)}
                      className="filter-select-field"
                      style={{ colorScheme: 'dark' }}
                    />
                  </div>
                </>
              )}

              <div className="filter-select-wrapper">
                <span className="filter-label">Cashier:</span>
                <select
                  value={analyticsCashier}
                  onChange={(e) => setAnalyticsCashier(e.target.value)}
                  className="filter-select-field"
                >
                  {cashierOptions.map(cashier => (
                    <option key={cashier} value={cashier}>{cashier === 'All' ? 'All Cashiers' : cashier}</option>
                  ))}
                </select>
              </div>

              <div className="filter-select-wrapper">
                <span className="filter-label">Category:</span>
                <select
                  value={analyticsCategory}
                  onChange={(e) => setAnalyticsCategory(e.target.value)}
                  className="filter-select-field"
                >
                  <option value="All">All Categories</option>
                  {categories.map(cat => (
                    <option key={cat.id} value={cat.name}>{cat.name}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Filtered Metrics Summary Row */}
            <div className="analytics-stats-row">
              <div className="analytics-stat-card">
                <span className="stat-label">Filtered Revenue</span>
                <span className="stat-value" style={{ color: 'var(--success)' }}>
                  ${filteredSalesTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
              <div className="analytics-stat-card">
                <span className="stat-label">Transactions</span>
                <span className="stat-value">{filteredTxnsCount} bills</span>
              </div>
              <div className="analytics-stat-card">
                <span className="stat-label">Items Sold</span>
                <span className="stat-value">{filteredItemsSold} units</span>
              </div>
              <div className="analytics-stat-card">
                <span className="stat-label">Avg Ticket Size</span>
                <span className="stat-value">
                  ${filteredAtv.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
              <div className="analytics-stat-card">
                <span className="stat-label">Discounts Given</span>
                <span className="stat-value" style={{ color: 'var(--danger)' }}>
                  ${filteredDiscountTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
            </div>

            {/* Main Interactive Charts Layout */}
            <div className="analytics-grid-layout">
              {/* Sales Revenue Trend Card */}
              <div className="glass-panel graph-card">
                <div className="panel-header">
                  <h3 className="panel-title">Sales Revenue Performance</h3>
                  <span className="panel-badge">USD</span>
                </div>
                <div className="chart-wrapper" style={{ minHeight: '180px' }}>
                  {analyticsPoints.length === 0 ? (
                    <div style={{ display: 'flex', flex: 1, height: '180px', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
                      No sales records for selected range.
                    </div>
                  ) : (
                    <svg viewBox={`0 0 ${cWidth} ${cHeight}`} className="dashboard-svg-chart">
                      {/* Gridlines */}
                      {[0, 0.25, 0.5, 0.75, 1].map((ratio, idx) => {
                        const yVal = cPadding.top + ratio * (cHeight - cPadding.top - cPadding.bottom);
                        const amtLabel = Math.round(analyticsMaxAmount * (1 - ratio));
                        return (
                          <g key={idx}>
                            <line x1={cPadding.left} y1={yVal} x2={cWidth - cPadding.right} y2={yVal} className="chart-gridline" strokeDasharray="3" />
                            <text x={cPadding.left - 10} y={yVal + 4} className="chart-grid-text" textAnchor="end">${amtLabel}</text>
                          </g>
                        );
                      })}

                      {analyticsAreaPath && <path d={analyticsAreaPath} fill="url(#chartGradient)" />}
                      {analyticsLinePath && <path d={analyticsLinePath} className="chart-line" />}

                      {analyticsPoints.map((p, idx) => {
                        let showLabel = false;
                        if (analyticsChartData.length <= 10) {
                          showLabel = true;
                        } else if (analyticsChartData.length <= 15) {
                          showLabel = idx % 2 === 0;
                        } else if (analyticsChartData.length <= 31) {
                          showLabel = idx % 5 === 0 || idx === analyticsChartData.length - 1;
                        } else {
                          showLabel = idx % 8 === 0 || idx === analyticsChartData.length - 1;
                        }

                        return (
                          <g key={idx} className="chart-dot-group">
                            <circle cx={p.x} cy={p.y} r={analyticsChartData.length > 20 ? "2" : "3.5"} className="chart-dot" />
                            {showLabel && (
                              <text x={p.x} y={cHeight - 8} fill="var(--text-muted)" fontSize="9" textAnchor="middle">{p.label}</text>
                            )}
                            <g className="chart-tooltip" transform={`translate(${p.x - 30}, ${p.y - 32})`}>
                              <rect width="65" height="22" rx="4" fill="black" stroke="var(--glass-border)" strokeWidth="1" />
                              <text x="32.5" y="14" fill="white" fontSize="9" fontWeight="bold" textAnchor="middle">${p.amount.toFixed(0)}</text>
                            </g>
                          </g>
                        );
                      })}
                    </svg>
                  )}
                </div>
              </div>

              {/* Tender Type circular donut chart */}
              <div className="glass-panel donut-card">
                <div className="panel-header">
                  <h3 className="panel-title">Tender Breakdown</h3>
                </div>
                {filteredTotalSalesFromTxns <= 0.05 ? (
                  <div style={{ display: 'flex', height: '180px', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
                    No payment data.
                  </div>
                ) : (
                  <div style={styles.donutLayout}>
                    <div style={styles.donutSvgWrapper}>
                      <svg width="110" height="110" viewBox="0 0 100 100">
                        <circle cx="50" cy="50" r={donutR} fill="transparent" stroke="rgba(255,255,255,0.03)" strokeWidth="10" />
                        {filteredCashPct > 0 && (
                          <circle
                            cx="50" cy="50" r={donutR}
                            fill="transparent"
                            stroke="var(--success)"
                            strokeWidth="10"
                            strokeDasharray={`${filteredCashPct * donutCirc} ${donutCirc}`}
                            strokeDashoffset={0}
                            transform="rotate(-90 50 50)"
                          />
                        )}
                        {filteredKhqrPct > 0 && (
                          <circle
                            cx="50" cy="50" r={donutR}
                            fill="transparent"
                            stroke="#e53935"
                            strokeWidth="10"
                            strokeDasharray={`${filteredKhqrPct * donutCirc} ${donutCirc}`}
                            strokeDashoffset={-filteredKhqrOffset}
                            transform="rotate(-90 50 50)"
                          />
                        )}
                        {filteredCardPct > 0 && (
                          <circle
                            cx="50" cy="50" r={donutR}
                            fill="transparent"
                            stroke="var(--info)"
                            strokeWidth="10"
                            strokeDasharray={`${filteredCardPct * donutCirc} ${donutCirc}`}
                            strokeDashoffset={-filteredCardOffset}
                            transform="rotate(-90 50 50)"
                          />
                        )}
                        <text x="50" y="55" fill="var(--text-primary)" fontSize="11" fontWeight="800" textAnchor="middle">
                          Split
                        </text>
                      </svg>
                    </div>

                    <div style={styles.donutLegend}>
                      <div style={styles.legendRow}>
                        <span style={{ ...styles.legendColor, background: 'var(--success)' }}></span>
                        <span style={styles.legendLabel}>Cash</span>
                        <span style={styles.legendVal}>${filteredCashSales.toFixed(0)} ({Math.round(filteredCashPct * 100)}%)</span>
                      </div>
                      <div style={styles.legendRow}>
                        <span style={{ ...styles.legendColor, background: '#e53935' }}></span>
                        <span style={styles.legendLabel}>KHQR</span>
                        <span style={styles.legendVal}>${filteredKhqrSales.toFixed(0)} ({Math.round(filteredKhqrPct * 100)}%)</span>
                      </div>
                      <div style={styles.legendRow}>
                        <span style={{ ...styles.legendColor, background: 'var(--info)' }}></span>
                        <span style={styles.legendLabel}>Card</span>
                        <span style={styles.legendVal}>${filteredCardSales.toFixed(0)} ({Math.round(filteredCardPct * 100)}%)</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Category Contribution Card */}
              <div className="glass-panel category-contribution-card">
                <div className="panel-header">
                  <h3 className="panel-title">Category Revenue Share</h3>
                </div>
                <div className="category-share-list">
                  {categorySalesList.filter(c => c.revenue > 0).length === 0 ? (
                    <div style={{ display: 'flex', height: '140px', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
                      No category splits found.
                    </div>
                  ) : (
                    categorySalesList.map(cat => {
                      const sharePct = (cat.revenue / totalCatRevenue) * 100;
                      return (
                        <div key={cat.name} className="category-share-item">
                          <div className="category-share-header">
                            <span className="category-share-name">{cat.name}</span>
                            <span className="category-share-values">
                              ${cat.revenue.toFixed(0)} ({Math.round(sharePct)}%)
                            </span>
                          </div>
                          <div className="category-progress-bg">
                            <div className="category-progress-fill" style={{ width: `${sharePct}%` }}></div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>

            {/* Breakdown Tables Tab panel */}
            <div className="glass-panel reports-tab-panel">
              <div className="reports-tab-header">
                <h3 className="reports-tab-title">Analytics Breakdown Reports</h3>
                <div className="reports-tabs-buttons">
                  <button
                    onClick={() => setActiveReportTab('products')}
                    className={`reports-tab-btn ${activeReportTab === 'products' ? 'active' : ''}`}
                  >
                    Top Selling Products
                  </button>
                  <button
                    onClick={() => setActiveReportTab('categories')}
                    className={`reports-tab-btn ${activeReportTab === 'categories' ? 'active' : ''}`}
                  >
                    Category Breakdown
                  </button>
                  <button
                    onClick={() => setActiveReportTab('cashiers')}
                    className={`reports-tab-btn ${activeReportTab === 'cashiers' ? 'active' : ''}`}
                  >
                    Cashier Performance
                  </button>
                  <button
                    onClick={() => setActiveReportTab('targets')}
                    className={`reports-tab-btn ${activeReportTab === 'targets' ? 'active' : ''}`}
                  >
                    Target Sales Planning
                  </button>
                  <button
                    onClick={() => setActiveReportTab('calendar')}
                    className={`reports-tab-btn ${activeReportTab === 'calendar' ? 'active' : ''}`}
                  >
                    Sales Calendar
                  </button>
                </div>
              </div>

              {/* Tab Contents: Top Products */}
              {activeReportTab === 'products' && (
                <div className="table-wrapper">
                  <table className="pos-table">
                    <thead>
                      <tr>
                        <th>SKU</th>
                        <th>Product Name</th>
                        <th>Category</th>
                        <th>Price</th>
                        <th>Units Sold</th>
                        <th style={{ textAlign: 'right' }}>Total Revenue</th>
                      </tr>
                    </thead>
                    <tbody>
                      {topProductsList.map(item => (
                        <tr key={item.sku}>
                          <td style={{ fontFamily: 'monospace', fontWeight: 'bold' }}>{item.sku}</td>
                          <td style={{ fontWeight: '600' }}>{item.name}</td>
                          <td>{item.category}</td>
                          <td>${item.price.toFixed(2)}</td>
                          <td style={{ fontWeight: 'bold' }}>{item.unitsSold} units</td>
                          <td style={{ textAlign: 'right', fontWeight: 'bold', color: 'var(--success)' }}>
                            ${item.revenue.toFixed(2)}
                          </td>
                        </tr>
                      ))}
                      {topProductsList.length === 0 && (
                        <tr>
                          <td colSpan="6" style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>
                            No product sales recorded in this interval.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Tab Contents: Category Breakdown */}
              {activeReportTab === 'categories' && (
                <div className="table-wrapper">
                  <table className="pos-table">
                    <thead>
                      <tr>
                        <th>Category Name</th>
                        <th>Units Sold</th>
                        <th>Percentage Contribution</th>
                        <th style={{ textAlign: 'right' }}>Total Revenue</th>
                      </tr>
                    </thead>
                    <tbody>
                      {categorySalesList.map(cat => {
                        const pct = (cat.revenue / totalCatRevenue) * 100;
                        return (
                          <tr key={cat.name}>
                            <td style={{ fontWeight: '600' }}>{cat.name}</td>
                            <td style={{ fontWeight: 'bold' }}>{cat.itemsCount} units</td>
                            <td>{pct > 0 ? `${pct.toFixed(1)}%` : '0%'}</td>
                            <td style={{ textAlign: 'right', fontWeight: 'bold', color: 'var(--success)' }}>
                              ${cat.revenue.toFixed(2)}
                            </td>
                          </tr>
                        );
                      })}
                      {categorySalesList.length === 0 && (
                        <tr>
                          <td colSpan="4" style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>
                            No category sales recorded in this interval.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Tab Contents: Cashier Performance */}
              {activeReportTab === 'cashiers' && (
                <div className="table-wrapper">
                  <table className="pos-table">
                    <thead>
                      <tr>
                        <th>Cashier Username</th>
                        <th>Transactions Managed</th>
                        <th>Total Discounts Offered</th>
                        <th style={{ textAlign: 'right' }}>Total Sales (USD)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {cashierSalesList.map(cashier => (
                        <tr key={cashier.name}>
                          <td style={{ fontWeight: '600' }}>{cashier.name}</td>
                          <td>{cashier.transactionsCount} orders</td>
                          <td style={{ color: 'var(--danger)' }}>${cashier.discountsGiven.toFixed(2)}</td>
                          <td style={{ textAlign: 'right', fontWeight: 'bold', color: 'var(--success)' }}>
                            ${cashier.totalSales.toFixed(2)}
                          </td>
                        </tr>
                      ))}
                      {cashierSalesList.length === 0 && (
                        <tr>
                          <td colSpan="4" style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>
                            No cashier performance logged in this interval.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}

              {activeReportTab === 'targets' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', padding: '10px 0' }}>
                  {/* Target Planning Controls */}
                  <div className="glass-panel" style={{ padding: '20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <h4 style={{ fontSize: '15px', fontWeight: '600' }}>Daily Sales Target</h4>
                      <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Define your daily sales goal to evaluate performance across days, months, and years.</p>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-secondary)' }}>$</span>
                      <input
                        type="number"
                        min="1"
                        value={targetSalesPerDay}
                        onChange={(e) => handleTargetSalesChange(e.target.value)}
                        style={{
                          width: '100px',
                          padding: '8px 12px',
                          background: 'var(--glass-bg)',
                          border: '1px solid var(--glass-border)',
                          borderRadius: '8px',
                          color: 'var(--text-primary)',
                          fontWeight: 'bold',
                          outline: 'none',
                          textAlign: 'right'
                        }}
                      />
                      <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>/ day</span>
                    </div>
                  </div>

                  {/* Performance Summary Cards */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
                    <div className="analytics-stat-card" style={{ background: 'rgba(255, 255, 255, 0.02)', border: '1px solid var(--glass-border)' }}>
                      <span className="stat-label">Total Target</span>
                      <span className="stat-value">${totalPeriodTarget.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                      <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{periodDaysCount} days × ${targetSalesPerDay}/day</span>
                    </div>
                    <div className="analytics-stat-card" style={{ background: 'rgba(255, 255, 255, 0.02)', border: '1px solid var(--glass-border)' }}>
                      <span className="stat-label">Actual Sales</span>
                      <span className="stat-value" style={{ color: 'var(--accent-primary)' }}>${filteredSalesTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                      <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>For selected range filters</span>
                    </div>
                    <div className="analytics-stat-card" style={{ background: 'rgba(255, 255, 255, 0.02)', border: '1px solid var(--glass-border)' }}>
                      <span className="stat-label">Performance Gap</span>
                      <span className="stat-value" style={{ color: periodGap >= 0 ? 'var(--success)' : 'var(--danger)' }}>
                        {periodGap >= 0 ? '+' : ''}${periodGap.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                      <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{periodGap >= 0 ? 'Surplus goal' : 'Behind target'}</span>
                    </div>
                    <div className="analytics-stat-card" style={{ background: 'rgba(255, 255, 255, 0.02)', border: '1px solid var(--glass-border)' }}>
                      <span className="stat-label">Achievement Rate</span>
                      <span className="stat-value" style={{ color: periodAchievementRate >= 100 ? 'var(--success)' : periodAchievementRate >= 80 ? 'var(--warning)' : 'var(--danger)' }}>
                        {periodAchievementRate.toFixed(1)}%
                      </span>
                      <div style={{ width: '100%', height: '4px', background: 'rgba(255,255,255,0.05)', borderRadius: '2px', marginTop: '6px', overflow: 'hidden' }}>
                        <div style={{
                          width: `${Math.min(100, periodAchievementRate)}%`,
                          height: '100%',
                          background: periodAchievementRate >= 100 ? 'var(--success)' : periodAchievementRate >= 80 ? 'var(--warning)' : 'var(--danger)',
                          borderRadius: '2px'
                        }}></div>
                      </div>
                    </div>
                  </div>

                  {/* Period Breakdown Table */}
                  <div className="table-panel" style={{ marginTop: '10px', border: '1px solid var(--glass-border)', borderRadius: '12px', overflow: 'hidden' }}>
                    <div style={{ padding: '16px', borderBottom: '1px solid var(--glass-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <h4 style={{ fontSize: '14px', fontWeight: '600' }}>
                        {isDailyBreakdown ? 'Daily Target Breakdown' : 'Monthly Target Breakdown'}
                      </h4>
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Comparison for active range filters</span>
                    </div>
                    <div className="table-wrapper">
                      <table className="pos-table">
                        <thead>
                          <tr>
                            <th>Period</th>
                            <th>Target Goal</th>
                            <th>Actual Sales</th>
                            <th>Variance</th>
                            <th>Rate %</th>
                            <th style={{ textAlign: 'right' }}>Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {detailedBreakdownData.map((row, idx) => {
                            const variance = row.actual - row.target;
                            const rate = row.target > 0 ? (row.actual / row.target) * 100 : 0;
                            const statusColor = rate >= 100 ? 'var(--success)' : rate >= 75 ? 'var(--warning)' : 'var(--danger)';
                            const statusLabel = rate >= 100 ? 'Exceeded' : rate >= 75 ? 'Met Goal' : 'Behind';

                            return (
                              <tr key={idx}>
                                <td style={{ fontWeight: '600' }}>{row.periodLabel}</td>
                                <td>${row.target.toFixed(2)}</td>
                                <td style={{ color: 'var(--accent-primary)', fontWeight: '600' }}>${row.actual.toFixed(2)}</td>
                                <td style={{ color: variance >= 0 ? 'var(--success)' : 'var(--danger)', fontWeight: '500' }}>
                                  {variance >= 0 ? '+' : ''}${variance.toFixed(2)}
                                </td>
                                <td style={{ fontWeight: '600' }}>{rate.toFixed(1)}%</td>
                                <td style={{ textAlign: 'right' }}>
                                  <span style={{
                                    padding: '2px 8px',
                                    borderRadius: '4px',
                                    fontSize: '10px',
                                    fontWeight: '700',
                                    background: statusColor + '20',
                                    color: statusColor,
                                    border: `1px solid ${statusColor}40`
                                  }}>
                                    {statusLabel}
                                  </span>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Annual Target Breakdown */}
                  <div className="table-panel" style={{ border: '1px solid var(--glass-border)', borderRadius: '12px', overflow: 'hidden' }}>
                    <div style={{ padding: '16px', borderBottom: '1px solid var(--glass-border)' }}>
                      <h4 style={{ fontSize: '14px', fontWeight: '600' }}>Yearly Target Breakdown</h4>
                    </div>
                    <div className="table-wrapper">
                      <table className="pos-table">
                        <thead>
                          <tr>
                            <th>Year</th>
                            <th>Total Days</th>
                            <th>Target Goal</th>
                            <th>Actual Sales</th>
                            <th>Variance</th>
                            <th>Rate %</th>
                            <th style={{ textAlign: 'right' }}>Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {yearlyBreakdownData.map((row, idx) => {
                            const variance = row.actual - row.target;
                            const rate = row.target > 0 ? (row.actual / row.target) * 100 : 0;
                            const statusColor = rate >= 100 ? 'var(--success)' : rate >= 75 ? 'var(--warning)' : 'var(--danger)';
                            const statusLabel = rate >= 100 ? 'Exceeded' : rate >= 75 ? 'Met Goal' : 'Behind';

                            return (
                              <tr key={idx}>
                                <td style={{ fontWeight: '700' }}>{row.year}</td>
                                <td>{row.days} days</td>
                                <td>${row.target.toFixed(2)}</td>
                                <td style={{ color: 'var(--accent-primary)', fontWeight: '600' }}>${row.actual.toFixed(2)}</td>
                                <td style={{ color: variance >= 0 ? 'var(--success)' : 'var(--danger)', fontWeight: '500' }}>
                                  {variance >= 0 ? '+' : ''}${variance.toFixed(2)}
                                </td>
                                <td style={{ fontWeight: '600' }}>{rate.toFixed(1)}%</td>
                                <td style={{ textAlign: 'right' }}>
                                  <span style={{
                                    padding: '2px 8px',
                                    borderRadius: '4px',
                                    fontSize: '10px',
                                    fontWeight: '700',
                                    background: statusColor + '20',
                                    color: statusColor,
                                    border: `1px solid ${statusColor}40`
                                  }}>
                                    {statusLabel}
                                  </span>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* Tab Contents: Sales Calendar */}
              {activeReportTab === 'calendar' && (
                <div className="sales-calendar-container" style={{ display: 'flex', flexDirection: 'column', gap: '20px', padding: '10px 0' }}>
                  {/* Calendar Header Controls */}
                  <div className="glass-panel" style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <h4 style={{ fontSize: '15px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
                        <Calendar size={18} color="var(--accent-primary)" />
                        <span>Sales Calendar Ledger</span>
                      </h4>
                      <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: 0 }}>Track daily sales targets, achievement metrics, and audit bills.</p>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <button
                        onClick={handlePrevMonth}
                        className="btn btn-secondary"
                        style={{ padding: '8px 12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                      >
                        <ChevronLeft size={16} />
                      </button>

                      <div style={{ display: 'flex', gap: '8px' }}>
                        <select
                          value={calendarMonth}
                          onChange={(e) => setCalendarMonth(parseInt(e.target.value))}
                          className="filter-select-field"
                          style={{ minWidth: '120px', margin: 0 }}
                        >
                          {monthNames.map((name, idx) => (
                            <option key={idx} value={idx}>{name}</option>
                          ))}
                        </select>
                        <select
                          value={calendarYear}
                          onChange={(e) => setCalendarYear(parseInt(e.target.value))}
                          className="filter-select-field"
                          style={{ minWidth: '90px', margin: 0 }}
                        >
                          {/* Range: 2024 to current year + 1 */}
                          {Array.from({ length: new Date().getFullYear() - 2024 + 2 }).map((_, i) => {
                            const yr = 2024 + i;
                            return <option key={yr} value={yr}>{yr}</option>;
                          })}
                        </select>
                      </div>

                      <button
                        onClick={handleNextMonth}
                        className="btn btn-secondary"
                        style={{ padding: '8px 12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                      >
                        <ChevronRight size={16} />
                      </button>
                    </div>
                  </div>

                  {/* Monthly Quick Stats */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
                    <div className="analytics-stat-card" style={{ background: 'var(--glass-bg)', border: '1px solid var(--glass-border)' }}>
                      <span className="stat-label">Month Total Sales</span>
                      <span className="stat-value" style={{ color: 'var(--success)' }}>
                        ${monthlyTotalSales.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                      <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Non-refunded transaction totals</span>
                    </div>
                    <div className="analytics-stat-card" style={{ background: 'var(--glass-bg)', border: '1px solid var(--glass-border)' }}>
                      <span className="stat-label">Daily Average Sales</span>
                      <span className="stat-value">
                        ${monthlyDailyAverage.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                      <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Total sales / {daysInCalendarMonth} calendar days</span>
                    </div>
                    <div className="analytics-stat-card" style={{ background: 'var(--glass-bg)', border: '1px solid var(--glass-border)' }}>
                      <span className="stat-label">Days Target Met</span>
                      <span className="stat-value" style={{ color: 'var(--accent-primary)' }}>
                        {monthlyTargetMetDays} / {daysInCalendarMonth} days
                      </span>
                      <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Daily target: ${targetSalesPerDay}/day</span>
                    </div>
                    <div className="analytics-stat-card" style={{ background: 'var(--glass-bg)', border: '1px solid var(--glass-border)' }}>
                      <span className="stat-label">Month Achievement</span>
                      <span className="stat-value" style={{ color: monthlyAchievementRate >= 100 ? 'var(--success)' : monthlyAchievementRate >= 80 ? 'var(--warning)' : 'var(--danger)' }}>
                        {monthlyAchievementRate.toFixed(1)}%
                      </span>
                      <div style={{ width: '100%', height: '4px', background: 'var(--border-color)', borderRadius: '2px', marginTop: '6px', overflow: 'hidden' }}>
                        <div style={{
                          width: `${Math.min(100, monthlyAchievementRate)}%`,
                          height: '100%',
                          background: monthlyAchievementRate >= 100 ? 'var(--success)' : monthlyAchievementRate >= 80 ? 'var(--warning)' : 'var(--danger)',
                          borderRadius: '2px'
                        }}></div>
                      </div>
                    </div>
                  </div>

                  {/* Calendar Grid card */}
                  <div className="glass-panel" style={{ padding: '20px' }}>
                    {/* Days of Week headers */}
                    <div className="calendar-grid-header" style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '10px', marginBottom: '8px' }}>
                      {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(dayName => (
                        <div key={dayName} style={{ textAlign: 'center', fontSize: '12px', fontWeight: '700', color: 'var(--text-muted)', padding: '6px 0', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                          {dayName}
                        </div>
                      ))}
                    </div>

                    {/* Day cells grid */}
                    <div className="calendar-grid-body" style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '10px' }}>
                      {/* Offset empty days */}
                      {Array.from({ length: startDayOfWeek }).map((_, idx) => (
                        <div key={`offset-${idx}`} className="calendar-day-cell offset-cell" style={{
                          minHeight: '80px',
                          borderRadius: '8px',
                          background: 'rgba(255, 255, 255, 0.01)',
                          border: '1px solid transparent',
                          opacity: 0.15,
                          pointerEvents: 'none'
                        }}></div>
                      ))}

                      {/* Active month days */}
                      {calendarDays.map(dayObj => {
                        const isSelected = activeCalendarDay === dayObj.day;
                        const sales = dayObj.actualSales;
                        const hasSales = sales > 0;
                        const isTargetMet = sales >= targetSalesPerDay;

                        let cellClass = "target-zero";
                        let borderStyle = "1px solid var(--glass-border)";
                        let bgStyle = "var(--glass-bg)";
                        let amtColor = "var(--text-muted)";

                        if (hasSales) {
                          if (isTargetMet) {
                            cellClass = "target-met";
                            borderStyle = "1px solid var(--success)";
                            bgStyle = "var(--success-glow)";
                            amtColor = "var(--success)";
                          } else {
                            cellClass = "target-missed";
                            borderStyle = "1px solid var(--danger)";
                            bgStyle = "var(--danger-glow)";
                            amtColor = "var(--danger)";
                          }
                        }

                        if (isSelected) {
                          borderStyle = "2px solid var(--accent-primary)";
                          bgStyle = "var(--accent-glow)";
                        }

                        return (
                          <div
                            key={dayObj.day}
                            onClick={() => setSelectedCalendarDay(dayObj.day)}
                            className={`calendar-day-cell ${cellClass} ${isSelected ? 'selected' : ''}`}
                            style={{
                              minHeight: '80px',
                              borderRadius: '8px',
                              border: borderStyle,
                              background: bgStyle,
                              padding: '10px',
                              display: 'flex',
                              flexDirection: 'column',
                              justifyContent: 'space-between',
                              cursor: 'pointer',
                              transition: 'all 0.2s ease',
                              boxShadow: isSelected ? '0 0 12px var(--accent-glow)' : 'none'
                            }}
                          >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <span style={{ fontSize: '13px', fontWeight: '700', color: isSelected ? 'white' : 'var(--text-primary)' }}>{dayObj.day}</span>
                              {hasSales && (
                                <span style={{
                                  width: '6px',
                                  height: '6px',
                                  borderRadius: '50%',
                                  background: isTargetMet ? 'var(--success)' : 'var(--danger)'
                                }}></span>
                              )}
                            </div>
                            <div style={{ fontSize: '12px', fontWeight: '700', color: amtColor, textAlign: 'right', marginTop: '12px' }}>
                              {hasSales ? `$${sales.toFixed(2)}` : '—'}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Selected Day Transaction Ledger */}
                  <div className="glass-panel" style={{ padding: '20px', borderRadius: '12px', overflow: 'hidden' }}>
                    <div style={{ borderBottom: '1px solid var(--glass-border)', paddingBottom: '12px', marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                      <h4 style={{ fontSize: '14px', fontWeight: '600', margin: 0 }}>
                        Transactions on {monthNames[calendarMonth]} {activeCalendarDay}, {calendarYear}
                      </h4>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                        <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                          Daily Sales Total: <strong style={{ color: 'var(--accent-primary)', fontSize: '13px' }}>${selectedDayTotalSales.toFixed(2)}</strong>
                        </span>
                        <span style={{
                          fontSize: '11px',
                          padding: '2px 8px',
                          borderRadius: '4px',
                          fontWeight: '700',
                          background: selectedDayTotalSales >= targetSalesPerDay ? 'var(--success-glow)' : 'var(--danger-glow)',
                          color: selectedDayTotalSales >= targetSalesPerDay ? 'var(--success)' : 'var(--danger)',
                          border: `1px solid ${selectedDayTotalSales >= targetSalesPerDay ? 'var(--success)' : 'var(--danger)'}40`
                        }}>
                          {selectedDayTotalSales >= targetSalesPerDay ? 'Target Met' : 'Below Target'}
                        </span>
                      </div>
                    </div>

                    <div className="table-wrapper" style={{ maxHeight: '250px', overflowY: 'auto' }}>
                      <table className="pos-table">
                        <thead>
                          <tr>
                            <th>Bill ID</th>
                            <th>Time</th>
                            <th>Cashier</th>
                            <th>Method</th>
                            <th>Items Purchased</th>
                            <th style={{ textAlign: 'right' }}>Total (USD)</th>
                            <th style={{ textAlign: 'right' }}>Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {selectedDayTransactions.map(txn => (
                            <tr key={txn.id}>
                              <td style={{ fontFamily: 'monospace', fontWeight: 'bold' }}>{txn.id}</td>
                              <td>{new Date(txn.timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</td>
                              <td>{txn.cashier || 'Admin'}</td>
                              <td>{txn.paymentMethod}</td>
                              <td style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                                {txn.items.map(i => `${i.name} (x${i.quantity})`).join(', ')}
                              </td>
                              <td style={{ textAlign: 'right', fontWeight: 'bold', color: 'var(--success)' }}>
                                ${txn.total.toFixed(2)}
                              </td>
                              <td style={{ textAlign: 'right' }}>
                                <button
                                  onClick={() => {
                                    setSelectedTxn(txn);
                                    setIsReceiptOpen(true);
                                  }}
                                  className="btn btn-secondary"
                                  style={{ padding: '4px 10px', fontSize: '11px', borderRadius: '6px' }}
                                >
                                  <Receipt size={12} style={{ marginRight: '4px' }} /> View
                                </button>
                              </td>
                            </tr>
                          ))}
                          {selectedDayTransactions.length === 0 && (
                            <tr>
                              <td colSpan="7" style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>
                                No transactions recorded on this date.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* USERS MANAGEMENT SECTION */}
        {activeSection === 'users' && (
          <div className="workspace-tab-fade">
            <div className="workspace-header">
              <div>
                <h1 className="workspace-title">User Accounts Control</h1>
                <p className="workspace-subtitle">Manage cashier and admin logins for register sessions.</p>
              </div>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button onClick={() => setIsScheduleModalOpen(true)} className="btn btn-secondary flex-btn">
                  <Calendar size={16} /> Job Schedule
                </button>
                <button onClick={handleOpenAddUserModal} className="btn btn-primary flex-btn">
                  <Plus size={16} /> Create User Account
                </button>
              </div>
            </div>

            {/* Search filter row */}
            <div className="filters-search-row glass-panel">
              <div className="search-box-wrapper">
                <Search size={16} />
                <input
                  type="text"
                  placeholder="Search user accounts by name, username..."
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  className="search-input-field"
                />
              </div>
            </div>

            {/* Users Table */}
            <div className="glass-panel table-panel" style={{ marginTop: '20px' }}>
              <div className="table-wrapper">
                <table className="pos-table">
                  <thead>
                    <tr>
                      <th>User ID</th>
                      <th>Full Name</th>
                      <th>Position</th>
                      <th>Tel.</th>
                      <th>Username</th>
                      <th>Account Role</th>
                      <th style={{ textAlign: 'right' }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users
                      .filter(usr =>
                        usr.name.toLowerCase().includes(userSearch.toLowerCase()) ||
                        usr.username.toLowerCase().includes(userSearch.toLowerCase())
                      )
                      .map(usr => {
                        const isSystemAdmin = usr.role === 'admin';
                        return (
                          <tr key={usr.id}>
                            <td style={{ fontWeight: 'bold', color: 'var(--text-muted)' }}>#{usr.id}</td>
                            <td style={{ fontWeight: '600' }}>{usr.name}</td>
                            <td>{usr.position || '—'}</td>
                            <td>{usr.tel || '—'}</td>
                            <td style={{ fontFamily: 'monospace' }}>{usr.username}</td>
                            <td>
                              <span className={isSystemAdmin ? 'badge badge-khqr' : 'badge-card badge'}>
                                {isSystemAdmin ? 'Administrator' : 'Cashier'}
                              </span>
                            </td>
                            <td style={{ textAlign: 'right' }}>
                              <div className="action-buttons-cell" style={{ justifyContent: 'flex-end' }}>
                                <button
                                  onClick={() => handleOpenEditUserModal(usr)}
                                  className="table-icon-btn edit"
                                  title="Edit User"
                                >
                                  <Edit2 size={14} />
                                </button>
                                <button
                                  onClick={() => handleDeleteUser(usr.id)}
                                  className="table-icon-btn delete"
                                  title="Delete User"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    {users.filter(usr =>
                      usr.name.toLowerCase().includes(userSearch.toLowerCase()) ||
                      usr.username.toLowerCase().includes(userSearch.toLowerCase())
                    ).length === 0 && (
                        <tr>
                          <td colSpan="5" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                            No cashier accounts found.
                          </td>
                        </tr>
                      )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* CATEGORIES MANAGEMENT SECTION */}
        {activeSection === 'categories' && (
          <div className="workspace-tab-fade">
            <div className="workspace-header">
              <div>
                <h1 className="workspace-title">Category Management</h1>
                <p className="workspace-subtitle">Manage store product categories, filters, and list tags.</p>
              </div>
              <button onClick={handleOpenAddCategoryModal} className="btn btn-primary flex-btn">
                <Plus size={16} /> Add New Category
              </button>
            </div>

            {/* Search filter row */}
            <div className="filters-search-row glass-panel">
              <div className="search-box-wrapper">
                <Search size={16} />
                <input
                  type="text"
                  placeholder="Search categories..."
                  value={categorySearch}
                  onChange={(e) => setCategorySearch(e.target.value)}
                  className="search-input-field"
                />
              </div>
            </div>

            {/* Categories Table */}
            <div className="glass-panel table-panel" style={{ marginTop: '20px' }}>
              <div className="table-wrapper">
                <table className="pos-table">
                  <thead>
                    <tr>
                      <th>Category ID</th>
                      <th>Category Name</th>
                      <th>Created At</th>
                      <th style={{ textAlign: 'right' }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {categories
                      .filter(cat =>
                        cat.name.toLowerCase().includes(categorySearch.toLowerCase())
                      )
                      .map(cat => (
                        <tr key={cat.id}>
                          <td style={{ fontWeight: 'bold', color: 'var(--text-muted)' }}>#{cat.id}</td>
                          <td style={{ fontWeight: '600' }}>{cat.name}</td>
                          <td>{cat.created_at ? new Date(cat.created_at).toLocaleString() : 'N/A'}</td>
                          <td style={{ textAlign: 'right' }}>
                            <div className="action-buttons-cell" style={{ justifyContent: 'flex-end' }}>
                              <button
                                onClick={() => handleOpenEditCategoryModal(cat)}
                                className="table-icon-btn edit"
                                title="Edit Category"
                              >
                                <Edit2 size={14} />
                              </button>
                              <button
                                onClick={() => handleDeleteCategory(cat.id)}
                                className="table-icon-btn delete"
                                title="Delete Category"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    {categories.filter(cat =>
                      cat.name.toLowerCase().includes(categorySearch.toLowerCase())
                    ).length === 0 && (
                        <tr>
                          <td colSpan="4" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                            No categories found.
                          </td>
                        </tr>
                      )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* User Creator/Editor Form modal */}
      {isUserModalOpen && (
        <div className="admin-modal-overlay">
          <div className="glass-panel admin-crud-modal">
            <div className="panel-header">
              <h3 className="panel-title">
                {editingUser ? 'Edit User Account' : 'Create User Account'}
              </h3>
              <button onClick={handleCloseUserModal} className="close-modal-btn"><X size={16} /></button>
            </div>

            <form onSubmit={handleSubmitUser} className="product-form" style={{ marginTop: '16px' }}>
              <div className="form-group">
                <label className="form-label">Full Name</label>
                <input
                  type="text"
                  name="name"
                  value={userFormState.name}
                  onChange={handleUserInputChange}
                  placeholder="e.g. Sombo Sophal"
                  className="form-input"
                  required
                />
              </div>

              <div className="form-row-grid">
                <div className="form-group">
                  <label className="form-label">Username</label>
                  <input
                    type="text"
                    name="username"
                    value={userFormState.username}
                    onChange={handleUserInputChange}
                    placeholder="e.g. sophal99"
                    className="form-input"
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Account Role</label>
                  <select
                    name="role"
                    value={userFormState.role}
                    onChange={handleUserInputChange}
                    className="form-select"
                    required
                  >
                    <option value="cashier">Cashier</option>
                    <option value="admin">Administrator</option>
                  </select>
                </div>
              </div>

              <div className="form-row-grid">
                <div className="form-group">
                  <label className="form-label">Position</label>
                  <input
                    type="text"
                    name="position"
                    value={userFormState.position}
                    onChange={handleUserInputChange}
                    placeholder="e.g. Acting Manager"
                    className="form-input"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Tel. / Phone</label>
                  <input
                    type="text"
                    name="tel"
                    value={userFormState.tel}
                    onChange={handleUserInputChange}
                    placeholder="e.g. 0889298383"
                    className="form-input"
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">
                  {editingUser ? 'Password (Leave blank to keep current)' : 'Password'}
                </label>
                <input
                  type="password"
                  name="password"
                  value={userFormState.password}
                  onChange={handleUserInputChange}
                  placeholder={editingUser ? '••••••••' : 'Enter login password'}
                  className="form-input"
                  required={!editingUser}
                  minLength="6"
                />
              </div>

              <div className="form-actions" style={{ marginTop: '20px' }}>
                <button
                  type="button"
                  onClick={handleCloseUserModal}
                  className="btn btn-secondary"
                  style={{ flex: 1 }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{ flex: 2 }}
                >
                  {editingUser ? 'Save Changes' : 'Create User'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Category Creator/Editor Form modal */}
      {isCategoryModalOpen && (
        <div className="admin-modal-overlay">
          <div className="glass-panel admin-crud-modal" style={{ maxWidth: '380px', width: '100%' }}>
            <div className="panel-header">
              <h3 className="panel-title">
                {editingCategory ? 'Edit Category' : 'Create Category'}
              </h3>
              <button onClick={handleCloseCategoryModal} className="close-modal-btn"><X size={16} /></button>
            </div>

            <form onSubmit={handleSubmitCategory} className="product-form" style={{ marginTop: '16px' }}>
              <div className="form-group">
                <label className="form-label">Category Name</label>
                <input
                  type="text"
                  name="name"
                  value={categoryFormState.name}
                  onChange={handleCategoryInputChange}
                  placeholder="e.g. Snacks"
                  className="form-input"
                  required
                />
              </div>

              <div className="form-actions" style={{ marginTop: '20px' }}>
                <button
                  type="button"
                  onClick={handleCloseCategoryModal}
                  className="btn btn-secondary"
                  style={{ flex: 1 }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{ flex: 2 }}
                >
                  {editingCategory ? 'Save Changes' : 'Create Category'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Product Creator/Editor Form modal */}
      {isModalOpen && (
        <div className="admin-modal-overlay">
          <div className="glass-panel admin-crud-modal">
            <div className="panel-header">
              <h3 className="panel-title">
                {editingProduct ? 'Edit Inventory Item' : 'Add New Inventory Item'}
              </h3>
              <button onClick={handleCloseModal} className="close-modal-btn"><X size={16} /></button>
            </div>

            <form onSubmit={handleSubmitProduct} className="product-form" style={{ marginTop: '16px' }}>
              <div className="form-group">
                <label className="form-label">Product Name</label>
                <input
                  type="text"
                  name="name"
                  value={formState.name}
                  onChange={handleInputChange}
                  placeholder="e.g. Specialty Espresso"
                  className="form-input"
                  required
                />
              </div>

              <div className="form-row-grid">
                <div className="form-group">
                  <label className="form-label">SKU Code</label>
                  <input
                    type="text"
                    name="sku"
                    value={formState.sku}
                    onChange={handleInputChange}
                    placeholder="e.g. CF-ESP-01"
                    className="form-input"
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Category</label>
                  <select
                    name="category"
                    value={formState.category}
                    onChange={handleInputChange}
                    className="form-select"
                    required
                  >
                    <option value="">Select Category</option>
                    {categories.map(cat => (
                      <option key={cat.id} value={cat.name}>{cat.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="form-row-grid">
                <div className="form-group">
                  <label className="form-label">Price (USD)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    name="price"
                    value={formState.price}
                    onChange={handleInputChange}
                    placeholder="3.50"
                    className="form-input"
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Stock Count</label>
                  <input
                    type="number"
                    min="0"
                    name="stock"
                    value={formState.stock}
                    onChange={handleInputChange}
                    placeholder="100"
                    className="form-input"
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Description (Optional)</label>
                <textarea
                  name="description"
                  value={formState.description}
                  onChange={handleInputChange}
                  placeholder="Add product details..."
                  className="form-textarea"
                  rows="3"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Product Image (Optional)</label>
                <div className="image-upload-wrapper">
                  {formState.image ? (
                    <div className="image-preview-container" style={{ display: 'flex', alignItems: 'center', gap: '16px', background: 'rgba(255,255,255,0.02)', padding: '12px', borderRadius: '8px', border: '1px dashed var(--glass-border)' }}>
                      <img src={formState.image} alt="Preview" className="image-preview-box" style={{ width: '80px', height: '80px', borderRadius: '8px', objectFit: 'cover', border: '1px solid var(--glass-border)' }} />
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <span style={{ fontSize: '11px', color: 'var(--success)', fontWeight: '600' }}>✓ Image Loaded Successfully</span>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button
                            type="button"
                            onClick={() => document.getElementById('product-image-file').click()}
                            className="btn btn-secondary"
                            style={{ padding: '4px 8px', fontSize: '11px', borderRadius: '4px', cursor: 'pointer' }}
                          >
                            Change Image
                          </button>
                          <button
                            type="button"
                            onClick={handleRemoveImage}
                            className="btn btn-danger remove-image-btn"
                            style={{ padding: '4px 8px', fontSize: '11px', background: 'rgba(239, 68, 68, 0.2)', border: '1px solid var(--danger)', color: '#ff8888', borderRadius: '4px', cursor: 'pointer' }}
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                      <input
                        id="product-image-file"
                        type="file"
                        accept="image/*"
                        onChange={handleImageChange}
                        style={{ display: 'none' }}
                      />
                    </div>
                  ) : (
                    <div className="file-input-container" style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <div
                        style={{
                          border: '1px dashed var(--glass-border)',
                          borderRadius: '8px',
                          padding: '20px 16px',
                          textAlign: 'center',
                          background: 'rgba(255, 255, 255, 0.01)',
                          cursor: 'pointer',
                          transition: 'background 0.2s ease',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          gap: '8px'
                        }}
                        onClick={() => document.getElementById('product-image-file').click()}
                        onMouseOver={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)'}
                        onMouseOut={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.01)'}
                      >
                        <Box size={20} style={{ color: 'var(--text-muted)', strokeWidth: 1.5 }} />
                        <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                          Click to browse from storage or <strong>Ctrl+V</strong> to paste image
                        </span>
                        <input
                          id="product-image-file"
                          type="file"
                          accept="image/*"
                          onChange={handleImageChange}
                          style={{ display: 'none' }}
                        />
                      </div>
                      <span className="file-input-help" style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Max size 1.5MB. PNG/JPG/WEBP supported.</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="form-actions" style={{ marginTop: '20px' }}>
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="btn btn-secondary"
                  style={{ flex: 1 }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{ flex: 2 }}
                >
                  {editingProduct ? 'Save Changes' : 'Create Item'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isReceiptOpen && (
        <ReceiptModal
          isOpen={isReceiptOpen}
          onClose={() => {
            setIsReceiptOpen(false);
            setSelectedTxn(null);
          }}
          transaction={selectedTxn}
          closeLabel="Close"
          isPast={true}
        />
      )}

      <ErrorBoundary>
        <JobScheduleModal
          isOpen={isScheduleModalOpen}
          onClose={() => setIsScheduleModalOpen(false)}
          users={users}
        />
      </ErrorBoundary>
    </div>
  );
}

// Simple icon X for modal
function X({ size }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18"></line>
      <line x1="6" y1="6" x2="18" y2="18"></line>
    </svg>
  );
}

const styles = {
  donutLayout: {
    display: 'flex',
    alignItems: 'center',
    gap: '24px',
    padding: '12px 0',
  },
  donutSvgWrapper: {
    position: 'relative',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
  },
  donutLegend: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    flex: 1,
  },
  legendRow: {
    display: 'flex',
    alignItems: 'center',
    fontSize: '12px',
    color: 'var(--text-secondary)',
  },
  legendColor: {
    width: '10px',
    height: '10px',
    borderRadius: '3px',
    marginRight: '8px',
    display: 'inline-block',
  },
  legendLabel: {
    fontWeight: '500',
    marginRight: '4px',
  },
  legendVal: {
    fontWeight: 'bold',
    color: 'var(--text-primary)',
    marginLeft: 'auto',
  }
};
