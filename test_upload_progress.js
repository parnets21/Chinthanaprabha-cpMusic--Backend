const { io } = require('socket.io-client');
const FormData = require('form-data');
const fs = require('fs');

console.log('🧪 Testing upload with Socket.IO progress tracking...');

// Create a test video file
const testContent = Buffer.alloc(1024 * 1024, 'test video content'); // 1MB test file
fs.writeFileSync('test_video.mp4', testContent);

const socket = io('http://localhost:5000');
let uploadId = null;

socket.on('connect', () => {
  console.log('✅ Connected to Socket.IO server');
  console.log('📡 Socket ID:', socket.id);
  
  // Generate upload ID
  uploadId = 'test_upload_' + Date.now();
  console.log('📡 Subscribing to upload:', uploadId);
  socket.emit('subscribeUpload', { uploadId: uploadId });
  
  // Listen for progress updates
  socket.on('uploadProgress', (data) => {
    console.log('📡 Received upload progress:', data);
    if (data.uploadId === uploadId) {
      console.log(`📊 Progress: ${data.percentage}% (${data.uploadedBytes}/${data.fileSize} bytes)`);
    }
  });
  
  // Start upload
  setTimeout(() => {
    console.log('📤 Starting upload...');
    
    const formData = new FormData();
    formData.append('video', fs.createReadStream('test_video.mp4'));
    formData.append('uploadId', uploadId);
    
    const axios = require('axios');
    axios.post('http://localhost:5000/chinthanaprabha/upload-video', formData, {
      headers: {
        ...formData.getHeaders(),
      },
      timeout: 30000
    }).then(response => {
      console.log('✅ Upload completed:', response.data);
      socket.disconnect();
      fs.unlinkSync('test_video.mp4');
      process.exit(0);
    }).catch(error => {
      console.error('❌ Upload failed:', error.message);
      socket.disconnect();
      fs.unlinkSync('test_video.mp4');
      process.exit(1);
    });
  }, 1000);
});

socket.on('connect_error', (error) => {
  console.error('❌ Socket.IO connection error:', error);
  process.exit(1);
});

console.log('📡 Attempting to connect to Socket.IO server...');
