const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const pool = require('./config/db');
const userRoutes = require('./routes/userRoutes');
const authRoutes = require('./routes/authRoutes');
const adminRoutes = require('./routes/adminRoutes');
const fileRoutes = require('./routes/fileRoutes');
const { auth } = require('express-openid-connect');
const cookieParser = require('cookie-parser');
const { auth0Config } = require('./middlewares/authMiddleware');
const expressWs = require('express-ws');

let SUBDOMAIN = '';
dotenv.config();
const app = express();
expressWs(app);

app.use(
  cors({
    origin: [process.env.ALLOWED_ORIGINS.split(',')],
    credentials: true,
  })
);
app.use(express.json());

app.use(cookieParser());
app.get('/login', (req, res, next) => {
  const { subdomain } = req.query;
  if (subdomain) {
    req.subdomain = subdomain;
  }
  next();
});

app.use((req, res, next) => {
  if (!req.subdomain) {
    return next();
  }

  const dynamicAuthConfig = {
    ...auth0Config,
    authorizationParams: {
      ...(auth0Config.authorizationParams ?? {}),
      subdomain: req.subdomain,
    },
  };
  SUBDOMAIN = req.subdomain;

  return auth(dynamicAuthConfig)(req, res, next);
});
app.use(auth(auth0Config));

app.get('/', (req, res) => {
  res.send(
    req.oidc.isAuthenticated()
      ? res.redirect(`${process.env.FRONTEND_URL}/dashboard`)
      : 'Logged out'
  );
});

app.get('/api/logout', (req, res) => {
  res.clearCookie('access_token');
  res.clearCookie('refresh_token');
  res.clearCookie('connect.sid');
  res.oidc.logout({
    returnTo: `http://${SUBDOMAIN ? `${SUBDOMAIN}.` : ''}${
      process.env.FRONTEND_DOMAIN
    }/landing-page`,
  });
});

app.get('/api/user', (req, res) => {
  if (req.oidc.isAuthenticated()) {
    return res.json({ isAuthenticated: true, user: req.oidc.user });
  }
  res.json({ isAuthenticated: false, user: null });
});


app.ws('/progress', (ws, req) => {
  app.set('ws', ws);
  ws.on('close', () => {
    app.set('ws', null);
  });
});

if (process.env.NODE_ENV !== 'test') {
  pool
    .connect()
    .then(() => console.log('Connected to PostgreSQL'))
    .catch((err) => console.log(err));
}

app.use('/api/users', userRoutes);
app.use('/api', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/files', fileRoutes);

module.exports = { app };
