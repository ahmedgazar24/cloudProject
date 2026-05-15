/** Shared DynamoDB client options (AWS or DynamoDB Local). */
function getDynamoClientConfig() {
  const config = { region: process.env.AWS_REGION ?? 'us-east-1' }

  if (process.env.DYNAMODB_ENDPOINT) {
    config.endpoint = process.env.DYNAMODB_ENDPOINT
    config.credentials = {
      accessKeyId:     process.env.AWS_ACCESS_KEY_ID     || 'local',
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || 'local',
    }
  }

  return config
}

/** DynamoDB Local rejects null attributes; omit them before writes. */
function stripNulls(item) {
  return Object.fromEntries(Object.entries(item).filter(([, v]) => v !== null))
}

module.exports = { getDynamoClientConfig, stripNulls }
