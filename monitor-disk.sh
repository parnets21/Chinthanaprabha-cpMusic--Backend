#!/bin/bash
# Disk monitoring script for t2.micro EC2
# Run this to monitor disk usage and prevent ENOSPC errors

echo "📊 Disk Monitor for t2.micro EC2"
echo "================================"

while true; do
    clear
    echo "📊 Disk Monitor - $(date)"
    echo "=========================="
    
    # Disk usage
    echo "💾 Disk Usage:"
    df -h /
    echo ""
    
    # Check if disk is getting full
    USAGE=$(df / | tail -1 | awk '{print $5}' | sed 's/%//')
    if [ $USAGE -gt 90 ]; then
        echo "🚨 WARNING: Disk usage is ${USAGE}% - CRITICAL!"
        echo "💡 Run emergency cleanup: ./emergency-cleanup.sh"
    elif [ $USAGE -gt 80 ]; then
        echo "⚠️ WARNING: Disk usage is ${USAGE}% - Getting full!"
    else
        echo "✅ Disk usage is ${USAGE}% - OK"
    fi
    echo ""
    
    # Largest directories
    echo "📁 Largest directories:"
    du -h /home/ubuntu 2>/dev/null | sort -hr | head -5
    echo ""
    
    # Uploads directory size
    if [ -d "/home/ubuntu/Chinthanaprabha-cpMusic--Backend/uploads" ]; then
        echo "📤 Uploads directory size:"
        du -sh /home/ubuntu/Chinthanaprabha-cpMusic--Backend/uploads
        echo ""
    fi
    
    # Progress files count
    if [ -d "/home/ubuntu/Chinthanaprabha-cpMusic--Backend/uploads/progress" ]; then
        PROGRESS_COUNT=$(find /home/ubuntu/Chinthanaprabha-cpMusic--Backend/uploads/progress -name "*.json" | wc -l)
        echo "📊 Progress files: $PROGRESS_COUNT"
        echo ""
    fi
    
    # Memory usage
    echo "🧠 Memory Usage:"
    free -h
    echo ""
    
    echo "Press Ctrl+C to exit"
    sleep 10
done
