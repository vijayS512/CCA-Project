const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema(
  {
    room: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Room',
      required: true
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    date: {
      type: String, // Stored as YYYY-MM-DD for precise querying and indexing
      required: [true, 'Booking date is required']
    },
    startTime: {
      type: String, // HH:mm format, e.g., '09:00'
      required: [true, 'Start time is required']
    },
    endTime: {
      type: String, // HH:mm format, e.g., '11:00'
      required: [true, 'End time is required']
    },
    purpose: {
      type: String,
      required: [true, 'Purpose of booking is required'],
      trim: true
    },
    expectedAttendees: {
      type: Number,
      default: 1
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected', 'cancelled', 'completed'],
      default: 'pending'
    },
    adminRemarks: {
      type: String,
      default: ''
    },
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    reviewedAt: {
      type: Date
    }
  },
  { timestamps: true }
);

// Compound index for quick slot availability queries
bookingSchema.index({ room: 1, date: 1, status: 1 });

module.exports = mongoose.model('Booking', bookingSchema);
