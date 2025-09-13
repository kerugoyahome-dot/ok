import express from 'express';
import pool from '../config/database.js';
import { authenticateToken, requireRole, requireSubscription } from '../middleware/auth.js';

const router = express.Router();

// Get all products with pagination and filters
router.get('/products', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 12;
    const category = req.query.category;
    const search = req.query.search;
    const featured = req.query.featured === 'true';
    const offset = (page - 1) * limit;

    let query = `
      SELECT p.*, u.name as seller_name, u.verified as seller_verified
      FROM products p
      JOIN users u ON p.seller_id = u.id
      WHERE p.stock > 0
    `;
    let params = [];
    let paramCount = 0;

    if (category) {
      paramCount++;
      query += ` AND p.category = $${paramCount}`;
      params.push(category);
    }

    if (search) {
      paramCount++;
      query += ` AND (p.title ILIKE $${paramCount} OR p.description ILIKE $${paramCount})`;
      params.push(`%${search}%`);
    }

    if (featured) {
      query += ` AND p.featured = true`;
    }

    query += ` ORDER BY p.created_at DESC LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
    params.push(limit, offset);

    const result = await pool.query(query, params);

    // Get total count
    let countQuery = `
      SELECT COUNT(*) FROM products p 
      JOIN users u ON p.seller_id = u.id 
      WHERE p.stock > 0
    `;
    let countParams = [];
    paramCount = 0;

    if (category) {
      paramCount++;
      countQuery += ` AND p.category = $${paramCount}`;
      countParams.push(category);
    }

    if (search) {
      paramCount++;
      countQuery += ` AND (p.title ILIKE $${paramCount} OR p.description ILIKE $${paramCount})`;
      countParams.push(`%${search}%`);
    }

    if (featured) {
      countQuery += ` AND p.featured = true`;
    }

    const countResult = await pool.query(countQuery, countParams);
    const totalCount = parseInt(countResult.rows[0].count);

    res.json({
      products: result.rows,
      pagination: {
        page,
        limit,
        total: totalCount,
        pages: Math.ceil(totalCount / limit)
      }
    });
  } catch (error) {
    console.error('Get products error:', error);
    res.status(500).json({ error: 'Failed to fetch products' });
  }
});

// Get single product
router.get('/products/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `SELECT p.*, u.name as seller_name, u.email as seller_email, u.phone as seller_phone, u.verified as seller_verified
       FROM products p
       JOIN users u ON p.seller_id = u.id
       WHERE p.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }

    res.json({ product: result.rows[0] });
  } catch (error) {
    console.error('Get product error:', error);
    res.status(500).json({ error: 'Failed to fetch product' });
  }
});

// Create product (sellers only)
router.post('/products', authenticateToken, requireRole(['seller']), requireSubscription, async (req, res) => {
  try {
    const { title, description, price, stock, category, imageUrl, discount, featured } = req.body;

    if (!title || !price || !stock || !category) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const result = await pool.query(
      `INSERT INTO products (seller_id, title, description, price, stock, category, image_url, discount, featured)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [req.user.id, title, description, price, stock, category, imageUrl, discount || 0, featured || false]
    );

    res.status(201).json({
      message: 'Product created successfully',
      product: result.rows[0]
    });
  } catch (error) {
    console.error('Create product error:', error);
    res.status(500).json({ error: 'Failed to create product' });
  }
});

// Update product
router.put('/products/:id', authenticateToken, requireRole(['seller']), async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, price, stock, category, imageUrl, discount, featured } = req.body;

    // Check if product belongs to seller
    const productCheck = await pool.query(
      'SELECT * FROM products WHERE id = $1 AND seller_id = $2',
      [id, req.user.id]
    );

    if (productCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Product not found or access denied' });
    }

    const result = await pool.query(
      `UPDATE products 
       SET title = $1, description = $2, price = $3, stock = $4, category = $5, 
           image_url = $6, discount = $7, featured = $8, updated_at = CURRENT_TIMESTAMP
       WHERE id = $9 AND seller_id = $10
       RETURNING *`,
      [title, description, price, stock, category, imageUrl, discount, featured, id, req.user.id]
    );

    res.json({
      message: 'Product updated successfully',
      product: result.rows[0]
    });
  } catch (error) {
    console.error('Update product error:', error);
    res.status(500).json({ error: 'Failed to update product' });
  }
});

// Delete product
router.delete('/products/:id', authenticateToken, requireRole(['seller']), async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      'DELETE FROM products WHERE id = $1 AND seller_id = $2 RETURNING *',
      [id, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Product not found or access denied' });
    }

    res.json({ message: 'Product deleted successfully' });
  } catch (error) {
    console.error('Delete product error:', error);
    res.status(500).json({ error: 'Failed to delete product' });
  }
});

// Get seller's products
router.get('/seller/products', authenticateToken, requireRole(['seller']), async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 12;
    const offset = (page - 1) * limit;

    const result = await pool.query(
      `SELECT * FROM products 
       WHERE seller_id = $1 
       ORDER BY created_at DESC 
       LIMIT $2 OFFSET $3`,
      [req.user.id, limit, offset]
    );

    const countResult = await pool.query(
      'SELECT COUNT(*) FROM products WHERE seller_id = $1',
      [req.user.id]
    );
    const totalCount = parseInt(countResult.rows[0].count);

    res.json({
      products: result.rows,
      pagination: {
        page,
        limit,
        total: totalCount,
        pages: Math.ceil(totalCount / limit)
      }
    });
  } catch (error) {
    console.error('Get seller products error:', error);
    res.status(500).json({ error: 'Failed to fetch seller products' });
  }
});

// Get product categories
router.get('/categories', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT category, COUNT(*) as product_count
       FROM products 
       WHERE stock > 0
       GROUP BY category
       ORDER BY category`
    );

    const categories = [
      'Electronics',
      'Clothing',
      'Food',
      'Home & Garden',
      'Sports',
      'Books',
      'Health & Beauty',
      'Professional Services'
    ];

    const categoriesWithCounts = categories.map(cat => {
      const found = result.rows.find(row => row.category === cat);
      return {
        name: cat,
        count: found ? parseInt(found.product_count) : 0
      };
    });

    res.json({ categories: categoriesWithCounts });
  } catch (error) {
    console.error('Get categories error:', error);
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
});

export default router;