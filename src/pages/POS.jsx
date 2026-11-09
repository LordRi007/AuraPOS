import { useState, useEffect } from 'react';
import { Search, ShoppingCart, Trash2, Plus, Minus, CreditCard, Banknote, QrCode, Pause, Clock, RotateCcw, Box, Target, X } from 'lucide-react';
import { api } from '../services/api';
import KHQRModal from '../components/KHQRModal';
import ReceiptModal from '../components/ReceiptModal';
import CashCalculatorModal from '../components/CashCalculatorModal';
import SuspendBillModal from '../components/SuspendBillModal';
import RecallBillsModal from '../components/RecallBillsModal';
import RefundModal from '../components/RefundModal';
import '../styles/POS.css';

export default function POS() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // Target Sales Planning POS state
  const [isTargetModalOpen, setIsTargetModalOpen] = useState(false);
  const [todaySales, setTodaySales] = useState(0);
  const [targetSales, setTargetSales] = useState(200);
  const [activeMobileTab, setActiveMobileTab] = useState('catalog'); // 'catalog' or 'cart'

  const loadTodaySales = async () => {
    try {
      const savedTarget = localStorage.getItem('pos_target_sales_per_day');
      setTargetSales(savedTarget ? parseFloat(savedTarget) : 200);

      const txns = await api.getTransactions();
      const todayStr = new Date().toDateString();
      const sales = txns
        .filter(t => t.status !== 'refunded' && new Date(t.timestamp).toDateString() === todayStr)
        .reduce((sum, t) => sum + t.total, 0);
      setTodaySales(sales);
    } catch (err) {
      console.error('Failed to load today sales target:', err);
    }
  };

  const handleOpenTargetModal = () => {
    loadTodaySales();
    setIsTargetModalOpen(true);
  };
  const [selectedCategory, setSelectedCategory] = useState('All');
  
  // Cart state persisted to LocalStorage to prevent clearing when navigating away
  const [cart, setCart] = useState(() => {
    try {
      const saved = localStorage.getItem('pos_cart');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });
  
  const [discountPercent, setDiscountPercent] = useState(() => {
    try {
      const saved = localStorage.getItem('pos_discount_percent');
      return saved ? parseInt(saved) || 0 : 0;
    } catch (e) {
      return 0;
    }
  });

  // Suspended Bills state persisted to LocalStorage
  const [suspendedBills, setSuspendedBills] = useState(() => {
    try {
      const saved = localStorage.getItem('pos_suspended_bills');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });
  
  // Checkout Modals State
  const [isKHQRModalOpen, setIsKHQRModalOpen] = useState(false);
  const [isCashModalOpen, setIsCashModalOpen] = useState(false);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);
  
  // Suspend/Recall Modals State
  const [isSuspendModalOpen, setIsSuspendModalOpen] = useState(false);
  const [isRecallModalOpen, setIsRecallModalOpen] = useState(false);
  const [isRefundModalOpen, setIsRefundModalOpen] = useState(false);
  
  const [completedTransaction, setCompletedTransaction] = useState(null);

  // Sync Cart to LocalStorage
  useEffect(() => {
    localStorage.setItem('pos_cart', JSON.stringify(cart));
  }, [cart]);

  // Sync Discount to LocalStorage
  useEffect(() => {
    localStorage.setItem('pos_discount_percent', discountPercent.toString());
  }, [discountPercent]);

  // Sync Suspended Bills to LocalStorage
  useEffect(() => {
    localStorage.setItem('pos_suspended_bills', JSON.stringify(suspendedBills));
  }, [suspendedBills]);

  // Load products from service
  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    try {
      setLoading(true);
      const data = await api.getProducts();
      setProducts(data);
    } catch (err) {
      console.error('Failed to load products:', err);
    } finally {
      setLoading(false);
    }
  };

  // Category list extraction
  const categories = ['All', ...new Set(products.map(p => p.category))];

  // Filtering products
  const filteredProducts = products.filter(product => {
    const matchesCategory = selectedCategory === 'All' || product.category === selectedCategory;
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          product.sku.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  // Cart Management
  const addToCart = (product) => {
    if (product.stock <= 0) return;

    setCart(prevCart => {
      const existingItem = prevCart.find(item => item.id === product.id);
      if (existingItem) {
        if (existingItem.quantity >= product.stock) return prevCart; // limit to stock
        return prevCart.map(item => 
          item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      } else {
        return [...prevCart, { ...product, quantity: 1 }];
      }
    });
  };

  const updateQuantity = (id, change) => {
    setCart(prevCart => {
      return prevCart.map(item => {
        if (item.id === id) {
          const newQty = item.quantity + change;
          // check stock limit
          if (newQty > item.stock) return item;
          return newQty > 0 ? { ...item, quantity: newQty } : null;
        }
        return item;
      }).filter(Boolean);
    });
  };

  const removeFromCart = (id) => {
    setCart(prevCart => prevCart.filter(item => item.id !== id));
  };

  const clearCart = () => {
    setCart([]);
    setDiscountPercent(0);
  };

  // Suspend/Recall Bill Logic
  const handleSuspendBill = (referenceName) => {
    if (cart.length === 0) return;
    
    const newBill = {
      id: 'SUSP-' + Date.now(),
      reference: referenceName,
      items: [...cart],
      discountPercent,
      subtotal,
      tax: taxAmount,
      total: grandTotal,
      timestamp: new Date().toISOString(),
    };

    setSuspendedBills(prev => [newBill, ...prev]);
    clearCart();
    setIsSuspendModalOpen(false);
  };

  const handleRecallBill = (index) => {
    const billToRecall = suspendedBills[index];
    if (!billToRecall) return;

    // Load into cart and discount
    setCart(billToRecall.items);
    setDiscountPercent(billToRecall.discountPercent);

    // Remove from suspended bills list
    setSuspendedBills(prev => prev.filter((_, idx) => idx !== index));
    setIsRecallModalOpen(false);
  };

  const handleDeleteSuspendedBill = (index) => {
    setSuspendedBills(prev => prev.filter((_, idx) => idx !== index));
  };

  // Calculations
  const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const discountAmount = subtotal * (discountPercent / 100);
  const taxAmount = (subtotal - discountAmount) * 0.10; // 10% VAT
  const grandTotal = subtotal - discountAmount + taxAmount;
  
  const exchangeRate = 4100;
  const grandTotalRiel = Math.round(grandTotal * exchangeRate);

  // Complete checkout process
  const processCheckout = async (paymentMethod, cashDetails = null) => {
    if (cart.length === 0) return;

    const transactionData = {
      items: cart.map(item => ({
        id: item.id,
        name: item.name,
        price: item.price,
        quantity: item.quantity,
      })),
      subtotal: parseFloat(subtotal.toFixed(2)),
      discount: parseFloat(discountAmount.toFixed(2)),
      tax: parseFloat(taxAmount.toFixed(2)),
      total: parseFloat(grandTotal.toFixed(2)),
      paymentMethod,
      cashier: 'Admin',
    };

    try {
      const result = await api.submitTransaction(transactionData);
      
      // Merge cash details into completed transaction for receipt display
      const completedTxn = {
        ...result,
        cashDetails
      };
      
      setCompletedTransaction(completedTxn);
      setIsKHQRModalOpen(false);
      setIsCashModalOpen(false);
      setIsReceiptModalOpen(true);
      // reload products to update stocks
      loadProducts();
      clearCart();
    } catch (err) {
      console.error('Checkout failed:', err);
    }
  };

  return (
    <div className={`pos-container active-mobile-tab-${activeMobileTab}`}>
      {/* Products Left Panel */}
      <div className="products-panel">
        <div className="search-filter-row">
          <div className="search-input-wrapper">
            <Search size={18} />
            <input 
              type="text" 
              placeholder="Search by product name or scan SKU..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-bar"
            />
          </div>
        </div>

        {/* Categories Carousel */}
        <div className="categories-container">
          {categories.map(category => (
            <button
              key={category}
              onClick={() => setSelectedCategory(category)}
              className={`category-pill ${selectedCategory === category ? 'active' : ''}`}
            >
              {category}
            </button>
          ))}
        </div>

        {/* Product Cards Grid */}
        {loading ? (
          <div style={{display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-secondary)'}}>
            Loading catalog...
          </div>
        ) : (
          <div className="products-grid">
            {filteredProducts.map(product => {
              const isLowStock = product.stock <= 10;
              const isOutOfStock = product.stock === 0;

              return (
                <div 
                  key={product.id} 
                  onClick={() => !isOutOfStock && addToCart(product)}
                  className="glass-panel product-card"
                  style={{ opacity: isOutOfStock ? 0.5 : 1 }}
                >
                  <div className="product-card-image-wrapper">
                    {product.image ? (
                      <img src={product.image} alt={product.name} className="product-card-image" />
                    ) : (
                      <div className="product-card-image-placeholder">
                        <Box size={24} style={{ strokeWidth: 1.5 }} />
                      </div>
                    )}
                  </div>
                  <div className="product-card-top" style={{ flex: 1 }}>
                    <span className="product-sku">{product.sku}</span>
                    <h3 className="product-name" style={{ minHeight: '38px', margin: '4px 0', fontSize: '14px' }}>{product.name}</h3>
                    <span className={`product-stock ${isLowStock ? 'low-stock' : ''}`}>
                      {isOutOfStock ? 'Out of Stock' : `Stock: ${product.stock} items`}
                    </span>
                  </div>
                  <div className="product-card-bottom" style={{ marginTop: '12px' }}>
                    <span className="product-price">${product.price.toFixed(2)}</span>
                    <button className="add-btn" disabled={isOutOfStock}>
                      <Plus size={16} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Cart Right Panel */}
      <div className="glass-panel cart-panel">
        <div className="cart-header">
          <h2 className="cart-title">
            <ShoppingCart size={18} color="var(--accent-primary)" />
            <span>Active Cart</span>
            <span className="cart-count">{cart.reduce((sum, item) => sum + item.quantity, 0)} items</span>
          </h2>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <button 
              onClick={handleOpenTargetModal} 
              className="target-trigger-btn"
              title="View Today's Sales Target"
            >
              <Target size={14} />
              <span>Target</span>
            </button>
            <button 
              onClick={() => setIsRefundModalOpen(true)} 
              className="refund-trigger-btn"
              title="Search & Process Refund"
            >
              <RotateCcw size={14} />
              <span>Refund</span>
            </button>
            <button 
              onClick={() => setIsRecallModalOpen(true)} 
              className="recall-bills-btn"
              title="Recall Suspended Bills"
            >
              <Clock size={14} />
              <span>Recall ({suspendedBills.length})</span>
            </button>
            {cart.length > 0 && (
              <>
                <button 
                  onClick={() => setIsSuspendModalOpen(true)} 
                  className="suspend-bill-btn"
                  title="Suspend Current Bill"
                >
                  <Pause size={14} />
                  <span>Suspend</span>
                </button>
                <button 
                  onClick={clearCart} 
                  className="clear-cart-btn"
                  title="Clear Cart"
                >
                  <Trash2 size={14} />
                  <span>Clear</span>
                </button>
              </>
            )}
          </div>
        </div>

        {/* Cart Item Rows */}
        <div className="cart-items-list">
          {cart.length === 0 ? (
            <div className="cart-empty-state">
              <ShoppingCart size={42} style={{opacity: 0.3}} />
              <span>Cart is empty. Select products on the left.</span>
            </div>
          ) : (
            cart.map(item => (
              <div key={item.id} className="cart-item">
                <div className="cart-item-details">
                  <span className="cart-item-name">{item.name}</span>
                  <span className="cart-item-price">${(item.price * item.quantity).toFixed(2)}</span>
                </div>
                <div className="cart-item-controls">
                  <button 
                    onClick={() => updateQuantity(item.id, -1)} 
                    className="qty-btn"
                  >
                    <Minus size={12} />
                  </button>
                  <span className="cart-item-qty">{item.quantity}</span>
                  <button 
                    onClick={() => updateQuantity(item.id, 1)} 
                    className="qty-btn"
                  >
                    <Plus size={12} />
                  </button>
                  <button 
                    onClick={() => removeFromCart(item.id)} 
                    className="remove-item-btn"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Checkout Calculations & Pay Grid */}
        {cart.length > 0 && (
          <div className="cart-footer">
            {/* Discount Section */}
            <div className="discount-tax-row">
              <div className="discount-controls">
                <span className="discount-label">Discount:</span>
                <div className="discount-input-wrapper">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={discountPercent || ''}
                    onChange={(e) => setDiscountPercent(Math.min(100, Math.max(0, parseInt(e.target.value) || 0)))}
                    className="discount-input"
                  />
                  <span className="discount-percent">%</span>
                </div>
                <div className="quick-discounts">
                  {[0, 5, 10, 15].map(pct => (
                    <button
                      key={pct}
                      onClick={() => setDiscountPercent(pct)}
                      className={`quick-discount-btn ${discountPercent === pct ? 'active' : ''}`}
                    >
                      {pct}%
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Calculations summary */}
            <div className="summary-math">
              <div className="math-row">
                <span>Subtotal:</span>
                <span>${subtotal.toFixed(2)}</span>
              </div>
              {discountAmount > 0 && (
                <div className="math-row">
                  <span>Discount:</span>
                  <span style={{color: 'var(--danger)'}}>-${discountAmount.toFixed(2)}</span>
                </div>
              )}
              <div className="math-row">
                <span>VAT Tax (10%):</span>
                <span>${taxAmount.toFixed(2)}</span>
              </div>
              <div className="math-row grand-total">
                <span>Total Due:</span>
                <span className="total-amt">${grandTotal.toFixed(2)}</span>
              </div>
              <div className="khr-conversion">
                ≈ ៛{grandTotalRiel.toLocaleString()}
              </div>
            </div>

            {/* Payment Terminals */}
            <div className="payment-methods-grid">
              <button 
                onClick={() => setIsCashModalOpen(true)} 
                className="payment-btn"
              >
                <Banknote size={20} color="var(--success)" />
                <span>Cash Pay</span>
              </button>
              <button 
                onClick={() => setIsKHQRModalOpen(true)} 
                className="payment-btn khqr-btn"
              >
                <QrCode size={20} color="#e53935" />
                <span>KHQR Pay</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Checkout Modals */}
      <KHQRModal 
        isOpen={isKHQRModalOpen} 
        onClose={() => setIsKHQRModalOpen(false)} 
        total={grandTotal}
        onPaymentSuccess={() => processCheckout('KHQR')}
      />

      <CashCalculatorModal
        isOpen={isCashModalOpen}
        onClose={() => setIsCashModalOpen(false)}
        total={grandTotal}
        onConfirm={(cashDetails) => processCheckout('Cash', cashDetails)}
      />

      <ReceiptModal 
        isOpen={isReceiptModalOpen}
        onClose={() => setIsReceiptModalOpen(false)}
        transaction={completedTransaction}
      />

      {/* Suspend & Recall Modals */}
      <SuspendBillModal
        isOpen={isSuspendModalOpen}
        onClose={() => setIsSuspendModalOpen(false)}
        onSuspend={handleSuspendBill}
        defaultReference={`Bill #${suspendedBills.length + 1}`}
      />

      <RecallBillsModal
        isOpen={isRecallModalOpen}
        onClose={() => setIsRecallModalOpen(false)}
        suspendedBills={suspendedBills}
        onRecall={handleRecallBill}
        onDelete={handleDeleteSuspendedBill}
      />

      <RefundModal
        isOpen={isRefundModalOpen}
        onClose={() => setIsRefundModalOpen(false)}
        onRefundSuccess={loadProducts}
      />

      {/* Target Modal */}
      {isTargetModalOpen && (
        <div style={{
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
          zIndex: 999
        }}>
          <div className="glass-panel" style={{ width: '380px', padding: '24px', position: 'relative' }}>
            <div className="panel-header" style={{ borderBottom: '1px solid var(--glass-border)', paddingBottom: '12px', marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 className="panel-title" style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: 0, fontSize: '15px', fontWeight: 'bold' }}>
                <Target size={18} color="var(--accent-primary)" />
                <span>Today's Sales Target</span>
              </h3>
              <button 
                onClick={() => setIsTargetModalOpen(false)} 
                className="close-modal-btn" 
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px', display: 'flex', alignItems: 'center' }}
              >
                <X size={16} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div style={{ background: 'var(--glass-bg)', padding: '12px', borderRadius: '8px', border: '1px solid var(--glass-border)' }}>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Daily Target Goal</span>
                  <div style={{ fontSize: '18px', fontWeight: 'bold', marginTop: '4px', color: 'var(--text-primary)' }}>${targetSales.toFixed(2)}</div>
                </div>
                <div style={{ background: 'var(--glass-bg)', padding: '12px', borderRadius: '8px', border: '1px solid var(--glass-border)' }}>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Actual Today</span>
                  <div style={{ fontSize: '18px', fontWeight: 'bold', marginTop: '4px', color: 'var(--accent-primary)' }}>${todaySales.toFixed(2)}</div>
                </div>
              </div>

              {/* Progress bar */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                  <span>Achievement Progress</span>
                  <span style={{ fontWeight: 'bold' }}>{targetSales > 0 ? ((todaySales / targetSales) * 100).toFixed(1) : '100.0'}%</span>
                </div>
                <div style={{ width: '100%', height: '8px', background: 'var(--border-color)', borderRadius: '4px', overflow: 'hidden' }}>
                  <div style={{
                    width: `${Math.min(100, targetSales > 0 ? (todaySales / targetSales) * 100 : 100)}%`,
                    height: '100%',
                    background: (todaySales / targetSales) >= 1 ? 'var(--success)' : (todaySales / targetSales) >= 0.75 ? 'var(--warning)' : 'var(--danger)',
                    borderRadius: '4px'
                  }}></div>
                </div>
              </div>

              {/* Message */}
              <div style={{
                padding: '12px',
                borderRadius: '8px',
                background: (todaySales / targetSales) >= 1 ? 'var(--success-glow)' : 'var(--glass-bg)',
                border: `1px solid ${(todaySales / targetSales) >= 1 ? 'var(--success)' : 'var(--glass-border)'}`,
                fontSize: '12px',
                color: (todaySales / targetSales) >= 1 ? 'var(--success)' : 'var(--text-secondary)',
                textAlign: 'center',
                lineHeight: '1.4'
              }}>
                {(todaySales / targetSales) >= 1 ? (
                  <span>🎉 Target met! Today's sales exceed target by <strong>${(todaySales - targetSales).toFixed(2)}</strong>. Great job!</span>
                ) : (
                  <span>You are <strong>${(targetSales - todaySales).toFixed(2)}</strong> away from meeting today's target sales. Keep it up!</span>
                )}
              </div>
            </div>
            
            <button 
              onClick={() => setIsTargetModalOpen(false)}
              className="btn btn-primary"
              style={{ width: '100%', marginTop: '20px' }}
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Mobile Toggle Footer */}
      <div className="pos-mobile-toggle-footer">
        <button 
          onClick={() => setActiveMobileTab('catalog')} 
          className={`toggle-tab-btn ${activeMobileTab === 'catalog' ? 'active' : ''}`}
        >
          <Box size={18} />
          <span>Catalog</span>
        </button>
        <button 
          onClick={() => setActiveMobileTab('cart')} 
          className={`toggle-tab-btn ${activeMobileTab === 'cart' ? 'active' : ''}`}
          style={{ position: 'relative' }}
        >
          <ShoppingCart size={18} />
          <span>Cart</span>
          {cart.length > 0 && (
            <span className="cart-badge-dot">
              {cart.reduce((sum, item) => sum + item.quantity, 0)}
            </span>
          )}
        </button>
      </div>
    </div>
  );
}
