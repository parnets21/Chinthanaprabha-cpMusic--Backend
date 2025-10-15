#!/bin/bash

# Test script to verify upload functionality
echo "🧪 Testing upload functionality..."

# Create a small test file
echo "Creating test file..."
echo "This is a test video file" > test-video.txt

# Test the upload endpoint
echo "Testing upload endpoint..."
curl -X POST \
  -F "video=@test-video.txt" \
  https://cpsangeetha.com/chinthanaprabha/test-upload \
  -H "Content-Type: multipart/form-data" \
  -v

echo ""
echo "Test completed!"

# Clean up
rm test-video.txt

