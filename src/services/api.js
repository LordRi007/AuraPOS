// API Client for connecting to Laravel backend
// Toggle this to true to connect to your Laravel backend APIs
const USE_REAL_BACKEND = true; 
const API_BASE_URL = 'http://127.0.0.1:8000/api';

// --- Local Storage Mock Database ---
const DEFAULT_PRODUCTS = [
  { id: 1, name: 'Specialty Espresso', category: 'Coffee', price: 3.50, stock: 120, sku: 'CF-ESP-01', description: 'Double shot rich espresso brewed from premium Arabica beans.' },
  { id: 2, name: 'Matcha Latte', category: 'Drinks', price: 4.25, stock: 85, sku: 'DR-MAT-02', description: 'Ceremonial grade Japanese matcha with steamed oat milk.' },
  { id: 3, name: 'Caramel Macchiato', category: 'Coffee', price: 4.75, stock: 90, sku: 'CF-MAC-03', description: 'Freshly steamed milk with vanilla-flavored syrup, espresso, and caramel drizzle.' },
  { id: 4, name: 'Chocolate Fudge Cake', category: 'Desserts', price: 5.50, stock: 25, sku: 'DS-CHOC-04', description: 'Decadent multi-layered chocolate fudge cake.' },
  { id: 5, name: 'Avocado Toast', category: 'Food', price: 7.95, stock: 40, sku: 'FD-AVO-05', description: 'Sourdough toast topped with mashed avocado, cherry tomatoes, and feta.' },
  { id: 6, name: 'Strawberry Waffle', category: 'Desserts', price: 6.75, stock: 30, sku: 'DS-WAF-06', description: 'Crisp waffle served with fresh strawberries, cream, and maple syrup.' },
  { id: 7, name: 'Classic Club Sandwich', category: 'Food', price: 8.50, stock: 15, sku: 'FD-CLUB-07', description: 'Triple-decker sandwich with turkey bacon, chicken breast, lettuce, and tomato.' },
  { id: 8, name: 'Cold Brew Tonic', category: 'Drinks', price: 4.50, stock: 60, sku: 'DR-COLD-08', description: 'Cold brew coffee poured over premium tonic water and ice.' },
  { id: 9, name: 'Iced Cafe Latte', category: 'Coffee', price: 3.80, stock: 150, sku: 'CF-LAT-09', description: 'Creamy rich espresso served over ice with fresh whole milk.' },
  { id: 10, name: 'Green Tea Frappe', category: 'Drinks', price: 4.50, stock: 95, sku: 'DR-GRN-10', description: 'Iced blended sweet ceremonial grade matcha topped with whipped cream.' },
  { id: 11, name: 'Red Velvet Slice', category: 'Desserts', price: 5.00, stock: 20, sku: 'DS-RED-11', description: 'A slice of moist red velvet cake layered with cream cheese frosting.' },
];

const DEFAULT_TRANSACTIONS = [
  {
    id: 'TXN-1001',
    items: [
      { id: 1, name: 'Specialty Espresso', price: 3.50, quantity: 2 },
      { id: 4, name: 'Chocolate Fudge Cake', price: 5.50, quantity: 1 }
    ],
    subtotal: 12.50,
    discount: 1.25, // 10%
    tax: 1.13, // 10% on discounted
    total: 12.38,
    paymentMethod: 'KHQR',
    cashier: 'Admin',
    timestamp: new Date(Date.now() - 3600000 * 4).toISOString(), // 4 hours ago
  },
  {
    id: 'TXN-1002',
    items: [
      { id: 5, name: 'Avocado Toast', price: 7.95, quantity: 1 },
      { id: 2, name: 'Matcha Latte', price: 4.25, quantity: 1 }
    ],
    subtotal: 12.20,
    discount: 0,
    tax: 1.22,
    total: 13.42,
    paymentMethod: 'Cash',
    cashier: 'Cashier A',
    timestamp: new Date(Date.now() - 3600000 * 2).toISOString(), // 2 hours ago
  },
  {
    id: 'TXN-1003',
    items: [
      { id: 3, name: 'Caramel Macchiato', price: 4.75, quantity: 3 }
    ],
    subtotal: 14.25,
    discount: 2.00,
    tax: 1.23,
    total: 13.48,
    paymentMethod: 'Card',
    cashier: 'Admin',
    timestamp: new Date(Date.now() - 600000).toISOString(), // 10 mins ago
  }
];

