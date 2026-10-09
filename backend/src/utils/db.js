const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const {
  DynamoDBDocumentClient,
  PutCommand,
  GetCommand,
  QueryCommand,
  ScanCommand,
  UpdateCommand,
  DeleteCommand,
  TransactWriteCommand
} = require('@aws-sdk/lib-dynamodb');
const { localStore } = require('./localStore');

const useLocalStore = process.env.USE_LOCAL_STORE !== 'false' && !process.env.AWS_LAMBDA_FUNCTION_NAME;

let ddbDocClient;

if (useLocalStore) {
  // High-fidelity local adapter routing AWS SDK commands to localStore
  ddbDocClient = {
    send: async (command) => {
      const input = command.input;
      const cmdName = command.constructor.name;

      if (cmdName === 'GetCommand' || (input.Key && !input.UpdateExpression && !input.Item)) {
        return await localStore.get(input);
      } else if (cmdName === 'PutCommand' || input.Item) {
        return await localStore.put(input);
      } else if (cmdName === 'QueryCommand' || input.KeyConditionExpression) {
        return await localStore.query(input);
      } else if (cmdName === 'ScanCommand' || (input.TableName && !input.KeyConditionExpression && !input.Key && !input.Item)) {
        return await localStore.scan(input);
      } else if (cmdName === 'UpdateCommand' || input.UpdateExpression) {
        return await localStore.update(input);
      } else if (cmdName === 'TransactWriteCommand' || input.TransactItems) {
        return await localStore.transactWrite(input);
      }

      throw new Error(`Unsupported local DynamoDB command: ${cmdName}`);
    }
  };
  console.log('[DynamoDB Adapter] Using Local Zero-Config Store with seeded data');
} else {
  // Real AWS DynamoDB Client
  const client = new DynamoDBClient({
    region: process.env.AWS_REGION || 'us-east-1',
    ...(process.env.IS_OFFLINE && {
      endpoint: 'http://localhost:8000'
    })
  });
  ddbDocClient = DynamoDBDocumentClient.from(client);
  console.log('[DynamoDB Adapter] Connected to AWS DynamoDB DocumentClient');
}

module.exports = {
  ddbDocClient,
  PutCommand,
  GetCommand,
  QueryCommand,
  ScanCommand,
  UpdateCommand,
  DeleteCommand,
  TransactWriteCommand
};
