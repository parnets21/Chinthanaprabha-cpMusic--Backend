#!/usr/bin/env node

/**
 * Cleanup script for temporary upload files
 * Run this periodically to clean up orphaned temp files
 */

const fs = require('fs');
const path = require('path');

const TEMP_DIR = path.join(__dirname, 'uploads', 'temp');
const MAX_AGE_HOURS = 2; // Clean files older than 2 hours

function cleanupTempFiles() {
  console.log(`🧹 Starting cleanup of temp files in: ${TEMP_DIR}`);
  
  if (!fs.existsSync(TEMP_DIR)) {
    console.log('📁 Temp directory does not exist, skipping cleanup');
    return;
  }

  const files = fs.readdirSync(TEMP_DIR);
  const now = Date.now();
  let cleanedCount = 0;
  let totalSize = 0;

  files.forEach(file => {
    const filePath = path.join(TEMP_DIR, file);
    const stats = fs.statSync(filePath);
    
    // Check if file is older than MAX_AGE_HOURS
    const ageHours = (now - stats.mtime.getTime()) / (1000 * 60 * 60);
    
    if (ageHours > MAX_AGE_HOURS) {
      try {
        const fileSize = stats.size;
        fs.unlinkSync(filePath);
        cleanedCount++;
        totalSize += fileSize;
        console.log(`🗑️ Cleaned: ${file} (${Math.round(fileSize / 1024 / 1024)}MB, ${ageHours.toFixed(1)}h old)`);
      } catch (error) {
        console.error(`❌ Error cleaning ${file}: ${error.message}`);
      }
    }
  });

  console.log(`✅ Cleanup complete: ${cleanedCount} files removed, ${Math.round(totalSize / 1024 / 1024)}MB freed`);
}

// Run cleanup
cleanupTempFiles();

// Export for use in other modules
module.exports = { cleanupTempFiles };
