#!/bin/bash
# Test script for t2.micro upload optimization
# This script creates a test file and monitors the upload process

echo "🧪 Testing t2.micro Upload Optimization"
echo "======================================"

# Create a test directory
mkdir -p /tmp/upload-test
cd /tmp/upload-test

# Create a test file (100MB for testing)
echo "📁 Creating test file (100MB)..."
dd if=/dev/zero of=test-video.mp4 bs=1M count=100 2>/dev/null

echo "📊 Test file created:"
ls -lh test-video.mp4

echo ""
echo "🚀 Starting upload test..."
echo "Monitor the server logs for progress..."

# Test the upload endpoint
curl -X POST \
  -F "video=@test-video.mp4" \
  http://localhost:5000/chinthanaprabha/upload-video \
  --max-time 1800 \
  --progress-bar

echo ""
echo "✅ Upload test completed!"
echo "Check server logs for detailed progress information"

# Clean up
cd /
rm -rf /tmp/upload-test
