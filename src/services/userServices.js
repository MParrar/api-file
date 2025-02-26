const pool = require('../config/db');
const { createAuditLog } = require('./adminServices');
const { auth0 } = require('./auth0Services');

const createUser = async (sub, email, name, organization_id, role = 'user') => {
  if (!name || !email || !sub) {
    throw new Error('You need to provide name, email and sub');
  }
  const now = new Date();
  try {
    await pool.query('BEGIN');
    let user = await findUserBySub(sub);
    if (!user) {
      const userResult = await pool.query(
        'INSERT INTO public.users (email, name, sub, created_at, updated_at) VALUES ($1, $2, $3, $4, $5) RETURNING *',
        [email, name, sub, now, now]
      );
      user = userResult.rows[0];
    }
    await pool.query(
      'INSERT INTO public.user_organizations (user_id, organization_id, role, created_at, updated_at) VALUES ($1, $2, $3, $4, $5)',
      [user.id, organization_id, role, now, now]
    );

    await pool.query('COMMIT');
    return await findUserBySubAndOrganizationId(sub, organization_id);
  } catch (error) {
    console.log(error);
    await pool.query('ROLLBACK');
  }
};

const createUserByAdmin = async (
  req,
  email,
  name,
  password,
  organization_id,
  role = 'user'
) => {
  if (!name || !email || !password) {
    throw new Error('You need to provide name, email and password');
  }
  const auth0User = await auth0.usersByEmail.getByEmail({
    email: email,
  });

  let sub;

  if (auth0User.data[0]?.user_id) {
    const userInOrganization = await findUserBySubAndOrganizationId(
      auth0User.data[0].user_id,
      organization_id
    );
    if (userInOrganization) {
      throw new Error('User already exists');
    }
    sub = auth0User.data[0].user_id;
  } else {
    const newAuth0User = await auth0.users.create({
      connection: 'Username-Password-Authentication',
      email,
      password,
      name,
    });
    sub = newAuth0User.data.user_id;
  }

  const newUser = createUser(sub, email, name, organization_id, role);

  createAuditLog(req, {
    id: newUser.id,
    name: newUser.name,
    email: newUser.email,
  });

  return newUser;
};

const updateUserProfile = async (
  req,
  id,
  name,
  email,
  currentUser,
  sub,
  organization_id
) => {
  if (!id || !name || !email) {
    throw new Error('You need to provide id, email and name');
  }

  const user = await pool.query('SELECT * FROM public.users WHERE sub = $1', [
    sub,
  ]);

  const existingUser = await findUserBySub(sub);
  if (
    !existingUser ||
    user.rows.length === 0 ||
    (currentUser.role !== 'admin' && user.rows[0].id != id)
  ) {
    throw new Error('User not found');
  }
  const auth0User = await auth0.usersByEmail.getByEmail({
    email: email,
  });

  if (
    auth0User.data[0]?.email == email &&
    existingUser.sub != auth0User.data[0].user_id
  ) {
    throw new Error('User already exists');
  }

  await pool.query(
    'UPDATE public.users SET name = $1, email = $2 WHERE sub = $3',
    [name, email, sub]
  );

  auth0.users.update(
    { id: sub },
    {
      name: name,
      email: email,
    }
  );

  if (currentUser.role === 'admin') {
    createAuditLog(req, {
      id: user.rows[0].id,
      name: user.rows[0].name,
      email: user.rows[0].email,
    });
  }

  const userUpdated = await findUserBySubAndOrganizationId(
    sub,
    organization_id
  );
  return userUpdated;
};

const removeUser = async (req, sub, currentUser) => {
  if (!sub) {
    throw new Error('Provide sub');
  }

  await pool.query('DELETE from public.users WHERE sub = $1', [sub]);

  await auth0.users.delete({
    id: sub,
  });

  if (currentUser.role === 'admin') {
    createAuditLog(req, {});
  }
};

const updateUserSession = async (session, expirationTime) => {
  await pool.query('UPDATE public.users SET session = $1  WHERE sub = $2', [
    expirationTime,
    session,
  ]);
};

const findUserBySub = async (sub) => {
  const existingUser = await pool.query(
    'SELECT * FROM public.users WHERE sub = $1',
    [sub]
  );

  return existingUser.rows[0];
};

const findUserBySubAndOrganizationId = async (sub, organization_id) => {
  const existingUser = await pool.query(
    `SELECT u.id, u.sub, u.name, u.email, uo.role, org.name as company_name
    FROM public.users as u
    inner join public.user_organizations as uo on u.id = uo.user_id
    inner join public.organizations as org on org.id = uo.organization_id
    WHERE u.sub = $1
    and org.id = $2`,
    [sub, organization_id]
  );

  return existingUser.rows[0];
};

module.exports = {
  updateUserProfile,
  createUser,
  removeUser,
  updateUserSession,
  findUserBySub,
  createUserByAdmin,
  findUserBySubAndOrganizationId,
};
