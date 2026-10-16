require('dotenv').config();
const mongoose = require('mongoose');
const QRCode = require('qrcode');
const User = require('../models/User');
const Room = require('../models/Room');
const Event = require('../models/Event');
const Booking = require('../models/Booking');
const Registration = require('../models/Registration');
const Notification = require('../models/Notification');
const AuditLog = require('../models/AuditLog');

const seedData = async () => {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/campusconnect';
    console.log(`[Seed] Connecting to MongoDB: ${mongoUri}`);
    await mongoose.connect(mongoUri);

    console.log('[Seed] Clearing existing collections...');
    await Promise.all([
      User.deleteMany({}),
      Room.deleteMany({}),
      Event.deleteMany({}),
      Booking.deleteMany({}),
      Registration.deleteMany({}),
      Notification.deleteMany({}),
      AuditLog.deleteMany({})
    ]);

    console.log('[Seed] Seeding Users with Role-Based Access Control...');
    // Default password for all seed accounts: admin123, faculty123, student123
    const admin = await User.create({
      name: 'Dr. Sarah Jenkins',
      email: 'admin@campus.edu',
      password: 'admin123',
      role: 'admin',
      department: 'Campus Administration',
      studentOrEmployeeId: 'ADM-001',
      phone: '+1 (555) 100-2001',
      avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=200&q=80'
    });

    const faculty = await User.create({
      name: 'Prof. Alan Turing',
      email: 'faculty@campus.edu',
      password: 'faculty123',
      role: 'faculty',
      department: 'Computer Science & Engineering',
      studentOrEmployeeId: 'FAC-104',
      phone: '+1 (555) 100-2002',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80'
    });

    const student = await User.create({
      name: 'Elena Rostova',
      email: 'student@campus.edu',
      password: 'student123',
      role: 'student',
      department: 'Artificial Intelligence',
      studentOrEmployeeId: 'STU-2024-88',
      phone: '+1 (555) 100-2003',
      avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=200&q=80'
    });

    console.log('[Seed] Seeding Campus Venues & Rooms...');
    const rooms = await Room.insertMany([
      {
        name: 'APJ Abdul Kalam Grand Auditorium',
        building: 'Main Academic Center',
        floor: 'Ground Floor',
        capacity: 450,
        roomType: 'Auditorium',
        amenities: ['4K Projector', 'Surround Sound System', 'Wireless Mics', 'Central AC', 'Stage Lighting', 'WiFi'],
        isAvailable: true,
        image: 'https://images.unsplash.com/photo-1517457373958-b7bdd4587205?auto=format&fit=crop&w=800&q=80',
        description: 'Premier campus auditorium equipped for large symposiums, keynote speeches, annual fests, and cultural performances.'
      },
      {
        name: 'Turing Advanced Computing Lab 301',
        building: 'Engineering Block B',
        floor: '3rd Floor',
        capacity: 65,
        roomType: 'Computer Lab',
        amenities: ['65 Workstations (RTX GPU)', 'Dual Smart Boards', 'High-Speed LAN', 'AC', 'Projector'],
        isAvailable: true,
        image: 'https://images.unsplash.com/photo-1562774053-701939374585?auto=format&fit=crop&w=800&q=80',
        description: 'Specialized lab for AI training, hackathons, robotics simulations, and competitive coding contests.'
      },
      {
        name: 'Newton Seminar Hall B',
        building: 'Science & Research Tower',
        floor: '2nd Floor',
        capacity: 120,
        roomType: 'Seminar Hall',
        amenities: ['Dual Projectors', 'Podium Mic', 'Sound System', 'AC', 'WiFi'],
        isAvailable: true,
        image: 'https://images.unsplash.com/photo-1505373877841-8d25f7d46678?auto=format&fit=crop&w=800&q=80',
        description: 'Ideal venue for guest lectures, technical workshops, and faculty symposiums.'
      },
      {
        name: 'Lovelace Lecture Hall 102',
        building: 'Engineering Block A',
        floor: '1st Floor',
        capacity: 90,
        roomType: 'Lecture Hall',
        amenities: ['Tiered Seating', 'Interactive Whiteboard', 'Ceiling Speakers', 'WiFi'],
        isAvailable: true,
        image: 'https://images.unsplash.com/photo-1580582932707-520aed937b7b?auto=format&fit=crop&w=800&q=80',
        description: 'Modern tiered lecture hall suitable for core engineering courses, club meetings, and exams.'
      },
      {
        name: 'Executive Boardroom 405',
        building: 'Administrative Wing',
        floor: '4th Floor',
        capacity: 25,
        roomType: 'Conference Room',
        amenities: ['Video Conferencing Camera', 'Smart Conference Table', 'AC', 'WiFi', 'Coffee Station'],
        isAvailable: true,
        image: 'https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=800&q=80',
        description: 'Executive conference space for student council deliberations, committee meetings, and placement interviews.'
      },
      {
        name: 'Innovation & Robotics Workspace',
        building: 'Student Activity Center',
        floor: 'Basement Level',
        capacity: 40,
        roomType: 'Study Room',
        amenities: ['3D Printers', 'Soldering Stations', 'Oscilloscopes', 'High-Speed WiFi'],
        isAvailable: true,
        image: 'https://images.unsplash.com/photo-1581092335397-9583fe92d232?auto=format&fit=crop&w=800&q=80',
        description: 'Open collaborative maker-space for student engineering projects, hardware testing, and prototype building.'
      }
    ]);

    console.log('[Seed] Seeding College Events...');
    const now = new Date();
    const eventDate1 = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000); // 3 days later
    const eventDate2 = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days later
    const eventDate3 = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000); // 14 days later

    const events = await Event.insertMany([
      {
        title: 'National Collegiate Hackathon 2026: CodeNext',
        description: 'Join over 200 college innovators for a 36-hour non-stop hackathon focused on AI, Web3, GreenTech, and Smart Healthcare. Prizes worth $10,000, industry mentors from Google and Microsoft, and free refreshments throughout.',
        category: 'Hackathon',
        date: eventDate1,
        startTime: '09:00',
        endTime: '21:00',
        venueType: 'Room',
        room: rooms[1]._id, // Turing Lab
        organizer: faculty._id,
        organizingClub: 'ACM Student Chapter',
        capacity: 65,
        registeredCount: 1,
        bannerImage: 'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?auto=format&fit=crop&w=1000&q=80'
      },
      {
        title: 'Generative AI & Autonomous Agent Architecture Workshop',
        description: 'Hands-on technical workshop exploring LLM orchestration, vector databases, multi-agent frameworks, and building real-world enterprise agent workflows.',
        category: 'Workshop',
        date: eventDate2,
        startTime: '14:00',
        endTime: '17:00',
        venueType: 'Room',
        room: rooms[2]._id, // Newton Seminar Hall
        organizer: faculty._id,
        organizingClub: 'Google Developer Student Club',
        capacity: 120,
        registeredCount: 0,
        bannerImage: 'https://images.unsplash.com/photo-1485827404703-89b55fcc595e?auto=format&fit=crop&w=1000&q=80'
      },
      {
        title: 'Spring Campus Cultural Festival & Battle of Bands',
        description: 'The biggest cultural extravaganza of the academic year! Featuring live performances by top college bands, stand-up comedy, street plays, art exhibitions, and food stalls.',
        category: 'Cultural',
        date: eventDate3,
        startTime: '16:00',
        endTime: '22:00',
        venueType: 'Room',
        room: rooms[0]._id, // Grand Auditorium
        organizer: admin._id,
        organizingClub: 'Student Cultural Council',
        capacity: 450,
        registeredCount: 0,
        bannerImage: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=1000&q=80'
      }
    ]);

    console.log('[Seed] Seeding Sample Bookings & Conflict-Free Slots...');
    const todayStr = now.toISOString().split('T')[0];
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    await Booking.insertMany([
      {
        room: rooms[0]._id,
        user: faculty._id,
        date: todayStr,
        startTime: '09:00',
        endTime: '11:00',
        purpose: 'Guest Lecture: Modern Systems Architecture',
        expectedAttendees: 150,
        status: 'approved',
        reviewedBy: admin._id,
        reviewedAt: now,
        adminRemarks: 'Approved for Dept of CSE'
      },
      {
        room: rooms[1]._id,
        user: student._id,
        date: tomorrow,
        startTime: '14:00',
        endTime: '16:00',
        purpose: 'AI Club Project Defense & Code Review',
        expectedAttendees: 20,
        status: 'pending',
        adminRemarks: ''
      }
    ]);

    console.log('[Seed] Seeding Ticket Pass with QR Code for Student...');
    const sampleTicketCode = 'CC-EVT-789421';
    const qrPayload = JSON.stringify({
      ticketCode: sampleTicketCode,
      eventId: events[0]._id.toString(),
      eventTitle: events[0].title,
      userId: student._id.toString(),
      userName: student.name
    });
    const qrCodeDataUrl = await QRCode.toDataURL(qrPayload);

    await Registration.create({
      event: events[0]._id,
      user: student._id,
      ticketCode: sampleTicketCode,
      qrCodeDataUrl,
      checkedIn: false
    });

    console.log('[Seed] Seeding Welcome Notifications...');
    await Notification.create({
      user: student._id,
      title: 'Welcome to CampusConnect! 🎓',
      message: 'Your student account is active. You are registered for the National Collegiate Hackathon 2026.',
      link: '/events/my-tickets',
      type: 'general'
    });

    console.log('===========================================================');
    console.log('✅ DATABASE SEEDING COMPLETED SUCCESSFULLY!');
    console.log('===========================================================');
    console.log('Demo Credentials for Instant Testing:');
    console.log('-----------------------------------------------------------');
    console.log('👑 Admin:   admin@campus.edu   / admin123');
    console.log('👨‍🏫 Faculty: faculty@campus.edu / faculty123');
    console.log('🎓 Student: student@campus.edu / student123');
    console.log('===========================================================');

    process.exit(0);
  } catch (error) {
    console.error('❌ Seeding error:', error);
    process.exit(1);
  }
};

seedData();
