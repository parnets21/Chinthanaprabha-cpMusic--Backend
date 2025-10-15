const WebSocket = require('ws');
const EventEmitter = require('events');

class UploadProgressTracker extends EventEmitter {
  constructor() {
    super();
    this.activeUploads = new Map();
    this.wss = null;
  }

  // Initialize WebSocket server
  initialize(server) {
    this.wss = new WebSocket.Server({ 
      server,
      path: '/upload-progress',
      cors: {
        origin: "*",
        methods: ["GET", "POST"]
      }
    });

    this.wss.on('connection', (ws) => {
      console.log('📡 Client connected to upload progress WebSocket');
      
      ws.on('message', (message) => {
        try {
          const data = JSON.parse(message);
          if (data.type === 'subscribe') {
            ws.uploadId = data.uploadId;
            console.log(`📡 Client subscribed to upload: ${data.uploadId}`);
          }
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      });

      ws.on('close', () => {
        console.log('📡 Client disconnected from upload progress WebSocket');
      });

      ws.on('error', (error) => {
        console.error('WebSocket error:', error);
      });
    });

    console.log('🚀 Upload Progress WebSocket server initialized');
  }

  // Start tracking an upload
  startTracking(uploadId, fileName, fileSize) {
    const uploadInfo = {
      id: uploadId,
      fileName,
      fileSize,
      uploadedBytes: 0,
      percentage: 0,
      speed: 0,
      eta: 0,
      startTime: Date.now(),
      lastUpdateTime: Date.now(),
      status: 'uploading'
    };

    this.activeUploads.set(uploadId, uploadInfo);
    console.log(`📊 Started tracking upload: ${fileName} (${Math.round(fileSize / 1024 / 1024)}MB) - ID: ${uploadId}`);
    console.log(`📊 Active uploads count: ${this.activeUploads.size}`);
    console.log(`📊 WebSocket clients count: ${this.wss ? this.wss.clients.size : 0}`);
    
    // Send initial progress
    this.broadcastProgress(uploadId, uploadInfo);
  }

  // Update upload progress
  updateProgress(uploadId, uploadedBytes, totalBytes) {
    const uploadInfo = this.activeUploads.get(uploadId);
    if (!uploadInfo) {
      console.log(`⚠️ Upload info not found for ID: ${uploadId}`);
      return;
    }

    const now = Date.now();
    const elapsed = (now - uploadInfo.startTime) / 1000;
    const speed = uploadedBytes / Math.max(elapsed, 1) / 1024 / 1024; // MB/s
    const percentage = Math.round((uploadedBytes / totalBytes) * 100);
    const remainingBytes = totalBytes - uploadedBytes;
    const eta = Math.round(remainingBytes / (speed * 1024 * 1024));

    uploadInfo.uploadedBytes = uploadedBytes;
    uploadInfo.percentage = percentage;
    uploadInfo.speed = speed.toFixed(2);
    uploadInfo.eta = eta;
    uploadInfo.lastUpdateTime = now;

    this.activeUploads.set(uploadId, uploadInfo);
    
    // EC2 t2.micro: Reduce logging frequency to save resources
    if (percentage % 20 === 0 || elapsed % 60 < 1) {
      console.log(`📈 Progress [${uploadId}]: ${percentage}% (${Math.round(uploadedBytes / 1024 / 1024)}/${Math.round(totalBytes / 1024 / 1024)}MB, ${speed.toFixed(2)}MB/s, ETA: ${eta}s)`);
    }
    
    this.broadcastProgress(uploadId, uploadInfo);
  }

  // Complete upload
  completeUpload(uploadId, location) {
    const uploadInfo = this.activeUploads.get(uploadId);
    if (!uploadInfo) return;

    uploadInfo.status = 'completed';
    uploadInfo.location = location;
    uploadInfo.completedAt = Date.now();

    this.broadcastProgress(uploadId, uploadInfo);
    
    // Clean up after 5 seconds
    setTimeout(() => {
      this.activeUploads.delete(uploadId);
    }, 5000);
  }

  // Fail upload
  failUpload(uploadId, error) {
    const uploadInfo = this.activeUploads.get(uploadId);
    if (!uploadInfo) return;

    uploadInfo.status = 'failed';
    uploadInfo.error = error.message;
    uploadInfo.failedAt = Date.now();

    this.broadcastProgress(uploadId, uploadInfo);
    
    // Clean up after 5 seconds
    setTimeout(() => {
      this.activeUploads.delete(uploadId);
    }, 5000);
  }

  // Broadcast progress to subscribed clients
  broadcastProgress(uploadId, uploadInfo) {
    if (!this.wss) return;

    const message = JSON.stringify({
      type: 'progress',
      uploadId,
      ...uploadInfo
    });

    console.log(`📡 Broadcasting progress for ${uploadId}: ${uploadInfo.percentage}%`);
    console.log(`📡 Active clients: ${this.wss.clients.size}`);

    this.wss.clients.forEach((client) => {
      console.log(`📡 Client uploadId: ${client.uploadId}, Target: ${uploadId}, Match: ${client.uploadId === uploadId}`);
      if (client.readyState === WebSocket.OPEN && 
          (client.uploadId === uploadId || !client.uploadId)) {
        console.log(`📡 Sending progress to client: ${uploadId}`);
        client.send(message);
      }
    });
  }

  // Get upload status
  getUploadStatus(uploadId) {
    return this.activeUploads.get(uploadId);
  }

  // Get all active uploads
  getAllActiveUploads() {
    return Array.from(this.activeUploads.values());
  }
}

module.exports = new UploadProgressTracker();
