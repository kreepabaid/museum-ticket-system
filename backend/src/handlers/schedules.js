const { ddbDocClient, PutCommand, QueryCommand, ScanCommand } = require('../utils/db');
const { formatResponse, parseBody, authenticate } = require('../utils/lambda');

const SCHEDULES_TABLE = process.env.SCHEDULES_TABLE || 'Museum_Schedules_dev';

module.exports.list = async (event) => {
  const exhibitionId = event.pathParameters?.id || event.params?.id;
  const queryStringParameters = event.queryStringParameters || {};
  const filterDate = queryStringParameters.date;

  try {
    const { Items } = await ddbDocClient.send(new QueryCommand({
      TableName: SCHEDULES_TABLE,
      KeyConditionExpression: 'exhibitionId = :exhibitionId',
      ExpressionAttributeValues: { ':exhibitionId': exhibitionId }
    }));

    let schedules = Items || [];
    if (filterDate) {
      schedules = schedules.filter(s => s.date === filterDate);
    }

    schedules.sort((a, b) => {
      if (a.date !== b.date) return a.date.localeCompare(b.date);
      return (a.startTime || '').localeCompare(b.startTime || '');
    });

    return formatResponse(200, schedules);
  } catch (error) {
    console.error('List schedules error:', error);
    return formatResponse(500, { error: 'Could not fetch schedules' });
  }
};

module.exports.create = async (event) => {
  let user;
  try {
    user = authenticate(event);
  } catch (e) {
    return formatResponse(401, { error: 'Authentication required' });
  }

  if ((user.role || '').toUpperCase() !== 'ADMIN') {
    return formatResponse(403, { error: 'Forbidden: Admin access required' });
  }

  const exhibitionId = event.pathParameters?.id || event.params?.id;
  const { date, startTime, endTime, capacity } = parseBody(event);

  if (!date || !startTime || !endTime || capacity === undefined) {
    return formatResponse(400, { error: 'date, startTime, endTime, and capacity are required' });
  }

  const parsedCapacity = parseInt(capacity, 10);
  if (isNaN(parsedCapacity) || parsedCapacity <= 0) {
    return formatResponse(400, { error: 'Capacity must be a positive integer greater than 0' });
  }

  const dateSlot = `${date}#${startTime}`;
  const item = {
    exhibitionId,
    dateSlot,
    slotId: dateSlot,
    date,
    startTime,
    endTime,
    capacity: parsedCapacity,
    bookedCount: 0,
    status: 'ACTIVE',
    createdAt: new Date().toISOString()
  };

  try {
    await ddbDocClient.send(new PutCommand({ TableName: SCHEDULES_TABLE, Item: item }));
    return formatResponse(201, item);
  } catch (error) {
    console.error('Create schedule error:', error);
    return formatResponse(500, { error: 'Could not create schedule' });
  }
};
