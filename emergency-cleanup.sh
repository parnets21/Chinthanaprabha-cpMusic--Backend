#!/bin/bash
# Emergency disk cleanup script for t2.micro EC2 instance
# Run this on your EC2 server to free up space

echo "🚨 EMERGENCY DISK CLEANUP FOR t2.micro EC2"
echo "=========================================="

# Check current disk usage
echo "📊 Current disk usage:"
df -h

echo ""
echo "🧹 Starting cleanup process..."

# Stop the application to free up memory and file handles
echo "⏹️ Stopping Node.js application..."
sudo pkill -f node
sudo pkill -f pm2

# Clean up temporary files
echo "🗑️ Cleaning temporary files..."
sudo rm -rf /tmp/*
sudo rm -rf /var/tmp/*

# Clean up old logs
echo "📝 Cleaning old logs..."
sudo find /var/log -name "*.log" -mtime +7 -delete
sudo find /var/log -name "*.gz" -mtime +7 -delete

# Clean up package manager cache
echo "📦 Cleaning package caches..."
sudo apt-get clean
sudo apt-get autoclean
sudo apt-get autoremove -y

# Clean up old kernels (if any)
echo "🔧 Cleaning old kernels..."
sudo apt-get autoremove --purge -y

# Clean up uploads directory (keep only recent files)
echo "📁 Cleaning uploads directory..."
if [ -d "/home/ubuntu/Chinthanaprabha-cpMusic--Backend/uploads" ]; then
    cd /home/ubuntu/Chinthanaprabha-cpMusic--Backend/uploads
    # Keep only files from last 24 hours
    find . -type f -mtime +1 -delete
    echo "✅ Cleaned old upload files"
fi

# Clean up progress files (keep only recent ones)
echo "📊 Cleaning old progress files..."
if [ -d "/home/ubuntu/Chinthanaprabha-cpMusic--Backend/uploads/progress" ]; then
    cd /home/ubuntu/Chinthanaprabha-cpMusic--Backend/uploads/progress
    find . -name "*.json" -mtime +1 -delete
    echo "✅ Cleaned old progress files"
fi

# Clean up node_modules if they exist in wrong places
echo "📦 Cleaning stray node_modules..."
find /home/ubuntu -name "node_modules" -type d -exec rm -rf {} + 2>/dev/null || true

# Clean up npm cache
echo "🧹 Cleaning npm cache..."
sudo npm cache clean --force 2>/dev/null || true

# Clean up system cache
echo "💾 Cleaning system cache..."
sudo sync
sudo echo 3 > /proc/sys/vm/drop_caches 2>/dev/null || true

# Check disk usage after cleanup
echo ""
echo "📊 Disk usage after cleanup:"
df -h

# Show largest directories
echo ""
echo "📁 Largest directories:"
du -h /home/ubuntu 2>/dev/null | sort -hr | head -10

echo ""
echo "✅ Cleanup completed!"
echo "💡 Recommendations:"
echo "   1. Consider upgrading to t3.small (2GB RAM, more storage)"
echo "   2. Add swap space: sudo fallocate -l 2G /swapfile"
echo "   3. Monitor disk usage regularly"
echo "   4. Clean up uploads directory weekly"
