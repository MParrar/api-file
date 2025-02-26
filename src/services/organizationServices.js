const pool = require('../config/db');

const getOrganizationBySubdomain = async (subdomain) => {

  let query = 'SELECT * FROM public.organizations WHERE subdomain = $1';
  let values = [subdomain];

  if (subdomain === null) {
    query = 'SELECT * FROM public.organizations WHERE subdomain IS NULL';
    values = [];
  }

  const organization = await pool.query(query, values);

  return organization.rows[0];
};

module.exports = { getOrganizationBySubdomain };
