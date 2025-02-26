const { findUserBySubAndOrganizationId } = require('../services/userServices');

const verifyRole = (roles) => {
  return async (req, res, next) => {
    try {
      const user = await findUserBySubAndOrganizationId(
        req.user.sub,
        req.organization.id
      );
      if (!user)
        return res
          .status(403)
          .json({ status: 'error', message: 'Access Denied' });

      if (!roles.includes(user.role)) {
        return res
          .status(403)
          .json({ status: 'error', message: 'Access Denied' });
      }
      next();
    } catch (error) {
      console.log(error);
    }
  };
};

module.exports = { verifyRole };
