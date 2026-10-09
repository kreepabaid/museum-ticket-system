const crypto = require('crypto');
const bcrypt = require('bcryptjs');

// Default initial seed data generator
function getInitialSeedData() {
  const adminPasswordHash = bcrypt.hashSync('Admin@123', 10);
  const visitorPasswordHash = bcrypt.hashSync('Visitor@123', 10);

  const today = new Date().toISOString().split('T')[0];
  const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];
  const dayAfter = new Date(Date.now() + 172800000).toISOString().split('T')[0];

  const adminUser = {
    userId: 'usr-admin-001',
    name: 'Curator Admin',
    email: 'admin@museum.org',
    phone: '+1 555-0199',
    role: 'ADMIN',
    passwordHash: adminPasswordHash,
    createdAt: new Date(Date.now() - 30 * 86400000).toISOString()
  };

  const visitorUser = {
    userId: 'usr-visitor-001',
    name: 'Alice Smith',
    email: 'visitor@example.com',
    phone: '+1 555-0142',
    role: 'VISITOR',
    passwordHash: visitorPasswordHash,
    createdAt: new Date(Date.now() - 10 * 86400000).toISOString()
  };

  const exhibitions = [
    {
      exhibitionId: 'exh-egypt-001',
      name: 'Treasures of Ancient Egypt: Pharaohs & Dynasties',
      category: 'Archaeology',
      description: 'Discover the golden artifacts, royal sarcophagi, and sacred hieroglyphic inscriptions of the Nile Valley. An awe-inspiring voyage spanning 3,000 years of civilization.',
      location: 'Grand East Wing, Gallery A',
      startDate: '2026-10-01',
      endDate: '2026-12-31',
      imageUrl: 'https://images.unsplash.com/photo-1544928147-79a2dbc1f389?auto=format&fit=crop&q=80&w=1200',
      status: 'ACTIVE',
      createdAt: new Date(Date.now() - 20 * 86400000).toISOString()
    },
    {
      exhibitionId: 'exh-renaissance-002',
      name: 'Renaissance Masters: Leonardo, Michelangelo & Raphael',
      category: 'Fine Art',
      description: 'Witness the zenith of European genius with authentic masterpieces, anatomical sketches, and monumental sculptures from the Florentine golden age.',
      location: 'Main Pavilion, Hall 2',
      startDate: '2026-09-15',
      endDate: '2026-11-30',
      imageUrl: 'https://images.unsplash.com/photo-1579783902614-a3fb3927b675?auto=format&fit=crop&q=80&w=1200',
      status: 'ACTIVE',
      createdAt: new Date(Date.now() - 25 * 86400000).toISOString()
    },
    {
      exhibitionId: 'exh-cosmos-003',
      name: 'Cosmos & Beyond: Journey Through the Universe',
      category: 'Science & Space',
      description: 'An interactive planetarium experience featuring authentic lunar soil samples, meteorites from Mars, and a 360-degree deep-space projection.',
      location: 'Astronomy & Space Dome',
      startDate: '2026-10-10',
      endDate: '2027-01-15',
      imageUrl: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&q=80&w=1200',
      status: 'ACTIVE',
      createdAt: new Date(Date.now() - 15 * 86400000).toISOString()
    },
    {
      exhibitionId: 'exh-impressionism-004',
      name: 'Impressionist Dreams: Monet, Renoir & Degas',
      category: 'Art & Impressionism',
      description: 'Step into luminous gardens and Parisian cafés painted with vibrant brushstrokes. Featuring rare loans from private European collections.',
      location: 'West Wing Pavilion',
      startDate: '2026-10-05',
      endDate: '2026-11-20',
      imageUrl: 'https://images.unsplash.com/photo-1578925518470-4def7a0f08bb?auto=format&fit=crop&q=80&w=1200',
      status: 'ACTIVE',
      createdAt: new Date(Date.now() - 18 * 86400000).toISOString()
    }
  ];

  const schedules = [
    // Ancient Egypt slots
    {
      exhibitionId: 'exh-egypt-001',
      dateSlot: `${today}#10:00 AM`,
      slotId: `${today}#10:00 AM`,
      date: today,
      startTime: '10:00 AM',
      endTime: '12:00 PM',
      capacity: 30,
      bookedCount: 12,
      status: 'ACTIVE'
    },
    {
      exhibitionId: 'exh-egypt-001',
      dateSlot: `${today}#02:00 PM`,
      slotId: `${today}#02:00 PM`,
      date: today,
      startTime: '02:00 PM',
      endTime: '04:00 PM',
      capacity: 25,
      bookedCount: 22, // Filling Fast (>=80%)
      status: 'ACTIVE'
    },
    {
      exhibitionId: 'exh-egypt-001',
      dateSlot: `${today}#05:00 PM`,
      slotId: `${today}#05:00 PM`,
      date: today,
      startTime: '05:00 PM',
      endTime: '07:00 PM',
      capacity: 20,
      bookedCount: 20, // Sold Out
      status: 'ACTIVE'
    },
    {
      exhibitionId: 'exh-egypt-001',
      dateSlot: `${tomorrow}#10:00 AM`,
      slotId: `${tomorrow}#10:00 AM`,
      date: tomorrow,
      startTime: '10:00 AM',
      endTime: '12:00 PM',
      capacity: 30,
      bookedCount: 5,
      status: 'ACTIVE'
    },
    {
      exhibitionId: 'exh-egypt-001',
      dateSlot: `${tomorrow}#02:00 PM`,
      slotId: `${tomorrow}#02:00 PM`,
      date: tomorrow,
      startTime: '02:00 PM',
      endTime: '04:00 PM',
      capacity: 30,
      bookedCount: 15,
      status: 'ACTIVE'
    },
    // Renaissance slots
    {
      exhibitionId: 'exh-renaissance-002',
      dateSlot: `${today}#11:00 AM`,
      slotId: `${today}#11:00 AM`,
      date: today,
      startTime: '11:00 AM',
      endTime: '01:00 PM',
      capacity: 25,
      bookedCount: 8,
      status: 'ACTIVE'
    },
    {
      exhibitionId: 'exh-renaissance-002',
      dateSlot: `${today}#03:00 PM`,
      slotId: `${today}#03:00 PM`,
      date: today,
      startTime: '03:00 PM',
      endTime: '05:00 PM',
      capacity: 25,
      bookedCount: 21, // Filling fast
      status: 'ACTIVE'
    },
    {
      exhibitionId: 'exh-renaissance-002',
      dateSlot: `${tomorrow}#11:00 AM`,
      slotId: `${tomorrow}#11:00 AM`,
      date: tomorrow,
      startTime: '11:00 AM',
      endTime: '01:00 PM',
      capacity: 25,
      bookedCount: 4,
      status: 'ACTIVE'
    },
    // Cosmos slots
    {
      exhibitionId: 'exh-cosmos-003',
      dateSlot: `${today}#01:00 PM`,
      slotId: `${today}#01:00 PM`,
      date: today,
      startTime: '01:00 PM',
      endTime: '03:00 PM',
      capacity: 40,
      bookedCount: 18,
      status: 'ACTIVE'
    },
    {
      exhibitionId: 'exh-cosmos-003',
      dateSlot: `${today}#04:00 PM`,
      slotId: `${today}#04:00 PM`,
      date: today,
      startTime: '04:00 PM',
      endTime: '06:00 PM',
      capacity: 40,
      bookedCount: 35, // Filling fast
      status: 'ACTIVE'
    },
    {
      exhibitionId: 'exh-cosmos-003',
      dateSlot: `${tomorrow}#01:00 PM`,
      slotId: `${tomorrow}#01:00 PM`,
      date: tomorrow,
      startTime: '01:00 PM',
      endTime: '03:00 PM',
      capacity: 40,
      bookedCount: 10,
      status: 'ACTIVE'
    },
    // Impressionism slots
    {
      exhibitionId: 'exh-impressionism-004',
      dateSlot: `${today}#10:30 AM`,
      slotId: `${today}#10:30 AM`,
      date: today,
      startTime: '10:30 AM',
      endTime: '12:30 PM',
      capacity: 20,
      bookedCount: 6,
      status: 'ACTIVE'
    },
    {
      exhibitionId: 'exh-impressionism-004',
      dateSlot: `${today}#02:30 PM`,
      slotId: `${today}#02:30 PM`,
      date: today,
      startTime: '02:30 PM',
      endTime: '04:30 PM',
      capacity: 20,
      bookedCount: 17,
      status: 'ACTIVE'
    },
    {
      exhibitionId: 'exh-impressionism-004',
      dateSlot: `${tomorrow}#10:30 AM`,
      slotId: `${tomorrow}#10:30 AM`,
      date: tomorrow,
      startTime: '10:30 AM',
      endTime: '12:30 PM',
      capacity: 20,
      bookedCount: 2,
      status: 'ACTIVE'
    }
  ];

  // Seed sample bookings
  const bookings = [
    {
      bookingId: 'MUS-2026-B001',
      visitorId: 'usr-visitor-001',
      userId: 'usr-visitor-001',
      exhibitionId: 'exh-egypt-001',
      slotId: `${today}#10:00 AM`,
      bookingDate: today,
      numberOfVisitors: 2,
      status: 'USED',
      ticketId: 'TKT-EGYPT-01',
      createdAt: new Date(Date.now() - 4 * 3600000).toISOString()
    },
    {
      bookingId: 'MUS-2026-B002',
      visitorId: 'usr-visitor-001',
      userId: 'usr-visitor-001',
      exhibitionId: 'exh-renaissance-002',
      slotId: `${today}#03:00 PM`,
      bookingDate: today,
      numberOfVisitors: 2,
      status: 'ACTIVE',
      ticketId: 'TKT-REN-02',
      createdAt: new Date(Date.now() - 2 * 3600000).toISOString()
    },
    {
      bookingId: 'MUS-2026-B003',
      visitorId: 'usr-visitor-001',
      userId: 'usr-visitor-001',
      exhibitionId: 'exh-cosmos-003',
      slotId: `${tomorrow}#01:00 PM`,
      bookingDate: tomorrow,
      numberOfVisitors: 3,
      status: 'ACTIVE',
      ticketId: 'TKT-COSMOS-03',
      createdAt: new Date(Date.now() - 1 * 3600000).toISOString()
    },
    {
      bookingId: 'MUS-2026-B004',
      visitorId: 'usr-visitor-001',
      userId: 'usr-visitor-001',
      exhibitionId: 'exh-impressionism-004',
      slotId: `${today}#10:30 AM`,
      bookingDate: today,
      numberOfVisitors: 1,
      status: 'CANCELLED',
      ticketId: 'TKT-IMP-04',
      createdAt: new Date(Date.now() - 8 * 3600000).toISOString()
    }
  ];

  // Seed sample entry records
  const entryRecords = [
    {
      bookingId: 'MUS-2026-B001',
      ticketId: 'TKT-EGYPT-01',
      visitorId: 'usr-visitor-001',
      exhibitionId: 'exh-egypt-001',
      numberOfVisitors: 2,
      entryDate: today,
      enteredAt: new Date(Date.now() - 3.5 * 3600000).toISOString(),
      validatedBy: 'usr-admin-001',
      status: 'USED'
    }
  ];

  // Seed statistics
  const statistics = [
    {
      statKey: 'GLOBAL_TOTALS',
      totalBookings: 4,
      cancelledBookings: 1,
      expectedVisitors: 7,
      totalEntries: 2
    },
    {
      statKey: `DAILY#${today}`,
      totalBookings: 3,
      cancelledBookings: 1,
      expectedVisitors: 4,
      totalEntries: 2
    },
    {
      statKey: `DAILY#${tomorrow}`,
      totalBookings: 1,
      cancelledBookings: 0,
      expectedVisitors: 3,
      totalEntries: 0
    },
    {
      statKey: 'EXH#exh-egypt-001',
      totalBookings: 1,
      totalVisitors: 2,
      totalEntries: 2,
      cancelledBookings: 0
    },
    {
      statKey: 'EXH#exh-renaissance-002',
      totalBookings: 1,
      totalVisitors: 2,
      totalEntries: 0,
      cancelledBookings: 0
    },
    {
      statKey: 'EXH#exh-cosmos-003',
      totalBookings: 1,
      totalVisitors: 3,
      totalEntries: 0,
      cancelledBookings: 0
    },
    {
      statKey: 'EXH#exh-impressionism-004',
      totalBookings: 1,
      totalVisitors: 1,
      totalEntries: 0,
      cancelledBookings: 1
    }
  ];

  return {
    users: [adminUser, visitorUser],
    exhibitions,
    schedules,
    bookings,
    entryRecords,
    statistics,
    notifications: [
      {
        id: 'notif-1',
        type: 'BOOKING_CONFIRMATION',
        recipient: 'visitor@example.com',
        subject: 'Booking Confirmation: Ancient Egypt',
        message: 'Your visit for Treasures of Ancient Egypt is confirmed (MUS-2026-B001).',
        timestamp: new Date(Date.now() - 4 * 3600000).toISOString()
      },
      {
        id: 'notif-2',
        type: 'BOOKING_CONFIRMATION',
        recipient: 'visitor@example.com',
        subject: 'Booking Confirmation: Renaissance Masters',
        message: 'Your visit for Renaissance Masters is confirmed (MUS-2026-B002).',
        timestamp: new Date(Date.now() - 2 * 3600000).toISOString()
      }
    ]
  };
}

