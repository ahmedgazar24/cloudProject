const { DynamoDBClient }        = require('@aws-sdk/client-dynamodb')
const { DynamoDBDocumentClient, GetCommand, PutCommand, UpdateCommand,
        DeleteCommand, QueryCommand, ScanCommand } = require('@aws-sdk/lib-dynamodb')

const { getDynamoClientConfig } = require('./dynamoConfig')
const client = new DynamoDBClient(getDynamoClientConfig())

const db = DynamoDBDocumentClient.from(client, {
  marshallOptions:   { removeUndefinedValues: true },
  unmarshallOptions: { wrapNumbers: false },
})

// ─── Table names (from env or defaults) ──────────────────────────────────────
const T = {
  USERS:    process.env.TABLE_USERS    ?? 'mj-users',
  TEAMS:    process.env.TABLE_TEAMS    ?? 'mj-teams',
  PROJECTS: process.env.TABLE_PROJECTS ?? 'mj-projects',
  TASKS:    process.env.TABLE_TASKS    ?? 'mj-tasks',
  COMMENTS: process.env.TABLE_COMMENTS ?? 'mj-comments',
  AUDIT:    process.env.TABLE_AUDIT    ?? 'mj-audit',
}

module.exports = { db, T, GetCommand, PutCommand, UpdateCommand, DeleteCommand, QueryCommand, ScanCommand }
