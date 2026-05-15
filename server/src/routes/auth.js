const router  = require('express').Router()
const bcrypt  = require('bcryptjs')
const jwt     = require('jsonwebtoken')
const { v4: uuid } = require('uuid')
const { db, T, PutCommand, QueryCommand, ScanCommand } = require('../lib/dynamo')
const { JWT_SECRET } = require('../middleware/auth')

// ─── Register ────────────────────────────────────────────────────────────────
router.post('/register', async (req, res) => {
  const { name, email, password, role = 'EMPLOYEE', teamId = null } = req.body
  if (!name || !email || !password) return res.status(400).json({ message: 'name, email and password required' })

  try {
    // Check email uniqueness
    const existing = await db.send(new QueryCommand({
      TableName: T.USERS,
      IndexName: 'email-index',
      KeyConditionExpression: 'email = :e',
      ExpressionAttributeValues: { ':e': email.toLowerCase() },
      Limit: 1,
    }))
    if (existing.Count > 0) return res.status(409).json({ message: 'Email already registered' })

    const hashed = await bcrypt.hash(password, 10)
    const user = {
      userId:    uuid(),
      name:      name.trim(),
      email:     email.toLowerCase(),
      password:  hashed,
      role:      ['MANAGER','ADMIN','EMPLOYEE'].includes(role) ? role : 'EMPLOYEE',
      teamId:    teamId ?? null,
      createdAt: new Date().toISOString(),
    }
    await db.send(new PutCommand({ TableName: T.USERS, Item: user }))

    const { password: _, ...safe } = user
    res.status(201).json({ message: 'Account created', user: safe })
  } catch (e) {
    console.error(e)
    res.status(500).json({ message: 'Registration failed' })
  }
})

// ─── Login ───────────────────────────────────────────────────────────────────
router.post('/login', async (req, res) => {
  const { email, password } = req.body
  if (!email || !password) return res.status(400).json({ message: 'email and password required' })

  try {
    const result = await db.send(new QueryCommand({
      TableName: T.USERS,
      IndexName: 'email-index',
      KeyConditionExpression: 'email = :e',
      ExpressionAttributeValues: { ':e': email.toLowerCase() },
      Limit: 1,
    }))
    const user = result.Items?.[0]
    if (!user) return res.status(401).json({ message: 'Invalid credentials' })

    const ok = await bcrypt.compare(password, user.password)
    if (!ok) return res.status(401).json({ message: 'Invalid credentials' })

    const token = jwt.sign(
      { userId: user.userId, email: user.email, name: user.name, role: user.role, teamId: user.teamId },
      JWT_SECRET,
      { expiresIn: '7d' }
    )

    const { password: _, ...safe } = user
    res.json({ user: { ...safe, token } })
  } catch (e) {
    console.error(e)
    res.status(500).json({ message: 'Login failed' })
  }
})

module.exports = router
