const Booking = require('../models/Booking');
const Room = require('../models/Room');
const Notification = require('../models/Notification');
const AuditLog = require('../models/AuditLog');
const { sendEmail } = require('../config/mailer');
const { bookingStatusUpdateEmail } = require('../services/emailTemplates');
const { emitToUser, emitToRoom } = require('../config/socket');
const redisClient = require('../config/redis');

// Helper to check for slot overlaps
const hasTimeConflict = (start1, end1, start2, end2) => {
  // e.g. "09:00" < "11:00"
  return (start1 < end2 && end1 > start2);
};

// User's own bookings
exports.getMyBookings = async (req, res) => {
  try {
    const bookings = await Booking.find({ user: req.user._id })
      .populate('room')
      .sort({ date: -1, startTime: -1 });

    res.render('bookings/my-bookings', {
      title: 'My Room Bookings - CampusConnect',
      bookings
    });
  } catch (error) {
    console.error('Error fetching my bookings:', error);
    req.flash('error_msg', 'Could not load your bookings.');
    res.redirect('/dashboard');
  }
};

// Create a new booking request
exports.postBookRoom = async (req, res) => {
  try {
    const { roomId, date, startTime, endTime, purpose, expectedAttendees } = req.body;

    if (!roomId || !date || !startTime || !endTime || !purpose) {
      req.flash('error_msg', 'Please provide all booking details.');
      return res.redirect(roomId ? `/rooms/${roomId}` : '/rooms');
    }

    if (startTime >= endTime) {
      req.flash('error_msg', 'End time must be after start time.');
      return res.redirect(`/rooms/${roomId}`);
    }

    const room = await Room.findById(roomId);
    if (!room) {
      req.flash('error_msg', 'Room not found.');
      return res.redirect('/rooms');
    }

    // Check for conflicting approved bookings
    const existingBookings = await Booking.find({
      room: roomId,
      date: date,
      status: { $in: ['approved', 'pending'] }
    });

    for (const b of existingBookings) {
      if (hasTimeConflict(startTime, endTime, b.startTime, b.endTime)) {
        req.flash('error_msg', `Slot conflict: This room already has a booking from ${b.startTime} to ${b.endTime} on ${date}.`);
        return res.redirect(`/rooms/${roomId}?date=${date}`);
      }
    }

    // Role-based automatic approval: Faculty or Admin gets auto-approved, Student requires review
    const autoApprove = req.user.role === 'admin' || req.user.role === 'faculty';
    const initialStatus = autoApprove ? 'approved' : 'pending';

    const booking = await Booking.create({
      room: roomId,
      user: req.user._id,
      date,
      startTime,
      endTime,
      purpose,
      expectedAttendees: parseInt(expectedAttendees) || 1,
      status: initialStatus,
      reviewedBy: autoApprove ? req.user._id : undefined,
      reviewedAt: autoApprove ? new Date() : undefined,
      adminRemarks: autoApprove ? 'Auto-approved for Faculty/Admin' : ''
    });

    // Invalidate Redis caches
    await redisClient.delPattern('bookings:*');
    await redisClient.delPattern('rooms:*');

    // Notify room channel in real-time
    emitToRoom(roomId, 'room:slot_booked', {
      roomId,
      date,
      startTime,
      endTime,
      status: initialStatus
    });

    // Send confirmation email
    sendEmail({
      to: req.user.email,
      subject: `Room Booking ${initialStatus === 'approved' ? 'Confirmed' : 'Request Received'} - ${room.name}`,
      html: bookingStatusUpdateEmail({
        userName: req.user.name,
        roomName: room.name,
        date,
        startTime,
        endTime,
        status: initialStatus,
        adminRemarks: booking.adminRemarks
      })
    });

    await AuditLog.create({
      user: req.user._id,
      action: 'BOOK_ROOM',
      resource: 'Booking',
      resourceId: booking._id.toString(),
      ipAddress: req.ip,
      details: { room: room.name, date, startTime, endTime, status: initialStatus }
    });

    const successMsg = autoApprove
      ? `Success! Your booking for ${room.name} has been confirmed.`
      : `Your booking request for ${room.name} was submitted and is awaiting approval.`;

    req.flash('success_msg', successMsg);
    res.redirect('/bookings/my-bookings');
  } catch (error) {
    console.error('Error creating booking:', error);
    req.flash('error_msg', error.message || 'Error submitting booking request.');
    res.redirect(req.body.roomId ? `/rooms/${req.body.roomId}` : '/rooms');
  }
};

