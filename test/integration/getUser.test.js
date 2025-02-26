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
  sub: 'auth0|mockUserId',
};

const organizationData = {
  name: 'My Org',
  subdomain: 'org',
};

describe('GET /api/users/profile', () => {
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
    require('../../src/middlewares/authMiddleware').validateUserOrganization.mockImplementation(
      async (req, res, next) => {
        req.organization = {
          id: organization_id,
          name: 'My Org',
          subdomain: 'org',
        };
        req.user = {
          id: userId,
          sub: userData.sub,
          name: userData.name,
          email: userData.email,
          role: 'user',
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
    await pool.query('DELETE FROM public.organizations WHERE id = $1', [
      organization_id,
    ]);
    await pool.end();
  });

  describe('Get User Profile', () => {
    it('Should return a 200 and the user info', async () => {
      const { statusCode, body } = await supertest(app).get(
        '/api/users/profile'
      );
      expect(statusCode).toBe(200);
      expect(body.status).toEqual('success');
      expect(body.user).toEqual({
        id: userId,
        sub: userData.sub,
        name: userData.name,
        email: userData.email,
        role: 'user',
        company_name: organizationData.name,
      });
    });
  });
});
