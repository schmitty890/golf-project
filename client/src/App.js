import './App.css';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { AdminChatProvider } from './context/AdminChatContext';
import AdminUnreadFab from './components/AdminUnreadFab';
import PublicLayout from './components/layout/PublicLayout';
import SidebarLayout from './components/layout/SidebarLayout';
import RequireAuth from './components/RequireAuth';
import ScrollToTop from './components/ScrollToTop';
import AnalyticsTracker from './components/AnalyticsTracker';
import ChatWidget from './components/chatbot/ChatWidget';
import GiveawayModal from './components/GiveawayModal';
import NewsletterModal from './components/NewsletterModal';
import Home from './pages/Home';
import Order from './pages/Order';
import Pricing from './pages/Pricing';
import TrackOrder from './pages/TrackOrder';
import Receipt from './pages/Receipt';
import Login from './pages/Login';
import Register from './pages/Register';
import MyOrders from './pages/MyOrders';
import Account from './pages/Account';
import NotFound from './pages/NotFound';
import AdminOrders from './pages/admin/AdminOrders';
import AdminSchedule from './pages/admin/AdminSchedule';
import AdminAvailability from './pages/admin/AdminAvailability';
import AdminFeedback from './pages/admin/AdminFeedback';
import AdminPromos from './pages/admin/AdminPromos';
import AdminCustomers from './pages/admin/AdminCustomers';
import AdminInventory from './pages/admin/AdminInventory';
import AdminChat from './pages/admin/AdminChat';
import AdminGiveaway from './pages/admin/AdminGiveaway';
import AdminNewsletter from './pages/admin/AdminNewsletter';
import Unsubscribe from './pages/Unsubscribe';

function App() {
  return (
    <Router>
      <AuthProvider>
        <AdminChatProvider>
          <ScrollToTop />
          <AnalyticsTracker />
          <Routes>
            {/* Public marketing site */}
            <Route path="/" element={<PublicLayout><Home /></PublicLayout>} />
            <Route path="/order" element={<PublicLayout><Order /></PublicLayout>} />
            <Route path="/pricing" element={<PublicLayout><Pricing /></PublicLayout>} />
            <Route path="/track/:token" element={<PublicLayout><TrackOrder /></PublicLayout>} />
            {/* Print-friendly receipt — standalone (no nav/footer) so the printout is clean */}
            <Route path="/receipt/:token" element={<Receipt />} />
            {/* Public newsletter unsubscribe (reached from an email link) */}
            <Route path="/unsubscribe/:token" element={<Unsubscribe />} />

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
              path="/admin/customers"
              element={(
                <RequireAuth adminOnly>
                  <SidebarLayout><AdminCustomers /></SidebarLayout>
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
            <Route
              path="/admin/inventory"
              element={(
                <RequireAuth adminOnly>
                  <SidebarLayout><AdminInventory /></SidebarLayout>
                </RequireAuth>
            )}
            />
            <Route
              path="/admin/chat"
              element={(
                <RequireAuth adminOnly>
                  <SidebarLayout><AdminChat /></SidebarLayout>
                </RequireAuth>
            )}
            />
            <Route
              path="/admin/giveaway"
              element={(
                <RequireAuth adminOnly>
                  <SidebarLayout><AdminGiveaway /></SidebarLayout>
                </RequireAuth>
            )}
            />
            <Route
              path="/admin/newsletter"
              element={(
                <RequireAuth adminOnly>
                  <SidebarLayout><AdminNewsletter /></SidebarLayout>
                </RequireAuth>
            )}
            />

            {/* 404 - branded catch-all, keeps nav/footer */}
            <Route path="*" element={<PublicLayout><NotFound /></PublicLayout>} />
          </Routes>
          <ChatWidget />
          <GiveawayModal />
          <NewsletterModal />
          <AdminUnreadFab />
        </AdminChatProvider>
      </AuthProvider>
    </Router>
  );
}

export default App;
