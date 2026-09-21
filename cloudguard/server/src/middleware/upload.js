const multer = require('multer');
const path = require('path');

// Store in memory buffer for security (no temporary executable files written to disk)
const storage = multer.memoryStorage();

// Allowed file extensions
const ALLOWED_EXTENSIONS = ['.json', '.yaml', '.yml'];

const fileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();
  if (ALLOWED_EXTENSIONS.includes(ext) || file.mimetype === 'application/json' || file.mimetype === 'text/yaml' || file.mimetype === 'application/x-yaml') {
    cb(null, true);
  } else {
    cb(new Error(`Unsupported file type: ${ext || 'unknown'}. Only .json, .yaml, and .yml files are permitted.`));
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5 MB max file size
  }
});

module.exports = upload;
