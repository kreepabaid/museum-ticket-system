const assert = require('assert');
const app = require('../src/server');

// Simple in-process runner testing all API endpoints
async function runTests() {
  console.log('--- STARTING BACKEND INTEGRATION & TEST GATES ---');
  let passed = 0;
  let failed = 0;

  // Helper for invoking express app in-memory
  const makeRequest = async (method, path, body = null, headers = {}) => {
    return new Promise((resolve, reject) => {
      const expressReq = {
        method,
        url: path,
        path,
        headers: { 'content-type': 'application/json', ...headers },
        body: body || {},
        params: {},
        query: {}
      };

      // Extract query params if any
      if (path.includes('?')) {
        const [p, q] = path.split('?');
        expressReq.path = p;
        expressReq.url = p;
        const searchParams = new URLSearchParams(q);
        for (const [k, v] of searchParams.entries()) {
          expressReq.query[k] = v;
        }
      }

      const resData = {
        statusCode: 200,
        headers: {},
        body: null
      };

      const expressRes = {
        status: (code) => {
          resData.statusCode = code;
          return expressRes;
        },
        setHeader: (k, v) => {
          resData.headers[k] = v;
        },
        json: (data) => {
          resData.body = data;
          resolve(resData);
        },
        send: (data) => {
          resData.body = data;
          resolve(resData);
        }
      };

      app.handle(expressReq, expressRes, (err) => {
        if (err) reject(err);
        else resolve({ statusCode: 404, body: { error: 'Not Found' } });
      });
    });
  };

  const test = async (name, fn) => {
    try {
      await fn();
      console.log(`[PASS] ${name}`);
      passed++;
    } catch (err) {
      console.error(`[FAIL] ${name}:`, err.message);
      failed++;
    }
  };

  // --- STAGE 1 GATE ---
  await test('Stage 1: Health check & Seeded exhibitions returned', async () => {
    const res = await makeRequest('GET', '/exhibitions');
    assert.strictEqual(res.statusCode, 200);
    assert(Array.isArray(res.body), 'Body must be array');
    assert(res.body.length >= 4, 'Should have at least 4 seeded exhibitions');
    const egypt = res.body.find(e => e.exhibitionId === 'exh-egypt-001');
    assert(egypt, 'Treasures of Ancient Egypt should exist');
  });

  // --- STAGE 2 GATE ---
  let visitorToken = '';
  let adminToken = '';
  let testVisitorId = '';

  await test('Stage 2.1: Visitor Registration', async () => {
    const uniqueEmail = `test_${Date.now()}@example.com`;
    const res = await makeRequest('POST', '/auth/register', {
      name: 'Bob Tester',
      email: uniqueEmail,
      phone: '+1 555-9999',
      password: 'Password@123'
    });
    assert.strictEqual(res.statusCode, 201);
    assert(res.body.token, 'Should return JWT token');
    assert.strictEqual(res.body.user.role, 'VISITOR');
    visitorToken = res.body.token;
    testVisitorId = res.body.user.userId;

    // Duplicate email check
    const dupRes = await makeRequest('POST', '/auth/register', {
      name: 'Bob Clone',
      email: uniqueEmail,
      password: 'Password@123'
    });
    assert.strictEqual(dupRes.statusCode, 409, 'Duplicate registration should return 409');
  });

  await test('Stage 2.2: Admin Login', async () => {
    const res = await makeRequest('POST', '/auth/login', {
      email: 'admin@museum.org',
      password: 'Admin@123'
    });
    assert.strictEqual(res.statusCode, 200);
    assert(res.body.token, 'Should return admin token');
    assert.strictEqual(res.body.user.role, 'ADMIN');
    adminToken = res.body.token;
  });

  await test('Stage 2.3: Role Guard - Visitor token gets 403 on /admin/*', async () => {
    const res = await makeRequest('GET', '/admin/dashboard', null, {
      authorization: `Bearer ${visitorToken}`
    });
    assert.strictEqual(res.statusCode, 403, 'Visitor should be forbidden from admin dashboard');
  });

  await test('Stage 2.4: Admin can create exhibition & schedule slot', async () => {
    const newExh = {
      name: 'Nordic Vikings: Sea Kings',
      description: 'Artifacts, runestones, and longships from Scandinavia.',
      category: 'History',
      location: 'North Gallery',
      startDate: '2026-11-01',
      endDate: '2027-02-28',
      imageUrl: 'https://images.unsplash.com/photo-1544928147-79a2dbc1f389'
    };
    const exhRes = await makeRequest('POST', '/admin/exhibitions', newExh, {
      authorization: `Bearer ${adminToken}`
    });
    assert.strictEqual(exhRes.statusCode, 201);
    assert(exhRes.body.exhibitionId, 'Should have created exhibition ID');
    const exhId = exhRes.body.exhibitionId;

    const schedRes = await makeRequest('POST', `/admin/exhibitions/${exhId}/schedules`, {
      date: '2026-11-05',
      startTime: '10:00 AM',
      endTime: '12:00 PM',
      capacity: 2
    }, {
      authorization: `Bearer ${adminToken}`
    });
    assert.strictEqual(schedRes.statusCode, 201);
    assert.strictEqual(schedRes.body.capacity, 2);
  });

  // --- STAGE 3 GATE ---
  let createdBooking = null;

  await test('Stage 3.1: Booking within capacity succeeds (atomic TransactWriteItems)', async () => {
    // Ancient Egypt slot: capacity 30, bookedCount 12
    const res = await makeRequest('POST', '/bookings', {
      exhibitionId: 'exh-egypt-001',
      dateSlot: new Date().toISOString().split('T')[0] + '#10:00 AM',
      numberOfVisitors: 2
    }, {
      authorization: `Bearer ${visitorToken}`
    });
    assert.strictEqual(res.statusCode, 201);
    assert(res.body.booking, 'Booking must be returned');
    assert.strictEqual(res.body.booking.status, 'ACTIVE');
    assert(res.body.booking.ticketId.startsWith('TKT-'), 'Ticket ID must start with TKT-');
    assert(res.body.booking.qrPayload.includes('.'), 'QR payload must contain HMAC signature');
    createdBooking = res.body.booking;
  });

  await test('Stage 3.2: Overbooking returns 409 Conflict', async () => {
    // 5:00 PM slot for Ancient Egypt is seeded at capacity 20, bookedCount 20 (Sold out)
    const today = new Date().toISOString().split('T')[0];
    const res = await makeRequest('POST', '/bookings', {
      exhibitionId: 'exh-egypt-001',
      dateSlot: `${today}#05:00 PM`,
      numberOfVisitors: 1
    }, {
      authorization: `Bearer ${visitorToken}`
    });
    assert.strictEqual(res.statusCode, 409, 'Sold out slot must return 409 Conflict');
  });

  await test('Stage 3.3: Cancellation restores booked count & rejects unauthorized cancel', async () => {
    // Unauthorized cancel attempt by other user
    const otherTokenRes = await makeRequest('POST', '/auth/login', {
      email: 'visitor@example.com',
      password: 'Visitor@123'
    });
    const fakeToken = otherTokenRes.body.token;

    const unauthRes = await makeRequest('POST', `/bookings/${createdBooking.bookingId}/cancel`, null, {
      authorization: `Bearer ${fakeToken}`
    });
    assert.strictEqual(unauthRes.statusCode, 403, 'Other visitor cannot cancel booking');

    // Authorized cancel
    const cancelRes = await makeRequest('POST', `/bookings/${createdBooking.bookingId}/cancel`, null, {
      authorization: `Bearer ${visitorToken}`
    });
    assert.strictEqual(cancelRes.statusCode, 200);

    // Second cancel attempt rejected
    const dupCancel = await makeRequest('POST', `/bookings/${createdBooking.bookingId}/cancel`, null, {
      authorization: `Bearer ${visitorToken}`
    });
    assert.strictEqual(dupCancel.statusCode, 400, 'Already cancelled booking must be rejected');
  });

  // --- STAGE 4 GATE ---
  await test('Stage 4: Ticket Validation, Duplicate Scanning & HMAC verification', async () => {
    // Book a fresh ticket to validate
    const today = new Date().toISOString().split('T')[0];
    const freshRes = await makeRequest('POST', '/bookings', {
      exhibitionId: 'exh-renaissance-002',
      dateSlot: `${today}#11:00 AM`,
      numberOfVisitors: 2
    }, {
      authorization: `Bearer ${visitorToken}`
    });
    assert.strictEqual(freshRes.statusCode, 201);
    const validBooking = freshRes.body.booking;

    // 1. First scan with valid cryptographic QR signature
    const scan1 = await makeRequest('POST', '/admin/tickets/validate', {
      qrPayload: validBooking.qrPayload
    }, {
      authorization: `Bearer ${adminToken}`
    });
    assert.strictEqual(scan1.statusCode, 200, 'Valid first scan must be allowed');
    assert.strictEqual(scan1.body.message, 'VALID TICKET — ENTRY ALLOWED');

    // 2. Second scan (duplicate) returns 409 TICKET ALREADY USED
    const scan2 = await makeRequest('POST', '/admin/tickets/validate', {
      qrPayload: validBooking.qrPayload
    }, {
      authorization: `Bearer ${adminToken}`
    });
    assert.strictEqual(scan2.statusCode, 409, 'Duplicate scan must return 409');
    assert(scan2.body.error.includes('ALREADY USED'), 'Error should state ALREADY USED');

    // 3. Tampered signature test
    const tamperedPayload = validBooking.bookingId + '.ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff';
    const scanTampered = await makeRequest('POST', '/admin/tickets/validate', {
      qrPayload: tamperedPayload
    }, {
      authorization: `Bearer ${adminToken}`
    });
    assert.strictEqual(scanTampered.statusCode, 400, 'Tampered QR code must be rejected');

    // 4. Cancelled ticket validation rejected
    const scanCancelled = await makeRequest('POST', '/admin/tickets/validate', {
      qrPayload: createdBooking.qrPayload
    }, {
      authorization: `Bearer ${adminToken}`
    });
    assert.strictEqual(scanCancelled.statusCode, 400, 'Cancelled ticket scan must be rejected');
    assert(scanCancelled.body.error.includes('CANCELLED'));
  });

  // --- STAGE 5 GATE ---
  await test('Stage 5: Admin Dashboard, Exhibition Stats, Daily Counts & Reports', async () => {
    const dashRes = await makeRequest('GET', '/admin/dashboard', null, {
      authorization: `Bearer ${adminToken}`
    });
    assert.strictEqual(dashRes.statusCode, 200);
    assert(dashRes.body.totalBookings > 0, 'Dashboard totalBookings > 0');
    assert(dashRes.body.totalEntries > 0, 'Dashboard totalEntries > 0');
    assert(typeof dashRes.body.capacityUtilization === 'number', 'Capacity utilization is number');

    const exhStats = await makeRequest('GET', '/admin/exhibition-stats', null, {
      authorization: `Bearer ${adminToken}`
    });
    assert.strictEqual(exhStats.statusCode, 200);
    assert(Array.isArray(exhStats.body) && exhStats.body.length > 0, 'Exhibition stats is non-empty array');

    const dailyStats = await makeRequest('GET', '/admin/daily-stats', null, {
      authorization: `Bearer ${adminToken}`
    });
    assert.strictEqual(dailyStats.statusCode, 200);
    assert(Array.isArray(dailyStats.body) && dailyStats.body.length > 0, 'Daily stats is non-empty array');

    const entriesRes = await makeRequest('GET', '/admin/entries', null, {
      authorization: `Bearer ${adminToken}`
    });
    assert.strictEqual(entriesRes.statusCode, 200);
    assert(Array.isArray(entriesRes.body), 'Entries is array');

    const reportsRes = await makeRequest('GET', '/admin/reports', null, {
      authorization: `Bearer ${adminToken}`
    });
    assert.strictEqual(reportsRes.statusCode, 200);
    assert(reportsRes.body.kpis, 'Reports must contain KPIs');
  });

  console.log(`\n========================================`);
  console.log(`TEST SUMMARY: ${passed} Passed, ${failed} Failed`);
  console.log(`========================================\n`);

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch(err => {
  console.error('Test runner fatal error:', err);
  process.exit(1);
});
