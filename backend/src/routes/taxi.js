import express from 'express';
import pool from '../config/database.js';
import { authenticateToken, requireRole, requireSubscription } from '../middleware/auth.js';

const router = express.Router();

// Calculate ride fare (base: KES 200 per 3KM)
const calculateFare = (distanceKm, category = 'Medium') => {
  const baseRate = 200; // KES per 3KM
  const baseFare = (distanceKm / 3) * baseRate;
  
  // Category multiplier
  const multiplier = category === 'XL' ? 1.5 : 1;
  
  return Math.max(baseFare * multiplier, 100); // Minimum fare KES 100
};

// Request ride (customers only)
router.post('/request', authenticateToken, requireRole(['customer']), async (req, res) => {
  try {
    const { pickup, destination, distanceKm, carCategory } = req.body;

    if (!pickup || !destination || !distanceKm) {
      return res.status(400).json({ error: 'Pickup, destination, and distance are required' });
    }

    const category = carCategory || 'Medium';
    const price = calculateFare(distanceKm, category);

    const result = await pool.query(
      `INSERT INTO taxirides (customer_id, pickup, destination, distance_km, price, car_category, status)
       VALUES ($1, $2, $3, $4, $5, $6, 'pending')
       RETURNING *`,
      [req.user.id, pickup, destination, distanceKm, price, category]
    );

    // Notify available drivers (in production, use WebSockets or push notifications)
    const nearbyDrivers = await pool.query(
      `SELECT u.id, u.name, u.phone, dd.car_make, dd.car_model, dd.car_registration
       FROM users u
       JOIN driver_details dd ON u.id = dd.id
       WHERE u.role = 'driver' AND u.verified = true AND u.is_active = true 
       AND dd.online_status = true
       AND u.subscription_expiry > CURRENT_DATE`
    );

    res.status(201).json({
      message: 'Ride requested successfully',
      ride: result.rows[0],
      availableDrivers: nearbyDrivers.rows.length
    });
  } catch (error) {
    console.error('Request ride error:', error);
    res.status(500).json({ error: 'Failed to request ride' });
  }
});

