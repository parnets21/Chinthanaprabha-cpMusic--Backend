#!/bin/bash
# System monitoring script for t2.micro EC2 instance
# Run this to monitor system resources during uploads

echo "🔍 t2.micro System Monitor"
echo "=========================="

while true; do
    clear
    echo "🔍 t2.micro System Monitor - $(date)"
    echo "=========================="
    
    # Memory usage
    echo "📊 Memory Usage:"
    free -h
    echo ""
    
    # CPU usage
    echo "⚡ CPU Usage:"
    top -bn1 | grep "Cpu(s)" | awk '{print $2}' | awk -F'%' '{print "CPU Usage: " $1 "%"}'
    echo ""
    
    # Disk usage
    echo "💾 Disk Usage:"
    df -h /
    echo ""
    
    # Network connections
    echo "🌐 Network Connections:"
    netstat -an | grep :5000 | wc -l | awk '{print "Active connections: " $1}'
    echo ""
    
    # Process memory usage
    echo "🔧 Node.js Process Memory:"
    ps aux | grep node | grep -v grep | awk '{print "PID: " $2 " Memory: " $4 "% CPU: " $3 "%"}'
    echo ""
    
    # Swap usage (if any)
    echo "🔄 Swap Usage:"
    swapon --show
    echo ""
    
    echo "Press Ctrl+C to exit"
    sleep 5
done

