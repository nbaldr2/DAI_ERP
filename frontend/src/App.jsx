import { useState, useEffect, useMemo, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useTranslation, I18nextProvider } from 'react-i18next';
import { ThemeProvider } from './contexts/ThemeContext';
import { AuthProvider } from './contexts/AuthContext';
import { SettingsProvider } from './contexts/SettingsContext';
import AuthNavigationWrapper from './components/AuthNavigationWrapper';
import { Toaster } from 'react-hot-toast';
import i18n from './i18n/config';
import './App.css';

// Layout Components
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import LoadingSpinner from './components/LoadingSpinner';

// Page Components
import Dashboard from './pages/DashboardRevamp';
import StockLayout from './components/StockLayout';
import StockDashboard from './pages/StockDashboard';
import StockInventory from './pages/StockInventory';
import StockAdjustments from './pages/StockAdjustments';
import StockTransfers from './pages/StockTransfers';
import StockLedger from './pages/StockLedger';
import StockDetails from './pages/StockDetails';
import WasteManagement from './pages/WasteManagement';
import SalesManagement from './pages/SalesManagement';
import PriceList from './pages/PriceList';
import Products from './pages/Products';
import Suppliers from './pages/Suppliers';
import Customers from './pages/Customers';
import Warehouses from './pages/Warehouses';
import WarehouseDetails from './pages/WarehouseDetails';
import Invoices from './pages/Invoices';
import InvoiceCreate from './pages/InvoiceCreate';
import InvoiceEdit from './pages/InvoiceEdit';
import DeliveryNotes from './pages/DeliveryNotes';
import Quotations from './pages/Quotations';
import QuotationCreate from './pages/QuotationCreate';
import QuotationEdit from './pages/QuotationEdit';
import Purchases from './pages/Purchases';
import PurchaseCreate from './pages/PurchaseCreate';
import PurchaseEdit from './pages/PurchaseEdit';
import PurchaseDetail from './pages/PurchaseDetail';
import Expenses from './pages/Expenses';
import Reports from './pages/Reports';
import AuditLogs from './pages/AuditLogs';
import Settings from './pages/Settings';
import Login from './pages/Login';
import NotFound from './pages/NotFound';
import Users from './pages/Users';
import POSPage from './pages/pos/POSPage';
import POSDashboard from './pages/POSDashboard';
import Documents from './pages/Documents';

function App() {
  const { i18n } = useTranslation();

  // Handle RTL based on language
  useEffect(() => {
    const dir = i18n.language === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.dir = dir;
    document.body.dir = dir;

    if (i18n.language === 'ar') {
      document.body.classList.add('rtl');
    } else {
      document.body.classList.remove('rtl');
    }
  }, [i18n.language]);

  return (
    <I18nextProvider i18n={i18n}>
      <ThemeProvider>
        <SettingsProvider>
          <Router>
            <AuthProvider>
              <AuthNavigationWrapper>
                <div className="App">
                  {/* Toast notifications with custom styling */}
                  <Toaster
                    position="top-right"
                    toastOptions={{
                      duration: 4000,
                      style: {
                        background: '#ffffff',
                        color: '#1e293b',
                        boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
                        borderRadius: '0.75rem',
                        padding: '1rem',
                        fontSize: '0.875rem',
                        fontWeight: '500',
                      },
                      success: {
                        iconTheme: {
                          primary: '#16a34a',
                          secondary: '#ffffff',
                        },
                      },
                      error: {
                        iconTheme: {
                          primary: '#dc2626',
                          secondary: '#ffffff',
                        },
                      },
                    }}
                  />

                  <Suspense fallback={<LoadingSpinner fullScreen />}>
                    <Routes>
                      {/* Public routes */}
                      <Route path="/login" element={<Login />} />

                      {/* Protected routes with layout */}
                      <Route
                        path="/"
                        element={
                          <ProtectedRoute>
                            <Layout />
                          </ProtectedRoute>
                        }
                      >
                        <Route index element={<Navigate to="/dashboard" replace />} />
                        <Route path="dashboard" element={<Dashboard />} />

                        {/* Stock Management */}
                        <Route path="stock" element={<StockLayout />}>
                          <Route index element={<Navigate to="dashboard" replace />} />
                          <Route path="dashboard" element={<StockDashboard />} />
                          <Route path="inventory" element={<StockInventory />} />
                          <Route path="adjustments" element={<StockAdjustments />} />
                          <Route path="transfers" element={<StockTransfers />} />
                          <Route path="ledger" element={<StockLedger />} />
                          <Route path=":id" element={<StockDetails />} />
                        </Route>

                        {/* Waste & Sales */}
                        <Route path="waste" element={<WasteManagement />} />
                        <Route path="sales" element={<SalesManagement />} />

                        {/* Master Data */}
                        <Route path="price-list" element={<PriceList />} />
                        <Route path="products" element={<Products />} />
                        <Route path="suppliers" element={<Suppliers />} />
                        <Route path="customers" element={<Customers />} />
                        <Route path="warehouses" element={<Warehouses />} />
                        <Route path="warehouses/:id" element={<WarehouseDetails />} />

                        {/* Financial */}
                        <Route path="invoices" element={<Invoices />} />
                        <Route path="invoices/create" element={<InvoiceCreate />} />
                        <Route path="invoices/edit/:id" element={<InvoiceEdit />} />
                        <Route path="delivery-notes" element={<DeliveryNotes />} />
                        <Route path="quotations" element={<Quotations />} />
                        <Route path="quotations/create" element={<QuotationCreate />} />
                        <Route path="quotations/edit/:id" element={<QuotationEdit />} />
                        <Route path="expenses" element={<Expenses />} />

                        {/* Purchases */}
                        <Route path="purchases" element={<Purchases />} />
                        <Route path="purchases/create" element={<PurchaseCreate />} />
                        <Route path="purchases/edit/:id" element={<PurchaseEdit />} />
                        <Route path="purchases/:id" element={<PurchaseDetail />} />

                        {/* POS Dashboard */}
                        <Route path="pos-dashboard" element={<POSDashboard />} />

                        {/* Reports & Audit */}
                        <Route path="reports" element={<Reports />} />
                        <Route path="audit-logs" element={<AuditLogs />} />
                        <Route path="documents" element={<Documents />} />

                        {/* Settings */}
                        <Route path="settings" element={<Settings />} />

                        {/* Users (Admin only) */}
                        <Route
                          path="users"
                          element={
                            <ProtectedRoute roles={['ADMIN']}>
                              <Users />
                            </ProtectedRoute>
                          }
                        />
                      </Route>

                      {/* POS Route - Fullscreen, outside Layout */}
                      <Route
                        path="/pos"
                        element={
                          <ProtectedRoute roles={['ADMIN', 'SALES']}>
                            <POSPage />
                          </ProtectedRoute>
                        }
                      />

                      {/* 404 */}
                      <Route path="*" element={<NotFound />} />
                    </Routes>
                  </Suspense>
                </div>
              </AuthNavigationWrapper>
            </AuthProvider>
          </Router>
        </SettingsProvider>
      </ThemeProvider>
    </I18nextProvider>
  );
}

export default App;