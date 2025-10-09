const axios = require('axios');

const API_BASE_URL = 'http://localhost:5000/api';

// Test data
const testOrder = {
  customer: "6843fd552711a3ffb6325fdd", // User ID
  customerModel: "User",
  items: [
    {
      instrument: "684688f57459089cbd4bad49", // Instrument ID
      quantity: 2,
      price: 6000
    }
  ],
  total: 12000,
  address: "123 Test Street, Chennai, Tamil Nadu",
  status: "processing"
};

const testTeacherOrder = {
  customer: "68467efa7459089cbd4baad8", // Teacher ID (you'll need to replace with actual teacher ID)
  customerModel: "Teacher",
  items: [
    {
      instrument: "684688f57459089cbd4bad49", // Instrument ID
      quantity: 1,
      price: 6000
    }
  ],
  total: 6000,
  address: "456 Teacher Street, Chennai, Tamil Nadu",
  status: "processing"
};

async function testOrderAPI() {
  try {
    console.log('🚀 Testing Order API...\n');

    // 1. Test creating an order
    console.log('1. Creating order...');
    const createResponse = await axios.post(`${API_BASE_URL}/orders`, testOrder);
    console.log('✅ Order created successfully');
    console.log('Order ID:', createResponse.data.data._id);
    console.log('Customer:', createResponse.data.data.customer?.name);
    console.log('Items:', createResponse.data.data.items.length);
    console.log('Total:', createResponse.data.data.total);
    console.log('Status:', createResponse.data.data.status);
    console.log('');

    // 2. Test getting all orders
    console.log('2. Fetching all orders...');
    const getOrdersResponse = await axios.get(`${API_BASE_URL}/orders`);
    console.log('✅ Orders fetched successfully');
    console.log('Total orders:', getOrdersResponse.data.data.length);
    
    // Check if orders have proper population
    const orders = getOrdersResponse.data.data;
    orders.forEach((order, index) => {
      console.log(`Order ${index + 1}:`);
      console.log(`  - ID: ${order._id.slice(-8)}`);
      console.log(`  - Customer: ${order.customer?.name || 'NULL'} (${order.customerModel})`);
      console.log(`  - Items: ${order.items.length}`);
      console.log(`  - Status: ${order.status}`);
      console.log(`  - Total: ${order.total}`);
      
      // Check if items have instrument details
      order.items.forEach((item, itemIndex) => {
        console.log(`    Item ${itemIndex + 1}:`);
        console.log(`      - Instrument: ${item.instrument?.name || 'NULL'}`);
        console.log(`      - Category: ${item.instrument?.category?.name || 'NULL'}`);
        console.log(`      - Subcategory: ${item.instrument?.subcategory?.name || 'NULL'}`);
        console.log(`      - Price: ${item.price}`);
        console.log(`      - Quantity: ${item.quantity}`);
      });
      console.log('');
    });

    // 3. Test getting order by ID
    console.log('3. Fetching order by ID...');
    const orderId = createResponse.data.data._id;
    const getOrderResponse = await axios.get(`${API_BASE_URL}/orders/${orderId}`);
    console.log('✅ Order fetched successfully');
    console.log('Order details:', {
      id: getOrderResponse.data.data._id.slice(-8),
      customer: getOrderResponse.data.data.customer?.name,
      customerType: getOrderResponse.data.data.customerModel,
      items: getOrderResponse.data.data.items.length,
      total: getOrderResponse.data.data.total,
      status: getOrderResponse.data.data.status
    });
    console.log('');

    // 4. Test updating order status
    console.log('4. Updating order status...');
    const updateResponse = await axios.put(`${API_BASE_URL}/orders/${orderId}`, {
      status: 'shipped'
    });
    console.log('✅ Order status updated successfully');
    console.log('New status:', updateResponse.data.data.status);
    console.log('');

    // 5. Test getting order statistics
    console.log('5. Fetching order statistics...');
    const statsResponse = await axios.get(`${API_BASE_URL}/orders/stats/overview`);
    console.log('✅ Statistics fetched successfully');
    console.log('Total orders:', statsResponse.data.data.totalOrders);
    console.log('Total revenue:', statsResponse.data.data.totalRevenue);
    console.log('Status breakdown:', statsResponse.data.data.statusBreakdown);
    console.log('');

    // 6. Test filtering orders
    console.log('6. Testing order filters...');
    const filterResponse = await axios.get(`${API_BASE_URL}/orders?status=shipped`);
    console.log('✅ Filtered orders fetched successfully');
    console.log('Shipped orders:', filterResponse.data.data.length);
    console.log('');

    console.log('🎉 All tests passed successfully!');

  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
    
    if (error.response?.data) {
      console.error('Error details:', error.response.data);
    }
  }
}

// Run the test
testOrderAPI(); 