class LocalStore {
  constructor() {
    this.reset();
  }

  reset() {
    const seed = getInitialSeedData();
    this.tables = {
      Museum_Users: seed.users,
      Museum_Exhibitions: seed.exhibitions,
      Museum_Schedules: seed.schedules,
      Museum_Bookings: seed.bookings,
      Museum_EntryRecords: seed.entryRecords,
      Museum_Statistics: seed.statistics
    };
    this.notifications = seed.notifications;
  }

  _resolveTable(tableName) {
    if (!tableName) return null;
    const cleanName = tableName.split('_')[1] || tableName;
    for (const key of Object.keys(this.tables)) {
      if (key.toLowerCase().includes(cleanName.toLowerCase())) {
        return this.tables[key];
      }
    }
    return this.tables[tableName] || null;
  }

  async get(params) {
    const table = this._resolveTable(params.TableName);
    if (!table) return { Item: undefined };
    const key = params.Key;
    const keyProps = Object.keys(key);

    const item = table.find(row => {
      return keyProps.every(k => row[k] === key[k]);
    });

    return { Item: item ? JSON.parse(JSON.stringify(item)) : undefined };
  }

  async put(params) {
    const table = this._resolveTable(params.TableName);
    if (!table) throw new Error(`Table ${params.TableName} not found`);

    const item = JSON.parse(JSON.stringify(params.Item));

    // Determine PK
    let pkName = 'id';
    if (item.userId) pkName = 'userId';
    else if (item.exhibitionId && !item.slotId) pkName = 'exhibitionId';
    else if (item.exhibitionId && item.slotId) pkName = 'dateSlot';
    else if (item.bookingId) pkName = 'bookingId';
    else if (item.statKey) pkName = 'statKey';

    const existingIdx = table.findIndex(row => {
      if (params.TableName.includes('Schedules')) {
        return row.exhibitionId === item.exhibitionId && (row.dateSlot === item.dateSlot || row.slotId === item.slotId);
      }
      return row[pkName] === item[pkName];
    });

    if (existingIdx >= 0) {
      table[existingIdx] = item;
    } else {
      table.push(item);
    }

    return {};
  }

