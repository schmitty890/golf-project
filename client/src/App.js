import './App.css';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import SidebarLayout from './components/layout/SidebarLayout';
import Login from './pages/Login';
import Register from './pages/Register';
import Scorecard from './pages/Scorecard';
import Settings from './pages/Settings';

function App() {
  return (
    <Router>
      <AuthProvider>
        <Routes>
          {/* Auth routes - standalone, no sidebar */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          {/* Protected routes - with sidebar layout */}
          <Route
            path="/*"
            element={(
              <SidebarLayout>
                <Routes>
                  <Route path="/" element={<Scorecard />} />
                  <Route path="/scorecard" element={<Scorecard />} />
                  <Route path="/settings" element={<Settings />} />
                </Routes>
              </SidebarLayout>
            )}
          />
        </Routes>
      </AuthProvider>
    </Router>
  );
}

export default App;
