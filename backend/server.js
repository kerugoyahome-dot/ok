import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import app from './src/app.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config();

const PORT = process.env.PORT || 5000;
const server = express();

// Middleware
server.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));
server.use(express.json());
server.use(express.urlencoded({ extended: true }));

// Routes
server.use('/api', app);

// Health check
server.get('/health', (req, res) => {
  res.json({ status: 'OK', message: 'QUICKLINK API is running' });
});

server.listen(PORT, () => {
  console.log(`🚀 QUICKLINK Backend running on http://localhost:${PORT}`);
});