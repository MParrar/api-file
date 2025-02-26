const dotenv = require('dotenv');
const {
  createUser,
  findUserBySubAndOrganizationId,
} = require('./userServices');

dotenv.config();

const userLoginProcess = async (sub, email, name, organization_id, role) => {
  const userQuery = await findUserBySubAndOrganizationId(sub, organization_id);
  let user = userQuery;
  if (!user) {
    user = await createUser(sub, email, name, organization_id, role);
  }
  return user;
};

module.exports = {
  userLoginProcess,
};
