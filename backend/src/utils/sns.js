const { SNSClient, PublishCommand } = require('@aws-sdk/client-sns');
const { localStore } = require('./localStore');

const isLocalMode = process.env.USE_LOCAL_STORE !== 'false' && !process.env.AWS_LAMBDA_FUNCTION_NAME;

let snsClient = null;
if (!isLocalMode) {
  try {
    snsClient = new SNSClient({
      region: process.env.AWS_REGION || 'us-east-1'
    });
  } catch (err) {
    console.warn('SNSClient could not be initialized:', err.message);
  }
}

const sendNotification = async (message, subject, metadata = {}) => {
  // Always log notification for audit/demo
  console.log(`[AMAZON SNS] ${subject}: ${message.replace(/\n/g, ' ')}`);

  // Add to local notification queue for real-time frontend toast alerts
  localStore.addNotification({
    subject,
    message,
    recipient: metadata.recipient || 'visitor@example.com',
    type: metadata.type || 'NOTIFICATION',
    bookingId: metadata.bookingId,
    ticketId: metadata.ticketId
  });

  // If in AWS environment with configured TopicArn, publish to actual SNS
  if (snsClient && process.env.SNS_TOPIC_ARN) {
    try {
      const params = {
        Message: message,
        Subject: subject,
        TopicArn: process.env.SNS_TOPIC_ARN
      };
      const command = new PublishCommand(params);
      await snsClient.send(command);
      console.log('[AMAZON SNS] Published successfully to AWS Topic');
    } catch (error) {
      console.error('[AMAZON SNS Error] PublishCommand failed:', error.message);
      // Non-blocking: failure in SNS does not revert successful booking
    }
  }
};

module.exports = {
  sendNotification
};
