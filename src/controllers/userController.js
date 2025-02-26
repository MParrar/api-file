const dotenv = require('dotenv');
const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');
const { createObjectCsvWriter } = require('csv-writer');
const xlsx = require('xlsx');
const { Transform } = require('stream');
const Papa = require('papaparse');

const {
  updateUserProfile,
  createUserByAdmin,
  removeUser,
  findUserBySubAndOrganizationId,
} = require('../services/userServices');

dotenv.config();

const registerUser = async (req, res) => {
  try {
    const { name, email, password, role = 'user' } = req.body;
    const organization_id = req.organization.id;
    const newUser = await createUserByAdmin(
      req,
      email,
      name,
      password,
      organization_id,
      role
    );

    res.status(201).json({
      status: 'success',
      user: newUser,
      message: 'User successfully created!',
    });
  } catch (error) {
    const errorMapping = {
      'You need to provide name, email and password': 400,
      'User already exists': 400,
    };

    const statusCode = errorMapping[error.message] || 500;
    const message = statusCode === 500 ? 'Server error' : error.message;

    return res.status(statusCode).json({
      status: 'error',
      message,
    });
  }
};

const getProfile = async (req, res) => {
  try {
    const sub = req.user.sub;
    const organization_id = req.organization.id;
    const user = await findUserBySubAndOrganizationId(sub, organization_id);

    res.status(200).json({
      status: 'success',
      user,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const updateProfile = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, sub } = req.body;
    const organization_id = req.organization.id;

    const updatedUser = await updateUserProfile(
      req,
      id,
      name,
      email,
      req.user,
      sub,
      organization_id
    );

    res.status(200).json({
      status: 'success',
      message: 'User Updated Successfully',
      user: updatedUser,
    });
  } catch (error) {
    const errorMapping = {
      'User not found': 400,
      'You need to provide id, email and name': 400,
      'User already exists': 400,
    };

    const statusCode = errorMapping[error.message] || 500;
    const message = statusCode === 500 ? 'Server error' : error.message;
    return res.status(statusCode).json({
      status: 'error',
      message,
    });
  }
};

const archiveProfile = async (req, res) => {
  try {
    const { sub } = req.query.user;

    await removeUser(req, sub, req.user);

    res.status(200).json({
      status: 'success',
      message: 'User removed',
    });
  } catch (error) {
    const errorMapping = {
      'User not found': 400,
    };

    const statusCode = errorMapping[error.message] || 500;
    const message = statusCode === 500 ? 'Server error' : error.message;

    return res.status(statusCode).json({
      status: 'error',
      message,
    });
  }
};

module.exports = {
  registerUser,
  getProfile,
  updateProfile,
  archiveProfile
};
