const asyncHandler = require('express-async-handler');
const User = require('../models/user.model');
const generateToken = require('../config/jwt');
const validator = require('validator');

const registerUser = asyncHandler(async (req, res) => {
  const { first_name, last_name, email, password } = req.body;

  // Validation
  if (!first_name || !last_name || !email || !password) {
    return res.status(400).json({ message: 'Please provide all required fields' });
  }

  if (!validator.isEmail(email)) {
    return res.status(400).json({ message: 'Please provide a valid email address' });
  }

  // Check if user exists
  const userExists = await User.findOne({ email });

  if (userExists) {
    return res.status(400).json({ message: 'User already exists with this email' });
  }

  // Create user
  const user = await User.create({
    first_name,
    last_name,
    email,
    password,
  });

  if (user) {
    res.status(201).json({
      _id: user._id,
      first_name: user.first_name,
      last_name: user.last_name,
      email: user.email,
      token: generateToken(user._id),
    });
  } else {
    res.status(400).json({ message: 'Invalid user data' });
  }
});

const loginUser = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  // 1. Check if email and password exist
  if (!email || !password) {
    return res.status(400).json({ message: 'Please provide email and password' });
  }

  // 2. Check if user exists and password is correct
  const user = await User.findOne({ email }).select('+password');

  if (!user || !(await user.correctPassword(password))) {
    return res.status(401).json({ message: 'Invalid email or password' });
  }

  // 3. If everything ok, send token
  res.status(200).json({
    _id: user._id,
    first_name: user.first_name,
    last_name: user.last_name,
    email: user.email,
    token: generateToken(user._id),
  });
});

const getMe = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).select('-password');
  res.status(200).json(user);
});

module.exports = {
  registerUser,
  loginUser,
  getMe,
};