import express from 'express';
import authRoutes from './routes/auth.js';
import userRoutes from './routes/users.js';
import marketplaceRoutes from './routes/marketplace.js';
import taxiRoutes from './routes/taxi.js';
import errandsRoutes from './routes/errands.js';
import propertiesRoutes from './routes/properties.js';
import paymentsRoutes from './routes/payments.js';
import messagesRoutes from './routes/messages.js';
import adminRoutes from './routes/admin.js';
import { errorHandler } from './middleware/errorHandler.js';

const app = express();

// Routes
app.use('/auth', authRoutes);
app.use('/users', userRoutes);
app.use('/marketplace', marketplaceRoutes);
app.use('/taxi', taxiRoutes);
app.use('/errands', errandsRoutes);
app.use('/properties', propertiesRoutes);
app.use('/payments', paymentsRoutes);
app.use('/messages', messagesRoutes);
app.use('/admin', adminRoutes);

// Error handling middleware
app.use(errorHandler);

export default app;