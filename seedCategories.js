const mongoose = require('mongoose');
const Category = require('./models/CategoryModel');

// Connect to MongoDB
mongoose.connect('mongodb://localhost:27017/chinthanaprabha', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const db = mongoose.connection;
db.on('error', console.error.bind(console, 'MongoDB connection error:'));
db.once('open', async () => {
  console.log('Connected to MongoDB');

  try {
    // Check existing categories
    const categories = await Category.find();
    console.log('Existing categories:', categories);

    // If no categories exist, create some sample ones
    if (categories.length === 0) {
      const sampleCategories = [
        {
          name: "Guitar",
          description: "Learn to play guitar with our expert instructors",
          image: "https://images.unsplash.com/photo-1510915361894-db8b60106cb1?w=150&h=150&fit=crop"
        },
        {
          name: "Piano",
          description: "Master the piano with classical and modern techniques",
          image: "https://images.unsplash.com/photo-1520523839897-bd0b52f945a0?w=150&h=150&fit=crop"
        },
        {
          name: "Drums",
          description: "Learn rhythm and percussion with professional drummers",
          image: "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=150&h=150&fit=crop"
        },
        {
          name: "Violin",
          description: "Classical violin training for all skill levels",
          image: "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=150&h=150&fit=crop"
        },
        {
          name: "Vocal",
          description: "Develop your singing voice with professional vocal coaches",
          image: "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=150&h=150&fit=crop"
        }
      ];

      await Category.insertMany(sampleCategories);
      console.log('Sample categories created successfully');
    }

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
});