  async scan(params) {
    const table = this._resolveTable(params.TableName);
    if (!table) return { Items: [] };

    let items = [...table];

    if (params.FilterExpression && params.ExpressionAttributeValues) {
      items = items.filter(row => {
        return this._evaluateFilter(row, params.FilterExpression, params.ExpressionAttributeValues, params.ExpressionAttributeNames);
      });
    }

    return { Items: JSON.parse(JSON.stringify(items)) };
  }

  async query(params) {
    const table = this._resolveTable(params.TableName);
    if (!table) return { Items: [] };

    let items = [...table];

    if (params.KeyConditionExpression && params.ExpressionAttributeValues) {
      items = items.filter(row => {
        return this._evaluateKeyCondition(row, params.KeyConditionExpression, params.ExpressionAttributeValues, params.ExpressionAttributeNames);
      });
    }

    if (params.FilterExpression && params.ExpressionAttributeValues) {
      items = items.filter(row => {
        return this._evaluateFilter(row, params.FilterExpression, params.ExpressionAttributeValues, params.ExpressionAttributeNames);
      });
    }

    return { Items: JSON.parse(JSON.stringify(items)) };
  }

  async update(params) {
    const table = this._resolveTable(params.TableName);
    if (!table) throw new Error(`Table ${params.TableName} not found`);

    const key = params.Key;
    const keyProps = Object.keys(key);

    let item = table.find(row => keyProps.every(k => row[k] === key[k]));

    if (!item) {
      item = { ...key };
      table.push(item);
    }

    // Check ConditionExpression if any
    if (params.ConditionExpression && !this._evaluateFilter(item, params.ConditionExpression, params.ExpressionAttributeValues, params.ExpressionAttributeNames)) {
      const err = new Error('ConditionalCheckFailedException');
      err.name = 'ConditionalCheckFailedException';
      throw err;
    }

    this._applyUpdateExpression(item, params.UpdateExpression, params.ExpressionAttributeValues, params.ExpressionAttributeNames);

    return { Attributes: JSON.parse(JSON.stringify(item)) };
  }

