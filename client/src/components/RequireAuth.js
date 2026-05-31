import { useContext } from 'react';
import PropTypes from 'prop-types';
import { Navigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';

// Gate routes behind authentication, and optionally behind the admin role.
function RequireAuth({ children, adminOnly = false }) {
  const { token, user, loading } = useContext(AuthContext);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-cream">
        <p className="text-walnut-400">Loading…</p>
      </div>
    );
  }

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  if (adminOnly && user?.role !== 'admin') {
    return <Navigate to="/my-orders" replace />;
  }

  return children;
}

RequireAuth.propTypes = {
  children: PropTypes.node.isRequired,
  adminOnly: PropTypes.bool,
};

RequireAuth.defaultProps = {
  adminOnly: false,
};

export default RequireAuth;
