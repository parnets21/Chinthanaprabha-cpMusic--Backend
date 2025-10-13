const mongoose = require('mongoose');
const Performance = require('./models/PerformanceModel');
const AudienceReview = require('./models/AudienceReviewModel');

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
    // Clear existing data
    await Performance.deleteMany({});
    await AudienceReview.deleteMany({});

    // Seed performance data
    const performances = [
      {
        title: "Classical Guitar Performance",
        name: "Sarah Johnson",
        skillLevel: "advanced",
        video: "https://example.com/video1.mp4",
        photo: "https://example.com/photo1.jpg",
        thumbnail: "https://example.com/thumb1.jpg"
      },
      {
        title: "Piano Recital",
        name: "Michael Chen",
        skillLevel: "intermediate",
        video: "https://example.com/video2.mp4",
        photo: "https://example.com/photo2.jpg",
        thumbnail: "https://example.com/thumb2.jpg"
      },
      {
        title: "Violin Solo",
        name: "Emma Davis",
        skillLevel: "advanced",
        video: "https://example.com/video3.mp4",
        photo: "https://example.com/photo3.jpg",
        thumbnail: "https://example.com/thumb3.jpg"
      },
      {
        title: "Drum Performance",
        name: "Alex Rodriguez",
        skillLevel: "beginner",
        video: "https://example.com/video4.mp4",
        photo: "https://example.com/photo4.jpg",
        thumbnail: "https://example.com/thumb4.jpg"
      },
      {
        title: "Vocal Performance",
        name: "Lisa Wang",
        skillLevel: "intermediate",
        video: "https://example.com/video5.mp4",
        photo: "https://example.com/photo5.jpg",
        thumbnail: "https://example.com/thumb5.jpg"
      }
    ];

    await Performance.insertMany(performances);
    console.log('Performance data seeded successfully');

    // Seed audience review data
    const reviews = [
      {
        name: "John Smith",
        rating: 5,
        comment: "Amazing course! The instructor was very knowledgeable and patient. I learned so much about classical music.",
        course: "Classical Music Fundamentals",
        image: "https://example.com/review1.jpg"
      },
      {
        name: "Maria Garcia",
        rating: 4,
        comment: "Great course with excellent content. The video quality could be better, but overall very informative.",
        course: "Jazz Piano Techniques",
        image: "https://example.com/review2.jpg"
      },
      {
        name: "David Kim",
        rating: 5,
        comment: "Perfect for beginners! The step-by-step approach made it easy to follow along.",
        course: "Guitar Basics",
        image: "https://example.com/review3.jpg"
      },
      {
        name: "Anna Thompson",
        rating: 4,
        comment: "Very comprehensive course. I wish there were more practice exercises.",
        course: "Violin Mastery",
        image: "https://example.com/review4.jpg"
      },
      {
        name: "Robert Brown",
        rating: 5,
        comment: "Excellent instructor and well-structured lessons. Highly recommended!",
        course: "Drumming Fundamentals",
        image: "https://example.com/review5.jpg"
      },
      {
        name: "Jennifer Lee",
        rating: 4,
        comment: "Good course overall. The instructor explains concepts clearly.",
        course: "Vocal Training",
        image: "https://example.com/review6.jpg"
      }
    ];

    await AudienceReview.insertMany(reviews);
    console.log('Audience review data seeded successfully');

    console.log('All seed data created successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Error seeding data:', error);
    process.exit(1);
  }
});
