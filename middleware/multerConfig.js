const multer = require("multer");
const path = require("path");

// Set storage engine
const storage = multer.diskStorage({
  destination: "./uploads/",
  filename: (req, file, cb) => {
    cb(
      null,
      file.fieldname + "-" + Date.now() + path.extname(file.originalname)
    );
  },
});

// Initialize upload
/* const upload = multer({
  storage: storage,
  limits: { fileSize: 50000000 }, // 50MB limit
  fileFilter: (req, file, cb) => {
    checkFileType(file, cb);
  },
}); */


const upload = multer();


// Check file type
function checkFileType(file, cb) {
  // Allowed file extensions for images and videos
  const filetypes = /jpeg|jpg|png|gif|mp4|avi|mkv|mov|webm/;
  const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = filetypes.test(file.mimetype);

  if (extname && mimetype) {
    return cb(null, true);
  } else {
    cb("Error: Images and Videos Only!");
  }
}

module.exports = upload;
