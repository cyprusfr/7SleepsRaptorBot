#!/usr/bin/env node
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 5000;

// Import server setup directly
import('./server/index.ts').then(() => {
  console.log(`🚀 Production server running on port ${PORT}`);
}).catch(error => {
  console.error('❌ Failed to start production server:', error);
  process.exit(1);
});