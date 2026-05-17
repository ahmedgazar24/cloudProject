const router  = require('express').Router()
const bcrypt  = require('bcryptjs')
const jwt     = require('jsonwebtoken')
const { v4: uuid } = require('uuid')
const { db, T, PutCommand, QueryCommand, ScanCommand } = require('../lib/dynamo')
const { stripNulls } = require('../lib/dynamoConfig')
const { JWT_SECRET } = require('../middleware/auth')
const {
  isCognitoEnabled,
  signUp,
  authenticate,
  findLocalUserByEmail,
  ensureLocalUser,
} = require('../lib/cognito')

// ─── GET /auth/teams — public, used by register page ─────────────────────────
router.get('/teams', async (req, res) => {
  try {
    const r = await db.send(new ScanCommand({
      TableName: T.TEAMS,
      ProjectionExpression: 'teamId, #n',
      ExpressionAttributeNames: { '#n': 'name' },
    }))
    res.json({ teams: r.Items ?? [] })
  } catch (e) {
    console.error(e)
    res.status(500).json({ message: 'Failed to fetch teams' })
  }
})

function normalizeRole(role) {
  return ['MANAGER', 'ADMIN', 'EMPLOYEE'].includes(role) ? role : 'EMPLOYEE'
}

function buildSafeUser(user) {
  const { password, ...safe } = user
  return safe
}

async function findExistingUser(email) {
  return await db.send(new QueryCommand({
    TableName: T.USERS,
    IndexName: 'email-index',
    KeyConditionExpression: 'email = :e',
    ExpressionAttributeValues: { ':e': email.toLowerCase() },
    Limit: 1,
  }))
}

// ─── Register ────────────────────────────────────────────────────────────────
router.post('/register', async (req, res) => {
  const { name, email, password, role = 'EMPLOYEE', teamId = null } = req.body
  if (!name || !email || !password) return res.status(400).json({ message: 'name, email and password required' })

  try {
    const existing = await findExistingUser(email)
    if (existing.Count > 0) return res.status(409).json({ message: 'Email already registered' })

    if (!isCognitoEnabled) {
      const hashed = await bcrypt.hash(password, 10)
      const user = {
        userId:    uuid(),
        name:      name.trim(),
        email:     email.toLowerCase(),
        password:  hashed,
        role:      normalizeRole(role),
        teamId:    teamId ?? null,
        createdAt: new Date().toISOString(),
      }
      await db.send(new PutCommand({ TableName: T.USERS, Item: stripNulls(user) }))
      res.status(201).json({ message: 'Account created', user: buildSafeUser(user) })
      return
    }

    const userId = await signUp({ email, password })
    const user = {
      userId,
      name:      name.trim(),
      email:     email.toLowerCase(),
      role:      normalizeRole(role),
      teamId:    teamId ?? null,
      createdAt: new Date().toISOString(),
    }
    await db.send(new PutCommand({ TableName: T.USERS, Item: stripNulls(user) }))

    res.status(201).json({ message: 'Account created', user: user })
  } catch (e) {
    console.error(e)
    const message = e.code === 'UsernameExistsException' || e.code === 'UsernameExists' ? 'Email already registered' : 'Registration failed'
    res.status(e.code === 'UsernameExistsException' || e.code === 'UsernameExists' ? 409 : 500).json({ message })
  }
})

// ─── Login ───────────────────────────────────────────────────────────────────
router.post('/login', async (req, res) => {
  const { email, password } = req.body
  if (!email || !password) return res.status(400).json({ message: 'email and password required' })

  try {
    if (!isCognitoEnabled) {
      const result = await findExistingUser(email)
      const user = result.Items?.[0]
      if (!user) return res.status(401).json({ message: 'Invalid credentials' })

      const ok = await bcrypt.compare(password, user.password)
      if (!ok) return res.status(401).json({ message: 'Invalid credentials' })

      const token = jwt.sign(
        { userId: user.userId, email: user.email, name: user.name, role: user.role, teamId: user.teamId },
        JWT_SECRET,
        { expiresIn: '7d' }
      )

      res.json({ user: { ...buildSafeUser(user), token } })
      return
    }

    const authResult = await authenticate({ email, password })
    const idToken = authResult.IdToken
    if (!idToken) {
      return res.status(401).json({ message: 'Invalid Cognito credentials' })
    }

    const decoded = jwt.decode(idToken) || {}
    const emailFromToken = decoded.email || decoded['cognito:username'] || email
    const user = await findLocalUserByEmail(emailFromToken)
    if (!user) {
      return res.status(401).json({ message: 'User profile not found' })
    }

    res.json({ user: { ...buildSafeUser(user), token: idToken } })
  } catch (e) {
    console.error(e)
    const status = e.code === 'NotAuthorizedException' || e.code === 'UserNotFoundException' || e.code === 'UserNotConfirmedException' ? 401 : 500
    const message = e.code === 'NotAuthorizedException' ? 'Invalid credentials' : e.code === 'UserNotConfirmedException' ? 'Please confirm your email first' : e.message || 'Login failed'
    res.status(status).json({ message })
  }
})

module.exports = router
