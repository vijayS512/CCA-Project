const Room = require('../models/Room');
const Booking = require('../models/Booking');
const Event = require('../models/Event');
const User = require('../models/User');
const Registration = require('../models/Registration');
const AuditLog = require('../models/AuditLog');
const Notification = require('../models/Notification');
const redisClient = require('../config/redis');

// Unified Dashboard Gateway - routes to role-specific dashboard
exports.getDashboard = async (req, res) => {
  try {
    const role = req.user.role;

    if (role === 'admin') {
      return exports.getAdminDashboard(req, res);
    } else if (role === 'faculty') {
      return exports.getFacultyDashboard(req, res);
    } else {
      return exports.getStudentDashboard(req, res);
    }
  } catch (error) {
    console.error('Dashboard gateway error:', error);
    req.flash('error_msg', 'Failed to load dashboard.');
    res.redirect('/');
  }
};

// Admin Dashboard
exports.getAdminDashboard = async (req, res) => {
  try {
    const todayStr = new Date().toISOString().split('T')[0];

    // Caching admin stats for 60 seconds
    const cacheKey = 'stats:admin_dashboard';
    let stats = null;
    const cachedStats = await redisClient.get(cacheKey);

    if (cachedStats) {
      stats = JSON.parse(cachedStats);
    } else {
      const [
        totalUsers,
        totalRooms,
        pendingBookingsCount,
        activeEventsCount,
        todayBookingsCount
      ] = await Promise.all([
        User.countDocuments(),
        Room.countDocuments(),
        Booking.countDocuments({ status: 'pending' }),
        Event.countDocuments({ status: 'upcoming' }),
        Booking.countDocuments({ date: todayStr, status: 'approved' })
      ]);

      stats = {
        totalUsers,
        totalRooms,
        pendingBookingsCount,
        activeEventsCount,
        todayBookingsCount
      };

      await redisClient.set(cacheKey, JSON.stringify(stats), 'EX', 60);
    }

    // Recent pending bookings needing review
    const pendingBookings = await Booking.find({ status: 'pending' })
      .populate('room')
      .populate('user', 'name email department')
      .sort({ createdAt: -1 })
      .limit(5);

    // Recent upcoming events
    const upcomingEvents = await Event.find({ status: 'upcoming' })
      .populate('organizer', 'name')
      .populate('room', 'name')
      .sort({ date: 1 })
      .limit(5);

    // Recent audit logs
    const recentLogs = await AuditLog.find()
      .populate('user', 'name role')
      .sort({ createdAt: -1 })
      .limit(8);

    res.render('dashboard/admin', {
      title: 'Admin Command Center - CampusConnect',
      stats,
      pendingBookings,
      upcomingEvents,
      recentLogs
    });
  } catch (error) {
    console.error('Admin dashboard error:', error);
    req.flash('error_msg', 'Error loading admin dashboard.');
    res.redirect('/');
  }
};

// Faculty Dashboard
exports.getFacultyDashboard = async (req, res) => {
  try {
    const [myEvents, myBookings, pendingApprovalsCount] = await Promise.all([
      Event.find({ organizer: req.user._id }).sort({ date: 1 }),
      Booking.find({ user: req.user._id }).populate('room').sort({ date: -1 }).limit(6),
      Booking.countDocuments({ status: 'pending' })
    ]);

    res.render('dashboard/faculty', {
      title: 'Faculty Portal - CampusConnect',
      myEvents,
      myBookings,
      pendingApprovalsCount
    });
  } catch (error) {
    console.error('Faculty dashboard error:', error);
    req.flash('error_msg', 'Error loading faculty portal.');
    res.redirect('/');
  }
};

// Student Dashboard
exports.getStudentDashboard = async (req, res) => {
  try {
    const [myTickets, myBookings, recommendedEvents, notifications] = await Promise.all([
      Registration.find({ user: req.user._id })
        .populate({
          path: 'event',
          populate: { path: 'room' }
        })
        .sort({ createdAt: -1 })
        .limit(4),
      Booking.find({ user: req.user._id }).populate('room').sort({ createdAt: -1 }).limit(4),
      Event.find({ status: 'upcoming' }).sort({ date: 1 }).limit(4),
      Notification.find({ user: req.user._id }).sort({ createdAt: -1 }).limit(10)
    ]);

    res.render('dashboard/student', {
      title: 'Student Dashboard - CampusConnect',
      myTickets,
      myBookings,
      recommendedEvents,
      notifications
    });
  } catch (error) {
    console.error('Student dashboard error:', error);
    req.flash('error_msg', 'Error loading student dashboard.');
    res.redirect('/');
  }
};
