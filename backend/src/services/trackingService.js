// backend/src/services/trackingService.js
// Agregar al index.js existente

const { Server } = require('socket.io');

let io = null;

// Inicializar WebSocket sobre el servidor HTTP existente
function initTracking(httpServer) {
  io = new Server(httpServer, {
    cors: {
      origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:5173'],
      methods: ['GET', 'POST']
    }
  });

  io.on('connection', (socket) => {
    console.log('🔌 Socket conectado:', socket.id);

    // Mecánico actualiza su ubicación
    // Emitido por la app mobile del mecánico cada 5 segundos
    socket.on('mechanic:location', ({ mechanicId, mechanicName, lat, lng, requestId }) => {
      console.log(`📍 Mecánico ${mechanicName}: ${lat}, ${lng}`);

      // Guardar última ubicación en memoria
      mechanicLocations[mechanicId] = {
        mechanicId, mechanicName, lat, lng,
        updatedAt: new Date().toISOString()
      };

      // Emitir a todos los clientes que están viendo esa solicitud
      if (requestId) {
        io.to(`request:${requestId}`).emit('mechanic:moved', {
          mechanicId, mechanicName, lat, lng,
          updatedAt: new Date().toISOString()
        });
      }

      // Emitir a sala del mecánico para que todos lo vean
      io.to(`mechanic:${mechanicId}`).emit('mechanic:moved', {
        mechanicId, mechanicName, lat, lng,
        updatedAt: new Date().toISOString()
      });
    });

    // Cliente se une a sala de seguimiento de una solicitud
    socket.on('tracking:join', ({ requestId, role }) => {
      socket.join(`request:${requestId}`);
      console.log(`👁 ${role} observando solicitud ${requestId}`);

      // Enviar última ubicación conocida del mecánico si existe
      const loc = Object.values(mechanicLocations)[0]; // simplificado
      if (loc) socket.emit('mechanic:moved', loc);
    });

    // Mecánico acepta una solicitud y empieza tracking
    socket.on('mechanic:accept', ({ mechanicId, requestId, estimatedMinutes }) => {
      socket.join(`request:${requestId}`);
      io.to(`request:${requestId}`).emit('request:accepted', {
        mechanicId, requestId, estimatedMinutes,
        estimatedAt: new Date(Date.now() + estimatedMinutes * 60000).toISOString()
      });
    });

    // Mecánico llega
    socket.on('mechanic:arrived', ({ requestId }) => {
      io.to(`request:${requestId}`).emit('request:arrived', {
        arrivedAt: new Date().toISOString()
      });
    });

    socket.on('disconnect', () => {
      console.log('🔌 Socket desconectado:', socket.id);
    });
  });

  console.log('🗺️ Tracking WebSocket iniciado');
  return io;
}

// Ubicaciones en memoria (en producción usar Redis)
const mechanicLocations = {};

function getIO() { return io; }
function getMechanicLocation(mechanicId) { return mechanicLocations[mechanicId] || null; }
function getAllLocations() { return mechanicLocations; }

module.exports = { initTracking, getIO, getMechanicLocation, getAllLocations };
