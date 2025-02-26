
const express = require('express');
const path = require('path');
const multer = require('multer');
const {
  uploadDocument,
} = require('../controllers/fileController');
const router = express.Router();
const upload = multer({
  storage: multer.diskStorage({
      destination: (req, file, cb) => {
          cb(null, 'uploads/');
      },
      filename: (req, file, cb) => {
          cb(null, file.originalname);
      }
  }),
  fileFilter: (req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase();
      if (['.xlsx', '.xls', '.csv'].includes(ext)) {
          cb(null, true);
      } else {
          cb(new Error('Only Excel or CSV files are allowed!'));
      }
  }
});


router.post('/upload',  upload.single('file'), uploadDocument);

module.exports = router;