const mongoose = require('mongoose');

const roomSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Room name/number is required'],
      trim: true,
      unique: true
    },
    building: {
      type: String,
      required: [true, 'Building name is required'],
      trim: true
    },
    floor: {
      type: String,
      default: 'Ground Floor'
    },
    capacity: {
      type: Number,
      required: [true, 'Capacity is required'],
      min: 1
    },
    roomType: {
      type: String,
      enum: ['Auditorium', 'Seminar Hall', 'Lecture Hall', 'Computer Lab', 'Conference Room', 'Study Room'],
      default: 'Lecture Hall'
    },
    amenities: {
      type: [String],
      default: ['WiFi', 'Projector', 'Whiteboard']
    },
    isAvailable: {
      type: Boolean,
      default: true
    },
    image: {
      type: String,
      default: 'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?auto=format&fit=crop&w=600&q=80'
    },
    description: {
      type: String,
      default: ''
    },
    requiresApproval: {
      type: Boolean,
      default: true
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model('Room', roomSchema);
