const Room = require('../models/Room');
const Booking = require('../models/Booking');
const redisClient = require('../config/redis');
const { emitToAll } = require('../config/socket');
const AuditLog = require('../models/AuditLog');

// Get all rooms with filter & Redis caching
exports.getAllRooms = async (req, res) => {
  try {
    const { building, roomType, minCapacity, search } = req.query;

    const cacheKey = `rooms:list:${building || 'all'}:${roomType || 'all'}:${minCapacity || 0}:${search || 'none'}`;
    const cachedData = await redisClient.get(cacheKey);

    if (cachedData) {
      const parsed = JSON.parse(cachedData);
      return res.render('rooms/index', {
        title: 'Campus Venues & Rooms - CampusConnect',
        rooms: parsed.rooms,
        buildings: parsed.buildings,
        roomTypes: parsed.roomTypes,
        filters: { building, roomType, minCapacity, search }
      });
    }

    const query = {};
    if (building && building !== 'all') query.building = building;
    if (roomType && roomType !== 'all') query.roomType = roomType;
    if (minCapacity) query.capacity = { $gte: parseInt(minCapacity) };
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { building: { $regex: search, $options: 'i' } },
        { amenities: { $regex: search, $options: 'i' } }
      ];
    }

    const rooms = await Room.find(query).sort({ building: 1, name: 1 });
    const allBuildings = await Room.distinct('building');
    const roomTypes = ['Auditorium', 'Seminar Hall', 'Lecture Hall', 'Computer Lab', 'Conference Room', 'Study Room'];

    // Cache the query result for 3 minutes (180 seconds)
    await redisClient.set(cacheKey, JSON.stringify({ rooms, buildings: allBuildings, roomTypes }), 'EX', 180);

    res.render('rooms/index', {
      title: 'Campus Venues & Rooms - CampusConnect',
      rooms,
      buildings: allBuildings,
      roomTypes,
      filters: { building, roomType, minCapacity, search }
    });
  } catch (error) {
    console.error('Error fetching rooms:', error);
    req.flash('error_msg', 'Failed to retrieve rooms.');
    res.redirect('/');
  }
};

// Get single room details with schedule
exports.getRoomDetails = async (req, res) => {
  try {
    const { id } = req.params;
    const room = await Room.findById(id);

    if (!room) {
      req.flash('error_msg', 'Room not found.');
      return res.redirect('/rooms');
    }

    // Default to today's date for initial schedule view
    const todayStr = new Date().toISOString().split('T')[0];
    const dateParam = req.query.date || todayStr;

    // Fetch approved bookings for this room on the specified date
    const bookings = await Booking.find({
      room: room._id,
      date: dateParam,
      status: { $in: ['approved', 'pending'] }
    }).populate('user', 'name role department');

    res.render('rooms/show', {
      title: `${room.name} - Details & Availability`,
      room,
      bookings,
      selectedDate: dateParam
    });
  } catch (error) {
    console.error('Error fetching room details:', error);
    req.flash('error_msg', 'Could not load room details.');
    res.redirect('/rooms');
  }
};

// Render Create Room Form (Admin only)
exports.getCreateRoom = (req, res) => {
  res.render('rooms/create', {
    title: 'Add New Room - CampusConnect',
    room: null,
    isEdit: false
  });
};

// Post Create Room (Admin only)
exports.postCreateRoom = async (req, res) => {
  try {
    const { name, building, floor, capacity, roomType, amenities, image, description } = req.body;

    const parsedAmenities = amenities
      ? amenities.split(',').map((a) => a.trim()).filter(Boolean)
      : ['WiFi', 'Projector', 'Whiteboard'];

    const newRoom = await Room.create({
      name,
      building,
      floor: floor || 'Ground Floor',
      capacity: parseInt(capacity) || 30,
      roomType,
      amenities: parsedAmenities,
      image: image || 'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?auto=format&fit=crop&w=600&q=80',
      description
    });

    // Invalidate Redis cache
    await redisClient.delPattern('rooms:*');

    // Emit live Socket.IO update
    emitToAll('room:created', { room: newRoom });

    await AuditLog.create({
      user: req.user._id,
      action: 'CREATE_ROOM',
      resource: 'Room',
      resourceId: newRoom._id.toString(),
      ipAddress: req.ip,
      details: { name: newRoom.name, building: newRoom.building }
    });

    req.flash('success_msg', `Room ${newRoom.name} created successfully.`);
    res.redirect(`/rooms/${newRoom._id}`);
  } catch (error) {
    console.error('Error creating room:', error);
    req.flash('error_msg', error.message || 'Failed to create room.');
    res.redirect('/rooms/new');
  }
};

// Render Edit Room Form (Admin only)
exports.getEditRoom = async (req, res) => {
  try {
    const room = await Room.findById(req.params.id);
    if (!room) {
      req.flash('error_msg', 'Room not found.');
      return res.redirect('/rooms');
    }
    res.render('rooms/create', {
      title: `Edit ${room.name} - CampusConnect`,
      room,
      isEdit: true
    });
  } catch (error) {
    req.flash('error_msg', 'Error loading edit form.');
    res.redirect('/rooms');
  }
};

// Post Edit Room (Admin only)
exports.postEditRoom = async (req, res) => {
  try {
    const { name, building, floor, capacity, roomType, amenities, image, description, isAvailable } = req.body;

    const parsedAmenities = amenities
      ? amenities.split(',').map((a) => a.trim()).filter(Boolean)
      : ['WiFi', 'Projector', 'Whiteboard'];

    const updatedRoom = await Room.findByIdAndUpdate(
      req.params.id,
      {
        name,
        building,
        floor,
        capacity: parseInt(capacity),
        roomType,
        amenities: parsedAmenities,
        image,
        description,
        isAvailable: isAvailable === 'true' || isAvailable === true
      },
      { new: true, runValidators: true }
    );

    await redisClient.delPattern('rooms:*');
    emitToAll('room:updated', { room: updatedRoom });

    req.flash('success_msg', `Room ${updatedRoom.name} updated successfully.`);
    res.redirect(`/rooms/${updatedRoom._id}`);
  } catch (error) {
    req.flash('error_msg', error.message || 'Failed to update room.');
    res.redirect(`/rooms/${req.params.id}/edit`);
  }
};

// Delete Room (Admin only)
exports.deleteRoom = async (req, res) => {
  try {
    const room = await Room.findByIdAndDelete(req.params.id);
    if (room) {
      await redisClient.delPattern('rooms:*');
      emitToAll('room:deleted', { roomId: req.params.id });
    }
    req.flash('success_msg', 'Room deleted successfully.');
    res.redirect('/rooms');
  } catch (error) {
    req.flash('error_msg', 'Failed to delete room.');
    res.redirect('/rooms');
  }
};
