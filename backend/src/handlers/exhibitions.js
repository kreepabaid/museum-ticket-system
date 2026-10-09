const crypto = require('crypto');
const { ddbDocClient, PutCommand, GetCommand, ScanCommand, UpdateCommand } = require('../utils/db');
const { formatResponse, parseBody, authenticate } = require('../utils/lambda');

const EXHIBITIONS_TABLE = process.env.EXHIBITIONS_TABLE || 'Museum_Exhibitions_dev';

module.exports.list = async (event) => {
  try {
    const { Items } = await ddbDocClient.send(new ScanCommand({ TableName: EXHIBITIONS_TABLE }));
    const exhibitions = (Items || []).sort((a, b) => new Date(a.startDate) - new Date(b.startDate));
    return formatResponse(200, exhibitions);
  } catch (error) {
    console.error('List exhibitions error:', error);
    return formatResponse(500, { error: 'Could not fetch exhibitions' });
  }
};

module.exports.get = async (event) => {
  try {
    const id = event.pathParameters?.id || event.params?.id;
    const { Item } = await ddbDocClient.send(new GetCommand({
      TableName: EXHIBITIONS_TABLE,
      Key: { exhibitionId: id }
    }));
    if (!Item) return formatResponse(404, { error: 'Exhibition not found' });
    return formatResponse(200, Item);
  } catch (error) {
    console.error('Get exhibition error:', error);
    return formatResponse(500, { error: 'Could not fetch exhibition' });
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

  const body = parseBody(event);
  const { name, description, category, location, startDate, endDate, imageUrl } = body;

  if (!name || !description || !startDate || !endDate) {
    return formatResponse(400, { error: 'Name, description, startDate, and endDate are required' });
  }

  const exhibitionId = `exh-${crypto.randomUUID().slice(0, 8)}`;
  const item = {
    exhibitionId,
    name: name.trim(),
    description: description.trim(),
    category: category ? category.trim() : 'General',
    location: location ? location.trim() : 'Main Gallery',
    startDate,
    endDate,
    imageUrl: imageUrl && imageUrl.trim() ? imageUrl.trim() : 'https://images.unsplash.com/photo-1544928147-79a2dbc1f389?auto=format&fit=crop&q=80&w=1200',
    status: 'ACTIVE',
    createdAt: new Date().toISOString()
  };

  try {
    await ddbDocClient.send(new PutCommand({ TableName: EXHIBITIONS_TABLE, Item: item }));
    return formatResponse(201, item);
  } catch (error) {
    console.error('Create exhibition error:', error);
    return formatResponse(500, { error: 'Could not create exhibition' });
  }
};
