#!/usr/bin/env node
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

// Set production environment
process.env.NODE_ENV = 'production';
const PORT = process.env.PORT || 5000;

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Create Express app
const app = express();

// Import and start the Discord bot and server directly
try {
  const { default: serverModule } = await import('./server/index.ts');
  console.log(`🚀 Production server started on port ${PORT}`);
} catch (error) {
  console.error('Failed to start production server:', error);
  process.exit(1);
}