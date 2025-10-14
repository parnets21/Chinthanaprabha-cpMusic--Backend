#!/bin/bash

# Optimized startup script for t2.micro EC2 instances
echo "🚀 Starting optimized server for t2.micro..."

# Set Node.js memory limit (512MB for t2.micro)
export NODE_OPTIONS="--max-old-space-size=512"

# Enable garbage collection
export NODE_OPTIONS="$NODE_OPTIONS --expose-gc"

# Optimize for low memory
export NODE_OPTIONS="$NODE_OPTIONS --optimize-for-size"

# Set environment
export NODE_ENV=production

# Create swap file if it doesn't exist (for t2.micro)
if [ ! -f /swapfile ]; then
    echo "📦 Creating swap file for t2.micro..."
    sudo fallocate -l 1G /swapfile
    sudo chmod 600 /swapfile
    sudo mkswap /swapfile
    sudo swapon /swapfile
    echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
fi

# Check swap
echo "💾 Swap status:"
free -h

# Start the server with PM2
echo "🎯 Starting server with PM2..."
pm2 start server.js --name "cpsangeetha-server" --node-args="$NODE_OPTIONS"

# Show status
pm2 status

echo "✅ Server started successfully!"
echo "📊 Monitor with: pm2 monit"
echo "📝 Logs with: pm2 logs"
