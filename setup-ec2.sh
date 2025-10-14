#!/bin/bash
# Quick setup script for t2.micro EC2 instance
# Run this on your EC2 server to fix disk space issues

echo "🚀 Quick Setup for t2.micro EC2"
echo "================================"

# Create swap file if it doesn't exist
if [ ! -f /swapfile ]; then
    echo "📦 Creating 2GB swap file..."
    sudo fallocate -l 2G /swapfile
    sudo chmod 600 /swapfile
    sudo mkswap /swapfile
    sudo swapon /swapfile
    echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
    echo "✅ Swap file created"
else
    echo "✅ Swap file already exists"
fi

# Create necessary directories
echo "📁 Creating upload directories..."
mkdir -p /home/ubuntu/Chinthanaprabha-cpMusic--Backend/uploads/temp
mkdir -p /home/ubuntu/Chinthanaprabha-cpMusic--Backend/uploads/progress
echo "✅ Directories created"

# Set proper permissions
echo "🔐 Setting permissions..."
chmod 755 /home/ubuntu/Chinthanaprabha-cpMusic--Backend/uploads
chmod 755 /home/ubuntu/Chinthanaprabha-cpMusic--Backend/uploads/temp
chmod 755 /home/ubuntu/Chinthanaprabha-cpMusic--Backend/uploads/progress
echo "✅ Permissions set"

# Check disk space
echo "📊 Current disk usage:"
df -h /

# Show system info
echo ""
echo "💻 System Information:"
echo "Memory: $(free -h | grep Mem | awk '{print $2}')"
echo "CPU: $(nproc) cores"
echo "Swap: $(free -h | grep Swap | awk '{print $2}')"

echo ""
echo "✅ Setup completed!"
echo "💡 Next steps:"
echo "   1. Run emergency cleanup if disk is full: ./emergency-cleanup.sh"
echo "   2. Start monitoring: ./monitor-disk.sh"
echo "   3. Start your application: ./start-t2micro.sh"