  async transactWrite(params) {
    const items = params.TransactItems || [];

    // First pass: validate all conditions
    for (const action of items) {
      if (action.Update) {
        const u = action.Update;
        const table = this._resolveTable(u.TableName);
        const item = table.find(row => Object.keys(u.Key).every(k => row[k] === u.Key[k]));
        if (u.ConditionExpression) {
          if (!item || !this._evaluateFilter(item, u.ConditionExpression, u.ExpressionAttributeValues, u.ExpressionAttributeNames)) {
            const err = new Error('TransactionCanceledException: ConditionalCheckFailed');
            err.name = 'TransactionCanceledException';
            throw err;
          }
        }
      } else if (action.Put) {
        const p = action.Put;
        const table = this._resolveTable(p.TableName);
        if (p.ConditionExpression) {
          const item = table.find(row => {
            if (p.Item.bookingId) return row.bookingId === p.Item.bookingId;
            return false;
          });
          if (!this._evaluateFilter(item, p.ConditionExpression, p.ExpressionAttributeValues, p.ExpressionAttributeNames)) {
            const err = new Error('TransactionCanceledException: ConditionalCheckFailed');
            err.name = 'TransactionCanceledException';
            throw err;
          }
        }
      }
    }

    // Second pass: apply all writes
    for (const action of items) {
      if (action.Update) {
        const u = action.Update;
        const table = this._resolveTable(u.TableName);
        let item = table.find(row => Object.keys(u.Key).every(k => row[k] === u.Key[k]));
        if (!item) {
          item = { ...u.Key };
          table.push(item);
        }
        this._applyUpdateExpression(item, u.UpdateExpression, u.ExpressionAttributeValues, u.ExpressionAttributeNames);
      } else if (action.Put) {
        const p = action.Put;
        const table = this._resolveTable(p.TableName);
        const existingIdx = table.findIndex(row => {
          if (p.Item.bookingId) return row.bookingId === p.Item.bookingId;
          return false;
        });
        if (existingIdx >= 0) table[existingIdx] = JSON.parse(JSON.stringify(p.Item));
        else table.push(JSON.parse(JSON.stringify(p.Item)));
      }
    }

    return {};
  }

