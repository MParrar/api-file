const supertest = require('supertest');
const { app } = require('../../src/app');
const pool = require('../../src/config/db');

jest.mock('../../src/middlewares/authMiddleware', () => ({
  verifyToken: jest.fn((req, res, next) => {
    req.cookies = req.cookies || {};
    req.cookies.access_token = 'mockedAccessToken';
    req.userLogin = {
      sub: 'auth0|mockUserIdUpdate',
      [`${process.env.AUTH0_NAME_SPACE}/subdomain`]: 'org',
      [`${process.env.AUTH0_NAME_SPACE}/email`]: 'user_update@email.com',
    };
    next();
  }),

  validateUserOrganization: jest.fn(async (req, res, next) => {
    req.organization = { id: null, name: 'My Org', subdomain: 'org' };
    req.user = {
      id: 1,
      sub: 'auth0|mockUserIdUpdate',
      name: 'Jane Doe',
      email: 'user_update@email.com',
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
    usersByEmail: {
      getByEmail: jest.fn().mockResolvedValue({
        data: {
          email: userData.email,
        },
      }),
    },
    users: {
      update: jest.fn().mockResolvedValue({}),
    },
  },
}));

const userData = {
  email: 'user_update@email.com', 
  name: 'Jane Doe',
  sub: 'auth0|mockUserIdUpdate',
};

const organizationData = {
  name: 'My Org',
  subdomain: 'org',
};

describe('UPDATE /api/users/:id', () => {
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

  describe('Update user', () => {
    it('Should return a 200 and update user', async () => {
        const updatedName = 'John Updated';
      const { statusCode, body } = await supertest(app)
        .put(`/api/users/${userId}`)
        .send({...userData, name:updatedName} );
      expect(statusCode).toBe(200);
      expect(body.status).toEqual('success');
      expect(body.message).toEqual('User Updated Successfully');
      expect(body.user).toEqual({
        id: userId,
        sub: userData.sub,
        name: updatedName,
        email: userData.email,
        role: 'user',
        company_name: organizationData.name
      });
    });
  });
});
