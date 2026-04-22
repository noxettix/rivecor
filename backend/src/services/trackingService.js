const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');

let io = null;

// requestId => última ubicación
const liveLocations = new Map();

function normalizeToken(raw) {
  if (!raw) return null;
  if (raw.startsWith('Bearer ')) return raw.replace('Bearer ', '').trim();
  return raw.trim();
}

function initTracking(server) {
  io = new Server(server, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST', 'PUT'],
    },
    transports: ['websocket', 'polling'],
  });

  io.use((socket, next) => {
    try {
      const token =
        normalizeToken(socket.handshake.auth?.token) ||
        normalizeToken(socket.handshake.headers?.authorization);

      if (!token) {
        return next(new Error('No autorizado'));
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.user = decoded;
      next();
    } catch (e) {
      next(new Error('Token inválido'));
    }
  });

  io.on('connection', (socket) => {
    console.log('🔌 Socket conectado:', socket.user?.email || socket.id);

    socket.on('tracking:join-request', ({ requestId }) => {
      if (!requestId) return;

      socket.join(`request:${requestId}`);

      const lastLocation = liveLocations.get(String(requestId));
      if (lastLocation) {
        socket.emit('tracking:location', lastLocation);
      }
    });

    socket.on('tracking:leave-request', ({ requestId }) => {
      if (!requestId) return;
      socket.leave(`request:${requestId}`);
    });

    socket.on('tracking:update', (payload) => {
      try {
        const requestId = String(payload?.requestId || '');
        if (!requestId) return;

        const lat = Number(payload?.lat);
        const lng = Number(payload?.lng);

        if (Number.isNaN(lat) || Number.isNaN(lng)) return;

        const normalized = {
          requestId,
          mechanicUserId: socket.user?.userId || null,
          mechanicName: payload?.mechanicName || 'Mecánico',
          lat,
          lng,
          heading: payload?.heading != null ? Number(payload.heading) : null,
          speed: payload?.speed != null ? Number(payload.speed) : null,
          updatedAt: new Date().toISOString(),
        };

        liveLocations.set(requestId, normalized);
        io.to(`request:${requestId}`).emit('tracking:location', normalized);
      } catch (e) {
        console.error('tracking:update error:', e);
      }
    });

    socket.on('disconnect', () => {
      console.log('🔌 Socket desconectado:', socket.user?.email || socket.id);
    });
  });
}

function getLiveLocation(requestId) {
  return liveLocations.get(String(requestId)) || null;
}

function setLiveLocation(requestId, location) {
  const key = String(requestId);
  liveLocations.set(key, location);

  if (io) {
    io.to(`request:${key}`).emit('tracking:location', location);
  }
}

module.exports = {
  initTracking,
  getLiveLocation,
  setLiveLocation,
};