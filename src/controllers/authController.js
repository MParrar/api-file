const dotenv = require('dotenv');
const {
  userLoginProcess,
} = require('../services/authServices');
dotenv.config();

const loginUser = async (req, res) => {
  const email = req.userLogin[`${process.env.AUTH0_NAME_SPACE}/email`];
  const name = req.userLogin[`${process.env.AUTH0_NAME_SPACE}/name`];;
  const sub = req.userLogin['sub'];;
  const organization_id = req.organization.id;
  const role = 'user';
  try {
    const user = await userLoginProcess(
      sub,
      email,
      name,
      organization_id,
      role
    );

    res.status(200).json({ status: 'success', user });
  } catch (error) {
    res.json({ status: 'error', message: error.message });
  }
};

module.exports = {
  loginUser
};
