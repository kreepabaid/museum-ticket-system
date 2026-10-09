const express = require('express');
const cors = require('cors');

// Handlers
const authHandler = require('./handlers/auth');
const exhibitionsHandler = require('./handlers/exhibitions');
const schedulesHandler = require('./handlers/schedules');
const bookingsHandler = require('./handlers/bookings');
const ticketsHandler = require('./handlers/tickets');
const adminHandler = require('./handlers/admin');
const notificationsHandler = require('./handlers/notifications');
const { localStore } = require('./utils/localStore');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Adapter function: Bridges Express req/res to AWS Lambda event/response
const adapt = (handlerFn) => {
  return async (req, res) => {
    try {
      const event = {
        body: JSON.stringify(req.body || {}),
        headers: req.headers || {},
        pathParameters: req.params || {},
        params: req.params || {},
        queryStringParameters: req.query || {},
        query: req.query || {}
      };

      const result = await handlerFn(event);
      const parsedBody = JSON.parse(result.body || '{}');

      // Forward headers if present
      if (result.headers) {
        Object.entries(result.headers).forEach(([k, v]) => {
          res.setHeader(k, v);
        });
      }

      return res.status(result.statusCode).json(parsedBody);
    } catch (err) {
      console.error('API Error in adapt:', err);
      return res.status(500).json({ error: 'Internal Server Error' });
    }
  };
};

// Mount routes on router
const router = express.Router();

// 1. Auth routes
router.post('/auth/register', adapt(authHandler.register));
router.post('/auth/login', adapt(authHandler.login));
router.get('/auth/me', adapt(authHandler.me));

// 2. Exhibitions & Schedules
router.get('/exhibitions', adapt(exhibitionsHandler.list));
router.get('/exhibitions/:id', adapt(exhibitionsHandler.get));
router.post('/exhibitions', adapt(exhibitionsHandler.create));
router.post('/admin/exhibitions', adapt(exhibitionsHandler.create));

router.get('/exhibitions/:id/schedules', adapt(schedulesHandler.list));
router.post('/exhibitions/:id/schedules', adapt(schedulesHandler.create));
router.post('/admin/exhibitions/:id/schedules', adapt(schedulesHandler.create));

// 3. Bookings
router.post('/bookings', adapt(bookingsHandler.create));
router.get('/bookings/me', adapt(bookingsHandler.myBookings));
router.get('/bookings/:id', adapt(bookingsHandler.getBooking));
router.post('/bookings/:id/cancel', adapt(bookingsHandler.cancel));

// 4. Tickets & QR Validation
router.get('/tickets/:ticketId', adapt(ticketsHandler.getTicket));
router.post('/admin/tickets/validate', adapt(ticketsHandler.validate));

// 5. Admin Dashboard, Analytics, Monitoring & Reports
router.get('/admin/dashboard', adapt(adminHandler.dashboard));
router.get('/admin/exhibition-stats', adapt(adminHandler.exhibitionStats));
router.get('/admin/daily-stats', adapt(adminHandler.dailyStats));
router.get('/admin/entries', adapt(adminHandler.entries));
router.get('/admin/reports', adapt(adminHandler.reports));

// 6. Notifications (Simulated Amazon SNS feed)
router.get('/notifications/me', adapt(notificationsHandler.list));

// 7. Seed Reset Utility for easy Demo Replay
router.post('/admin/seed/reset', (req, res) => {
  localStore.reset();
  console.log('[Demo] LocalStore seed data has been reset to initial state');
  res.json({ message: 'Store reset to fresh seed state successfully' });
});

// Mount router on both '/' and '/dev' so any frontend config works seamlessly
app.use('/dev', router);
app.use('/', router);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'museum-ticket-backend', timestamp: new Date().toISOString() });
});

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`=======================================================`);
    console.log(` Museum Ticket System Backend (Dual-Mode Local Server)`);
    console.log(` Running at: http://localhost:${PORT}`);
    console.log(` API base:   http://localhost:${PORT} or http://localhost:${PORT}/dev`);
    console.log(` Admin:      admin@museum.org / Admin@123`);
    console.log(` Visitor:    visitor@example.com / Visitor@123`);
    console.log(`=======================================================`);
  });
}

module.exports = app;
