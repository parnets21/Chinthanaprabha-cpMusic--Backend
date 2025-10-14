// Test script to verify heartbeat endpoint
const axios = require('axios');

async function testHeartbeat() {
  try {
    console.log('Testing heartbeat endpoint...');
    
    // Test POST request
    const postResponse = await axios.post('http://localhost:5000/api/heartbeat', {
      timestamp: Date.now()
    });
    console.log('POST heartbeat response:', postResponse.data);
    
    // Test GET request
    const getResponse = await axios.get('http://localhost:5000/api/heartbeat');
    console.log('GET heartbeat response:', getResponse.data);
    
    console.log('✅ Heartbeat endpoint is working correctly!');
  } catch (error) {
    console.error('❌ Heartbeat endpoint test failed:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
  }
}

testHeartbeat();
