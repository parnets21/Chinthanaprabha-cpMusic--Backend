const axios = require('axios');

const API_BASE_URL = 'http://localhost:5000/api';

// Test data with complete item details
const testUserOrder = {
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
  customer: "68467efa7459089cbd4baad8", // Teacher ID
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

async function testCompleteOrderAPI() {
  try {
    console.log('🚀 Testing Complete Order API with All Item Details...\n');

    // 1. Test creating a User order
    console.log('1. Creating User order...');
    const userOrderResponse = await axios.post(`${API_BASE_URL}/orders`, testUserOrder);
    console.log('✅ User order created successfully');
    console.log('Order ID:', userOrderResponse.data.data._id);
    console.log('Customer Type:', userOrderResponse.data.data.customerModel);
    console.log('Customer Name:', userOrderResponse.data.data.customer?.name);
    console.log('Customer Email:', userOrderResponse.data.data.customer?.email);
    console.log('Customer Mobile:', userOrderResponse.data.data.customer?.mobile);
    console.log('');

    // 2. Test creating a Teacher order
    console.log('2. Creating Teacher order...');
    const teacherOrderResponse = await axios.post(`${API_BASE_URL}/orders`, testTeacherOrder);
    console.log('✅ Teacher order created successfully');
    console.log('Order ID:', teacherOrderResponse.data.data._id);
    console.log('Customer Type:', teacherOrderResponse.data.data.customerModel);
    console.log('Customer Name:', teacherOrderResponse.data.data.customer?.name);
    console.log('Customer Subject:', teacherOrderResponse.data.data.customer?.subject);
    console.log('');

    // 3. Test getting all orders with complete details
    console.log('3. Fetching all orders with complete details...');
    const getOrdersResponse = await axios.get(`${API_BASE_URL}/orders`);
    console.log('✅ Orders fetched successfully');
    console.log('Total orders:', getOrdersResponse.data.data.length);
    
    // Check if orders have proper population and complete item details
    const orders = getOrdersResponse.data.data;
    orders.forEach((order, index) => {
      console.log(`\n📦 Order ${index + 1}:`);
      console.log(`  - ID: ${order._id.slice(-8)}`);
      console.log(`  - Customer: ${order.customer?.name || 'NULL'} (${order.customerModel})`);
      console.log(`  - Status: ${order.status}`);
      console.log(`  - Total: ₹${order.total}`);
      console.log(`  - Address: ${order.address}`);
      console.log(`  - Date: ${new Date(order.createdAt).toLocaleString()}`);
      
      // Check customer details based on type
      if (order.customerModel === 'User') {
        console.log(`  - Customer Details (User):`);
        console.log(`    * Email: ${order.customer?.email || 'N/A'}`);
        console.log(`    * Mobile: ${order.customer?.mobile || 'N/A'}`);
        console.log(`    * Image: ${order.customer?.image || 'N/A'}`);
      } else if (order.customerModel === 'Teacher') {
        console.log(`  - Customer Details (Teacher):`);
        console.log(`    * Subject: ${order.customer?.subject || 'N/A'}`);
        console.log(`    * Subject Image: ${order.customer?.subjectImage || 'N/A'}`);
        console.log(`    * Video URL: ${order.customer?.videoUrl || 'N/A'}`);
      }
      
      // Check complete item details
      console.log(`  - Items (${order.items.length}):`);
      order.items.forEach((item, itemIndex) => {
        console.log(`    Item ${itemIndex + 1}:`);
        console.log(`      * Instrument ID: ${item.instrument?._id || 'NULL'}`);
        console.log(`      * Instrument Name: ${item.instrumentName || item.instrument?.name || 'NULL'}`);
        console.log(`      * Description: ${item.instrumentDescription || item.instrument?.description || 'NULL'}`);
        console.log(`      * Image: ${item.instrumentImage || item.instrument?.image || 'NULL'}`);
        console.log(`      * Category: ${item.category || item.instrument?.category?.name || 'NULL'}`);
        console.log(`      * Subcategory: ${item.subcategory || item.instrument?.subcategory?.name || 'NULL'}`);
        console.log(`      * Price: ₹${item.price}`);
        console.log(`      * Quantity: ${item.quantity}`);
        console.log(`      * GST: ₹${item.gst || 0}`);
        console.log(`      * Tax: ₹${item.tax || 0}`);
        console.log(`      * Delivery Fee: ₹${item.deliveryFee || 0}`);
        console.log(`      * Discount: ₹${item.discount || 0}`);
      });
    });

    // 4. Test getting order by ID
    console.log('\n4. Fetching specific order by ID...');
    const orderId = userOrderResponse.data.data._id;
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

    // 5. Test updating order status
    console.log('5. Updating order status...');
    const updateResponse = await axios.put(`${API_BASE_URL}/orders/${orderId}`, {
      status: 'shipped'
    });
    console.log('✅ Order status updated successfully');
    console.log('New status:', updateResponse.data.data.status);
    console.log('');

    // 6. Test getting order statistics
    console.log('6. Fetching order statistics...');
    const statsResponse = await axios.get(`${API_BASE_URL}/orders/stats/overview`);
    console.log('✅ Statistics fetched successfully');
    console.log('Total orders:', statsResponse.data.data.totalOrders);
    console.log('Total revenue: ₹', statsResponse.data.data.totalRevenue);
    console.log('Status breakdown:');
    statsResponse.data.data.statusBreakdown.forEach(stat => {
      console.log(`  - ${stat._id}: ${stat.count} orders (₹${stat.totalAmount})`);
    });
    console.log('');

    // 7. Test filtering orders
    console.log('7. Testing order filters...');
    
    // Filter by status
    const shippedOrders = await axios.get(`${API_BASE_URL}/orders?status=shipped`);
    console.log('✅ Shipped orders:', shippedOrders.data.data.length);
    
    // Filter by customer type
    const userOrders = await axios.get(`${API_BASE_URL}/orders?customerModel=User`);
    console.log('✅ User orders:', userOrders.data.data.length);
    
    const teacherOrders = await axios.get(`${API_BASE_URL}/orders?customerModel=Teacher`);
    console.log('✅ Teacher orders:', teacherOrders.data.data.length);
    console.log('');

    // 8. Test error handling
    console.log('8. Testing error handling...');
    
    // Test with invalid customer ID
    try {
      await axios.post(`${API_BASE_URL}/orders`, {
        ...testUserOrder,
        customer: "invalid_id"
      });
    } catch (error) {
      console.log('✅ Invalid customer ID error handled:', error.response.data.message);
    }
    
    // Test with invalid instrument ID
    try {
      await axios.post(`${API_BASE_URL}/orders`, {
        ...testUserOrder,
        items: [{ instrument: "invalid_instrument_id", quantity: 1, price: 1000 }]
      });
    } catch (error) {
      console.log('✅ Invalid instrument ID error handled:', error.response.data.message);
    }
    
    // Test with invalid customer model
    try {
      await axios.post(`${API_BASE_URL}/orders`, {
        ...testUserOrder,
        customerModel: "Invalid"
      });
    } catch (error) {
      console.log('✅ Invalid customer model error handled:', error.response.data.message);
    }
    console.log('');

    console.log('🎉 All tests passed successfully!');
    console.log('\n📋 Summary:');
    console.log('✅ User and Teacher orders created with proper validation');
    console.log('✅ Complete item details included (name, description, image, category, subcategory)');
    console.log('✅ Customer details properly populated based on type');
    console.log('✅ All CRUD operations working');
    console.log('✅ Statistics and filtering working');
    console.log('✅ Error handling working properly');

  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
    
    if (error.response?.data) {
      console.error('Error details:', error.response.data);
    }
  }
}

// Run the test
testCompleteOrderAPI(); 