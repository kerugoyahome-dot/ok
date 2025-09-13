import express from 'express';
import bcrypt from 'bcryptjs';
import pool from '../config/database.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';

const router = express.Router();

// All admin routes require authentication and admin role
router.use(authenticateToken);
router.use(requireRole(['admin']));

// Log admin action
const logAdminAction = async (adminId, action, targetTable, targetId, details, req) => {
  try {
    await pool.query(
      `INSERT INTO audit_logs (admin_id, action, target_table, target_id, details, ip_address, user_agent)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        adminId,
        action,
        targetTable,
        targetId,
        details,
        req.ip || req.connection.remoteAddress,
        req.headers['user-agent']
      ]
    );
  } catch (error) {
    console.error('Failed to log admin action:', error);
  }
};

// Get dashboard analytics
router.get('/analytics', async (req, res) => {
  try {
    // Get user counts by role
    const userStats = await pool.query(
      `SELECT role, COUNT(*) as count, 
       COUNT(CASE WHEN verified = true THEN 1 END) as verified_count
       FROM users GROUP BY role`
    );

    // Get revenue data
    const revenueStats = await pool.query(
      `SELECT 
         purpose,
         SUM(amount) as total_amount,
         COUNT(*) as transaction_count
       FROM payments 
       WHERE status = 'verified' AND created_at >= CURRENT_DATE - INTERVAL '30 days'
       GROUP BY purpose`
    );

    // Get order statistics
    const orderStats = await pool.query(
      `SELECT 
         order_status,
         COUNT(*) as count,
         SUM(total_amount) as total_value
       FROM orders
       WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
       GROUP BY order_status`
    );

    // Get ride statistics
    const rideStats = await pool.query(
      `SELECT 
         status,
         COUNT(*) as count,
         SUM(price) as total_value
       FROM taxirides
       WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
       GROUP BY status`
    );

    res.json({
      users: userStats.rows,
      revenue: revenueStats.rows,
      orders: orderStats.rows,
      rides: rideStats.rows,
      summary: {
        totalUsers: userStats.rows.reduce((sum, row) => sum + parseInt(row.count), 0),
        totalRevenue: revenueStats.rows.reduce((sum, row) => sum + parseFloat(row.total_amount), 0),
        totalOrders: orderStats.rows.reduce((sum, row) => sum + parseInt(row.count), 0),
        totalRides: rideStats.rows.reduce((sum, row) => sum + parseInt(row.count), 0)
      }
    });
  } catch (error) {
    console.error('Analytics error:', error);
    res.status(500).json({ error: 'Failed to fetch analytics' });
  }
});

// Get all users with pagination
router.get('/users', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const role = req.query.role;
    const offset = (page - 1) * limit;

    let query = `
      SELECT u.*, dd.car_registration, dd.car_make, dd.car_model
      FROM users u
      LEFT JOIN driver_details dd ON u.id = dd.id
      WHERE 1=1
    `;
    let params = [];
    let paramCount = 0;

    if (role) {
      paramCount++;
      query += ` AND u.role = $${paramCount}`;
      params.push(role);
    }

    query += ` ORDER BY u.created_at DESC LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
    params.push(limit, offset);

    const result = await pool.query(query, params);

    // Get total count
    let countQuery = 'SELECT COUNT(*) FROM users WHERE 1=1';
    let countParams = [];
    if (role) {
      countQuery += ' AND role = $1';
      countParams.push(role);
    }

    const countResult = await pool.query(countQuery, countParams);
    const totalCount = parseInt(countResult.rows[0].count);

    res.json({
      users: result.rows.map(user => {
        const { password_hash, ...userWithoutPassword } = user;
        return userWithoutPassword;
      }),
      pagination: {
        page,
        limit,
        total: totalCount,
        pages: Math.ceil(totalCount / limit)
      }
    });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// Verify/approve user
router.put('/users/:id/verify', async (req, res) => {
  try {
    const { id } = req.params;
    const { verified } = req.body;

    const result = await pool.query(
      'UPDATE users SET verified = $1 WHERE id = $2 RETURNING *',
      [verified, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = result.rows[0];
    const { password_hash, ...userWithoutPassword } = user;

    await logAdminAction(
      req.user.id,
      verified ? 'VERIFY_USER' : 'UNVERIFY_USER',
      'users',
      id,
      { verified },
      req
    );

    res.json({
      message: `User ${verified ? 'verified' : 'unverified'} successfully`,
      user: userWithoutPassword
    });
  } catch (error) {
    console.error('Verify user error:', error);
    res.status(500).json({ error: 'Failed to verify user' });
  }
});

// Change admin credentials
router.put('/admins/:id/change-credentials', async (req, res) => {
  try {
    const { id } = req.params;
    const { email, phone, password } = req.body;

    // Check if the admin can edit other admins
    const currentAdmin = await pool.query(
      'SELECT can_edit_admins FROM admins WHERE id = $1',
      [req.user.id]
    );

    if (currentAdmin.rows.length === 0 || !currentAdmin.rows[0].can_edit_admins) {
      return res.status(403).json({ error: 'Insufficient permissions to change admin credentials' });
    }

    // Check if target user is admin
    const targetUser = await pool.query(
      'SELECT * FROM users WHERE id = $1 AND role = $2',
      [id, 'admin']
    );

    if (targetUser.rows.length === 0) {
      return res.status(404).json({ error: 'Admin not found' });
    }

    let updateFields = [];
    let params = [];
    let paramCount = 0;

    if (email) {
      paramCount++;
      updateFields.push(`email = $${paramCount}`);
      params.push(email);
    }

    if (phone) {
      paramCount++;
      updateFields.push(`phone = $${paramCount}`);
      params.push(phone);
    }

    if (password) {
      const hashedPassword = await bcrypt.hash(password, 10);
      paramCount++;
      updateFields.push(`password_hash = $${paramCount}`);
      params.push(hashedPassword);
    }

    if (updateFields.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    paramCount++;
    params.push(id);

    const query = `UPDATE users SET ${updateFields.join(', ')} WHERE id = $${paramCount} RETURNING id, name, email, phone, role`;
    const result = await pool.query(query, params);

    await logAdminAction(
      req.user.id,
      'CHANGE_ADMIN_CREDENTIALS',
      'users',
      id,
      { changedFields: updateFields.map(f => f.split(' = ')[0]) },
      req
    );

    res.json({
      message: 'Admin credentials updated successfully',
      admin: result.rows[0]
    });
  } catch (error) {
    console.error('Change admin credentials error:', error);
    res.status(500).json({ error: 'Failed to change admin credentials' });
  }
});

// Get audit logs
router.get('/audit-logs', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const offset = (page - 1) * limit;

    const result = await pool.query(
      `SELECT al.*, u.name as admin_name, u.email as admin_email
       FROM audit_logs al
       LEFT JOIN users u ON al.admin_id = u.id
       ORDER BY al.created_at DESC
       LIMIT $1 OFFSET $2`,
      [limit, offset]
    );

    const countResult = await pool.query('SELECT COUNT(*) FROM audit_logs');
    const totalCount = parseInt(countResult.rows[0].count);

    res.json({
      logs: result.rows,
      pagination: {
        page,
        limit,
        total: totalCount,
        pages: Math.ceil(totalCount / limit)
      }
    });
  } catch (error) {
    console.error('Get audit logs error:', error);
    res.status(500).json({ error: 'Failed to fetch audit logs' });
  }
});

// Export data
router.get('/export/:type', async (req, res) => {
  try {
    const { type } = req.params;
    const format = req.query.format || 'csv';

    let data = [];
    let filename = '';

    switch (type) {
      case 'users':
        const usersResult = await pool.query(
          'SELECT id, name, email, phone, role, verified, created_at FROM users ORDER BY created_at DESC'
        );
        data = usersResult.rows;
        filename = `users_export_${new Date().toISOString().split('T')[0]}`;
        break;

      case 'orders':
        const ordersResult = await pool.query(
          `SELECT o.id, o.total_amount, o.payment_status, o.order_status, o.created_at,
                  u.name as customer_name, s.name as seller_name
           FROM orders o
           JOIN users u ON o.customer_id = u.id
           JOIN users s ON o.seller_id = s.id
           ORDER BY o.created_at DESC`
        );
        data = ordersResult.rows;
        filename = `orders_export_${new Date().toISOString().split('T')[0]}`;
        break;

      case 'rides':
        const ridesResult = await pool.query(
          `SELECT tr.id, tr.pickup, tr.destination, tr.price, tr.status, tr.created_at,
                  u.name as customer_name, d.name as driver_name
           FROM taxirides tr
           JOIN users u ON tr.customer_id = u.id
           LEFT JOIN users d ON tr.driver_id = d.id
           ORDER BY tr.created_at DESC`
        );
        data = ridesResult.rows;
        filename = `rides_export_${new Date().toISOString().split('T')[0]}`;
        break;

      default:
        return res.status(400).json({ error: 'Invalid export type' });
    }

    await logAdminAction(
      req.user.id,
      'EXPORT_DATA',
      type,
      null,
      { type, format, recordCount: data.length },
      req
    );

    if (format === 'json') {
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}.json"`);
      res.json(data);
    } else {
      // CSV format
      if (data.length === 0) {
        return res.status(404).json({ error: 'No data to export' });
      }

      const headers = Object.keys(data[0]);
      const csvContent = [
        headers.join(','),
        ...data.map(row => 
          headers.map(header => 
            JSON.stringify(row[header] || '')
          ).join(',')
        )
      ].join('\n');

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}.csv"`);
      res.send(csvContent);
    }
  } catch (error) {
    console.error('Export error:', error);
    res.status(500).json({ error: 'Export failed' });
  }
});

export default router;