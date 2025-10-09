const mongoose = require('mongoose');
const Order = require('./models/OrderModel');
const Teacher = require('./models/TeacherModel');

// Connect to MongoDB
mongoose.connect('mongodb://localhost:27017/chinthaprabha', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

async function fixTeacherOrders() {
  try {
    console.log('🔧 Fixing Teacher orders with null customer...\n');

    // Find all Teacher orders with null customer
    const teacherOrdersWithNullCustomer = await Order.find({
      customerModel: 'Teacher',
      customer: null
    });

    console.log(`Found ${teacherOrdersWithNullCustomer.length} Teacher orders with null customer`);

    if (teacherOrdersWithNullCustomer.length === 0) {
      console.log('✅ No Teacher orders with null customer found!');
      return;
    }

    // Get all available teachers
    const teachers = await Teacher.find({});
    console.log(`Found ${teachers.length} teachers in database`);

    if (teachers.length === 0) {
      console.log('❌ No teachers found in database. Please create some teachers first.');
      return;
    }

    // Fix each order by assigning a valid teacher
    for (let i = 0; i < teacherOrdersWithNullCustomer.length; i++) {
      const order = teacherOrdersWithNullCustomer[i];
      const teacherIndex = i % teachers.length; // Distribute teachers evenly
      const teacher = teachers[teacherIndex];

      console.log(`\n📦 Fixing Order ${order._id.slice(-8)}:`);
      console.log(`   - Current customer: ${order.customer}`);
      console.log(`   - Assigning teacher: ${teacher.name} (${teacher._id})`);

      // Update the order with the teacher ID
      await Order.findByIdAndUpdate(order._id, {
        customer: teacher._id
      });

      console.log(`   ✅ Order updated successfully`);
    }

    console.log('\n🎉 All Teacher orders have been fixed!');
    console.log('\n📋 Summary:');
    console.log(`   - Fixed ${teacherOrdersWithNullCustomer.length} orders`);
    console.log(`   - Used ${teachers.length} teachers`);
    console.log('\n🔄 Now you can test the API again to see Teacher details populated!');

  } catch (error) {
    console.error('❌ Error fixing Teacher orders:', error);
  } finally {
    mongoose.connection.close();
  }
}

// Run the fix
fixTeacherOrders(); 