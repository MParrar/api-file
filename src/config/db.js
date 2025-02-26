const { Pool } = require('pg');
const dotenv = require('dotenv');


dotenv.config();


const pool = new Pool({
  connectionString: process.env.NODE_ENV === 'test' ? process.env.DATABASE_URL_TEST : process.env.DATABASE_URL,
});


module.exports = pool;