// Get available rides for drivers
router.get('/available', authenticateToken, requireRole(['driver']), requireSubscription, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT tr.*, u.name as customer_name, u.phone as customer_phone
       FROM taxirides tr
       JOIN users u ON tr.customer_id = u.id
       WHERE tr.status = 'pending'
       ORDER BY tr.created_at DESC
       LIMIT 10`
    );

    res.json({ rides: result.rows });
  } catch (error) {
    console.error('Get available rides error:', error);
    res.status(500).json({ error: 'Failed to fetch available rides' });
  }
});

// Accept ride (drivers only)
router.post('/:id/accept', authenticateToken, requireRole(['driver']), requireSubscription, async (req, res) => {
  try {
    const { id } = req.params;

    // Check if ride is still available
    const rideCheck = await pool.query(
      'SELECT * FROM taxirides WHERE id = $1 AND status = $2',
      [id, 'pending']
    );

    if (rideCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Ride not available' });
    }

    // Check if driver is online and available
    const driverCheck = await pool.query(
      'SELECT online_status FROM driver_details WHERE id = $1',
      [req.user.id]
    );

    if (driverCheck.rows.length === 0 || !driverCheck.rows[0].online_status) {
      return res.status(400).json({ error: 'Driver not available' });
    }

    // Accept the ride
    const result = await pool.query(
      `UPDATE taxirides 
       SET driver_id = $1, status = 'confirmed', confirmed_at = CURRENT_TIMESTAMP
       WHERE id = $2 AND status = 'pending'
       RETURNING *`,
      [req.user.id, id]
    );

    if (result.rows.length === 0) {
      return res.status(409).json({ error: 'Ride already accepted by another driver' });
    }

    // Get ride details with customer info
    const rideDetails = await pool.query(
      `SELECT tr.*, u.name as customer_name, u.phone as customer_phone,
              d.name as driver_name, dd.car_make, dd.car_model, dd.car_registration
       FROM taxirides tr
       JOIN users u ON tr.customer_id = u.id
       JOIN users d ON tr.driver_id = d.id
       LEFT JOIN driver_details dd ON d.id = dd.id
       WHERE tr.id = $1`,
      [id]
    );

    res.json({
      message: 'Ride accepted successfully',
      ride: rideDetails.rows[0]
    });
  } catch (error) {
    console.error('Accept ride error:', error);
    res.status(500).json({ error: 'Failed to accept ride' });
  }
});

// Start trip
router.post('/:id/start', authenticateToken, requireRole(['driver']), async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `UPDATE taxirides 
       SET status = 'in_progress'
       WHERE id = $1 AND driver_id = $2 AND status = 'confirmed'
       RETURNING *`,
      [id, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Ride not found or cannot be started' });
    }

    res.json({
      message: 'Trip started successfully',
      ride: result.rows[0]
    });
  } catch (error) {
    console.error('Start trip error:', error);
    res.status(500).json({ error: 'Failed to start trip' });
  }
});

// Complete ride
router.post('/:id/complete', authenticateToken, requireRole(['driver']), async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `UPDATE taxirides 
       SET status = 'completed', completed_at = CURRENT_TIMESTAMP
       WHERE id = $1 AND driver_id = $2 AND status IN ('confirmed', 'in_progress')
       RETURNING *`,
      [id, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Ride not found or cannot be completed' });
    }

    const ride = result.rows[0];

    // Create payment record
    await pool.query(
      `INSERT INTO payments (user_id, amount, method, purpose, status, reference)
       VALUES ($1, $2, 'cash', 'ride', 'verified', $3)`,
      [ride.customer_id, ride.price, `RIDE_${ride.id}`]
    );

    res.json({
      message: 'Ride completed successfully',
      ride: result.rows[0]
    });
  } catch (error) {
    console.error('Complete ride error:', error);
    res.status(500).json({ error: 'Failed to complete ride' });
  }
});

// Get customer's rides
router.get('/my-rides', authenticateToken, requireRole(['customer']), async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT tr.*, d.name as driver_name, dd.car_make, dd.car_model, dd.car_registration
       FROM taxirides tr
       LEFT JOIN users d ON tr.driver_id = d.id
       LEFT JOIN driver_details dd ON d.id = dd.id
       WHERE tr.customer_id = $1
       ORDER BY tr.created_at DESC`,
      [req.user.id]
    );

    res.json({ rides: result.rows });
  } catch (error) {
    console.error('Get customer rides error:', error);
    res.status(500).json({ error: 'Failed to fetch rides' });
  }
});

// Get driver's rides
router.get('/driver-rides', authenticateToken, requireRole(['driver']), async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT tr.*, u.name as customer_name, u.phone as customer_phone
       FROM taxirides tr
       JOIN users u ON tr.customer_id = u.id
       WHERE tr.driver_id = $1
       ORDER BY tr.created_at DESC`,
      [req.user.id]
    );

    res.json({ rides: result.rows });
  } catch (error) {
    console.error('Get driver rides error:', error);
    res.status(500).json({ error: 'Failed to fetch driver rides' });
  }
});

// Update driver online status
router.put('/driver/status', authenticateToken, requireRole(['driver']), async (req, res) => {
  try {
    const { online } = req.body;

    await pool.query(
      'UPDATE driver_details SET online_status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      [online, req.user.id]
    );

    res.json({
      message: `Driver status updated to ${online ? 'online' : 'offline'}`,
      online
    });
  } catch (error) {
    console.error('Update driver status error:', error);
    res.status(500).json({ error: 'Failed to update driver status' });
  }
});

// Get ride details
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `SELECT tr.*, 
              u.name as customer_name, u.phone as customer_phone,
              d.name as driver_name, d.phone as driver_phone,
              dd.car_make, dd.car_model, dd.car_registration, dd.car_category
       FROM taxirides tr
       JOIN users u ON tr.customer_id = u.id
       LEFT JOIN users d ON tr.driver_id = d.id
       LEFT JOIN driver_details dd ON d.id = dd.id
       WHERE tr.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Ride not found' });
    }

    const ride = result.rows[0];

    // Check if user has access to this ride
    if (req.user.role !== 'admin' && req.user.id !== ride.customer_id && req.user.id !== ride.driver_id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    res.json({ ride });
  } catch (error) {
    console.error('Get ride details error:', error);
    res.status(500).json({ error: 'Failed to fetch ride details' });
  }
});

export default router;