// Example: How to create orders with complete item details

// 1. User Order Example
const userOrderExample = {
  customer: "6843fd552711a3ffb6325fdd", // User ID from database
  customerModel: "User", // Must be "User" or "Teacher"
  items: [
    {
      instrument: "684688f57459089cbd4bad49", // Instrument ID from database
      quantity: 2,
      price: 6000
    },
    {
      instrument: "684688f57459089cbd4bad50", // Another instrument
      quantity: 1,
      price: 8000
    }
  ],
  total: 20000, // Total amount including all items
  address: "123 Test Street, Chennai, Tamil Nadu",
  status: "processing" // Optional: processing, shipped, delivered, cancelled
};

// 2. Teacher Order Example
const teacherOrderExample = {
  customer: "68467efa7459089cbd4baad8", // Teacher ID from database
  customerModel: "Teacher", // Must be "User" or "Teacher"
  items: [
    {
      instrument: "684688f57459089cbd4bad49", // Instrument ID from database
      quantity: 1,
      price: 6000
    }
  ],
  total: 6000,
  address: "456 Teacher Street, Chennai, Tamil Nadu",
  status: "processing"
};

// 3. API Call Examples

// Create User Order
async function createUserOrder() {
  try {
    const response = await fetch('http://localhost:5000/api/orders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(userOrderExample)
    });
    
    const result = await response.json();
    console.log('User Order Created:', result);
    
    // The response will include complete item details:
    // - instrumentName, instrumentDescription, instrumentImage
    // - category, subcategory
    // - gst, tax, deliveryFee, discount
    // - Complete customer details (name, email, mobile for User)
    
  } catch (error) {
    console.error('Error creating user order:', error);
  }
}

// Create Teacher Order
async function createTeacherOrder() {
  try {
    const response = await fetch('http://localhost:5000/api/orders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(teacherOrderExample)
    });
    
    const result = await response.json();
    console.log('Teacher Order Created:', result);
    
    // The response will include complete item details:
    // - instrumentName, instrumentDescription, instrumentImage
    // - category, subcategory
    // - gst, tax, deliveryFee, discount
    // - Complete customer details (name, subject, subjectImage for Teacher)
    
  } catch (error) {
    console.error('Error creating teacher order:', error);
  }
}

// 4. Expected Response Structure
const expectedResponse = {
  success: true,
  message: "Order created successfully",
  data: {
    _id: "684688f57459089cbd4bad48",
    customer: {
      _id: "6843fd552711a3ffb6325fdd",
      name: "AravindMurugan",
      email: "Aravindbe2016cse@gmail.com",
      mobile: "6383626844",
      image: ""
    },
    customerModel: "User",
    items: [
      {
        instrument: {
          _id: "684688f57459089cbd4bad49",
          name: "Acoustic Guitar",
          description: "High-quality acoustic guitar",
          image: "uploads/instruments/guitar.jpg",
          category: {
            _id: "68467efa7459089cbd4baad8",
            name: "String Instruments"
          },
          subcategory: {
            _id: "68467efa7459089cbd4baad9",
            name: "Guitars"
          }
        },
        quantity: 2,
        price: 6000,
        // Additional details automatically added:
        instrumentName: "Acoustic Guitar",
        instrumentDescription: "High-quality acoustic guitar",
        instrumentImage: "uploads/instruments/guitar.jpg",
        category: "String Instruments",
        subcategory: "Guitars",
        gst: 0,
        tax: 0,
        deliveryFee: 0,
        discount: 0
      }
    ],
    total: 12000,
    status: "processing",
    address: "123 Test Street, Chennai, Tamil Nadu",
    createdAt: "2025-06-09T07:10:45.227Z",
    updatedAt: "2025-06-09T07:10:45.227Z"
  }
};

// 5. Validation Rules
const validationRules = {
  required: [
    "customer", // Must be valid User or Teacher ID
    "customerModel", // Must be "User" or "Teacher"
    "items", // Array of items with instrument IDs
    "total", // Total amount
    "address" // Delivery address
  ],
  customerModel: {
    allowed: ["User", "Teacher"],
    validation: "Customer ID must exist in the specified model"
  },
  items: {
    required: "instrument", // Instrument ID must exist
    optional: ["quantity", "price"], // Will use instrument price if not provided
    validation: "All instrument IDs must exist in database"
  },
  status: {
    allowed: ["processing", "shipped", "delivered", "cancelled"],
    default: "processing"
  }
};

// 6. Error Examples
const errorExamples = {
  invalidCustomer: {
    success: false,
    message: "User not found with the provided ID"
  },
  invalidInstrument: {
    success: false,
    message: "Instrument with ID 684688f57459089cbd4bad49 not found"
  },
  invalidCustomerModel: {
    success: false,
    message: "Invalid customerModel. Must be 'User' or 'Teacher'"
  },
  missingFields: {
    success: false,
    message: "Missing required fields"
  }
};

module.exports = {
  userOrderExample,
  teacherOrderExample,
  createUserOrder,
  createTeacherOrder,
  expectedResponse,
  validationRules,
  errorExamples
}; 