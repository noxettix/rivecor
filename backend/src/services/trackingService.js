const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');

let io = null;

// requestId => última ubicación
const liveLocations = new Map();

function normalizeToken(raw) {
  if (!raw || typeof raw !== 'string') return null;
  if (raw.startsWith('Bearer ')) return raw.replace('Bearer ', '').trim();
  return raw.trim();
}

function initTracking(server) {
  if (io) {
    return io;
  }

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
      console.error('❌ socket auth error:', e?.message || e);
      next(new Error('Token inválido'));
    }
  });

  io.on('connection', (socket) => {
    console.log('🔌 Socket conectado:', socket.user?.email || socket.id);

    socket.on('tracking:join-request', ({ requestId }) => {
      const safeRequestId = String(requestId || '').trim();
      if (!safeRequestId) return;

      socket.join(`request:${safeRequestId}`);

      const lastLocation = liveLocations.get(safeRequestId);
      if (lastLocation) {
        socket.emit('tracking:location', lastLocation);
      }
    });

    socket.on('tracking:leave-request', ({ requestId }) => {
      const safeRequestId = String(requestId || '').trim();
      if (!safeRequestId) return;

      socket.leave(`request:${safeRequestId}`);
    });

    socket.on('tracking:update', (payload = {}) => {
      try {
        const safeRequestId = String(payload?.requestId || '').trim();
        if (!safeRequestId) return;

        const lat = Number(payload?.lat);
        const lng = Number(payload?.lng);

        if (Number.isNaN(lat) || Number.isNaN(lng)) {
          console.log('⚠️ tracking:update ignorado por lat/lng inválidos');
          return;
        }

        const normalized = {
          requestId: safeRequestId,
          mechanicUserId: socket.user?.userId || socket.user?.id || null,
          mechanicName: payload?.mechanicName || 'Mecánico',
          lat,
          lng,
          heading: payload?.heading != null ? Number(payload.heading) : null,
          speed: payload?.speed != null ? Number(payload.speed) : null,
          updatedAt: new Date().toISOString(),
        };

        liveLocations.set(safeRequestId, normalized);

        io.to(`request:${safeRequestId}`).emit('tracking:location', normalized);

        console.log('📍 tracking:update emitido:', safeRequestId, lat, lng);
      } catch (e) {
        console.error('❌ tracking:update error:', e);
      }
    });

    socket.on('disconnect', () => {
      console.log('🔌 Socket desconectado:', socket.user?.email || socket.id);
    });
  });

  return io;
}

function getIO() {
  return io;
}

function getLiveLocation(requestId) {
  const key = String(requestId || '').trim();
  if (!key) return null;
  return liveLocations.get(key) || null;
}

function setLiveLocation(requestId, location) {
  const key = String(requestId || '').trim();
  if (!key || !location) return;

  const normalized = {
    ...location,
    requestId: key,
    updatedAt: location.updatedAt || new Date().toISOString(),
  };

  liveLocations.set(key, normalized);

  if (io) {
    io.to(`request:${key}`).emit('tracking:location', normalized);
  }
}

module.exports = {
  initTracking,
  getIO,
  getLiveLocation,
  setLiveLocation,
};