// Initialize local DB if empty
if (!localStorage.getItem('pos_products')) {
  localStorage.setItem('pos_products', JSON.stringify(DEFAULT_PRODUCTS));
} else {
  // Ensure the 3 new test products are in the local storage list if it already exists
  try {
    const currentList = JSON.parse(localStorage.getItem('pos_products')) || [];
    const newProducts = [
      { id: 9, name: 'Iced Cafe Latte', category: 'Coffee', price: 3.80, stock: 150, sku: 'CF-LAT-09', description: 'Creamy rich espresso served over ice with fresh whole milk.' },
      { id: 10, name: 'Green Tea Frappe', category: 'Drinks', price: 4.50, stock: 95, sku: 'DR-GRN-10', description: 'Iced blended sweet ceremonial grade matcha topped with whipped cream.' },
      { id: 11, name: 'Red Velvet Slice', category: 'Desserts', price: 5.00, stock: 20, sku: 'DS-RED-11', description: 'A slice of moist red velvet cake layered with cream cheese frosting.' }
    ];
    let updated = false;
    newProducts.forEach(np => {
      if (!currentList.some(p => p.sku === np.sku)) {
        currentList.push(np);
        updated = true;
      }
    });
    if (updated) {
      localStorage.setItem('pos_products', JSON.stringify(currentList));
    }
  } catch (e) {
    console.error('Error migrating local storage products', e);
  }
}
const DEFAULT_USERS = [
  { id: 1, name: 'Administrator', username: 'admin', role: 'admin', position: 'Acting Manager', tel: '0889298383' },
  { id: 2, name: 'Cashier A', username: 'cashier', role: 'cashier', position: 'Employee', tel: '010883860' },
];

const DEFAULT_CATEGORIES = [
  { id: 1, name: 'Coffee' },
  { id: 2, name: 'Drinks' },
  { id: 3, name: 'Food' },
  { id: 4, name: 'Desserts' },
];

if (!localStorage.getItem('pos_users')) {
  localStorage.setItem('pos_users', JSON.stringify(DEFAULT_USERS));
}
if (!localStorage.getItem('pos_categories')) {
  localStorage.setItem('pos_categories', JSON.stringify(DEFAULT_CATEGORIES));
}
if (!localStorage.getItem('pos_transactions')) {
  localStorage.setItem('pos_transactions', JSON.stringify(DEFAULT_TRANSACTIONS));
}

// Helper fetch client for real Laravel endpoint
const request = async (endpoint, options = {}) => {
  const url = `${API_BASE_URL}${endpoint}`;
  const auth = localStorage.getItem('pos_auth');
  const token = auth ? JSON.parse(auth).token : null;

  const headers = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    ...options.headers,
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  try {
    const response = await fetch(url, { ...options, headers });
    if (!response.ok) {
      let message = `API Error: ${response.status} ${response.statusText}`;
      try {
        const errJson = await response.json();
        if (errJson && errJson.message) {
          message = errJson.message;
        } else if (errJson && errJson.error) {
          message = errJson.error;
        }
      } catch (_) {
        // ignore parse error if not JSON
      }
      throw new Error(message);
    }
    return await response.json();
  } catch (error) {
    if (error.name === 'TypeError' && (error.message.includes('fetch') || error.message.includes('NetworkError'))) {
      throw new Error('Cannot connect to backend server. Please make sure the Laravel backend is running on http://127.0.0.1:8000 (php artisan serve).');
    }
    console.error(`Request to ${url} failed:`, error);
    throw error;
  }
};

// Map backend snake_case transaction object to frontend format
const mapTransaction = (t) => {
  if (!t) return null;
  return {
    id: t.txn_code || `TXN-${t.id}`,
    timestamp: t.created_at || t.timestamp,
    paymentMethod: t.payment_method || t.paymentMethod,
    subtotal: parseFloat(t.subtotal || 0),
    discount: parseFloat(t.discount || 0),
    tax: parseFloat(t.tax || 0),
    total: parseFloat(t.total || 0),
    cashier: t.cashier,
    status: t.status || 'completed',
    items: (t.items || []).map(item => ({
      id: item.product_id || item.id,
      name: item.name,
      price: parseFloat(item.price || 0),
      quantity: parseInt(item.quantity || 1)
    }))
  };
};

