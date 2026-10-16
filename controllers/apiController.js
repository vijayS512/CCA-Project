const Booking = require('../models/Booking');
const Room = require('../models/Room');
const Notification = require('../models/Notification');
const redisClient = require('../config/redis');
const mongoose = require('mongoose');

// Check room slot availability for a date
exports.checkRoomAvailability = async (req, res) => {
  try {
    const { id } = req.params;
    const { date } = req.query;

    if (!date) {
      return res.status(400).json({ success: false, message: 'Date query param is required' });
    }

    const bookings = await Booking.find({
      room: id,
      date: date,
      status: { $in: ['approved', 'pending'] }
    }).select('startTime endTime purpose status');

    // Pre-defined campus time slots for quick selection
    const standardSlots = [
      { start: '08:00', end: '09:00', label: '08:00 AM - 09:00 AM' },
      { start: '09:00', end: '10:00', label: '09:00 AM - 10:00 AM' },
      { start: '10:00', end: '11:00', label: '10:00 AM - 11:00 AM' },
      { start: '11:00', end: '12:00', label: '11:00 AM - 12:00 PM' },
      { start: '12:00', end: '13:00', label: '12:00 PM - 01:00 PM' },
      { start: '13:00', end: '14:00', label: '01:00 PM - 02:00 PM' },
      { start: '14:00', end: '15:00', label: '02:00 PM - 03:00 PM' },
      { start: '15:00', end: '16:00', label: '03:00 PM - 04:00 PM' },
      { start: '16:00', end: '17:00', label: '04:00 PM - 05:00 PM' },
      { start: '17:00', end: '18:00', label: '05:00 PM - 06:00 PM' },
      { start: '18:00', end: '20:00', label: '06:00 PM - 08:00 PM' }
    ];

    const slotsWithAvailability = standardSlots.map((slot) => {
      const conflict = bookings.find((b) => b.startTime < slot.end && b.endTime > slot.start);
      return {
        ...slot,
        isBooked: !!conflict,
        bookingStatus: conflict ? conflict.status : null,
        purpose: conflict ? conflict.purpose : null
      };
    });

    res.json({
      success: true,
      date,
      roomId: id,
      bookedSlots: bookings,
      standardSlots: slotsWithAvailability
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Fetch user's unread notifications
exports.getUserNotifications = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const notifications = await Notification.find({ user: req.user._id })
      .sort({ createdAt: -1 })
      .limit(15);

    const unreadCount = await Notification.countDocuments({
      user: req.user._id,
      isRead: false
    });

    res.json({
      success: true,
      unreadCount,
      notifications
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Mark single notification read
exports.markNotificationRead = async (req, res) => {
  try {
    const { id } = req.params;
    await Notification.findOneAndUpdate(
      { _id: id, user: req.user._id },
      { isRead: true }
    );
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Mark all notifications read
exports.markAllNotificationsRead = async (req, res) => {
  try {
    await Notification.updateMany({ user: req.user._id, isRead: false }, { isRead: true });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// System Health API (useful for Railway / monitoring)
exports.getHealthStatus = async (req, res) => {
  const dbState = mongoose.connection.readyState;
  const dbStatusMap = {
    0: 'disconnected',
    1: 'connected',
    2: 'connecting',
    3: 'disconnecting'
  };

  const cacheStatus = redisClient.getStatus();

  res.json({
    status: 'online',
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.floor(process.uptime()),
    database: {
      status: dbStatusMap[dbState] || 'unknown',
      readyState: dbState
    },
    cache: cacheStatus,
    version: '1.0.0'
  });
};
