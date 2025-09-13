import pool from '../config/database.js';
import bcrypt from 'bcryptjs';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const seedDatabase = async () => {
  try {
    console.log('🌱 Starting database seeding...');

    // Read and execute schema
    console.log('📋 Creating database schema...');
    const schema = readFileSync(join(__dirname, '../config/schema.sql'), 'utf8');
    await pool.query(schema);
    console.log('✅ Schema created successfully');

    // Clear existing data (in reverse order of dependencies)
    console.log('🧹 Clearing existing data...');
    await pool.query('DELETE FROM audit_logs');
    await pool.query('DELETE FROM messages');
    await pool.query('DELETE FROM payments');
    await pool.query('DELETE FROM properties');
    await pool.query('DELETE FROM errands');
    await pool.query('DELETE FROM taxirides');
    await pool.query('DELETE FROM orders');
    await pool.query('DELETE FROM products');
    await pool.query('DELETE FROM driver_details');
    await pool.query('DELETE FROM admins');
    await pool.query('DELETE FROM users');

    // Hash password for demo users
    const demoPassword = await bcrypt.hash('password123', 10);

    // Seed Users
    console.log('👥 Seeding users...');
    const users = [
      {
        id: '00000000-0000-0000-0000-000000000001',
        role: 'admin',
        name: 'Super Admin',
        email: 'admin@quicklink.com',
        phone: '0711000000',
        password_hash: demoPassword,
        subscription_expiry: '2026-01-01',
        verified: true
      },
      {
        id: '00000000-0000-0000-0000-000000000002',
        role: 'driver',
        name: 'James Mwangi',
        email: 'james.driver@test.com',
        phone: '0711222333',
        password_hash: demoPassword,
        subscription_expiry: '2025-10-12',
        verified: true
      },
      {
        id: '00000000-0000-0000-0000-000000000003',
        role: 'customer',
        name: 'Mary Achieng',
        email: 'mary.customer@test.com',
        phone: '0711444555',
        password_hash: demoPassword,
        verified: true
      },
      {
        id: '00000000-0000-0000-0000-000000000004',
        role: 'seller',
        name: 'Tech Store Kenya',
        email: 'seller@test.com',
        phone: '0711666777',
        password_hash: demoPassword,
        subscription_expiry: '2025-10-12',
        verified: true
      },
      {
        id: '00000000-0000-0000-0000-000000000005',
        role: 'agent',
        name: 'Property Hub Ltd',
        email: 'agent@test.com',
        phone: '0711888999',
        password_hash: demoPassword,
        subscription_expiry: '2025-10-12',
        verified: true
      },
      {
        id: '00000000-0000-0000-0000-000000000006',
        role: 'customer',
        name: 'Peter Kamau',
        email: 'peter@test.com',
        phone: '0722111222',
        password_hash: demoPassword,
        verified: true
      }
    ];

    for (const user of users) {
      await pool.query(
        `INSERT INTO users (id, role, name, email, phone, password_hash, subscription_expiry, verified)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [user.id, user.role, user.name, user.email, user.phone, user.password_hash, user.subscription_expiry, user.verified]
      );
    }

    // Create admin record
    await pool.query(
      'INSERT INTO admins (id, can_edit_admins) VALUES ($1, $2)',
      ['00000000-0000-0000-0000-000000000001', true]
    );

    // Create driver details
    await pool.query(
      `INSERT INTO driver_details (id, car_make, car_model, car_registration, car_category, license_number, online_status)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      ['00000000-0000-0000-0000-000000000002', 'Toyota', 'Corolla', 'KDA123A', 'Medium', 'DL123456', true]
    );

    console.log('✅ Users seeded successfully');

    // Seed Products
    console.log('🛍️ Seeding products...');
    const products = [
      {
        id: '10000000-0000-0000-0000-000000000001',
        seller_id: '00000000-0000-0000-0000-000000000004',
        title: 'iPhone 14 Pro',
        description: 'Latest iPhone 14 Pro with 128GB storage, excellent condition',
        price: 120000,
        stock: 5,
        category: 'Electronics',
        image_url: 'https://images.pexels.com/photos/788946/pexels-photo-788946.jpeg',
        featured: true
      },
      {
        id: '10000000-0000-0000-0000-000000000002',
        seller_id: '00000000-0000-0000-0000-000000000004',
        title: 'Classic Cotton T-Shirt',
        description: '100% cotton T-shirt, various colors available',
        price: 1500,
        stock: 50,
        category: 'Clothing',
        image_url: 'https://images.pexels.com/photos/1152994/pexels-photo-1152994.jpeg'
      },
      {
        id: '10000000-0000-0000-0000-000000000003',
        seller_id: '00000000-0000-0000-0000-000000000004',
        title: 'MacBook Pro 13"',
        description: 'Apple MacBook Pro 13-inch with M2 chip',
        price: 180000,
        stock: 3,
        category: 'Electronics',
        image_url: 'https://images.pexels.com/photos/812264/pexels-photo-812264.jpeg',
        featured: true
      },
      {
        id: '10000000-0000-0000-0000-000000000004',
        seller_id: '00000000-0000-0000-0000-000000000004',
        title: 'Web Development Service',
        description: 'Professional website development and design services',
        price: 50000,
        stock: 100,
        category: 'Professional Services',
        image_url: 'https://images.pexels.com/photos/577585/pexels-photo-577585.jpeg'
      }
    ];

    for (const product of products) {
      await pool.query(
        `INSERT INTO products (id, seller_id, title, description, price, stock, category, image_url, featured)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [product.id, product.seller_id, product.title, product.description, product.price, product.stock, product.category, product.image_url, product.featured || false]
      );
    }

    console.log('✅ Products seeded successfully');

    // Seed Properties
    console.log('🏠 Seeding properties...');
    const properties = [
      {
        id: '20000000-0000-0000-0000-000000000001',
        agent_id: '00000000-0000-0000-0000-000000000005',
        title: '3-Bedroom Apartment in Kilimani',
        description: 'Spacious 3-bedroom apartment with modern amenities, parking, and security',
        type: 'house',
        price: 7500000,
        location: 'Nairobi, Kilimani',
        images: ['https://images.pexels.com/photos/106399/pexels-photo-106399.jpeg'],
        bedrooms: 3,
        bathrooms: 2,
        size_sqft: 1200,
        featured: true
      },
      {
        id: '20000000-0000-0000-0000-000000000002',
        agent_id: '00000000-0000-0000-0000-000000000005',
        title: '1 Acre Land in Thika',
        description: 'Fertile agricultural land near Thika town, ideal for farming',
        type: 'land',
        price: 2500000,
        location: 'Thika',
        images: ['https://images.pexels.com/photos/1583884/pexels-photo-1583884.jpeg'],
        size_sqft: 43560
      }
    ];

    for (const property of properties) {
      await pool.query(
        `INSERT INTO properties (id, agent_id, title, description, type, price, location, images, bedrooms, bathrooms, size_sqft, featured)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
        [property.id, property.agent_id, property.title, property.description, property.type, property.price, property.location, property.images, property.bedrooms, property.bathrooms, property.size_sqft, property.featured || false]
      );
    }

    console.log('✅ Properties seeded successfully');

    // Seed Taxi Rides
    console.log('🚗 Seeding taxi rides...');
    const rides = [
      {
        id: '30000000-0000-0000-0000-000000000001',
        customer_id: '00000000-0000-0000-0000-000000000003',
        driver_id: '00000000-0000-0000-0000-000000000002',
        pickup: 'Westlands',
        destination: 'CBD',
        distance_km: 9,
        price: 600,
        car_category: 'Medium',
        status: 'confirmed',
        confirmed_at: new Date()
      },
      {
        id: '30000000-0000-0000-0000-000000000002',
        customer_id: '00000000-0000-0000-0000-000000000006',
        pickup: 'Airport',
        destination: 'Karen',
        distance_km: 15,
        price: 1000,
        car_category: 'Medium',
        status: 'pending'
      }
    ];

    for (const ride of rides) {
      await pool.query(
        `INSERT INTO taxirides (id, customer_id, driver_id, pickup, destination, distance_km, price, car_category, status, confirmed_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
        [ride.id, ride.customer_id, ride.driver_id, ride.pickup, ride.destination, ride.distance_km, ride.price, ride.car_category, ride.status, ride.confirmed_at]
      );
    }

    console.log('✅ Taxi rides seeded successfully');

    // Seed Errands
    console.log('📦 Seeding errands...');
    const errands = [
      {
        id: '40000000-0000-0000-0000-000000000001',
        customer_id: '00000000-0000-0000-0000-000000000003',
        assigned_to: '00000000-0000-0000-0000-000000000002',
        type: 'kids_pickup',
        details: 'Pick up from Little Stars Academy at 14:00, drop at home in Lavington',
        status: 'assigned',
        pickup_location: 'Little Stars Academy, Kilimani',
        destination: 'Lavington',
        price: 800,
        scheduled_at: new Date(Date.now() + 24 * 60 * 60 * 1000) // Tomorrow
      },
      {
        id: '40000000-0000-0000-0000-000000000002',
        customer_id: '00000000-0000-0000-0000-000000000006',
        type: 'grocery',
        details: 'Pick up groceries from Naivas Westlands',
        status: 'pending',
        pickup_location: 'Naivas Westlands',
        price: 500
      }
    ];

    for (const errand of errands) {
      await pool.query(
        `INSERT INTO errands (id, customer_id, assigned_to, type, details, status, pickup_location, destination, price, scheduled_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
        [errand.id, errand.customer_id, errand.assigned_to, errand.type, errand.details, errand.status, errand.pickup_location, errand.destination, errand.price, errand.scheduled_at]
      );
    }

    console.log('✅ Errands seeded successfully');

    // Seed Payments
    console.log('💳 Seeding payments...');
    const payments = [
      {
        id: '50000000-0000-0000-0000-000000000001',
        user_id: '00000000-0000-0000-0000-000000000004',
        amount: 500,
        method: 'mpesa_paybill',
        purpose: 'subscription',
        status: 'verified',
        reference: 'MPESA12345',
        verified_at: new Date()
      },
      {
        id: '50000000-0000-0000-0000-000000000002',
        user_id: '00000000-0000-0000-0000-000000000002',
        amount: 500,
        method: 'mpesa_paybill',
        purpose: 'subscription',
        status: 'verified',
        reference: 'MPESA67890',
        verified_at: new Date()
      },
      {
        id: '50000000-0000-0000-0000-000000000003',
        user_id: '00000000-0000-0000-0000-000000000005',
        amount: 500,
        method: 'card',
        purpose: 'subscription',
        status: 'verified',
        reference: 'STRIPE_ABC123',
        verified_at: new Date()
      }
    ];

    for (const payment of payments) {
      await pool.query(
        `INSERT INTO payments (id, user_id, amount, method, purpose, status, reference, verified_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [payment.id, payment.user_id, payment.amount, payment.method, payment.purpose, payment.status, payment.reference, payment.verified_at]
      );
    }

    console.log('✅ Payments seeded successfully');

    // Seed Messages
    console.log('💬 Seeding messages...');
    const messages = [
      {
        sender_id: '00000000-0000-0000-0000-000000000003',
        receiver_id: '00000000-0000-0000-0000-000000000004',
        content: 'Hi, is the iPhone still available?'
      },
      {
        sender_id: '00000000-0000-0000-0000-000000000004',
        receiver_id: '00000000-0000-0000-0000-000000000003',
        content: 'Yes, it is! Would you like to place an order?'
      }
    ];

    for (const message of messages) {
      await pool.query(
        `INSERT INTO messages (sender_id, receiver_id, content)
         VALUES ($1, $2, $3)`,
        [message.sender_id, message.receiver_id, message.content]
      );
    }

    console.log('✅ Messages seeded successfully');

    console.log('🎉 Database seeding completed successfully!');
    console.log('');
    console.log('Demo Accounts:');
    console.log('=============');
    console.log('Admin: admin@quicklink.com / password123');
    console.log('Driver: james.driver@test.com / password123');
    console.log('Customer: mary.customer@test.com / password123');
    console.log('Seller: seller@test.com / password123');
    console.log('Agent: agent@test.com / password123');
    console.log('');

  } catch (error) {
    console.error('❌ Database seeding failed:', error);
  } finally {
    await pool.end();
  }
};

// Run seeding
seedDatabase();