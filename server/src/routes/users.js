const router = require('express').Router()
const { db, T, ScanCommand, QueryCommand, GetCommand, UpdateCommand, DeleteCommand } = require('../lib/dynamo')

// GET /users — filter by teamId, or list all (manager/admin)
router.get('/', async (req, res) => {
  const { user } = req
  const { teamId } = req.query

  try {
    let items = []

    if (teamId) {
      // Query by team GSI
      const r = await db.send(new QueryCommand({
        TableName: T.USERS,
        IndexName: 'teamId-index',
        KeyConditionExpression: 'teamId = :t',
        ExpressionAttributeValues: { ':t': teamId },
      }))
      items = r.Items ?? []
    } else if (user.role === 'MANAGER' || user.role === 'ADMIN') {
      const r = await db.send(new ScanCommand({ TableName: T.USERS }))
      items = r.Items ?? []
    } else {
      // Employees only see teammates
      if (!user.teamId) return res.json({ users: [] })
      const r = await db.send(new QueryCommand({
        TableName: T.USERS,
        IndexName: 'teamId-index',
        KeyConditionExpression: 'teamId = :t',
        ExpressionAttributeValues: { ':t': user.teamId },
      }))
      items = r.Items ?? []
    }

    // Strip passwords
    const safe = items.map(({ password, ...u }) => u)
    res.json({ users: safe })
  } catch (e) {
    console.error(e)
    res.status(500).json({ message: 'Failed to fetch users' })
  }
})

// GET /users/:id
router.get('/:id', async (req, res) => {
  try {
    const r = await db.send(new GetCommand({ TableName: T.USERS, Key: { userId: req.params.id } }))
    if (!r.Item) return res.status(404).json({ message: 'User not found' })
    const { password, ...safe } = r.Item
    res.json({ user: safe })
  } catch {
    res.status(500).json({ message: 'Failed to fetch user' })
  }
})

// PATCH /users/:id — manager/admin can update a user's team, name, or role
router.patch('/:id', async (req, res) => {
  const { user } = req
  if (user.role !== 'MANAGER' && user.role !== 'ADMIN') {
    return res.status(403).json({ message: 'Only managers can edit users' })
  }

  const { teamId, name, role } = req.body
  const updates = {}

  if (teamId !== undefined) updates.teamId = teamId === '' ? null : teamId
  if (name)  updates.name  = name.trim()
  if (role && ['EMPLOYEE', 'MANAGER', 'ADMIN'].includes(role)) updates.role = role
  updates.updatedAt = new Date().toISOString()

  if (Object.keys(updates).length === 1) {
    return res.status(400).json({ message: 'Nothing to update' })
  }

  try {
    // Verify user exists
    const existing = await db.send(new GetCommand({ TableName: T.USERS, Key: { userId: req.params.id } }))
    if (!existing.Item) return res.status(404).json({ message: 'User not found' })

    // Build update expression dynamically
    const exp   = []
    const names = {}
    const vals  = {}
    for (const [k, v] of Object.entries(updates)) {
      exp.push(`#${k} = :${k}`)
      names[`#${k}`] = k
      vals[`:${k}`]  = v
    }

    const r = await db.send(new UpdateCommand({
      TableName: T.USERS,
      Key: { userId: req.params.id },
      UpdateExpression: 'SET ' + exp.join(', '),
      ExpressionAttributeNames: names,
      ExpressionAttributeValues: vals,
      ReturnValues: 'ALL_NEW',
    }))

    const { password: _, ...safe } = r.Attributes
    res.json({ user: safe })
  } catch (e) {
    console.error(e)
    res.status(500).json({ message: 'Failed to update user' })
  }
})

// DELETE /users/:id — manager/admin only
router.delete('/:id', async (req, res) => {
  const { user } = req
  if (user.role !== 'MANAGER' && user.role !== 'ADMIN') {
    return res.status(403).json({ message: 'Only managers can delete users' })
  }
  if (req.params.id === user.userId) {
    return res.status(400).json({ message: 'You cannot delete your own account' })
  }
  try {
    await db.send(new DeleteCommand({ TableName: T.USERS, Key: { userId: req.params.id } }))
    res.json({ message: 'User deleted' })
  } catch {
    res.status(500).json({ message: 'Failed to delete user' })
  }
})

module.exports = router
