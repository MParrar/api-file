const path = require('path');
const { validateFile, cleanAndGenerateNewFile, processExcelFile, validateXLSXFile } = require('../services/fileServices');

const uploadDocument = async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: 'Please upload a file' });
  }

  try {
    const filePath = path.join('/tmp', req.file.filename);
    const WebSocket = req.app.get('ws');
    const fileExtension = path.extname(req.file.originalname);
    if(fileExtension === '.csv'){
      await validateFile(filePath);
      await cleanAndGenerateNewFile(res, filePath, WebSocket);
    }
    if(fileExtension === '.xlsx' || fileExtension === '.xls'){
      await validateXLSXFile(filePath);
      await processExcelFile(filePath,res, WebSocket);
    }
  } catch (err) {
    console.log('Error reading file:', err.message);
    return res.status(400).json({
      status: 'error',
      message: err.message || 'An error occurred. Please try again later',
    });
  }
};

module.exports = { uploadDocument };
