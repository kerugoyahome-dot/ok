import express from 'express';
import pool from '../config/database.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';

const router = express.Router();

// Create order/checkout
router.post('/checkout', authenticateToken, requireRole(['customer']), async (req, res) => {
  try {
    const { items, paymentMethod, deliveryAddress } = req.body;

    if (!items || items.length === 0) {
      return res.status(400).json({ error: 'Order items are required' });
    }

    if (!paymentMethod) {
      return res.status(400).json({ error: 'Payment method is required' });
    }

    // Validate items and calculate total
    let totalAmount = 0;
    const productItems = [];

    for (const item of items) {
      const productResult = await pool.query(
        'SELECT * FROM products WHERE id = $1 AND stock >= $2',
        [item.productId, item.quantity]
      );

      if (productResult.rows.length === 0) {
        return res.status(400).json({ 
          error: `Product ${item.productId} not found or insufficient stock` 
        });
      }

      const product = productResult.rows[0];
      const itemTotal = product.price * item.quantity;
      totalAmount += itemTotal;

      productItems.push({
        product_id: product.id,
        title: product.title,
        price: product.price,
        quantity: item.quantity,
        total: itemTotal,
        seller_id: product.seller_id
      });

      // Update product stock
      await pool.query(
        'UPDATE products SET stock = stock - $1 WHERE id = $2',
        [item.quantity, product.id]
      );
    }

    // Group items by seller to create separate orders
    const ordersBySeller = {};
    productItems.forEach(item => {
      if (!ordersBySeller[item.seller_id]) {
        ordersBySeller[item.seller_id] = {
          seller_id: item.seller_id,
          items: [],
          total: 0
        };
      }
      ordersBySeller[item.seller_id].items.push(item);
      ordersBySeller[item.seller_id].total += item.total;
    });

    const createdOrders = [];

    // Create separate order for each seller
    for (const sellerOrder of Object.values(ordersBySeller)) {
      const orderResult = await pool.query(
        `INSERT INTO orders (customer_id, seller_id, product_items, total_amount, payment_method, delivery_address)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING *`,
        [
          req.user.id,
          sellerOrder.seller_id,
          JSON.stringify(sellerOrder.items),
          sellerOrder.total,
          paymentMethod,
          deliveryAddress
        ]
      );

      createdOrders.push(orderResult.rows[0]);
    }

    // Create payment record
    await pool.query(
      `INSERT INTO payments (user_id, amount, method, purpose, status, reference)
       VALUES ($1, $2, $3, 'order', 'pending', $4)`,
      [req.user.id, totalAmount, paymentMethod, `ORDER_${createdOrders[0].id}`]
    );

    res.status(201).json({
      message: 'Orders created successfully',
      orders: createdOrders,
      totalAmount,
      requiresPayment: paymentMethod !== 'cash'
    });
  } catch (error) {
    console.error('Checkout error:', error);
    res.status(500).json({ error: 'Checkout failed' });
  }
});

// Get customer orders
router.get('/my-orders', authenticateToken, requireRole(['customer']), async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT o.*, u.name as seller_name, u.phone as seller_phone
       FROM orders o
       JOIN users u ON o.seller_id = u.id
       WHERE o.customer_id = $1
       ORDER BY o.created_at DESC`,
      [req.user.id]
    );

    res.json({ orders: result.rows });
  } catch (error) {
    console.error('Get customer orders error:', error);
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
});

// Get seller orders
router.get('/seller-orders', authenticateToken, requireRole(['seller']), async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT o.*, u.name as customer_name, u.phone as customer_phone, u.email as customer_email
       FROM orders o
       JOIN users u ON o.customer_id = u.id
       WHERE o.seller_id = $1
       ORDER BY o.created_at DESC`,
      [req.user.id]
    );

    res.json({ orders: result.rows });
  } catch (error) {
    console.error('Get seller orders error:', error);
    res.status(500).json({ error: 'Failed to fetch seller orders' });
  }
});

// Update order status (seller only)
router.put('/:id/status', authenticateToken, requireRole(['seller']), async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!['confirmed', 'dispatched', 'delivered', 'cancelled'].includes(status)) {
      return res.status(400).json({ error: 'Invalid order status' });
    }

    const result = await pool.query(
      `UPDATE orders 
       SET order_status = $1, updated_at = CURRENT_TIMESTAMP
       WHERE id = $2 AND seller_id = $3
       RETURNING *`,
      [status, id, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Order not found or access denied' });
    }

    res.json({
      message: 'Order status updated successfully',
      order: result.rows[0]
    });
  } catch (error) {
    console.error('Update order status error:', error);
    res.status(500).json({ error: 'Failed to update order status' });
  }
});

// Get single order details
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `SELECT o.*, 
              u.name as customer_name, u.phone as customer_phone, u.email as customer_email,
              s.name as seller_name, s.phone as seller_phone, s.email as seller_email
       FROM orders o
       JOIN users u ON o.customer_id = u.id
       JOIN users s ON o.seller_id = s.id
       WHERE o.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }

    const order = result.rows[0];

    // Check if user has access to this order
    if (req.user.role !== 'admin' && req.user.id !== order.customer_id && req.user.id !== order.seller_id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    res.json({ order });
  } catch (error) {
    console.error('Get order details error:', error);
    res.status(500).json({ error: 'Failed to fetch order details' });
  }
});

export default router;