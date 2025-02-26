const supertest = require('supertest');
const { app } = require('../../src/app');
const pool = require('../../src/config/db');

jest.mock('../../src/middlewares/authMiddleware', () => ({
  verifyToken: jest.fn((req, res, next) => {
    req.cookies = req.cookies || {};
    req.cookies.access_token = 'mockedAccessToken';
    req.userLogin = {
      sub: 'auth0|mockUserId',
      [`${process.env.AUTH0_NAME_SPACE}/subdomain`]: 'org',
      [`${process.env.AUTH0_NAME_SPACE}/email`]: 'get@example.com',
    };
    next();
  }),

  validateUserOrganization: jest.fn(async (req, res, next) => {
    req.organization = { id: null, name: 'My Org', subdomain: 'org' };
    req.user = {
      id: 1,
      sub: 'auth0|mockUserId',
      name: 'Jane Doe',
      email: 'get@example.com',
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

const userData = {
  email: 'get@example.com',
  name: 'Jane Doe',
  password: 'Password123',
  role: 'user',
  sessionToken: 'mock-user-token',
  sub: 'auth0|mockUserId',
};

const adminUser = {
  email: 'admin@example.com',
  name: 'Admin',
  password: 'Password123',
  role: 'admin',
  sessionToken: 'mock-admin-token',
  sub: 'auth0|mockAdminId',
};

const organizationData = {
  name: 'My Org',
  subdomain: 'org',
};

describe('User with "user" role try to get an admin endpoint', () => {
  let userId;
  let organization_id;

  beforeAll(async () => {
    const result = await pool.query(
      `
      INSERT INTO public.users (name, email, sub)
      VALUES ($1, $2, $3) RETURNING id;
    `,
      [userData.name, userData.email, userData.sub]
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
      [userId, organization_id, 'user']
    );
  });

  afterAll(async () => {
    await pool.query('DELETE FROM public.users WHERE id = $1;', [userId]);
    await pool.query(
      'DELETE FROM public.user_organizations WHERE user_id = $1;',
      [userId]
    );
    await pool.query('DELETE FROM public.organizations WHERE id = $1;', [
      organization_id,
    ]);
  });

  it('should return access denied for the user role', async () => {
    const { statusCode, body } = await supertest(app)
      .get('/api/admin/logs');
    expect(statusCode).toBe(403);
    expect(body.message).toBe('Access Denied');
  });
});

describe('User with "admin" role gets logs', () => {
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
    await pool.query('DELETE FROM public.organizations WHERE id = $1;', [
      organization_id,
    ]);
  });

  it('should return success status', async () => {
    const { statusCode, body } = await supertest(app)
      .get('/api/admin/logs');
    expect(statusCode).toBe(200);
    expect(body.status).toBe('success');
    expect(Array.isArray(body.logs)).toBe(true);
  });
});

afterAll(async () => {
  await pool.end();
});
