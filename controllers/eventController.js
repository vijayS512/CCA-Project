const QRCode = require('qrcode');
const Event = require('../models/Event');
const Room = require('../models/Room');
const Registration = require('../models/Registration');
const Booking = require('../models/Booking');
const Notification = require('../models/Notification');
const AuditLog = require('../models/AuditLog');
const { sendEmail } = require('../config/mailer');
const { eventTicketEmail } = require('../services/emailTemplates');
const { emitToAll, emitToEvent } = require('../config/socket');
const redisClient = require('../config/redis');

// Get all events with category filters and Redis cache
exports.getAllEvents = async (req, res) => {
  try {
    const { category, search, status } = req.query;

    const cacheKey = `events:list:${category || 'all'}:${status || 'all'}:${search || 'none'}`;
    const cached = await redisClient.get(cacheKey);

    if (cached) {
      const parsed = JSON.parse(cached);
      return res.render('events/index', {
        title: 'College Events & Workshops - CampusConnect',
        events: parsed.events,
        categories: parsed.categories,
        filters: { category, search, status }
      });
    }

    const query = { isPublished: true };
    if (category && category !== 'all') query.category = category;
    if (status && status !== 'all') query.status = status;
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { organizingClub: { $regex: search, $options: 'i' } }
      ];
    }

    const events = await Event.find(query)
      .populate('organizer', 'name email department')
      .populate('room', 'name building')
      .sort({ date: 1 });

    const categories = ['Technical', 'Cultural', 'Sports', 'Workshop', 'Seminar', 'Hackathon', 'Career/Placement'];

    // Cache for 2 minutes
    await redisClient.set(cacheKey, JSON.stringify({ events, categories }), 'EX', 120);

    res.render('events/index', {
      title: 'College Events & Workshops - CampusConnect',
      events,
      categories,
      filters: { category, search, status }
    });
  } catch (error) {
    console.error('Error fetching events:', error);
    req.flash('error_msg', 'Failed to retrieve events.');
    res.redirect('/');
  }
};

// Event Details page
exports.getEventDetails = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id)
      .populate('organizer', 'name email department avatar')
      .populate('room');

    if (!event) {
      req.flash('error_msg', 'Event not found.');
      return res.redirect('/events');
    }

    let isRegistered = false;
    let userRegistration = null;

    if (req.user) {
      userRegistration = await Registration.findOne({
        event: event._id,
        user: req.user._id
      });
      if (userRegistration) {
        isRegistered = true;
      }
    }

    res.render('events/show', {
      title: `${event.title} - CampusConnect`,
      event,
      isRegistered,
      userRegistration
    });
  } catch (error) {
    console.error('Error showing event details:', error);
    req.flash('error_msg', 'Error loading event.');
    res.redirect('/events');
  }
};

// Render Create Event Form (Faculty / Admin)
exports.getCreateEvent = async (req, res) => {
  try {
    const rooms = await Room.find({ isAvailable: true }).sort({ name: 1 });
    const categories = ['Technical', 'Cultural', 'Sports', 'Workshop', 'Seminar', 'Hackathon', 'Career/Placement'];

    res.render('events/create', {
      title: 'Host New Event - CampusConnect',
      rooms,
      categories,
      event: null,
      isEdit: false
    });
  } catch (error) {
    req.flash('error_msg', 'Error preparing event form.');
    res.redirect('/events');
  }
};

// Post Create Event (Faculty / Admin)
exports.postCreateEvent = async (req, res) => {
  try {
    const {
      title,
      description,
      category,
      date,
      startTime,
      endTime,
      venueType,
      roomId,
      customVenue,
      organizingClub,
      capacity,
      bannerImage
    } = req.body;

    const event = await Event.create({
      title,
      description,
      category,
      date: new Date(date),
      startTime,
      endTime,
      venueType,
      room: venueType === 'Room' && roomId ? roomId : null,
      customVenue: venueType !== 'Room' ? customVenue : '',
      organizer: req.user._id,
      organizingClub: organizingClub || req.user.department || 'Campus Club',
      capacity: parseInt(capacity) || 100,
      bannerImage: bannerImage || 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&w=1000&q=80'
    });

    // If venue is a campus room, auto-reserve room for the event
    if (venueType === 'Room' && roomId) {
      await Booking.create({
        room: roomId,
        user: req.user._id,
        date: date,
        startTime,
        endTime,
        purpose: `Event: ${title}`,
        expectedAttendees: parseInt(capacity),
        status: 'approved',
        adminRemarks: `Auto-reserved for campus event: ${title}`
      });
      await redisClient.delPattern('rooms:*');
    }

    // Invalidate Redis cache
    await redisClient.delPattern('events:*');

    // Notify all clients in real-time
    emitToAll('event:created', {
      eventId: event._id,
      title: event.title,
      category: event.category
    });

    await AuditLog.create({
      user: req.user._id,
      action: 'CREATE_EVENT',
      resource: 'Event',
      resourceId: event._id.toString(),
      ipAddress: req.ip,
      details: { title: event.title, capacity: event.capacity }
    });

    req.flash('success_msg', `Event "${event.title}" published successfully!`);
    res.redirect(`/events/${event._id}`);
  } catch (error) {
    console.error('Error creating event:', error);
    req.flash('error_msg', error.message || 'Failed to create event.');
    res.redirect('/events/new');
  }
};