  _evaluateKeyCondition(row, expr, values, names) {
    return this._evaluateFilter(row, expr, values, names);
  }

  _evaluateFilter(row, expr, values = {}, names = {}) {
    if (!row) {
      if (expr && expr.includes('attribute_not_exists')) return true;
      return false;
    }
    let normalized = expr;

    // Resolve ExpressionAttributeNames
    if (names) {
      for (const [alias, actual] of Object.entries(names)) {
        normalized = normalized.split(alias).join(`row['${actual}']`);
      }
    }

    // Filter evaluation for specific attributes
    if (normalized.includes(':bId') || normalized.includes(':tId')) {
      const matchBId = values[':bId'] ? (row.bookingId === values[':bId']) : false;
      const matchTId = values[':tId'] ? (row.ticketId === values[':tId']) : false;
      return matchBId || matchTId;
    }
    if (normalized.includes('ticketId = :id OR bookingId = :id')) {
      return (row.ticketId === values[':id'] || row.bookingId === values[':id']);
    }
    if (normalized.includes('email = :email')) {
      return row.email === values[':email'];
    }
    if (normalized.includes('exhibitionId = :exhibitionId')) {
      return row.exhibitionId === values[':exhibitionId'];
    }
    if (normalized.includes('visitorId = :visitorId')) {
      return (row.visitorId === values[':visitorId'] || row.userId === values[':visitorId']);
    }
    if (normalized.includes('userId = :userId')) {
      return (row.userId === values[':userId'] || row.visitorId === values[':userId']);
    }
    if (normalized.includes('ticketId = :ticketId')) {
      return row.ticketId === values[':ticketId'];
    }
    if (normalized.includes('bookingId = :bookingId')) {
      return row.bookingId === values[':bookingId'];
    }
    if (normalized.includes('bookedCount + :val <= capacity')) {
      const val = values[':val'] || 0;
      const booked = row.bookedCount || 0;
      const cap = row.capacity || 0;
      const statusOk = row.status === (values[':active'] || 'ACTIVE');
      return (booked + val <= cap) && statusOk;
    }
    if (normalized.includes(':confirmed') || normalized.includes(':active')) {
      return (row.status || '').toUpperCase() === 'ACTIVE' || (row.status || '').toUpperCase() === 'CONFIRMED';
    }
    if (normalized.includes('attribute_not_exists(bookingId)')) {
      return !row.bookingId;
    }

    return true;
  }

