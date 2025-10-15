const { io } = require('socket.io-client');

console.log('🧪 Testing Socket.IO connection...');

const socket = io('http://localhost:5000');

socket.on('connect', () => {
  console.log('✅ Connected to Socket.IO server');
  console.log('📡 Socket ID:', socket.id);
  
  // Test subscription
  const testUploadId = 'test_upload_' + Date.now();
  console.log('📡 Subscribing to upload:', testUploadId);
  socket.emit('subscribeUpload', { uploadId: testUploadId });
  
  // Listen for progress updates
  socket.on('uploadProgress', (data) => {
    console.log('📡 Received upload progress:', data);
  });
  
  // Test after 5 seconds
  setTimeout(() => {
    console.log('📡 Test completed');
    socket.disconnect();
    process.exit(0);
  }, 5000);
});

socket.on('connect_error', (error) => {
  console.error('❌ Socket.IO connection error:', error);
  process.exit(1);
});

socket.on('disconnect', () => {
  console.log('📡 Disconnected from Socket.IO server');
});

console.log('📡 Attempting to connect to Socket.IO server...');
