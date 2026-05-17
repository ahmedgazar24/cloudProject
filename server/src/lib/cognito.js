const AWS = require('aws-sdk')
const { db, T, PutCommand, QueryCommand } = require('./dynamo')
const { stripNulls } = require('./dynamoConfig')

const COGNITO_REGION = process.env.AWS_REGION ?? 'us-east-2'
const USER_POOL_ID   = process.env.COGNITO_USER_POOL_ID
const CLIENT_ID      = process.env.COGNITO_CLIENT_ID

AWS.config.update({ region: COGNITO_REGION })
const cognito = new AWS.CognitoIdentityServiceProvider()

const isCognitoEnabled = Boolean(USER_POOL_ID && CLIENT_ID)

function getUserAttributes(email) {
  return [{ Name: 'email', Value: email.toLowerCase() }]
}

async function findLocalUserByEmail(email) {
  if (!email) return null
  const result = await db.send(new QueryCommand({
    TableName: T.USERS,
    IndexName: 'email-index',
    KeyConditionExpression: 'email = :e',
    ExpressionAttributeValues: { ':e': email.toLowerCase() },
    Limit: 1,
  }))
  return result.Items?.[0] ?? null
}

async function ensureLocalUser(user) {
  const existing = await findLocalUserByEmail(user.email)
  if (existing) return existing
  await db.send(new PutCommand({ TableName: T.USERS, Item: stripNulls(user) }))
  return user
}

async function signUp({ email, password }) {
  if (!isCognitoEnabled) {
    throw new Error('Cognito is not configured')
  }

  const params = {
    ClientId: CLIENT_ID,
    Username: email.toLowerCase(),
    Password: password,
    UserAttributes: getUserAttributes(email),
  }

  const result = await cognito.signUp(params).promise()
  return result.UserSub
}

async function authenticate({ email, password }) {
  if (!isCognitoEnabled) {
    throw new Error('Cognito is not configured')
  }

  const params = {
    AuthFlow: 'USER_PASSWORD_AUTH',
    ClientId: CLIENT_ID,
    AuthParameters: {
      USERNAME: email.toLowerCase(),
      PASSWORD: password,
    },
  }
  await cognito.adminConfirmSignUp({
  UserPoolId: process.env.COGNITO_USER_POOL_ID,
  Username: email,
}).promise();

  const result = await cognito.initiateAuth(params).promise()
  return result.AuthenticationResult
}

module.exports = {
  isCognitoEnabled,
  findLocalUserByEmail,
  ensureLocalUser,
  signUp,
  authenticate,
}