export const api = {
  // --- Auth ---
  async login(username, password) {
    if (USE_REAL_BACKEND) {
      const authData = await request('/login', {
        method: 'POST',
        body: JSON.stringify({ username, password }),
      });
      if (authData && authData.token) {
        localStorage.setItem('pos_auth', JSON.stringify(authData));
      }
      return authData;
    }
    
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 800));

    if (username === 'admin' && password === 'admin123') {
      const authData = {
        token: 'mock-token-admin',
        user: { id: 1, name: 'Administrator', role: 'admin' }
      };
      localStorage.setItem('pos_auth', JSON.stringify(authData));
      return authData;
    } else if (username === 'cashier' && password === 'cashier123') {
      const authData = {
        token: 'mock-token-cashier',
        user: { id: 2, name: 'Cashier A', role: 'cashier' }
      };
      localStorage.setItem('pos_auth', JSON.stringify(authData));
      return authData;
    } else {
      throw new Error('Invalid username or password');
    }
  },

  async logout() {
    if (USE_REAL_BACKEND) {
      // Optionally notify Laravel backend
      try {
        await request('/logout', { method: 'POST' });
      } catch (err) {
        console.error('Real backend logout failed', err);
      }
    }
    localStorage.removeItem('pos_auth');
    return { success: true };
  },

  async getCurrentUser() {
    if (USE_REAL_BACKEND) {
      try {
        return await request('/user');
      } catch (err) {
        return null;
      }
    }
    const auth = localStorage.getItem('pos_auth');
    return auth ? JSON.parse(auth).user : null;
  },

  // --- Products ---
  async getProducts() {
    if (USE_REAL_BACKEND) {
      return request('/products');
    }
    const list = JSON.parse(localStorage.getItem('pos_products')) || [];
    return [...list].reverse();
  },

  async createProduct(productData) {
    if (USE_REAL_BACKEND) {
      return request('/products', {
        method: 'POST',
        body: JSON.stringify(productData),
      });
    }
    const products = JSON.parse(localStorage.getItem('pos_products'));
    const newProduct = {
      ...productData,
      id: products.length > 0 ? Math.max(...products.map(p => p.id)) + 1 : 1,
      price: parseFloat(productData.price),
      stock: parseInt(productData.stock),
    };
    products.push(newProduct);
    localStorage.setItem('pos_products', JSON.stringify(products));
    return newProduct;
  },

  async updateProduct(id, productData) {
    if (USE_REAL_BACKEND) {
      return request(`/products/${id}`, {
        method: 'PUT',
        body: JSON.stringify(productData),
      });
    }
    const products = JSON.parse(localStorage.getItem('pos_products'));
    const index = products.findIndex(p => p.id === parseInt(id));
    if (index === -1) throw new Error('Product not found');
    
    products[index] = {
      ...products[index],
      ...productData,
      price: parseFloat(productData.price),
      stock: parseInt(productData.stock),
    };
    localStorage.setItem('pos_products', JSON.stringify(products));
    return products[index];
  },

  async deleteProduct(id) {
    if (USE_REAL_BACKEND) {
      return request(`/products/${id}`, {
        method: 'DELETE',
      });
    }
    let products = JSON.parse(localStorage.getItem('pos_products'));
    products = products.filter(p => p.id !== parseInt(id));
    localStorage.setItem('pos_products', JSON.stringify(products));
    return { success: true };
  },

  // --- Transactions ---
  async getTransactions() {
    if (USE_REAL_BACKEND) {
      const data = await request('/transactions');
      return (data || []).map(mapTransaction);
    }
    return JSON.parse(localStorage.getItem('pos_transactions'));
  },

  async submitTransaction(transactionData) {
    if (USE_REAL_BACKEND) {
      // Map frontend keys to backend database expectations
      const backendData = {
        items: transactionData.items,
        subtotal: parseFloat(transactionData.subtotal),
        discount: parseFloat(transactionData.discount),
        tax: parseFloat(transactionData.tax),
        total: parseFloat(transactionData.total),
        payment_method: transactionData.paymentMethod, // database parameter
        cashier: transactionData.cashier || 'Admin'
      };
      const result = await request('/transactions', {
        method: 'POST',
        body: JSON.stringify(backendData),
      });
      return mapTransaction(result);
    }
    
    // Create transaction record
    const transactions = JSON.parse(localStorage.getItem('pos_transactions'));
    const products = JSON.parse(localStorage.getItem('pos_products'));
    
    const newTxn = {
      ...transactionData,
      id: `TXN-${1000 + transactions.length + 1}`,
      timestamp: new Date().toISOString(),
    };
    
    // Deduct stock
    newTxn.items.forEach(item => {
      const product = products.find(p => p.id === item.id);
      if (product) {
        product.stock = Math.max(0, product.stock - item.quantity);
      }
    });
    
    transactions.unshift(newTxn); // Add to beginning of array
    localStorage.setItem('pos_transactions', JSON.stringify(transactions));
    localStorage.setItem('pos_products', JSON.stringify(products));
    
    return newTxn;
  },

  async refundTransaction(id) {
    if (USE_REAL_BACKEND) {
      const data = await request(`/transactions/${id}/refund`, {
        method: 'POST'
      });
      return mapTransaction(data);
    }

    const transactions = JSON.parse(localStorage.getItem('pos_transactions') || '[]');
    const products = JSON.parse(localStorage.getItem('pos_products') || '[]');

    const index = transactions.findIndex(t => t.id === id);
    if (index === -1) throw new Error('Transaction not found');

    if (transactions[index].status === 'refunded') {
      throw new Error('Transaction is already refunded');
    }

    // Restore stock
    transactions[index].items.forEach(item => {
      const product = products.find(p => p.id === item.id);
      if (product) {
        product.stock = product.stock + item.quantity;
      }
    });

    transactions[index].status = 'refunded';

    localStorage.setItem('pos_transactions', JSON.stringify(transactions));
    localStorage.setItem('pos_products', JSON.stringify(products));

    return transactions[index];
  },

  // --- Dashboard Statistics ---
  async getDashboardStats() {
    if (USE_REAL_BACKEND) {
      return request('/stats');
    }

    const transactions = JSON.parse(localStorage.getItem('pos_transactions') || '[]');
    const products = JSON.parse(localStorage.getItem('pos_products') || '[]');

    const activeTxns = transactions.filter(t => t.status !== 'refunded');

    const totalSales = activeTxns.reduce((sum, t) => sum + t.total, 0);
    const totalTxns = activeTxns.length;
    const lowStockCount = products.filter(p => p.stock <= 10).length;
    
    // Calculate items sold
    const itemsSold = activeTxns.reduce((sum, t) => {
      return sum + t.items.reduce((innerSum, item) => innerSum + item.quantity, 0);
    }, 0);

    // Group sales by day (last 7 days)
    const salesHistory = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateString = date.toLocaleDateString('en-US', { weekday: 'short' });
      
      const dayTotal = activeTxns
        .filter(t => {
          const tDate = new Date(t.timestamp);
          return tDate.toDateString() === date.toDateString();
        })
        .reduce((sum, t) => sum + t.total, 0);

      salesHistory.push({
        day: dateString,
        amount: parseFloat(dayTotal.toFixed(2)),
      });
    }

    return {
      totalSales: parseFloat(totalSales.toFixed(2)),
      totalTransactions: totalTxns,
      itemsSold,
      lowStockCount,
      salesHistory,
    };
  },

  // --- Users CRUD ---
  async getUsers() {
    if (USE_REAL_BACKEND) {
      return request('/users');
    }
    const list = JSON.parse(localStorage.getItem('pos_users')) || [];
    return [...list].reverse();
  },

  async createUser(userData) {
    if (USE_REAL_BACKEND) {
      return request('/users', {
        method: 'POST',
        body: JSON.stringify(userData),
      });
    }
    const users = JSON.parse(localStorage.getItem('pos_users'));
    const newUser = {
      ...userData,
      id: users.length > 0 ? Math.max(...users.map(u => u.id)) + 1 : 1,
    };
    users.push(newUser);
    localStorage.setItem('pos_users', JSON.stringify(users));
    return newUser;
  },

  async updateUser(id, userData) {
    if (USE_REAL_BACKEND) {
      return request(`/users/${id}`, {
        method: 'PUT',
        body: JSON.stringify(userData),
      });
    }
    const users = JSON.parse(localStorage.getItem('pos_users'));
    const index = users.findIndex(u => u.id === parseInt(id));
    if (index === -1) throw new Error('User not found');
    
    users[index] = {
      ...users[index],
      ...userData,
    };
    localStorage.setItem('pos_users', JSON.stringify(users));
    return users[index];
  },

  async deleteUser(id) {
    if (USE_REAL_BACKEND) {
      return request(`/users/${id}`, {
        method: 'DELETE',
      });
    }
    let users = JSON.parse(localStorage.getItem('pos_users'));
    users = users.filter(u => u.id !== parseInt(id));
    localStorage.setItem('pos_users', JSON.stringify(users));
    return { success: true };
  },

  // --- Categories CRUD ---
  async getCategories() {
    if (USE_REAL_BACKEND) {
      return request('/categories');
    }
    const list = JSON.parse(localStorage.getItem('pos_categories')) || [];
    return [...list];
  },

  async createCategory(categoryData) {
    if (USE_REAL_BACKEND) {
      return request('/categories', {
        method: 'POST',
        body: JSON.stringify(categoryData),
      });
    }
    const categories = JSON.parse(localStorage.getItem('pos_categories')) || [];
    const newCategory = {
      ...categoryData,
      id: categories.length > 0 ? Math.max(...categories.map(c => c.id)) + 1 : 1,
    };
    categories.push(newCategory);
    localStorage.setItem('pos_categories', JSON.stringify(categories));
    return newCategory;
  },

  async updateCategory(id, categoryData) {
    if (USE_REAL_BACKEND) {
      return request(`/categories/${id}`, {
        method: 'PUT',
        body: JSON.stringify(categoryData),
      });
    }
    const categories = JSON.parse(localStorage.getItem('pos_categories')) || [];
    const index = categories.findIndex(c => c.id === parseInt(id));
    if (index === -1) throw new Error('Category not found');
    
    categories[index] = {
      ...categories[index],
      ...categoryData,
    };
    localStorage.setItem('pos_categories', JSON.stringify(categories));
    return categories[index];
  },

  async deleteCategory(id) {
    if (USE_REAL_BACKEND) {
      return request(`/categories/${id}`, {
        method: 'DELETE',
      });
    }
    let categories = JSON.parse(localStorage.getItem('pos_categories')) || [];
    categories = categories.filter(c => c.id !== parseInt(id));
    localStorage.setItem('pos_categories', JSON.stringify(categories));
    return { success: true };
  },

  // --- KHQR Payments ---
  async generateKHQR(amount) {
    if (USE_REAL_BACKEND) {
      return request('/khqr/generate', {
        method: 'POST',
        body: JSON.stringify({ amount: parseFloat(amount) }),
      });
    }
    
    // Local fallback mock database simulation
    await new Promise(resolve => setTimeout(resolve, 800));
    return {
      success: true,
      qr: '00020101021229230019sath_chhunseak@bkrt5204599953038405402105802KH5912POS Merchant6010PHNOM PENH99170013178102311367863046CBC',
      md5: '07ee97275c6a1ded000cf83a3c1ec507',
      amount: parseFloat(amount),
      currency: 'USD'
    };
  },

  async checkKHQRPayment(md5) {
    if (USE_REAL_BACKEND) {
      return request('/khqr/check-payment', {
        method: 'POST',
        body: JSON.stringify({ md5 }),
      });
    }

    // Local fallback mock simulation
    await new Promise(resolve => setTimeout(resolve, 500));
    return {
      success: true,
      data: {
        status: 'success'
      }
    };
  },

  async checkKHQRPaymentByHash(hash) {
    if (USE_REAL_BACKEND) {
      return request('/khqr/check-payment-hash', {
        method: 'POST',
        body: JSON.stringify({ hash }),
      });
    }

    // Local fallback mock simulation
    await new Promise(resolve => setTimeout(resolve, 500));
    return {
      success: true,
      data: {
        status: 'success'
      }
    };
  },

  async checkKHQRPaymentByHashList(hashes) {
    if (USE_REAL_BACKEND) {
      return request('/khqr/check-payment-hash-list', {
        method: 'POST',
        body: JSON.stringify({ hashes }),
      });
    }

    // Local fallback mock simulation
    await new Promise(resolve => setTimeout(resolve, 500));
    return {
      success: true,
      data: []
    };
  },

  async checkKHQRPaymentByShortHash(shortHash, amount, currency) {
    if (USE_REAL_BACKEND) {
      return request('/khqr/check-payment-short-hash', {
        method: 'POST',
        body: JSON.stringify({ short_hash: shortHash, amount: parseFloat(amount), currency }),
      });
    }

    // Local fallback mock simulation
    await new Promise(resolve => setTimeout(resolve, 500));
    return {
      success: true,
      data: {
        status: 'success'
      }
    };
  }
};
