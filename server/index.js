const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const http = require('http');
const { WebSocketServer } = require('ws');
require('dotenv').config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Create HTTP server
const server = http.createServer(app);

// WebSocket server
const wss = new WebSocketServer({ server });

// WebSocket room management: Map<matchId, Set<ws>>
const wsManager = new Map();

wss.on('connection', (ws) => {
  console.log('New WebSocket connection established');

  ws.isAlive = true;
  ws.subscribedMatches = new Set();

  ws.on('pong', () => {
    ws.isAlive = true;
  });

  ws.on('message', (data) => {
    try {
      const message = JSON.parse(data.toString());

      if (message.type === 'subscribe' && message.matchId) {
        const matchId = message.matchId.toString();

        // Add client to the match room
        if (!wsManager.has(matchId)) {
          wsManager.set(matchId, new Set());
        }
        wsManager.get(matchId).add(ws);
        ws.subscribedMatches.add(matchId);

        console.log(`Client subscribed to match: ${matchId}`);
        ws.send(JSON.stringify({
          type: 'subscribed',
          matchId,
          message: `Subscribed to match ${matchId}`
        }));
      }

      if (message.type === 'unsubscribe' && message.matchId) {
        const matchId = message.matchId.toString();

        if (wsManager.has(matchId)) {
          wsManager.get(matchId).delete(ws);
          if (wsManager.get(matchId).size === 0) {
            wsManager.delete(matchId);
          }
        }
        ws.subscribedMatches.delete(matchId);

        console.log(`Client unsubscribed from match: ${matchId}`);
      }
    } catch (err) {
      console.error('WebSocket message parse error:', err.message);
    }
  });

  ws.on('close', () => {
    // Clean up: remove client from all match rooms
    for (const matchId of ws.subscribedMatches) {
      if (wsManager.has(matchId)) {
        wsManager.get(matchId).delete(ws);
        if (wsManager.get(matchId).size === 0) {
          wsManager.delete(matchId);
        }
      }
    }
    console.log('WebSocket connection closed');
  });

  ws.on('error', (err) => {
    console.error('WebSocket error:', err.message);
  });
});

// Heartbeat interval to detect broken connections
const heartbeatInterval = setInterval(() => {
  wss.clients.forEach((ws) => {
    if (ws.isAlive === false) {
      // Clean up subscriptions before terminating
      if (ws.subscribedMatches) {
        for (const matchId of ws.subscribedMatches) {
          if (wsManager.has(matchId)) {
            wsManager.get(matchId).delete(ws);
            if (wsManager.get(matchId).size === 0) {
              wsManager.delete(matchId);
            }
          }
        }
      }
      return ws.terminate();
    }
    ws.isAlive = false;
    ws.ping();
  });
}, 30000);

wss.on('close', () => {
  clearInterval(heartbeatInterval);
});

// Broadcast helper function
function broadcastToMatch(matchId, data) {
  const matchIdStr = matchId.toString();
  if (wsManager.has(matchIdStr)) {
    const clients = wsManager.get(matchIdStr);
    const message = JSON.stringify(data);
    clients.forEach((client) => {
      if (client.readyState === 1) { // WebSocket.OPEN
        client.send(message);
      }
    });
  }
}

// Mount routes
const authRoutes = require('./routes/auth');
const matchRoutes = require('./routes/matches');
const playerRoutes = require('./routes/players');
const seriesRoutes = require('./routes/series');

app.use('/api/auth', authRoutes);
app.use('/api/matches', matchRoutes);
app.use('/api/players', playerRoutes);
app.use('/api/series', seriesRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    wsClients: wss.clients.size,
    activeMatchRooms: wsManager.size
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// MongoDB connection
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/cricket_scorecard';
const PORT = process.env.PORT || 5005;

mongoose.connect(MONGO_URI)
  .then(() => {
    console.log('Connected to MongoDB');

    server.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
      console.log(`WebSocket server ready on ws://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error('MongoDB connection error:', err.message);
    process.exit(1);
  });

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\nShutting down gracefully...');
  wss.close();
  server.close();
  mongoose.connection.close();
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\nSIGTERM received. Shutting down...');
  wss.close();
  server.close();
  mongoose.connection.close();
  process.exit(0);
});

// Export for use in routes (WebSocket broadcast)
module.exports = { app, server, wss, wsManager, broadcastToMatch };
