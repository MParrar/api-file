const dotenv = require('dotenv');
const { ManagementClient } = require('auth0');

dotenv.config();

const auth0 = new ManagementClient({
  domain: process.env.AUTH0_DOMAIN,
  clientId: process.env.AUTH0_CLIENT_ID_MACHINE,
  clientSecret: process.env.AUTH0_CLIENT_SECRET_MACHINE,
  scope: 'update:users',
});

module.exports = { auth0 };
