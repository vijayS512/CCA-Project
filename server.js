require('dotenv').config();
const http = require('http');
const path = require('path');
const express = require('express');
const cookieParser = require('cookie-parser');
const session = require('express-session');
const flash = require('connect-flash');
const morgan = require('morgan');
const cors = require('cors');

const connectDB = require('./config/db');
const { initSocket } = require('./config/socket');
const { initCronJobs } = require('./services/cronService');
const { setUserLocals } = require('./middleware/authMiddleware');
const { notFound, errorHandler } = require('./middleware/errorHandler');

// Route imports
const authRoutes = require('./routes/authRoutes');
const roomRoutes = require('./routes/roomRoutes');
const bookingRoutes = require('./routes/bookingRoutes');
const eventRoutes = require('./routes/eventRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const apiRoutes = require('./routes/apiRoutes');
const Event = require('./models/Event');
const Room = require('./models/Room');

const app = express();
const server = http.createServer(app);

// Connect to Database
connectDB();

// Setup View Engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Core Middlewares
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('dev'));
}
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

// Session configuration for flash messages
app.use(
  session({
    secret: process.env.SESSION_SECRET || 'campusconnect_session_secret_key_2026',
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 60000 }
  })
);
app.use(flash());

// Global template context middleware (current user, flash messages)
app.use(setUserLocals);

// Home Landing Page Route
app.get('/', async (req, res) => {
  try {
    const featuredEvents = await Event.find({ status: 'upcoming', isPublished: true })
      .populate('room')
      .sort({ date: 1 })
      .limit(3);

    const featuredRooms = await Room.find({ isAvailable: true })
      .sort({ capacity: -1 })
      .limit(3);

    res.render('index', {
      title: 'CampusConnect - College Event & Room Booking System',
      featuredEvents,
      featuredRooms
    });
  } catch (error) {
    console.error('Home page error:', error);
    res.render('index', {
      title: 'CampusConnect - College Event & Room Booking System',
      featuredEvents: [],
      featuredRooms: []
    });
  }
});

// Mount Feature Routers
app.use('/auth', authRoutes);
app.use('/rooms', roomRoutes);
app.use('/bookings', bookingRoutes);
app.use('/events', eventRoutes);
app.use('/dashboard', dashboardRoutes);
app.use('/api', apiRoutes);

// Error Handling Middlewares
app.use(notFound);
app.use(errorHandler);

// Initialize Socket.IO
initSocket(server);

// Initialize Background Cron Jobs
initCronJobs();

// Start Server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`====================================================`);
  console.log(`🚀 CampusConnect Server running on port ${PORT}`);
  console.log(`🌐 Local URL: http://localhost:${PORT}`);
  console.log(`📦 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`====================================================`);
});

module.exports = { app, server };
