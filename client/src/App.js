import './App.css';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import PublicLayout from './components/layout/PublicLayout';
import SidebarLayout from './components/layout/SidebarLayout';
import RequireAuth from './components/RequireAuth';
import ScrollToTop from './components/ScrollToTop';
import Home from './pages/Home';
import Order from './pages/Order';
import Login from './pages/Login';
import Register from './pages/Register';
import MyOrders from './pages/MyOrders';
import Account from './pages/Account';
import AdminOrders from './pages/admin/AdminOrders';
import AdminSchedule from './pages/admin/AdminSchedule';
import AdminAvailability from './pages/admin/AdminAvailability';
import AdminFeedback from './pages/admin/AdminFeedback';
import AdminPromos from './pages/admin/AdminPromos';

function App() {
  return (
    <Router>
      <AuthProvider>
        <ScrollToTop />
        <Routes>
          {/* Public marketing site */}
          <Route path="/" element={<PublicLayout><Home /></PublicLayout>} />
          <Route path="/order" element={<PublicLayout><Order /></PublicLayout>} />

          {/* Auth - standalone */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          {/* Authenticated app - sidebar layout */}
          <Route
            path="/my-orders"
            element={(
              <RequireAuth>
                <SidebarLayout><MyOrders /></SidebarLayout>
              </RequireAuth>
            )}
          />
          <Route
            path="/account"
            element={(
              <RequireAuth>
                <SidebarLayout><Account /></SidebarLayout>
              </RequireAuth>
            )}
          />
          <Route
            path="/admin/schedule"
            element={(
              <RequireAuth adminOnly>
                <SidebarLayout><AdminSchedule /></SidebarLayout>
              </RequireAuth>
            )}
          />
          <Route
            path="/admin/orders"
            element={(
              <RequireAuth adminOnly>
                <SidebarLayout><AdminOrders /></SidebarLayout>
              </RequireAuth>
            )}
          />
          <Route
            path="/admin/availability"
            element={(
              <RequireAuth adminOnly>
                <SidebarLayout><AdminAvailability /></SidebarLayout>
              </RequireAuth>
            )}
          />
          <Route
            path="/admin/feedback"
            element={(
              <RequireAuth adminOnly>
                <SidebarLayout><AdminFeedback /></SidebarLayout>
              </RequireAuth>
            )}
          />
          <Route
            path="/admin/promos"
            element={(
              <RequireAuth adminOnly>
                <SidebarLayout><AdminPromos /></SidebarLayout>
              </RequireAuth>
            )}
          />
        </Routes>
      </AuthProvider>
    </Router>
  );
}

export default App;
