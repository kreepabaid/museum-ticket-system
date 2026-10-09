const { localStore } = require('../utils/localStore');
const { formatResponse, authenticate } = require('../utils/lambda');

module.exports.list = async (event) => {
  let recipient = null;
  try {
    const user = authenticate(event);
    recipient = user.email;
  } catch (err) {
    // If not authenticated, still allow viewing demo notifications
  }

  const notifications = localStore.getNotifications(recipient);
  return formatResponse(200, notifications);
};
