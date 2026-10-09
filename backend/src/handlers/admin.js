const { ddbDocClient, GetCommand, ScanCommand, QueryCommand } = require('../utils/db');
const { formatResponse, authenticate } = require('../utils/lambda');

const STATISTICS_TABLE = process.env.STATISTICS_TABLE || 'Museum_Statistics_dev';
const EXHIBITIONS_TABLE = process.env.EXHIBITIONS_TABLE || 'Museum_Exhibitions_dev';
const SCHEDULES_TABLE = process.env.SCHEDULES_TABLE || 'Museum_Schedules_dev';
const ENTRY_RECORDS_TABLE = process.env.ENTRY_RECORDS_TABLE || 'Museum_EntryRecords_dev';
const BOOKINGS_TABLE = process.env.BOOKINGS_TABLE || 'Museum_Bookings_dev';

const verifyAdmin = (event) => {
  let user;
  try {
    user = authenticate(event);
  } catch (e) {
    throw { statusCode: 401, error: 'Authentication required' };
  }
  if ((user.role || '').toUpperCase() !== 'ADMIN') {
    throw { statusCode: 403, error: 'Forbidden: Admin access required' };
  }
  return user;
};

// 1. Main Admin Dashboard KPIs
module.exports.dashboard = async (event) => {
  try {
    verifyAdmin(event);
  } catch (err) {
    return formatResponse(err.statusCode || 403, { error: err.error });
  }

  try {
    const todayStr = new Date().toISOString().split('T')[0];

    const { Item: globalStats } = await ddbDocClient.send(new GetCommand({
      TableName: STATISTICS_TABLE,
      Key: { statKey: 'GLOBAL_TOTALS' }
    }));

    const { Item: dailyStats } = await ddbDocClient.send(new GetCommand({
      TableName: STATISTICS_TABLE,
      Key: { statKey: `DAILY#${todayStr}` }
    }));

    const { Items: exhibitions } = await ddbDocClient.send(new ScanCommand({
      TableName: EXHIBITIONS_TABLE
    }));

    const { Items: schedules } = await ddbDocClient.send(new ScanCommand({
      TableName: SCHEDULES_TABLE
    }));

    let totalCapacity = 0;
    let totalBooked = 0;
    (schedules || []).forEach(s => {
      totalCapacity += (s.capacity || 0);
      totalBooked += (s.bookedCount || 0);
    });

    const activeExhibitionsCount = (exhibitions || []).filter(e => e.status === 'ACTIVE').length;
    const capacityUtilization = totalCapacity > 0 ? ((totalBooked / totalCapacity) * 100).toFixed(1) : 0;

    const stats = {
      totalBookings: globalStats?.totalBookings || 0,
      cancelledBookings: globalStats?.cancelledBookings || 0,
      totalExpectedVisitors: globalStats?.expectedVisitors || 0,
      totalEntries: globalStats?.totalEntries || 0,
      visitorsToday: dailyStats?.totalEntries || 0,
      bookingsToday: dailyStats?.totalBookings || 0,
      activeExhibitions: activeExhibitionsCount,
      totalCapacity,
      totalBooked,
      capacityUtilization: parseFloat(capacityUtilization)
    };

    return formatResponse(200, stats);
  } catch (error) {
    console.error('Admin dashboard error:', error);
    return formatResponse(500, { error: 'Could not fetch dashboard statistics' });
  }
};

// 2. Exhibition-Wise Booking Statistics
module.exports.exhibitionStats = async (event) => {
  try {
    verifyAdmin(event);
  } catch (err) {
    return formatResponse(err.statusCode || 403, { error: err.error });
  }

  try {
    const { Items: exhibitions } = await ddbDocClient.send(new ScanCommand({
      TableName: EXHIBITIONS_TABLE
    }));

    const { Items: schedules } = await ddbDocClient.send(new ScanCommand({
      TableName: SCHEDULES_TABLE
    }));

    const { Items: allStats } = await ddbDocClient.send(new ScanCommand({
      TableName: STATISTICS_TABLE
    }));

    const statsMap = {};
    (allStats || []).forEach(s => {
      if (s.statKey && s.statKey.startsWith('EXH#')) {
        const exhId = s.statKey.replace('EXH#', '');
        statsMap[exhId] = s;
      }
    });

    const breakdown = (exhibitions || []).map(exh => {
      const exhSchedules = (schedules || []).filter(s => s.exhibitionId === exh.exhibitionId);
      const totalCapacity = exhSchedules.reduce((acc, s) => acc + (s.capacity || 0), 0);
      const bookedCount = exhSchedules.reduce((acc, s) => acc + (s.bookedCount || 0), 0);
      const exhStat = statsMap[exh.exhibitionId] || {};

      const fillRate = totalCapacity > 0 ? ((bookedCount / totalCapacity) * 100).toFixed(1) : 0;

      return {
        exhibitionId: exh.exhibitionId,
        name: exh.name,
        category: exh.category,
        location: exh.location,
        status: exh.status,
        totalCapacity,
        bookedCount,
        fillRate: parseFloat(fillRate),
        totalBookings: exhStat.totalBookings || (bookedCount > 0 ? Math.ceil(bookedCount / 2) : 0),
        totalVisitors: exhStat.totalVisitors || bookedCount,
        totalEntries: exhStat.totalEntries || 0,
        cancelledBookings: exhStat.cancelledBookings || 0
      };
    });

    return formatResponse(200, breakdown);
  } catch (error) {
    console.error('Exhibition stats error:', error);
    return formatResponse(500, { error: 'Could not fetch exhibition statistics' });
  }
};

