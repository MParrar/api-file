const pool = require('../config/db');

const createAuditLog = async (req, oldData) => {
  const user = req.user;
  const organizationId = req.organization.id;

  const logData = {
    userId: user.id,
    action: `${req.method} ${req.originalUrl}`,
    url: req.originalUrl,
    method: req.method,
    newData: req.body,
    oldData,
    timestamp: new Date(),
    organizationId,
  };

  await saveAuditLog(logData);
};

const saveAuditLog = async (logData) => {
  const query = `
      INSERT INTO audit_logs (user_id, action, url, method, new_data, old_data, timestamp, organization_id)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8);
    `;

  const values = [
    logData.userId,
    logData.action,
    logData.url,
    logData.method,
    logData.newData ? JSON.stringify(logData.newData) : null,
    logData.oldData ? JSON.stringify(logData.oldData) : null,
    logData.timestamp,
    logData.organizationId,
  ];

  try {
    await pool.query(query, values);
  } catch (error) {
    throw new Error(error);
  }
};

const getAuditLogs = async (organization_id) => {
  const logs = await pool.query(
    `
    SELECT public.audit_logs.id, name, action, old_data, new_data, timestamp
    FROM public.audit_logs
    INNER JOIN public.users on public.users.id = public.audit_logs.user_id
    WHERE public.audit_logs.organization_id = $1
      `,
    [organization_id]
  );
  return logs;
};

const getUsers = async (organization_id) => {
  const users = await pool.query(
    `SELECT u.id, u.sub, u.name, u.email, uo.role, org.name as company_name
    FROM public.users as u
    inner join public.user_organizations as uo on u.id = uo.user_id
    inner join public.organizations as org on org.id = uo.organization_id
    where org.id = $1
    `,
    [organization_id]
  );
  return users.rows;
};

module.exports = { createAuditLog, getAuditLogs, getUsers };
