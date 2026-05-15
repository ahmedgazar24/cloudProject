const router = require('express').Router()
const { v4: uuid } = require('uuid')
const { db, T, GetCommand, PutCommand, UpdateCommand, DeleteCommand, ScanCommand } = require('../lib/dynamo')
const { requireRole } = require('../middleware/auth')

// GET /teams — all roles
router.get('/', async (req, res) => {
  try {
    const r = await db.send(new ScanCommand({ TableName: T.TEAMS }))
    res.json({ teams: r.Items ?? [] })
  } catch (e) {
    res.status(500).json({ message: 'Failed to fetch teams' })
  }
})

// GET /teams/:id
router.get('/:id', async (req, res) => {
  try {
    const r = await db.send(new GetCommand({ TableName: T.TEAMS, Key: { teamId: req.params.id } }))
    if (!r.Item) return res.status(404).json({ message: 'Team not found' })
    res.json({ team: r.Item })
  } catch {
    res.status(500).json({ message: 'Failed to fetch team' })
  }
})

// POST /teams — manager/admin only
router.post('/', requireRole('MANAGER', 'ADMIN'), async (req, res) => {
  const { name } = req.body
  if (!name?.trim()) return res.status(400).json({ message: 'name is required' })
  try {
    const team = {
      teamId:      uuid(),
      name:        name.trim(),
      createdBy:   req.user.userId,
      createdAt:   new Date().toISOString(),
      memberCount: 0,
    }
    await db.send(new PutCommand({ TableName: T.TEAMS, Item: team }))
    res.status(201).json({ team })
  } catch {
    res.status(500).json({ message: 'Failed to create team' })
  }
})

// PATCH /teams/:id
router.patch('/:id', requireRole('MANAGER', 'ADMIN'), async (req, res) => {
  const { name } = req.body
  if (!name?.trim()) return res.status(400).json({ message: 'name is required' })
  try {
    const r = await db.send(new UpdateCommand({
      TableName: T.TEAMS,
      Key: { teamId: req.params.id },
      UpdateExpression: 'SET #n = :n, updatedAt = :u',
      ExpressionAttributeNames: { '#n': 'name' },
      ExpressionAttributeValues: { ':n': name.trim(), ':u': new Date().toISOString() },
      ReturnValues: 'ALL_NEW',
    }))
    res.json({ team: r.Attributes })
  } catch {
    res.status(500).json({ message: 'Failed to update team' })
  }
})

// DELETE /teams/:id
router.delete('/:id', requireRole('MANAGER', 'ADMIN'), async (req, res) => {
  try {
    await db.send(new DeleteCommand({ TableName: T.TEAMS, Key: { teamId: req.params.id } }))
    res.json({ message: 'Deleted' })
  } catch {
    res.status(500).json({ message: 'Failed to delete team' })
  }
})

module.exports = router
