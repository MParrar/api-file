const express = require('express');
const {
  getAdminLogs,
  getAllUsers,
} = require('../controllers/adminControllers');
const {
  verifyToken,
  validateUserOrganization,
} = require('../middlewares/authMiddleware');
const { verifyRole } = require('../middlewares/verifyRoleMiddleware');
const { registerUser } = require('../controllers/userController');
const router = express.Router();

router.post(
  '/register',
  [verifyToken, validateUserOrganization, verifyRole(['admin'])],
  registerUser
);
router.get(
  '/logs',
  [verifyToken, validateUserOrganization, verifyRole(['admin'])],
  getAdminLogs
);
router.get(
  '/list',
  [verifyToken, validateUserOrganization, verifyRole(['admin'])],
  getAllUsers
);
module.exports = router;
