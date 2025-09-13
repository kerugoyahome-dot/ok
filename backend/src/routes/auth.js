import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import pool from '../config/database.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Generate JWT token
const generateToken = (user) => {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '30d' }
  );
};

// Register user
router.post('/register', async (req, res) => {
  try {
    const { name, email, phone, password, role, carDetails, idDocument } = req.body;

    // Validate required fields
    if (!name || !role || (!email && !phone)) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Check if user already exists
    const existingUser = await pool.query(
      'SELECT id FROM users WHERE email = $1 OR phone = $2',
      [email, phone]
    );

    if (existingUser.rows.length > 0) {
      return res.status(409).json({ error: 'User already exists' });
    }

    // Hash password if provided
    let passwordHash = null;
    if (password) {
      passwordHash = await bcrypt.hash(password, 10);
    }

    // Set subscription expiry for paid roles
    let subscriptionExpiry = null;
    if (['seller', 'driver', 'agent'].includes(role)) {
      subscriptionExpiry = new Date();
      subscriptionExpiry.setDate(subscriptionExpiry.getDate() + 30);
    }

    // Create user
    const userResult = await pool.query(
      `INSERT INTO users (name, email, phone, password_hash, role, subscription_expiry, id_document_url)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, name, email, phone, role, verified, subscription_expiry`,
      [name, email, phone, passwordHash, role, subscriptionExpiry, idDocument]
    );

    const user = userResult.rows[0];

    // Create admin record if role is admin
    if (role === 'admin') {
      await pool.query(
        'INSERT INTO admins (id) VALUES ($1)',
        [user.id]
      );
    }

    // Create driver details if role is driver
    if (role === 'driver' && carDetails) {
      await pool.query(
        `INSERT INTO driver_details (id, car_make, car_model, car_registration, car_category, license_number)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          user.id,
          carDetails.make,
          carDetails.model,
          carDetails.registration,
          carDetails.category || 'Medium',
          carDetails.licenseNumber
        ]
      );
    }

    const token = generateToken(user);

    res.status(201).json({
      message: 'User registered successfully',
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        verified: user.verified,
        subscriptionExpiry: user.subscription_expiry
      },
      token,
      requiresSubscription: ['seller', 'driver', 'agent'].includes(role)
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// Login user
router.post('/login', async (req, res) => {
  try {
    const { email, phone, password } = req.body;

    if (!password || (!email && !phone)) {
      return res.status(400).json({ error: 'Email/phone and password are required' });
    }

    // Find user
    const userResult = await pool.query(
      'SELECT * FROM users WHERE (email = $1 OR phone = $2) AND is_active = true',
      [email, phone]
    );

    if (userResult.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const user = userResult.rows[0];

    // Check password
    if (!user.password_hash || !await bcrypt.compare(password, user.password_hash)) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Update last login for admin users
    if (user.role === 'admin') {
      await pool.query(
        'UPDATE admins SET last_login = CURRENT_TIMESTAMP WHERE id = $1',
        [user.id]
      );
    }

    const token = generateToken(user);

    res.json({
      message: 'Login successful',
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        verified: user.verified,
        subscriptionExpiry: user.subscription_expiry
      },
      token
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

// Send OTP for phone verification (mock implementation)
router.post('/send-otp', async (req, res) => {
  try {
    const { phone } = req.body;

    if (!phone) {
      return res.status(400).json({ error: 'Phone number required' });
    }

    // In production, integrate with SMS service
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    
    // Store OTP in database or cache (simplified for demo)
    console.log(`OTP for ${phone}: ${otp}`);

    res.json({
      message: 'OTP sent successfully',
      // In production, don't send OTP in response
      otp: process.env.NODE_ENV === 'development' ? otp : undefined
    });
  } catch (error) {
    console.error('OTP error:', error);
    res.status(500).json({ error: 'Failed to send OTP' });
  }
});

// Verify OTP
router.post('/verify-otp', async (req, res) => {
  try {
    const { phone, otp } = req.body;

    if (!phone || !otp) {
      return res.status(400).json({ error: 'Phone and OTP required' });
    }

    // In production, verify OTP from database/cache
    // For demo, accept any 6-digit OTP
    if (otp.length !== 6) {
      return res.status(400).json({ error: 'Invalid OTP' });
    }

    // Create or find user with phone
    let userResult = await pool.query(
      'SELECT * FROM users WHERE phone = $1',
      [phone]
    );

    let user;
    if (userResult.rows.length === 0) {
      // Create new customer user
      const newUserResult = await pool.query(
        `INSERT INTO users (name, phone, role, verified)
         VALUES ($1, $2, 'customer', true)
         RETURNING *`,
        [`User ${phone}`, phone]
      );
      user = newUserResult.rows[0];
    } else {
      user = userResult.rows[0];
      // Mark as verified
      await pool.query(
        'UPDATE users SET verified = true WHERE id = $1',
        [user.id]
      );
    }

    const token = generateToken(user);

    res.json({
      message: 'Phone verified successfully',
      user: {
        id: user.id,
        name: user.name,
        phone: user.phone,
        role: user.role,
        verified: true
      },
      token
    });
  } catch (error) {
    console.error('OTP verification error:', error);
    res.status(500).json({ error: 'OTP verification failed' });
  }
});

// Get current user
router.get('/me', authenticateToken, (req, res) => {
  const { password_hash, ...user } = req.user;
  res.json({ user });
});

// Logout (client-side token removal, optionally blacklist token)
router.post('/logout', authenticateToken, (req, res) => {
  res.json({ message: 'Logged out successfully' });
});

export default router;