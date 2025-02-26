const jwt = require('jsonwebtoken');
const jwksClient = require('jwks-rsa');
const { findUserBySubAndOrganizationId } = require('../services/userServices');
const dotenv = require('dotenv');
const {
  getOrganizationBySubdomain,
} = require('../services/organizationServices');
const axios = require('axios');
dotenv.config();

const auth0Config = {
  authRequired: false,
  auth0Logout: true,
  baseURL: process.env.BACKEND_BASE_URL,
  clientID: process.env.AUTH0_RWA_CLIENT_ID,
  clientSecret: process.env.AUTH0_RWA_SECRET_ID,
  issuerBaseURL: `https://${process.env.AUTH0_DOMAIN}`,
  secret: process.env.AUTH0_RWA_SECRET,
  session: {
    cookie: {
      secure: false,
      sameSite: 'None',
    },
  },
  authorizationParams: {
    response_type: 'code',
    audience: process.env.AUTH0_AUDIENCE,
    scope: 'openid profile email read:products offline_access',
  },
  afterCallback: (req, res, session) => {
    res.cookie('access_token', session.access_token, {
      httpOnly: true,
      secure: false,
      sameSite: 'None',
      maxAge: 60 * 60 * 1000,
    });
    res.cookie('refresh_token', session.refresh_token, {
      httpOnly: true,
      secure: false,
      sameSite: 'None',
      maxAge: 30 * 24 * 60 * 60 * 1000,
    });

    return session;
  },
};

const client = jwksClient({
  jwksUri: `https://${process.env.AUTH0_DOMAIN}/.well-known/jwks.json`,
});

const getKey = (header, callback) => {
  client.getSigningKey(header.kid, (err, key) => {
    if (err) {
      return callback(err);
    }
    const signingKey = key.publicKey || key.rsaPublicKey;
    callback(null, signingKey);
  });
};

const verifyToken = async (req, res, next) => {
  const token = req.cookies.access_token;
  if (!token) {
    return res.status(401).json({ status: 'error', message: 'Unauthorized' });
  }
  jwt.verify(token, getKey, { algorithms: ['RS256'] }, async (err, decoded) => {
    if (err) {
      if (err.name === 'TokenExpiredError') {
        try {
          const newToken = await refreshAccessToken(req.cookies.refresh_token);
          if (!newToken) {
            return res
              .status(403)
              .json({ status: 'error', message: 'Could not renew the token' });
          }

          res.cookie('access_token', newToken.access_token, { httpOnly: true });

          req.user = jwt.decode(newToken.access_token);
          return next();
        } catch (refreshError) {
          return res.status(403).json({
            status: 'error',
            message: refreshError || 'Invalid or expired token',
          });
        }
      }

      return res
        .status(403)
        .json({ status: 'error', message: 'Invalid or expired token' });
    }
    req.userLogin = decoded;
    next();
  });
};

const refreshAccessToken = async (refreshToken) => {
  try {
    const response = await axios.post(`https://${process.env.AUTH0_DOMAIN}/${process.env.REFRESH_TOKEN_URL}`, {
      grant_type: 'refresh_token',
      client_id: process.env.AUTH0_RWA_CLIENT_ID,
      client_secret: process.env.AUTH0_RWA_SECRET_ID,
      refresh_token: refreshToken,
    });

    return response.data;
  } catch (error) {
    console.error(error.response?.data || error.message);
    return null;
  }
};

const validateUserOrganization = async (req, res, next) => {
  const subdomain = req.userLogin[`${process.env.AUTH0_NAME_SPACE}/subdomain`] || null;
  try {
    const organization = await getOrganizationBySubdomain(subdomain);
    if (!organization) {
      return res
        .status(404)
        .json({ status: 'error', message: 'Subdomain not found' });
    }
    req.organization = organization;
    const user = await findUserBySubAndOrganizationId(
      req.oidc.user.sub,
      organization.id
    );
    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({
      status: 'error',
      message: error?.message || 'Invalid subdomain',
    });
  }
};

module.exports = { verifyToken, validateUserOrganization, auth0Config };
