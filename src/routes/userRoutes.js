const express = require('express');
const {
  getProfile,
  updateProfile,
  archiveProfile,
} = require('../controllers/userController');
const {
  verifyToken,
  validateUserOrganization,
} = require('../middlewares/authMiddleware');
const router = express.Router();


router.get('/profile', [verifyToken, validateUserOrganization], getProfile);
router.delete('/:id', [verifyToken, validateUserOrganization], archiveProfile);
router.put('/:id', [verifyToken, validateUserOrganization], updateProfile);


module.exports = router;
