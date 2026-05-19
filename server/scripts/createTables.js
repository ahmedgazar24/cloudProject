/**
 * scripts/createTables.js
 * Creates all DynamoDB tables required by FlowBoard.
 * Run once:  node scripts/createTables.js
 * For local: DYNAMODB_ENDPOINT=http://localhost:8000 node scripts/createTables.js
 */
require('dotenv').config({ path: require('path').join(__dirname, '../.env') })
const { DynamoDBClient, CreateTableCommand, ListTablesCommand } = require('@aws-sdk/client-dynamodb')
const { getDynamoClientConfig } = require('../src/lib/dynamoConfig')

const client = new DynamoDBClient(getDynamoClientConfig())

const TABLE_PREFIX = 'mj-'

const tables = [
  // ── Users ─────────────────────────────────────────────────────────────────
  {
    TableName:            'mj-users',
    BillingMode:          'PAY_PER_REQUEST',
    AttributeDefinitions: [
      { AttributeName: 'userId', AttributeType: 'S' },
      { AttributeName: 'email',  AttributeType: 'S' },
      { AttributeName: 'teamId', AttributeType: 'S' },
    ],
    KeySchema: [{ AttributeName: 'userId', KeyType: 'HASH' }],
    GlobalSecondaryIndexes: [
      {
        IndexName: 'email-index',
        KeySchema: [{ AttributeName: 'email', KeyType: 'HASH' }],
        Projection: { ProjectionType: 'ALL' },
      },
      {
        IndexName: 'teamId-index',
        KeySchema: [{ AttributeName: 'teamId', KeyType: 'HASH' }],
        Projection: { ProjectionType: 'ALL' },
      },
    ],
  },

  // ── Teams ──────────────────────────────────────────────────────────────────
  {
    TableName:            'mj-teams',
    BillingMode:          'PAY_PER_REQUEST',
    AttributeDefinitions: [{ AttributeName: 'teamId', AttributeType: 'S' }],
    KeySchema:            [{ AttributeName: 'teamId', KeyType: 'HASH' }],
  },

  // ── Projects ───────────────────────────────────────────────────────────────
  {
    TableName:            'mj-projects',
    BillingMode:          'PAY_PER_REQUEST',
    AttributeDefinitions: [{ AttributeName: 'projectId', AttributeType: 'S' }],
    KeySchema:            [{ AttributeName: 'projectId', KeyType: 'HASH' }],
  },

  // ── Tasks ──────────────────────────────────────────────────────────────────
  {
    TableName:            'mj-tasks',
    BillingMode:          'PAY_PER_REQUEST',
    AttributeDefinitions: [
      { AttributeName: 'taskId', AttributeType: 'S' },
      { AttributeName: 'teamId', AttributeType: 'S' },
      { AttributeName: 'status', AttributeType: 'S' },
      { AttributeName: 'assigneeId', AttributeType: 'S' },
    ],
    KeySchema: [{ AttributeName: 'taskId', KeyType: 'HASH' }],
    GlobalSecondaryIndexes: [
      {
        IndexName: 'teamId-index',
        KeySchema: [
          { AttributeName: 'teamId', KeyType: 'HASH' },
          { AttributeName: 'status', KeyType: 'RANGE' },
        ],
        Projection: { ProjectionType: 'ALL' },
      },
      {
        IndexName: 'assigneeId-index',
        KeySchema: [
          { AttributeName: 'assigneeId', KeyType: 'HASH' },
        ],
        Projection: { ProjectionType: 'ALL' },
      },
    ],
  },

  // ── Comments ───────────────────────────────────────────────────────────────
  {
    TableName:            'mj-comments',
    BillingMode:          'PAY_PER_REQUEST',
    AttributeDefinitions: [
      { AttributeName: 'commentId', AttributeType: 'S' },
      { AttributeName: 'taskId',    AttributeType: 'S' },
    ],
    KeySchema: [{ AttributeName: 'commentId', KeyType: 'HASH' }],
    GlobalSecondaryIndexes: [
      {
        IndexName: 'taskId-index',
        KeySchema: [{ AttributeName: 'taskId', KeyType: 'HASH' }],
        Projection: { ProjectionType: 'ALL' },
      },
    ],
  },

  // ── Audit Logs ─────────────────────────────────────────────────────────────
  {
    TableName:            'mj-audit',
    BillingMode:          'PAY_PER_REQUEST',
    AttributeDefinitions: [
      { AttributeName: 'logId',  AttributeType: 'S' },
      { AttributeName: 'taskId', AttributeType: 'S' },
    ],
    KeySchema: [{ AttributeName: 'logId', KeyType: 'HASH' }],
    GlobalSecondaryIndexes: [
      {
        IndexName: 'taskId-index',
        KeySchema: [{ AttributeName: 'taskId', KeyType: 'HASH' }],
        Projection: { ProjectionType: 'ALL' },
      },
    ],
  },
]

async function run() {
  const existing = await client.send(new ListTablesCommand({}))
  const existingNames = new Set(existing.TableNames)

  for (const def of tables) {
    if (existingNames.has(def.TableName)) {
      console.log(`✓ Already exists: ${def.TableName}`)
      continue
    }
    try {
      await client.send(new CreateTableCommand(def))
      console.log(`✅ Created: ${def.TableName}`)
    } catch (e) {
      console.error(`❌ Failed to create ${def.TableName}:`, e.message)
    }
  }
  console.log('\nDone.')
}

run().catch(console.error)
