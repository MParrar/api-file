const { getAuditLogs, getUsers } = require('../services/adminServices');

const getAdminLogs = async (req, res) => {
  const organization_id = req.organization.id;
  try {
    const logs = await getAuditLogs(organization_id);

    res.status(200).json({
      status: 'success',
      logs: logs.rows,
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

const getAllUsers = async (req, res) => {
  try {
    const organization_id = req.organization.id;
    const users = await getUsers(organization_id);
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

module.exports = { getAdminLogs, getAllUsers };
