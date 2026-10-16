let ioInstance = null;

const initSocket = (server) => {
  const { Server } = require('socket.io');
  const io = new Server(server, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST']
    }
  });

  io.on('connection', (socket) => {
    // console.log(`[Socket.IO] Client connected: ${socket.id}`);

    // Join user specific room for direct alerts
    socket.on('join_user_room', (userId) => {
      if (userId) {
        socket.join(`user_${userId}`);
        // console.log(`[Socket.IO] User ${userId} joined room user_${userId}`);
      }
    });

    // Join room calendar view to get live slot bookings
    socket.on('join_room_view', (roomId) => {
      if (roomId) {
        socket.join(`room_${roomId}`);
      }
    });

    // Join event view for real-time ticket/capacity count
    socket.on('join_event_view', (eventId) => {
      if (eventId) {
        socket.join(`event_${eventId}`);
      }
    });

    socket.on('disconnect', () => {
      // client disconnected
    });
  });

  ioInstance = io;
  return io;
};

const getIO = () => {
  if (!ioInstance) {
    throw new Error('Socket.io has not been initialized yet!');
  }
  return ioInstance;
};

// Real-time helper triggers
const emitToUser = (userId, eventName, data) => {
  if (ioInstance && userId) {
    ioInstance.to(`user_${userId}`).emit(eventName, data);
  }
};

const emitToAll = (eventName, data) => {
  if (ioInstance) {
    ioInstance.emit(eventName, data);
  }
};

const emitToRoom = (roomId, eventName, data) => {
  if (ioInstance && roomId) {
    ioInstance.to(`room_${roomId}`).emit(eventName, data);
  }
};

const emitToEvent = (eventId, eventName, data) => {
  if (ioInstance && eventId) {
    ioInstance.to(`event_${eventId}`).emit(eventName, data);
  }
};

module.exports = {
  initSocket,
  getIO,
  emitToUser,
  emitToAll,
  emitToRoom,
  emitToEvent
};
