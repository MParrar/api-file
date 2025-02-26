const supertest = require('supertest');
const { app } = require('../../src/app');
const pool = require('../../src/config/db');

jest.mock('../../src/middlewares/authMiddleware', () => ({
  verifyToken: jest.fn((req, res, next) => {
    req.cookies = req.cookies || {};
    req.cookies.access_token = 'mockedAccessToken';
    req.userLogin = {
      sub: 'auth0|mockAdminId',
      [`${process.env.AUTH0_NAME_SPACE}/subdomain`]: 'org',
      [`${process.env.AUTH0_NAME_SPACE}/email`]: 'admin@example.com',
    };
    next();
  }),

  validateUserOrganization: jest.fn(async (req, res, next) => {
    req.organization = { id: null, name: 'My Org', subdomain: 'org' };
    req.user = {
      id: 1,
      sub: 'auth0|mockAdminId',
      name: 'Naruto Uzumaki',
      email: 'admin@example.com',
      role: 'user',
    };
    next();
  }),
  auth0Config: {
    authRequired: false,
    auth0Logout: true,
    baseURL: 'http://localhost:3000',
    clientID: 'mockClientId',
    clientSecret: 'mockClientSecret',
    issuerBaseURL: 'https://mock-auth0.com',
    secret: 'mockSecret',
    session: {
      cookie: {
        secure: false,
        sameSite: 'Lax',
      },
    },
    authorizationParams: {
      response_type: 'code',
      audience: 'mockAudience',
      scope: 'openid profile email read:products offline_access',
    },
    afterCallback: jest.fn((req, res, session) => {
      res.cookie('access_token', 'mockAccessToken', {
        httpOnly: true,
        secure: false,
        sameSite: 'Lax',
        maxAge: 60 * 60 * 1000,
      });
      res.cookie('refresh_token', 'mockRefreshToken', {
        httpOnly: true,
        secure: false,
        sameSite: 'Lax',
        maxAge: 30 * 24 * 60 * 60 * 1000,
      });

      return session;
    }),
  },
}));

jest.mock('../../src/services/auth0Services', () => ({
  auth0: {
    users: {
      create: jest.fn().mockResolvedValue({
        data: {
          user_id: 'auth0|mockNewUserId',
        },
      }),
    },
    usersByEmail: {
      getByEmail: jest.fn().mockResolvedValue({
        data: {
          user_id: null,
        },
      }),
    },
  },
}));

const adminUser = {
  email: 'admin@example.com',
  name: 'Naruto Uzumaki',
  password: 'Password123',
  role: 'admin',
  sessionToken: 'mock-admin-token',
  sub: 'auth0|mockAdminId',
};

const organizationData = {
  name: 'My Org',
  subdomain: 'org',
};

const newUser = {
  name: 'New User',
  email: 'new_email_test@test.com',
  password: 'ThisIsTheP4ss-',
};

describe('POST /api/admin/register', () => {
  let userId;
  let organization_id;

  beforeAll(async () => {
    const result = await pool.query(
      `
        INSERT INTO public.users (name, email, sub)
        VALUES ($1, $2, $3) RETURNING id;
      `,
      [adminUser.name, adminUser.email, adminUser.sub]
    );

    const organization = await pool.query(
      `
        INSERT INTO public.organizations (name, subdomain)
        VALUES ($1, $2) RETURNING id;
      `,
      [organizationData.name, organizationData.subdomain]
    );

    userId = result.rows[0].id;
    organization_id = organization.rows[0].id;

    await pool.query(
      `
        INSERT INTO public.user_organizations (user_id, organization_id, role)
        VALUES ($1, $2, $3) RETURNING id;
      `,
      [userId, organization_id, 'admin']
    );

    require('../../src/middlewares/authMiddleware').validateUserOrganization.mockImplementation(
      async (req, res, next) => {
        req.organization = {
          id: organization_id,
          name: 'My Org',
          subdomain: 'org',
        };
        req.user = {
          id: userId,
          sub: adminUser.sub,
          name: adminUser.name,
          email: adminUser.email,
          role: 'admin',
        };
        next();
      }
    );
  });

  afterAll(async () => {
    await pool.query('DELETE FROM public.users WHERE id = $1;', [userId]);
    await pool.query(
      'DELETE FROM public.user_organizations WHERE user_id = $1;',
      [userId]
    );
    await pool.query('DELETE FROM public.users WHERE email = $1;', [
      newUser.email,
    ]);
    await pool.query('DELETE FROM public.organizations WHERE id = $1;', [
      organization_id,
    ]);
  });

  it('should return status 400', async () => {
    const { statusCode, body } = await supertest(app)
      .post('/api/admin/register')
      .send({});
    expect(statusCode).toBe(400);
    expect(body.status).toBe('error');
    expect(body.message).toBe('You need to provide name, email and password');
  });

  it('should return status 200 and create the user', async () => {
    const { statusCode, body } = await supertest(app)
      .post('/api/admin/register')
      .send(newUser);

    expect(statusCode).toBe(201);
    expect(body.status).toBe('success');
    expect(body.user).toHaveProperty('id');
    expect(body.user).toHaveProperty('name', newUser.name);
    expect(body.user).toHaveProperty('email', newUser.email);
    expect(body.user).toHaveProperty('company_name', organizationData.name);
  });
});

afterAll(async () => {
  await pool.end();
});
