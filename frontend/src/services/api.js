import axios from 'axios';
import toast from 'react-hot-toast';

// Create axios instance with default config
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:4002/api',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor - Add auth token to requests
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // Log request in development
    if (import.meta.env.DEV) {
      console.log('🚀 API Request:', {
        method: config.method?.toUpperCase(),
        baseURL: config.baseURL,
        url: config.url,
        params: config.params,
        data: config.data,
      });
    }

    return config;
  },
  (error) => {
    console.error('❌ Request Error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor - Handle responses and errors
api.interceptors.response.use(
  (response) => {
    // Log response in development
    if (import.meta.env.DEV) {
      console.log('✅ API Response:', {
        status: response.status,
        url: response.config.url,
        data: response.data,
      });
    }

    return response;
  },
  (error) => {
    // Log error in development
    if (import.meta.env.DEV) {
      console.error('❌ API Error:', {
        status: error.response?.status,
        method: error.config?.method?.toUpperCase(),
        url: error.config?.url,
        data: error.config?.data,
        response: error.response?.data,
        message: error.response?.data?.message || error.message,
      });
    }

    // Handle different error scenarios
    if (error.response) {
      // Server responded with error status
      const { status, data } = error.response;

      switch (status) {
        case 400:
          // Bad request - validation errors
          if (data.errors && Array.isArray(data.errors)) {
            data.errors.forEach((err) => {
              toast.error(err.msg || err.message);
            });
          } else {
            toast.error(data.message || 'Invalid request');
          }
          break;

        case 401:
          // Unauthorized - token expired or invalid
          toast.error('Session expired. Please login again.');
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          window.location.href = '/login';
          break;

        case 403:
          // Forbidden - insufficient permissions
          toast.error(data.message || 'You do not have permission to perform this action');
          break;

        case 404:
          // Not found
          toast.error(data.message || 'Resource not found');
          break;

        case 409:
          // Conflict - optimistic locking or duplicate
          toast.error(data.message || 'Conflict detected. Please refresh and try again.');
          break;

        case 422:
          // Unprocessable entity - validation errors
          if (data.errors) {
            Object.values(data.errors).forEach((error) => {
              toast.error(error);
            });
          } else {
            toast.error(data.message || 'Validation failed');
          }
          break;

        case 429:
          // Too many requests
          toast.error('Too many requests. Please try again later.');
          break;

        case 500:
        case 502:
        case 503:
        case 504:
          // Server errors
          toast.error(data.message || 'Server error. Please try again later.');
          break;

        default:
          toast.error(data.message || 'An unexpected error occurred');
      }
    } else if (error.request) {
      // Request was made but no response received
      toast.error('Network error. Please check your internet connection.');
    } else {
      // Something else happened
      toast.error(error.message || 'An unexpected error occurred');
    }

    return Promise.reject(error);
  }
);

// API service methods
const apiService = {
  // Generic methods
  get: (url, config) => api.get(url, config),
  post: (url, data, config) => api.post(url, data, config),
  put: (url, data, config) => api.put(url, data, config),
  patch: (url, data, config) => api.patch(url, data, config),
  delete: (url, config) => api.delete(url, config),

  // Auth
  auth: {
    login: (credentials) => api.post('/auth/login', credentials),
    register: (userData) => api.post('/auth/register', userData),
    me: () => api.get('/auth/me'),
    changePassword: (passwords) => api.post('/auth/change-password', passwords),
    logout: () => api.post('/auth/logout'),
  },

  // Export
  export: {
    table: (tableName, config = {}) => api.get(`/export/${tableName}`, config),
  },

  // Stock
  stock: {
    list: (params) => api.get('/stock', { params }),
    get: (id) => api.get(`/stock/${id}`),
    create: (data) => api.post('/stock', data),
    update: (id, data) => api.put(`/stock/${id}`, data),
    delete: (id) => api.delete(`/stock/${id}`),
    summary: (params) => api.get('/stock/summary', { params }),
    ledger: (stockEntryId) => api.get(`/stock/ledger/${stockEntryId}`),
    ledgerList: (params) => api.get('/stock/ledger', { params }),
    trends: (params) => api.get('/stock/trends', { params }),

    // Adjustments
    adjustments: {
      list: (params) => api.get('/stock/adjustments', { params }),
      get: (id) => api.get(`/stock/adjustments/${id}`),
      create: (data) => api.post('/stock/adjustments', data),
      approve: (id) => api.post(`/stock/adjustments/${id}/approve`),
    },

    // Transfers
    transfers: {
      list: (params) => api.get('/stock/transfers', { params }),
      get: (id) => api.get(`/stock/transfers/${id}`),
      create: (data) => api.post('/stock/transfers', data),
      updateStatus: (id, status) => api.put(`/stock/transfers/${id}/status`, { status }),
    },
  },

  // Waste
  waste: {
    list: (params) => api.get('/waste', { params }),
    create: (data) => api.post('/waste', data),
    delete: (id) => api.delete(`/waste/${id}`),
  },

  // Sales
  sales: {
    list: (params) => api.get('/sales', { params }),
    get: (id) => api.get(`/sales/${id}`),
    create: (data) => api.post('/sales', data),
    stats: (params) => api.get('/sales/summary/stats', { params }),
  },

  // Products
  products: {
    list: (params) => api.get('/products', { params }),
    get: (id) => api.get(`/products/${id}`),
    create: (data) => api.post('/products', data),
    update: (id, data) => api.put(`/products/${id}`, data),
    delete: (id) => api.delete(`/products/${id}`),
  },

  // Suppliers
  suppliers: {
    list: (params) => api.get('/suppliers', { params }),
    get: (id) => api.get(`/suppliers/${id}`),
    create: (data) => api.post('/suppliers', data),
    update: (id, data) => api.put(`/suppliers/${id}`, data),
    delete: (id) => api.delete(`/suppliers/${id}`),
  },

  // Customers
  customers: {
    list: (params) => api.get('/customers', { params }),
    get: (id) => api.get(`/customers/${id}`),
    create: (data) => api.post('/customers', data),
    update: (id, data) => api.put(`/customers/${id}`, data),
    delete: (id) => api.delete(`/customers/${id}`),
  },

  // Warehouses
  warehouses: {
    list: (params) => api.get('/warehouses', { params }),
    get: (id) => api.get(`/warehouses/${id}`),
    getProducts: (id) => api.get(`/warehouses/${id}/products`),
    create: (data) => api.post('/warehouses', data),
    update: (id, data) => api.put(`/warehouses/${id}`, data),
    delete: (id) => api.delete(`/warehouses/${id}`),
  },

  // Invoices
  invoices: {
    list: (params) => api.get('/invoices', { params }),
    get: (id) => api.get(`/invoices/${id}`),
    create: (data) => api.post('/invoices', data),
    update: (id, data) => api.put(`/invoices/${id}`, data),
    updateStatus: (id, status) => api.patch(`/invoices/${id}/status`, { status }),
    delete: (id) => api.delete(`/invoices/${id}`),
    download: (id) => api.get(`/invoices/${id}/download`, { responseType: 'blob' }),
    download: (id) => api.get(`/invoices/${id}/download`, { responseType: 'blob' }),
    getNextNumber: () => api.get('/invoices/next-number'),
  },

  // Quotations
  quotations: {
    list: (params) => api.get('/quotations', { params }),
    get: (id) => api.get(`/quotations/${id}`),
    create: (data) => api.post('/quotations', data),
    update: (id, data) => api.put(`/quotations/${id}`, data),
    updateStatus: (id, status) => api.patch(`/quotations/${id}/status`, { status }),
    delete: (id) => api.delete(`/quotations/${id}`),
    convert: (id) => api.post(`/quotations/${id}/convert`),
  },

  // Expenses
  expenses: {
    list: (params) => api.get('/expenses', { params }),
    get: (id) => api.get(`/expenses/${id}`),
    create: (data) => api.post('/expenses', data),
    update: (id, data) => api.put(`/expenses/${id}`, data),
    delete: (id) => api.delete(`/expenses/${id}`),
  },

  // Purchases
  purchases: {
    list: (params) => api.get('/purchases', { params }),
    get: (id) => api.get(`/purchases/${id}`),
    create: (data) => api.post('/purchases', data),
    updateStatus: (id, data) => api.patch(`/purchases/${id}/status`, data),
    delete: (id) => api.delete(`/purchases/${id}`),
  },

  // Reports
  reports: {
    nearExpiry: (params) => api.get('/reports/near-expiry', { params }),
    stockSummary: (params) => api.get('/reports/stock-summary', { params }),
    salesRevenue: (params) => api.get('/reports/sales-revenue', { params }),
    wasteAnalysis: (params) => api.get('/reports/waste-analysis', { params }),
    inventoryValuation: (params) => api.get('/reports/inventory-valuation', { params }),
    invoiceRevenue: (params) => api.get('/reports/invoice-revenue', { params }),
  },

  // Audit Logs
  auditLogs: {
    list: (params) => api.get('/audit-logs', { params }),
    get: (id) => api.get(`/audit-logs/${id}`),
    getEntityTrail: (entityType, entityId) =>
      api.get(`/audit-logs/entity/${entityType}/${entityId}`),
    getUserActivity: (userId, params) =>
      api.get(`/audit-logs/user/${userId}/activity`, { params }),
    getStatistics: (params) => api.get('/audit-logs/summary/statistics', { params }),
  },

  // Users (Admin)
  users: {
    list: (params) => api.get('/users', { params }),
    create: (data) => api.post('/users', data),
    update: (id, data) => api.put(`/users/${id}`, data),
    delete: (id) => api.delete(`/users/${id}`),
  },

  // Settings
  settings: {
    get: () => api.get('/settings'),
    update: (data) => api.put('/settings', data),
  },

  // Delivery Notes
  deliveryNotes: {
    list: (params) => api.get('/delivery-notes', { params }),
    get: (id) => api.get(`/delivery-notes/${id}`),
    create: (data) => api.post('/delivery-notes', data),
    updateStatus: (id, status) => api.patch(`/delivery-notes/${id}/status`, { status }),
    delete: (id) => api.delete(`/delivery-notes/${id}`),
  },

  // POS (Point of Sale)
  pos: {
    // Dashboard
    getDashboard: () => api.get('/pos/dashboard'),
    listSessions: (params) => api.get('/pos/sessions', { params }),

    // Session Management
    openSession: (data) => api.post('/pos/sessions/open', data),
    closeSession: (id, data) => api.post(`/pos/sessions/${id}/close`, data),
    getCurrentSession: () => api.get('/pos/sessions/current'),
    getSessionSummary: (id) => api.get(`/pos/sessions/${id}/summary`),
    getSessionOrders: (id, params) => api.get(`/pos/sessions/${id}/orders`, { params }),

    // Products
    getProducts: (params) => api.get('/pos/products', { params }),

    // Orders
    completeSale: (data) => api.post('/pos/orders', data),
    voidOrder: (id) => api.post(`/pos/orders/${id}/void`),
    getReceipt: (id) => api.get(`/pos/orders/${id}/receipt`),

    // Park / Resume
    parkOrder: (data) => api.post('/pos/orders/park', data),
    getParkedOrders: (params) => api.get('/pos/orders/parked', { params }),
    resumeParkedOrder: (id) => api.get(`/pos/orders/parked/${id}`),
    deleteParkedOrder: (id) => api.delete(`/pos/orders/parked/${id}`),
  },

  // Health check
  health: () => api.get('/health'),
};

export default apiService;
