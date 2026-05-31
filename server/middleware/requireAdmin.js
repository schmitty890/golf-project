import User from '../models/User.js';

// Must run AFTER the `auth` middleware (relies on req.userId).
const requireAdmin = async (req, res, next) => {
  try {
    const user = await User.findById(req.userId).select('role');
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }
    return next();
  } catch (error) {
    return res.status(500).json({ error: 'Server error' });
  }
};

export default requireAdmin;
