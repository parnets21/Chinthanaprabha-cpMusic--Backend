const mongoose = require('mongoose');
const Teacher = require('./models/TeacherModel');

// Connect to MongoDB
mongoose.connect('mongodb://localhost:27017/chinthaprabha', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

async function checkAndCreateTeachers() {
  try {
    console.log('👨‍🏫 Checking teachers in database...\n');

    // Check existing teachers
    const existingTeachers = await Teacher.find({});
    console.log(`Found ${existingTeachers.length} existing teachers`);

    if (existingTeachers.length > 0) {
      console.log('\n📋 Existing teachers:');
      existingTeachers.forEach((teacher, index) => {
        console.log(`   ${index + 1}. ${teacher.name} - ${teacher.subject}`);
      });
      return;
    }

    console.log('❌ No teachers found. Creating sample teachers...\n');

    // Create sample teachers
    const sampleTeachers = [
      {
        name: "Guitar Master",
        subject: "Guitar",
        subjectImage: "uploads/teachers/guitar.jpg",
        videoUrl: "uploads/videos/guitar-lesson.mp4"
      },
      {
        name: "Piano Expert",
        subject: "Piano",
        subjectImage: "uploads/teachers/piano.jpg",
        videoUrl: "uploads/videos/piano-lesson.mp4"
      },
      {
        name: "Violin Teacher",
        subject: "Violin",
        subjectImage: "uploads/teachers/violin.jpg",
        videoUrl: "uploads/videos/violin-lesson.mp4"
      },
      {
        name: "Drum Instructor",
        subject: "Drums",
        subjectImage: "uploads/teachers/drums.jpg",
        videoUrl: "uploads/videos/drums-lesson.mp4"
      }
    ];

    const createdTeachers = [];
    for (const teacherData of sampleTeachers) {
      const teacher = new Teacher(teacherData);
      await teacher.save();
      createdTeachers.push(teacher);
      console.log(`✅ Created teacher: ${teacher.name} - ${teacher.subject}`);
    }

    console.log('\n🎉 Sample teachers created successfully!');
    console.log('\n📋 Created teachers:');
    createdTeachers.forEach((teacher, index) => {
      console.log(`   ${index + 1}. ${teacher.name} - ${teacher.subject} (ID: ${teacher._id})`);
    });

    console.log('\n🔄 Now you can run the fix-teacher-orders.js script to fix existing orders!');

  } catch (error) {
    console.error('❌ Error checking/creating teachers:', error);
  } finally {
    mongoose.connection.close();
  }
}

// Run the check and create
checkAndCreateTeachers(); 