#!/bin/bash
# Startup script optimized for t2.micro EC2 instance
# Run this before starting your Node.js application

echo "🚀 Starting Node.js server optimized for t2.micro..."

# Set Node.js memory limits
export NODE_OPTIONS="--max-old-space-size=512 --max-semi-space-size=64 --gc-interval=100"

# Set file upload limits
export MAX_FILE_SIZE=2147483648  # 2GB max
export CHUNK_SIZE=2097152        # 2MB chunks
export MAX_CONCURRENT_UPLOADS=1  # Only 1 upload at a time

# Set server timeouts
export SERVER_TIMEOUT=1800000    # 30 minutes
export KEEP_ALIVE_TIMEOUT=300000 # 5 minutes
export HEADERS_TIMEOUT=60000     # 1 minute

# Enable memory monitoring
export ENABLE_MEMORY_MONITORING=true
export MEMORY_WARNING_THRESHOLD=80
export MEMORY_CRITICAL_THRESHOLD=95

# Create swap file if it doesn't exist (helps with memory)
if [ ! -f /swapfile ]; then
    echo "📦 Creating swap file..."
    sudo fallocate -l 1G /swapfile
    sudo chmod 600 /swapfile
    sudo mkswap /swapfile
    sudo swapon /swapfile
    echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
fi

# Check system resources
echo "📊 System Resources:"
echo "Memory: $(free -h | grep Mem | awk '{print $3 "/" $2}')"
echo "Disk: $(df -h / | tail -1 | awk '{print $3 "/" $2 " (" $5 ")"}')"
echo "CPU: $(nproc) cores"

# Start the application
echo "🎯 Starting application with optimized settings..."
node server.js

