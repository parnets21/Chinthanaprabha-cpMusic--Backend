const multer = require("multer");
const path = require("path");
const fs = require("fs");

// Ensure upload directories exist
const createUploadDir = (dirPath) => {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
};

// Method 1: Dynamic destination based on route or field
const dynamicStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    let uploadPath;

    // Option A: Based on route path
    const route = req.route?.path || req.path;
    if (route.includes("/banners")) {
      uploadPath = "./uploads/banners/";
    } else if (route.includes("/products")) {
      uploadPath = "./uploads/products/";
    } else if (route.includes("/categories")) {
      uploadPath = "./uploads/categories/";
    } else if (route.includes("/subcategories")) {
      uploadPath = "./uploads/subcategories/";
    } else if (route.includes("/instruments")) {
      uploadPath = "./uploads/instruments/";
    } else {
      uploadPath = "./uploads/misc/";
    }

    // Option B: Based on request body parameter
    if (req.body.uploadType) {
      uploadPath = `./uploads/${req.body.uploadType}/`;
    }

    // Option C: Based on file fieldname
    if (file.fieldname === "banner") {
      uploadPath = "./uploads/banners/";
    } else if (file.fieldname === "product_image") {
      uploadPath = "./uploads/products/";
    } else if (
      file.fieldname === "avatar" ||
      file.fieldname === "profile_pic"
    ) {
      uploadPath = "./uploads/users/";
    }

    // Create directory if it doesn't exist
    createUploadDir(uploadPath);

    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    // Get folder name from destination for filename prefix
    const folderName = path.basename(path.dirname(file.destination || "misc"));
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const fileName = `${folderName}-${uniqueSuffix}${path.extname(
      file.originalname
    )}`;
    cb(null, fileName);
  },
});

// Method 2: Factory function to create specific multer instances
const createMulterConfig = (uploadType, options = {}) => {
  const {
    fileSize = 5 * 1024 * 1024, // 5MB default
    allowedTypes = ["jpeg", "jpg", "png", "gif", "webp"],
    maxFiles = 1,
  } = options;

  const uploadPath = `./uploads/${uploadType}/`;
  createUploadDir(uploadPath);

  const storage = multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
      const fileName = `${uploadType}-${uniqueSuffix}${path.extname(
        file.originalname
      )}`;
      cb(null, fileName);
    },
  });

  const fileFilter = (req, file, cb) => {
    const filetypes = new RegExp(allowedTypes.join("|"), "i");
    const extname = filetypes.test(
      path.extname(file.originalname).toLowerCase()
    );
    const mimetype = filetypes.test(file.mimetype);

    if (extname && mimetype) {
      return cb(null, true);
    } else {
      cb(
        new Error(
          `Only ${allowedTypes.join(", ").toUpperCase()} files are allowed!`
        )
      );
    }
  };

  return multer({
    storage: storage,
    limits: {
      fileSize: fileSize,
      files: maxFiles,
    },
    fileFilter: fileFilter,
  });
};

// Method 3: Pre-configured multer instances for different upload types
const uploadConfigs = {
  // Banner uploads
  banners: createMulterConfig("banners", {
    fileSize: 5 * 1024 * 1024, // 5MB
    allowedTypes: ["jpeg", "jpg", "png", "gif", "webp"],
    maxFiles: 1,
  }),

  // Product image uploads
  products: createMulterConfig("products", {
    fileSize: 10 * 1024 * 1024, // 10MB
    allowedTypes: ["jpeg", "jpg", "png", "webp"],
    maxFiles: 5, // Multiple product images
  }),

  // Category image uploads
  categories: createMulterConfig("categories", {
    fileSize: 3 * 1024 * 1024, // 3MB
    allowedTypes: ["jpeg", "jpg", "png", "svg", "webp"],
    maxFiles: 1,
  }),
  // subCategory image uploads
  subcategories: createMulterConfig("subcategories", {
    fileSize: 3 * 1024 * 1024, // 3MB
    allowedTypes: ["jpeg", "jpg", "png", "svg", "webp"],
    maxFiles: 1,
  }),

  // Instrument image uploads
  instruments: createMulterConfig("instruments", {
    fileSize: 5 * 1024 * 1024, // 5MB
    allowedTypes: ["jpeg", "jpg", "png", "webp"],
    maxFiles: 1,
  }),
};

// Method 4: Middleware factory with dynamic folder selection
const createUploadMiddleware = (req, res, next) => {
  return (uploadType, fieldName = "file", isArray = false) => {
    const config = uploadConfigs[uploadType];
    if (!config) {
      return res.status(400).json({
        success: false,
        message: `Invalid upload type: ${uploadType}`,
      });
    }

    const middleware = isArray
      ? config.array(
          fieldName,
          uploadConfigs[uploadType].options?.limits?.files || 5
        )
      : config.single(fieldName);

    return middleware(req, res, next);
  };
};

// Method 5: Universal multer with subfolder support
const universalStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Get upload type from request body, query, or params
    const uploadType =
      req.body.uploadType ||
      req.query.uploadType ||
      req.params.uploadType ||
      "misc";
    const subFolder = req.body.subFolder || req.query.subFolder || "";

    let uploadPath = `./uploads/${uploadType}/`;
    if (subFolder) {
      uploadPath += `${subFolder}/`;
    }

    createUploadDir(uploadPath);
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uploadType =
      req.body.uploadType ||
      req.query.uploadType ||
      req.params.uploadType ||
      "misc";
    const prefix = req.body.filePrefix || uploadType;
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const fileName = `${prefix}-${uniqueSuffix}${path.extname(
      file.originalname
    )}`;
    cb(null, fileName);
  },
});

const universalUpload = multer({
  storage: universalStorage,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB max
    files: 10, // Max 10 files
  },
  fileFilter: (req, file, cb) => {
    // Get allowed types from request or use default
    const allowedTypes =
      req.body.allowedTypes || "jpeg,jpg,png,gif,webp,pdf,doc,docx";
    const typesArray = allowedTypes.split(",");
    const filetypes = new RegExp(typesArray.join("|"), "i");

    const extname = filetypes.test(
      path.extname(file.originalname).toLowerCase()
    );
    const mimetype = filetypes.test(file.mimetype);

    if (extname && mimetype) {
      return cb(null, true);
    } else {
      cb(
        new Error(
          `Only ${typesArray.join(", ").toUpperCase()} files are allowed!`
        )
      );
    }
  },
});

module.exports = {
  // Export different approaches
  dynamicUpload: multer({ storage: dynamicStorage }),
  uploadConfigs,
  createMulterConfig,
  createUploadMiddleware,
  universalUpload,

  // Export individual configs for direct use
  bannerUpload: uploadConfigs.banners,
  productUpload: uploadConfigs.products,
  categoryUpload: uploadConfigs.categories,
  subcategoryUpload: uploadConfigs.subcategories,
  instrumentUpload: uploadConfigs.instruments,
};