// 3. Daily Visitor Count Trends
module.exports.dailyStats = async (event) => {
  try {
    verifyAdmin(event);
  } catch (err) {
    return formatResponse(err.statusCode || 403, { error: err.error });
  }

  try {
    const { Items: allStats } = await ddbDocClient.send(new ScanCommand({
      TableName: STATISTICS_TABLE
    }));

    const dailyItems = (allStats || [])
      .filter(s => s.statKey && s.statKey.startsWith('DAILY#'))
      .map(s => ({
        date: s.statKey.replace('DAILY#', ''),
        totalBookings: s.totalBookings || 0,
        expectedVisitors: s.expectedVisitors || 0,
        totalEntries: s.totalEntries || 0,
        cancelledBookings: s.cancelledBookings || 0
      }))
      .sort((a, b) => b.date.localeCompare(a.date));

    return formatResponse(200, dailyItems);
  } catch (error) {
    console.error('Daily stats error:', error);
    return formatResponse(500, { error: 'Could not fetch daily visitor counts' });
  }
};

// 4. Live Gate Entry Monitoring Stream
module.exports.entries = async (event) => {
  try {
    verifyAdmin(event);
  } catch (err) {
    return formatResponse(err.statusCode || 403, { error: err.error });
  }

  try {
    const { Items: entries } = await ddbDocClient.send(new ScanCommand({
      TableName: ENTRY_RECORDS_TABLE
    }));

    const sortedEntries = (entries || []).sort((a, b) => {
      const timeA = new Date(a.enteredAt || a.entryTime || 0);
      const timeB = new Date(b.enteredAt || b.entryTime || 0);
      return timeB - timeA;
    });

    return formatResponse(200, sortedEntries);
  } catch (error) {
    console.error('Live entries error:', error);
    return formatResponse(500, { error: 'Could not fetch gate entry records' });
  }
};

// 5. Reports and Analytics Summary
module.exports.reports = async (event) => {
  try {
    verifyAdmin(event);
  } catch (err) {
    return formatResponse(err.statusCode || 403, { error: err.error });
  }

  try {
    const { Item: globalStats } = await ddbDocClient.send(new GetCommand({
      TableName: STATISTICS_TABLE,
      Key: { statKey: 'GLOBAL_TOTALS' }
    }));

    const { Items: exhibitions } = await ddbDocClient.send(new ScanCommand({
      TableName: EXHIBITIONS_TABLE
    }));

    const { Items: schedules } = await ddbDocClient.send(new ScanCommand({
      TableName: SCHEDULES_TABLE
    }));

    const { Items: entries } = await ddbDocClient.send(new ScanCommand({
      TableName: ENTRY_RECORDS_TABLE
    }));

    const totalBookings = globalStats?.totalBookings || 0;
    const cancelledBookings = globalStats?.cancelledBookings || 0;
    const totalEntries = globalStats?.totalEntries || 0;
    const expectedVisitors = globalStats?.expectedVisitors || 0;

    const cancellationRate = totalBookings > 0 ? ((cancelledBookings / totalBookings) * 100).toFixed(1) : 0;
    const attendanceRate = expectedVisitors > 0 ? ((totalEntries / expectedVisitors) * 100).toFixed(1) : 0;

    const reportSummary = {
      generatedAt: new Date().toISOString(),
      kpis: {
        totalBookings,
        cancelledBookings,
        cancellationRate: parseFloat(cancellationRate),
        totalExpectedVisitors: expectedVisitors,
        totalEntriesRecorded: totalEntries,
        attendanceRate: parseFloat(attendanceRate),
        totalExhibitions: (exhibitions || []).length,
        totalSchedules: (schedules || []).length
      },
      topExhibitions: (exhibitions || []).map(e => ({
        id: e.exhibitionId,
        name: e.name,
        category: e.category,
        location: e.location
      })),
      recentEntriesCount: (entries || []).length
    };

    return formatResponse(200, reportSummary);
  } catch (error) {
    console.error('Reports error:', error);
    return formatResponse(500, { error: 'Could not generate reports' });
  }
};
