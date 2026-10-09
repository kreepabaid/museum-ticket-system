const express = require('express');
const serverless = require('serverless-http');
const cors = require('cors');

const authRoutes = require('./functions/auth');
const exhibitionRoutes = require('./functions/exhibitions');
const scheduleRoutes = require('./functions/schedules');
const bookingRoutes = require('./functions/bookings');
const ticketRoutes = require('./functions/tickets');
const adminRoutes = require('./functions/admin');

const app = express();

app.use(cors());
app.use(express.json());

// Routes
app.use('/auth', authRoutes);
app.use('/exhibitions', exhibitionRoutes);
app.use('/exhibitions', scheduleRoutes); // Nested routes under exhibitions
app.use('/bookings', bookingRoutes);
app.use('/tickets', ticketRoutes);
app.use('/admin', adminRoutes);

// Error Handling Middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal Server Error' });
});

app.use((req, res, next) => {
  res.status(404).json({ error: 'Not Found' });
});

module.exports.handler = serverless(app);
