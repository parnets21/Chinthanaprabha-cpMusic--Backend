const axios = require('axios');

const API_BASE_URL = 'http://localhost:5000/api';

async function testTeacherOrders() {
  try {
    console.log('👨‍🏫 Testing Teacher Order Population...\n');

    // 1. First, check if there are any teachers in the database
    console.log('1. Checking existing teachers...');
    try {
      const teachersResponse = await axios.get(`${API_BASE_URL}/teachers`);
      console.log('✅ Teachers API response:', teachersResponse.data);
    } catch (error) {
      console.log('❌ Teachers API not available or no teachers found');
    }

    // 2. Get all orders to see current state
    console.log('\n2. Getting all orders to check current state...');
    const ordersResponse = await axios.get(`${API_BASE_URL}/orders`);
    console.log('✅ Orders fetched successfully');
    
    const orders = ordersResponse.data.data;
    const teacherOrders = orders.filter(order => order.customerModel === 'Teacher');
    const userOrders = orders.filter(order => order.customerModel === 'User');
    
    console.log(`📊 Order Summary:`);
    console.log(`   - Total orders: ${orders.length}`);
    console.log(`   - Teacher orders: ${teacherOrders.length}`);
    console.log(`   - User orders: ${userOrders.length}`);
    
    // Check Teacher orders specifically
    console.log('\n📋 Teacher Orders Analysis:');
    teacherOrders.forEach((order, index) => {
      console.log(`\n   Teacher Order ${index + 1}:`);
      console.log(`   - Order ID: ${order._id.slice(-8)}`);
      console.log(`   - Customer: ${order.customer ? '✅ Populated' : '❌ NULL'}`);
      if (order.customer) {
        console.log(`   - Teacher Name: ${order.customer.name}`);
        console.log(`   - Teacher Subject: ${order.customer.subject}`);
        console.log(`   - Teacher Image: ${order.customer.subjectImage}`);
      } else {
        console.log(`   - Teacher Details: NULL (needs fixing)`);
      }
      console.log(`   - Items: ${order.items.length}`);
      console.log(`   - Total: ₹${order.total}`);
      console.log(`   - Status: ${order.status}`);
    });

    // 3. Check User orders for comparison
    console.log('\n📋 User Orders Analysis:');
    userOrders.forEach((order, index) => {
      console.log(`\n   User Order ${index + 1}:`);
      console.log(`   - Order ID: ${order._id.slice(-8)}`);
      console.log(`   - Customer: ${order.customer ? '✅ Populated' : '❌ NULL'}`);
      if (order.customer) {
        console.log(`   - User Name: ${order.customer.name}`);
        console.log(`   - User Email: ${order.customer.email}`);
        console.log(`   - User Mobile: ${order.customer.mobile}`);
      } else {
        console.log(`   - User Details: NULL (needs fixing)`);
      }
      console.log(`   - Items: ${order.items.length}`);
      console.log(`   - Total: ₹${order.total}`);
      console.log(`   - Status: ${order.status}`);
    });

    // 4. Test creating a new Teacher order (if we have teacher IDs)
    console.log('\n3. Testing new Teacher order creation...');
    
    // Try to get a teacher ID from existing orders or create a test one
    let teacherId = null;
    if (teacherOrders.length > 0 && teacherOrders[0].customer) {
      teacherId = teacherOrders[0].customer._id;
      console.log(`Using existing teacher ID: ${teacherId}`);
    } else {
      console.log('No existing teacher found, will need to create one first');
    }

    if (teacherId) {
      const newTeacherOrder = {
        customer: teacherId,
        customerModel: "Teacher",
        items: [
          {
            instrument: "684688f57459089cbd4bad49", // Use an existing instrument ID
            quantity: 1,
            price: 5000
          }
        ],
        total: 5000,
        address: "Test Teacher Address, Chennai",
        status: "processing"
      };

      try {
        const createResponse = await axios.post(`${API_BASE_URL}/orders`, newTeacherOrder);
        console.log('✅ New Teacher order created successfully');
        console.log('Teacher details:', createResponse.data.data.customer);
        console.log('Order ID:', createResponse.data.data._id);
      } catch (error) {
        console.log('❌ Failed to create new Teacher order:', error.response?.data?.message || error.message);
      }
    }

    // 5. Summary and recommendations
    console.log('\n🎯 Summary and Recommendations:');
    
    const nullTeacherOrders = teacherOrders.filter(order => order.customer === null);
    const nullUserOrders = userOrders.filter(order => order.customer === null);
    
    if (nullTeacherOrders.length > 0) {
      console.log(`❌ Found ${nullTeacherOrders.length} Teacher orders with null customer`);
      console.log('   Run: node fix-teacher-orders.js to fix these orders');
    } else {
      console.log('✅ All Teacher orders have proper customer data');
    }
    
    if (nullUserOrders.length > 0) {
      console.log(`❌ Found ${nullUserOrders.length} User orders with null customer`);
      console.log('   These also need to be fixed');
    } else {
      console.log('✅ All User orders have proper customer data');
    }

    console.log('\n🔄 Next Steps:');
    console.log('1. Run: node check-and-create-teachers.js (if no teachers exist)');
    console.log('2. Run: node fix-teacher-orders.js (to fix null customer orders)');
    console.log('3. Test the API again to see populated Teacher details');

  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
    
    if (error.response?.data) {
      console.error('Error details:', error.response.data);
    }
  }
}

// Run the test
testTeacherOrders(); 