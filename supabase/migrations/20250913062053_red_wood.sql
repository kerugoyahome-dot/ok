-- QUICKLINK Database Schema
-- Run this script to create all required tables

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table (main users table for all roles)
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    role VARCHAR(20) CHECK (role IN ('admin', 'seller', 'driver', 'customer', 'agent')) NOT NULL,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE,
    phone VARCHAR(20) UNIQUE,
    password_hash VARCHAR(255),
    is_active BOOLEAN DEFAULT true,
    subscription_expiry DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    verified BOOLEAN DEFAULT false,
    id_document_url TEXT,
    profile_image_url TEXT
);

-- Admins table (extends users for admin-specific data)
CREATE TABLE IF NOT EXISTS admins (
    id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    can_edit_admins BOOLEAN DEFAULT true,
    last_login TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Products table
CREATE TABLE IF NOT EXISTS products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    seller_id UUID REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    price NUMERIC(12, 2) NOT NULL,
    stock INTEGER DEFAULT 0,
    category VARCHAR(100) NOT NULL,
    discount NUMERIC(5, 2) DEFAULT 0,
    featured BOOLEAN DEFAULT false,
    image_url TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Orders table
CREATE TABLE IF NOT EXISTS orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_id UUID REFERENCES users(id) ON DELETE CASCADE,
    seller_id UUID REFERENCES users(id) ON DELETE CASCADE,
    product_items JSONB NOT NULL,
    total_amount NUMERIC(12, 2) NOT NULL,
    payment_method VARCHAR(20) CHECK (payment_method IN ('mpesa_paybill', 'mpesa_till', 'card', 'cash')) NOT NULL,
    payment_status VARCHAR(20) CHECK (payment_status IN ('pending', 'verified', 'failed')) DEFAULT 'pending',
    order_status VARCHAR(20) CHECK (order_status IN ('pending', 'confirmed', 'dispatched', 'delivered', 'cancelled')) DEFAULT 'pending',
    delivery_address TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Taxi rides table
CREATE TABLE IF NOT EXISTS taxirides (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_id UUID REFERENCES users(id) ON DELETE CASCADE,
    driver_id UUID REFERENCES users(id) ON DELETE SET NULL,
    pickup TEXT NOT NULL,
    destination TEXT NOT NULL,
    distance_km NUMERIC(8, 2),
    price NUMERIC(10, 2),
    car_category VARCHAR(20) CHECK (car_category IN ('Medium', 'XL')) DEFAULT 'Medium',
    status VARCHAR(20) CHECK (status IN ('pending', 'confirmed', 'in_progress', 'completed', 'cancelled')) DEFAULT 'pending',
    confirmed_at TIMESTAMP,
    completed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Errands table
CREATE TABLE IF NOT EXISTS errands (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_id UUID REFERENCES users(id) ON DELETE CASCADE,
    assigned_to UUID REFERENCES users(id) ON DELETE SET NULL,
    type VARCHAR(50) CHECK (type IN ('kids_pickup', 'parcel', 'grocery', 'other')) NOT NULL,
    details TEXT NOT NULL,
    status VARCHAR(20) CHECK (status IN ('pending', 'assigned', 'in_progress', 'completed', 'cancelled')) DEFAULT 'pending',
    scheduled_at TIMESTAMP,
    pickup_location TEXT,
    destination TEXT,
    price NUMERIC(10, 2),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Properties table
CREATE TABLE IF NOT EXISTS properties (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    agent_id UUID REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    type VARCHAR(20) CHECK (type IN ('land', 'house')) NOT NULL,
    price NUMERIC(15, 2) NOT NULL,
    location TEXT NOT NULL,
    images TEXT[],
    bedrooms INTEGER,
    bathrooms INTEGER,
    size_sqft INTEGER,
    featured BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Payments table
CREATE TABLE IF NOT EXISTS payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    amount NUMERIC(12, 2) NOT NULL,
    method VARCHAR(20) CHECK (method IN ('mpesa_paybill', 'mpesa_till', 'card', 'cash')) NOT NULL,
    purpose VARCHAR(50) CHECK (purpose IN ('subscription', 'order', 'ride', 'errand', 'property')) NOT NULL,
    status VARCHAR(20) CHECK (status IN ('pending', 'verified', 'failed')) DEFAULT 'pending',
    reference TEXT UNIQUE,
    transaction_id TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    verified_at TIMESTAMP
);

-- Messages table
CREATE TABLE IF NOT EXISTS messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sender_id UUID REFERENCES users(id) ON DELETE CASCADE,
    receiver_id UUID REFERENCES users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    read BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Audit logs table
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    admin_id UUID REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    target_table VARCHAR(50),
    target_id UUID,
    details JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    immutable BOOLEAN DEFAULT true
);

-- Driver details table
CREATE TABLE IF NOT EXISTS driver_details (
    id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    car_make VARCHAR(50),
    car_model VARCHAR(50),
    car_registration VARCHAR(20) UNIQUE,
    car_category VARCHAR(20) CHECK (car_category IN ('Medium', 'XL')) DEFAULT 'Medium',
    license_number VARCHAR(50),
    license_expiry DATE,
    online_status BOOLEAN DEFAULT false,
    current_location POINT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone);
CREATE INDEX IF NOT EXISTS idx_products_seller_id ON products(seller_id);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
CREATE INDEX IF NOT EXISTS idx_orders_customer_id ON orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_orders_seller_id ON orders(seller_id);
CREATE INDEX IF NOT EXISTS idx_taxirides_customer_id ON taxirides(customer_id);
CREATE INDEX IF NOT EXISTS idx_taxirides_driver_id ON taxirides(driver_id);
CREATE INDEX IF NOT EXISTS idx_taxirides_status ON taxirides(status);
CREATE INDEX IF NOT EXISTS idx_errands_customer_id ON errands(customer_id);
CREATE INDEX IF NOT EXISTS idx_errands_assigned_to ON errands(assigned_to);
CREATE INDEX IF NOT EXISTS idx_properties_agent_id ON properties(agent_id);
CREATE INDEX IF NOT EXISTS idx_payments_user_id ON payments(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);
CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_receiver_id ON messages(receiver_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_admin_id ON audit_logs(admin_id);
CREATE INDEX IF NOT EXISTS idx_driver_details_online_status ON driver_details(online_status);