import jwt from 'jsonwebtoken';
import pool from '../config/database.js';

export const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({ error: 'Access token required' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Get user from database
    const userResult = await pool.query(
      'SELECT * FROM users WHERE id = $1 AND is_active = true',
      [decoded.id]
    );

    if (userResult.rows.length === 0) {
      return res.status(401).json({ error: 'User not found or inactive' });
    }

    req.user = userResult.rows[0];
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(403).json({ error: 'Invalid token' });
    }
    return res.status(403).json({ error: 'Token verification failed' });
  }
};

export const requireRole = (roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    next();
  };
};

export const requireSubscription = async (req, res, next) => {
  try {
    const user = req.user;
    
    // Check if user has valid subscription (for sellers, drivers, agents)
    if (['seller', 'driver', 'agent'].includes(user.role)) {
      if (!user.subscription_expiry || new Date(user.subscription_expiry) < new Date()) {
        return res.status(402).json({ 
          error: 'Active subscription required',
          code: 'SUBSCRIPTION_EXPIRED'
        });
      }
    }

    next();
  } catch (error) {
    return res.status(500).json({ error: 'Subscription check failed' });
  }
};