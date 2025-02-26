const express = require('express');
const { loginUser } = require('../controllers/authController');
const {
  verifyToken,
  validateUserOrganization,
} = require('../middlewares/authMiddleware');
const router = express.Router();

router.post('/login', [verifyToken, validateUserOrganization], loginUser);

module.exports = router;
