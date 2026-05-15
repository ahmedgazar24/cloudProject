const router = require('express').Router()
const { v4: uuid } = require('uuid')
const { db, T, GetCommand, PutCommand, UpdateCommand, DeleteCommand, ScanCommand, QueryCommand } = require('../lib/dynamo')
const { requireRole } = require('../middleware/auth')

// GET /projects
router.get('/', async (req, res) => {
  try {
    const r = await db.send(new ScanCommand({ TableName: T.PROJECTS }))
    res.json({ projects: r.Items ?? [] })
  } catch {
    res.status(500).json({ message: 'Failed to fetch projects' })
  }
})

// GET /projects/:id
router.get('/:id', async (req, res) => {
  try {
    const r = await db.send(new GetCommand({ TableName: T.PROJECTS, Key: { projectId: req.params.id } }))
    if (!r.Item) return res.status(404).json({ message: 'Project not found' })
    res.json({ project: r.Item })
  } catch {
    res.status(500).json({ message: 'Failed to fetch project' })
  }
})

// POST /projects
router.post('/', requireRole('MANAGER', 'ADMIN'), async (req, res) => {
  const { name, description } = req.body
  if (!name?.trim()) return res.status(400).json({ message: 'name is required' })
  try {
    const project = {
      projectId:   uuid(),
      name:        name.trim(),
      description: description ?? '',
      createdBy:   req.user.userId,
      createdAt:   new Date().toISOString(),
      taskCount:   0,
    }
    await db.send(new PutCommand({ TableName: T.PROJECTS, Item: project }))
    res.status(201).json({ project })
  } catch {
    res.status(500).json({ message: 'Failed to create project' })
  }
})

// PATCH /projects/:id
router.patch('/:id', requireRole('MANAGER', 'ADMIN'), async (req, res) => {
  const { name, description } = req.body
  try {
    const r = await db.send(new UpdateCommand({
      TableName: T.PROJECTS,
      Key: { projectId: req.params.id },
      UpdateExpression: 'SET #n = :n, description = :d, updatedAt = :u',
      ExpressionAttributeNames: { '#n': 'name' },
      ExpressionAttributeValues: {
        ':n': name?.trim() ?? '',
        ':d': description ?? '',
        ':u': new Date().toISOString(),
      },
      ReturnValues: 'ALL_NEW',
    }))
    res.json({ project: r.Attributes })
  } catch {
    res.status(500).json({ message: 'Failed to update project' })
  }
})

// DELETE /projects/:id
router.delete('/:id', requireRole('MANAGER', 'ADMIN'), async (req, res) => {
  try {
    await db.send(new DeleteCommand({ TableName: T.PROJECTS, Key: { projectId: req.params.id } }))
    res.json({ message: 'Deleted' })
  } catch {
    res.status(500).json({ message: 'Failed to delete project' })
  }
})

module.exports = router
