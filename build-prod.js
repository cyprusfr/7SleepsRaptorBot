#!/usr/bin/env node
import { execSync } from 'child_process';
import { existsSync, rmSync } from 'fs';

console.log('🔧 Starting optimized production build...');

// Clean previous build
if (existsSync('dist')) {
  rmSync('dist', { recursive: true, force: true });
  console.log('✅ Cleaned previous build');
}

try {
  // Build frontend with timeout protection
  console.log('📦 Building frontend...');
  execSync('timeout 120 vite build', { 
    stdio: 'inherit',
    timeout: 120000
  });
  
  // Build backend
  console.log('🖥️  Building backend...');
  execSync('esbuild server/index.ts --platform=node --packages=external --bundle --format=esm --outdir=dist --minify', {
    stdio: 'inherit',
    timeout: 30000
  });
  
  console.log('🚀 Production build completed successfully!');
} catch (error) {
  console.error('❌ Build failed:', error.message);
  process.exit(1);
}