// Register / RSVP for Event (Student / Faculty)
exports.registerForEvent = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id).populate('room');
    if (!event) {
      req.flash('error_msg', 'Event not found.');
      return res.redirect('/events');
    }

    if (event.status === 'completed' || event.status === 'cancelled') {
      req.flash('error_msg', 'Registration is closed for this event.');
      return res.redirect(`/events/${event._id}`);
    }

    if (event.registeredCount >= event.capacity) {
      req.flash('error_msg', 'Sorry, this event is already sold out!');
      return res.redirect(`/events/${event._id}`);
    }

    // Check if already registered
    const alreadyRegistered = await Registration.findOne({
      event: event._id,
      user: req.user._id
    });

    if (alreadyRegistered) {
      req.flash('error_msg', 'You are already registered for this event.');
      return res.redirect(`/events/${event._id}`);
    }

    // Generate unique Ticket Code: CC-EVT-<random5>
    const ticketCode = `CC-EVT-${Math.floor(100000 + Math.random() * 900000)}`;

    // Generate QR code data URL (contains ticket verification payload)
    const qrPayload = JSON.stringify({
      ticketCode,
      eventId: event._id.toString(),
      eventTitle: event.title,
      userId: req.user._id.toString(),
      userName: req.user.name
    });
    const qrCodeDataUrl = await QRCode.toDataURL(qrPayload);

    // Save registration
    const registration = await Registration.create({
      event: event._id,
      user: req.user._id,
      ticketCode,
      qrCodeDataUrl
    });

    // Increment registered count
    event.registeredCount += 1;
    await event.save();

    // Invalidate Redis cache
    await redisClient.delPattern('events:*');

    // Emit live attendee count to all users viewing this event page
    emitToEvent(event._id.toString(), 'event:rsvp_updated', {
      eventId: event._id,
      registeredCount: event.registeredCount,
      capacity: event.capacity
    });

    // Create In-App Notification
    await Notification.create({
      user: req.user._id,
      title: 'Ticket Confirmed! 🎟️',
      message: `You are registered for "${event.title}". Ticket Code: ${ticketCode}`,
      link: `/events/my-tickets`,
      type: 'event_reminder'
    });

    // Send confirmation email with QR code
    const venueName = event.room ? `${event.room.name} (${event.room.building})` : event.customVenue || 'Campus Venue';
    sendEmail({
      to: req.user.email,
      subject: `Your Ticket Confirmed: ${event.title}`,
      html: eventTicketEmail({
        userName: req.user.name,
        eventTitle: event.title,
        date: event.date.toDateString(),
        startTime: event.startTime,
        venue: venueName,
        ticketCode,
        qrCodeDataUrl
      })
    });

    req.flash('success_msg', '🎉 Registration confirmed! Your ticket and QR code are ready.');
    res.redirect('/events/my-tickets');
  } catch (error) {
    console.error('Registration error:', error);
    req.flash('error_msg', 'Failed to register for event.');
    res.redirect(`/events/${req.params.id}`);
  }
};

// View User's Registered Tickets
exports.getMyTickets = async (req, res) => {
  try {
    const registrations = await Registration.find({ user: req.user._id })
      .populate({
        path: 'event',
        populate: [{ path: 'room' }, { path: 'organizer', select: 'name' }]
      })
      .sort({ createdAt: -1 });

    res.render('events/my-tickets', {
      title: 'My Event Passes & Tickets - CampusConnect',
      registrations
    });
  } catch (error) {
    console.error('Error fetching tickets:', error);
    req.flash('error_msg', 'Could not load your event tickets.');
    res.redirect('/dashboard');
  }
};

// Organizer / Admin: View Attendees List for an event
exports.getEventAttendees = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) {
      req.flash('error_msg', 'Event not found.');
      return res.redirect('/events');
    }

    // Check organizer permission
    if (event.organizer.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      req.flash('error_msg', 'Unauthorized to view attendee list.');
      return res.redirect(`/events/${event._id}`);
    }

    const attendees = await Registration.find({ event: event._id })
      .populate('user', 'name email department studentOrEmployeeId phone')
      .sort({ createdAt: 1 });

    res.render('events/attendees', {
      title: `Attendees - ${event.title}`,
      event,
      attendees
    });
  } catch (error) {
    req.flash('error_msg', 'Failed to load attendees.');
    res.redirect(`/events/${req.params.id}`);
  }
};

// Check-in attendee (Organizer/Admin)
exports.checkInAttendee = async (req, res) => {
  try {
    const { registrationId } = req.params;
    const reg = await Registration.findById(registrationId);
    if (!reg) {
      return res.status(404).json({ success: false, message: 'Registration not found' });
    }

    reg.checkedIn = !reg.checkedIn;
    reg.checkedInAt = reg.checkedIn ? new Date() : null;
    await reg.save();

    res.json({ success: true, checkedIn: reg.checkedIn, checkedInAt: reg.checkedInAt });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
