const router = require('express').Router()
const { db, T, ScanCommand, QueryCommand, GetCommand } = require('../lib/dynamo')

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

module.exports = router
