#!/usr/bin/env node

const path = require('path');
const fs = require('fs');

// Support tsx in development or compiled dist in production
const distPath = path.resolve(__dirname, '../dist/index.js');
const srcPath = path.resolve(__dirname, '../src/index.ts');

if (fs.existsSync(distPath)) {
  require(distPath);
} else {
  // Use tsx on the fly if dist not built yet
  require('tsx/cjs');
  require(srcPath);
}