  _applyUpdateExpression(item, expr, values = {}, names = {}) {
    if (!expr) return;

    // Replace names
    let resolvedExpr = expr;
    if (names) {
      for (const [alias, actual] of Object.entries(names)) {
        resolvedExpr = resolvedExpr.split(alias).join(actual);
      }
    }

    // Handles:
    // SET bookedCount = bookedCount + :val
    // SET bookedCount = bookedCount - :val
    // SET status = :cancelled / :used
    // ADD totalBookings :one, expectedVisitors :val
    // ADD totalEntries :val
    // ADD cancelledBookings :one, expectedVisitors :negVal

    if (resolvedExpr.includes('SET bookedCount = bookedCount + :val')) {
      item.bookedCount = (item.bookedCount || 0) + (values[':val'] || 0);
    } else if (resolvedExpr.includes('SET bookedCount = bookedCount - :val')) {
      item.bookedCount = Math.max(0, (item.bookedCount || 0) - (values[':val'] || 0));
    }

    if (resolvedExpr.includes('status = :cancelled')) {
      item.status = values[':cancelled'] || 'CANCELLED';
    } else if (resolvedExpr.includes('status = :used')) {
      item.status = values[':used'] || 'USED';
    } else if (resolvedExpr.includes('status = :active')) {
      item.status = values[':active'] || 'ACTIVE';
    }

    if (resolvedExpr.includes('ADD totalBookings :one')) {
      item.totalBookings = (item.totalBookings || 0) + (values[':one'] || 1);
    }
    if (resolvedExpr.includes('expectedVisitors :val')) {
      item.expectedVisitors = (item.expectedVisitors || 0) + (values[':val'] || 0);
    }
    if (resolvedExpr.includes('totalEntries :val')) {
      item.totalEntries = (item.totalEntries || 0) + (values[':val'] || 0);
    }
    if (resolvedExpr.includes('cancelledBookings :one')) {
      item.cancelledBookings = (item.cancelledBookings || 0) + (values[':one'] || 1);
    }
    if (resolvedExpr.includes('expectedVisitors :negVal')) {
      item.expectedVisitors = Math.max(0, (item.expectedVisitors || 0) + (values[':negVal'] || 0));
    }
    if (resolvedExpr.includes('totalVisitors :val')) {
      item.totalVisitors = (item.totalVisitors || 0) + (values[':val'] || 0);
    }
  }

  addNotification(notification) {
    const notif = {
      id: `notif-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      timestamp: new Date().toISOString(),
      ...notification
    };
    this.notifications.unshift(notif);
    if (this.notifications.length > 50) this.notifications.pop();
    return notif;
  }

  getNotifications(recipient) {
    if (!recipient) return this.notifications;
    return this.notifications.filter(n => !n.recipient || n.recipient === recipient || recipient === 'admin@museum.org');
  }
}

const localStore = new LocalStore();

module.exports = {
  localStore,
  LocalStore
};
