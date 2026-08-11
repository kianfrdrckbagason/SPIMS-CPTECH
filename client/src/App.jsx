import { Routes, Route, Navigate } from 'react-router-dom';
import ProtectedRoute from './components/ProtectedRoute';
import AdminRoute from './components/AdminRoute';
import MainLayout from './components/layout/MainLayout';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import SparePartsPage from './pages/SparePartsPage';
import ConsumablesPage from './pages/ConsumablesPage';
import CategoriesPage from './pages/CategoriesPage';
import StockInPage from './pages/StockInPage';
import StockOutPage from './pages/StockOutPage';
import BorrowedToolsPage from './pages/BorrowedToolsPage';
import ToolsInventoryPage from './pages/ToolsInventoryPage';
import DailyConsumptionPage from './pages/DailyConsumptionPage';
import ReportsPage from './pages/ReportsPage';
import UsersPage from './pages/UsersPage';
import InventoryRecountPage from './pages/InventoryRecountPage';
import { useAuth } from './context/AuthContext';
import { Box, CircularProgress, Typography } from '@mui/material';

function App() {
  const { loading } = useAuth();

  if (loading) {
    return (
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          gap: 2,
        }}
      >
        <CircularProgress size={48} />
        <Typography variant="body1" color="text.secondary">
          Loading SPIMS...
        </Typography>
      </Box>
    );
  }

  return (
    <Routes>
      <Route index element={<Navigate to="/dashboard" replace />} />
      <Route path="/login" element={<LoginPage />} />
      <Route
        element={
          <ProtectedRoute>
            <MainLayout />
          </ProtectedRoute>
        }
      >
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/spare-parts" element={<SparePartsPage />} />
        <Route path="/consumables" element={<ConsumablesPage />} />
        <Route path="/categories" element={<CategoriesPage />} />
        <Route path="/stock-in" element={<StockInPage />} />
        <Route path="/stock-out" element={<StockOutPage />} />
        <Route path="/borrowed-tools" element={<BorrowedToolsPage />} />
        <Route path="/tools-inventory" element={<ToolsInventoryPage />} />
        <Route path="/daily-consumption" element={<DailyConsumptionPage />} />
        <Route path="/reports" element={<ReportsPage />} />
        <Route path="/inventory-recount" element={<InventoryRecountPage />} />
        <Route
          path="/users"
          element={
            <AdminRoute>
              <UsersPage />
            </AdminRoute>
          }
        />
      </Route>
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}

export default App;
