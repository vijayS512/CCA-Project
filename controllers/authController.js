const jwt = require('jsonwebtoken');
const User = require('../models/User');
const AuditLog = require('../models/AuditLog');
const { sendEmail } = require('../config/mailer');
const { welcomeEmail } = require('../services/emailTemplates');

const JWT_SECRET = process.env.JWT_SECRET || 'campusconnect_super_secret_jwt_key_2026_secure';

const generateToken = (id) => {
  return jwt.sign({ id }, JWT_SECRET, { expiresIn: '7d' });
};

// Render Login Page
exports.getLogin = (req, res) => {
  if (req.user) {
    return res.redirect('/dashboard');
  }
  res.render('auth/login', { title: 'Login - CampusConnect' });
};

// Handle Login Submission
exports.postLogin = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      req.flash('error_msg', 'Please provide both email and password.');
      return res.redirect('/auth/login');
    }

    const user = await User.findOne({ email: email.toLowerCase() }).select('+password');
    if (!user) {
      req.flash('error_msg', 'Invalid email or password.');
      return res.redirect('/auth/login');
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      req.flash('error_msg', 'Invalid email or password.');
      return res.redirect('/auth/login');
    }

    // Generate JWT and set in httpOnly cookie
    const token = generateToken(user._id);
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });

    // Record login audit log
    await AuditLog.create({
      user: user._id,
      action: 'LOGIN',
      resource: 'User',
      resourceId: user._id.toString(),
      ipAddress: req.ip,
      details: { role: user.role }
    });

    req.flash('success_msg', `Welcome back, ${user.name}!`);
    res.redirect('/dashboard');
  } catch (error) {
    console.error('Login error:', error);
    req.flash('error_msg', 'Something went wrong during login. Please try again.');
    res.redirect('/auth/login');
  }
};

// Render Register Page
exports.getRegister = (req, res) => {
  if (req.user) {
    return res.redirect('/dashboard');
  }
  res.render('auth/register', { title: 'Create Account - CampusConnect' });
};

// Handle Register Submission
exports.postRegister = async (req, res) => {
  try {
    const { name, email, password, confirmPassword, role, department, studentOrEmployeeId, phone } = req.body;

    if (!name || !email || !password) {
      req.flash('error_msg', 'Please fill in all required fields.');
      return res.redirect('/auth/register');
    }

    if (password !== confirmPassword) {
      req.flash('error_msg', 'Passwords do not match.');
      return res.redirect('/auth/register');
    }

    if (password.length < 6) {
      req.flash('error_msg', 'Password must be at least 6 characters long.');
      return res.redirect('/auth/register');
    }

    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      req.flash('error_msg', 'An account with this email address already exists.');
      return res.redirect('/auth/register');
    }

    // Validate role (defaults to student, can register as faculty/student)
    const assignedRole = ['student', 'faculty'].includes(role) ? role : 'student';

    const user = await User.create({
      name,
      email: email.toLowerCase(),
      password,
      role: assignedRole,
      department: department || 'General',
      studentOrEmployeeId: studentOrEmployeeId || '',
      phone: phone || ''
    });

    // Send Welcome Email asynchronously
    sendEmail({
      to: user.email,
      subject: 'Welcome to CampusConnect!',
      html: welcomeEmail(user.name, user.role)
    });

    // Log in automatically after registration
    const token = generateToken(user._id);
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 7 * 24 * 60 * 60 * 1000
    });

    await AuditLog.create({
      user: user._id,
      action: 'REGISTER',
      resource: 'User',
      resourceId: user._id.toString(),
      ipAddress: req.ip,
      details: { role: user.role }
    });

    req.flash('success_msg', 'Registration successful! Welcome to CampusConnect.');
    res.redirect('/dashboard');
  } catch (error) {
    console.error('Registration error:', error);
    req.flash('error_msg', error.message || 'Error creating account.');
    res.redirect('/auth/register');
  }
};

// Logout
exports.logout = (req, res) => {
  res.clearCookie('token');
  req.flash('success_msg', 'You have been logged out.');
  res.redirect('/auth/login');
};

// Profile Page
exports.getProfile = async (req, res) => {
  res.render('auth/profile', {
    title: 'User Profile - CampusConnect',
    user: req.user
  });
};

// Update Profile
exports.updateProfile = async (req, res) => {
  try {
    const { name, department, studentOrEmployeeId, phone } = req.body;
    await User.findByIdAndUpdate(req.user._id, {
      name,
      department,
      studentOrEmployeeId,
      phone
    });

    req.flash('success_msg', 'Profile updated successfully.');
    res.redirect('/auth/profile');
  } catch (error) {
    req.flash('error_msg', 'Failed to update profile.');
    res.redirect('/auth/profile');
  }
};
