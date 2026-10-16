const mongoose = require('mongoose');

const eventSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Event title is required'],
      trim: true
    },
    description: {
      type: String,
      required: [true, 'Event description is required']
    },
    category: {
      type: String,
      enum: ['Technical', 'Cultural', 'Sports', 'Workshop', 'Seminar', 'Hackathon', 'Career/Placement'],
      default: 'Workshop'
    },
    date: {
      type: Date,
      required: [true, 'Event date is required']
    },
    startTime: {
      type: String,
      required: [true, 'Start time is required'] // e.g. "10:00"
    },
    endTime: {
      type: String,
      required: [true, 'End time is required'] // e.g. "13:00"
    },
    venueType: {
      type: String,
      enum: ['Room', 'Virtual', 'Outdoor'],
      default: 'Room'
    },
    room: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Room'
    },
    customVenue: {
      type: String,
      default: ''
    },
    organizer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    organizingClub: {
      type: String,
      default: 'Student Affairs'
    },
    capacity: {
      type: Number,
      required: [true, 'Event seat capacity is required'],
      min: 1
    },
    registeredCount: {
      type: Number,
      default: 0
    },
    bannerImage: {
      type: String,
      default: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&w=1000&q=80'
    },
    status: {
      type: String,
      enum: ['upcoming', 'ongoing', 'completed', 'cancelled'],
      default: 'upcoming'
    },
    isPublished: {
      type: Boolean,
      default: true
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model('Event', eventSchema);