// Manage all bookings (Admin & Faculty)
exports.getManageBookings = async (req, res) => {
  try {
    const { status, date } = req.query;
    const filter = {};
    if (status && status !== 'all') filter.status = status;
    if (date) filter.date = date;

    const bookings = await Booking.find(filter)
      .populate('room')
      .populate('user', 'name email department role phone studentOrEmployeeId')
      .populate('reviewedBy', 'name role')
      .sort({ createdAt: -1 });

    res.render('bookings/manage', {
      title: 'Manage Room Bookings - CampusConnect',
      bookings,
      currentFilter: { status: status || 'all', date: date || '' }
    });
  } catch (error) {
    console.error('Error managing bookings:', error);
    req.flash('error_msg', 'Could not load bookings list.');
    res.redirect('/dashboard');
  }
};

// Update booking status (Approve / Reject)
exports.updateBookingStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, adminRemarks } = req.body;

    if (!['approved', 'rejected', 'cancelled'].includes(status)) {
      req.flash('error_msg', 'Invalid status update.');
      return res.redirect('/bookings/manage');
    }

    const booking = await Booking.findById(id).populate('room').populate('user');
    if (!booking) {
      req.flash('error_msg', 'Booking not found.');
      return res.redirect('/bookings/manage');
    }

    booking.status = status;
    booking.adminRemarks = adminRemarks || '';
    booking.reviewedBy = req.user._id;
    booking.reviewedAt = new Date();
    await booking.save();

    // Invalidate Redis caches
    await redisClient.delPattern('bookings:*');
    await redisClient.delPattern('rooms:*');

    // Create in-app notification for the user
    await Notification.create({
      user: booking.user._id,
      title: `Booking Request ${status.toUpperCase()}`,
      message: `Your booking request for ${booking.room.name} on ${booking.date} (${booking.startTime}-${booking.endTime}) was ${status}.`,
      link: '/bookings/my-bookings',
      type: 'booking_update'
    });

    // Send Real-Time Socket.IO event to the user
    emitToUser(booking.user._id.toString(), 'notification:new', {
      title: `Booking ${status.toUpperCase()}`,
      message: `Your booking for ${booking.room.name} was ${status}.`,
      type: status === 'approved' ? 'success' : 'error'
    });

    // Emit room schedule update to anyone viewing that room
    emitToRoom(booking.room._id.toString(), 'room:status_changed', {
      bookingId: booking._id,
      status
    });

    // Dispatch email notification
    sendEmail({
      to: booking.user.email,
      subject: `Update on Room Booking: ${booking.room.name} (${status.toUpperCase()})`,
      html: bookingStatusUpdateEmail({
        userName: booking.user.name,
        roomName: booking.room.name,
        date: booking.date,
        startTime: booking.startTime,
        endTime: booking.endTime,
        status: booking.status,
        adminRemarks: booking.adminRemarks
      })
    });

    await AuditLog.create({
      user: req.user._id,
      action: `BOOKING_${status.toUpperCase()}`,
      resource: 'Booking',
      resourceId: booking._id.toString(),
      ipAddress: req.ip,
      details: { room: booking.room.name, status, adminRemarks }
    });

    req.flash('success_msg', `Booking successfully updated to ${status}.`);
    res.redirect('/bookings/manage');
  } catch (error) {
    console.error('Error updating booking status:', error);
    req.flash('error_msg', 'Failed to update booking status.');
    res.redirect('/bookings/manage');
  }
};

// Cancel own booking
exports.cancelBooking = async (req, res) => {
  try {
    const { id } = req.params;
    const booking = await Booking.findById(id).populate('room');

    if (!booking) {
      req.flash('error_msg', 'Booking not found.');
      return res.redirect('/bookings/my-bookings');
    }

    // Only owner or admin can cancel
    if (booking.user.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      req.flash('error_msg', 'Unauthorized to cancel this booking.');
      return res.redirect('/bookings/my-bookings');
    }

    booking.status = 'cancelled';
    booking.adminRemarks = 'Cancelled by applicant.';
    await booking.save();

    await redisClient.delPattern('bookings:*');
    await redisClient.delPattern('rooms:*');

    emitToRoom(booking.room._id.toString(), 'room:slot_released', {
      roomId: booking.room._id,
      date: booking.date
    });

    req.flash('success_msg', 'Booking cancelled successfully.');
    res.redirect('/bookings/my-bookings');
  } catch (error) {
    req.flash('error_msg', 'Failed to cancel booking.');
    res.redirect('/bookings/my-bookings');
  }
};
