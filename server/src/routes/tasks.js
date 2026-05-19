const router = require('express').Router()
const { v4: uuid } = require('uuid')
const {
  db, T, GetCommand, PutCommand, UpdateCommand, DeleteCommand,
  QueryCommand, ScanCommand
} = require('../lib/dynamo')
const { upload, deleteS3Object, getImageUrl, BUCKET_RESIZED } = require('../lib/s3')
const { publishTaskAssigned, putMetric } = require('../lib/events')
const { requireRole } = require('../middleware/auth')

// ─── Helper: build update expression ─────────────────────────────────────────
function buildUpdate(fields) {
  const exp   = []
  const names = {}
  const vals  = {}
  for (const [k, v] of Object.entries(fields)) {
    if (v === undefined) continue
    exp.push(`#${k} = :${k}`)
    names[`#${k}`] = k
    vals[`:${k}`]  = v
  }
  return { expression: 'SET ' + exp.join(', '), names, vals }
}

function enhanceTask(task) {
  return {
    ...task,
    imageUrl: task.imageKey ? getImageUrl(task.imageKey) : null,
    resizedImageUrl: task.imageKey ? getImageUrl(task.imageKey, BUCKET_RESIZED) : null,
  }
}

// ─── GET /tasks ───────────────────────────────────────────────────────────────
router.get('/', async (req, res) => {
  const { user } = req
  const { teamId, assigneeId, projectId, status, priority } = req.query

  try {
    let items = []

    if (user.role === 'MANAGER' || user.role === 'ADMIN') {
      if (assigneeId) {
        const r = await db.send(new QueryCommand({
          TableName: T.TASKS,
          IndexName: 'assigneeId-index',
          KeyConditionExpression: 'assigneeId = :a',
          ExpressionAttributeValues: { ':a': assigneeId },
        }))
        items = r.Items ?? []
      } else if (teamId) {
        const r = await db.send(new QueryCommand({
          TableName: T.TASKS,
          IndexName: 'teamId-index',
          KeyConditionExpression: 'teamId = :t',
          ExpressionAttributeValues: { ':t': teamId },
        }))
        items = r.Items ?? []
      } else {
        const r = await db.send(new ScanCommand({ TableName: T.TASKS }))
        items = r.Items ?? []
      }
    } else {
      const userTeamId = user.teamId
      if (!userTeamId) return res.json({ tasks: [] })

      const r = await db.send(new QueryCommand({
        TableName: T.TASKS,
        IndexName: 'teamId-index',
        KeyConditionExpression: 'teamId = :t',
        ExpressionAttributeValues: { ':t': userTeamId },
      }))
      items = r.Items ?? []
    }

    // Additional filters
    if (assigneeId) items = items.filter(t => t.assigneeId === assigneeId)
    if (priority)   items = items.filter(t => t.priority === priority)
    if (status)     items = items.filter(t => t.status === status)
    if (projectId)  items = items.filter(t => t.projectId === projectId)

    items = items.map(enhanceTask)

    res.json({ tasks: items })
  } catch (e) {
    console.error(e)
    res.status(500).json({ message: 'Failed to fetch tasks' })
  }
})

// ─── GET /tasks/:id ───────────────────────────────────────────────────────────
router.get('/:id', async (req, res) => {
  const { user } = req
  try {
    const r = await db.send(new GetCommand({ TableName: T.TASKS, Key: { taskId: req.params.id } }))
    const task = r.Item
    if (!task) return res.status(404).json({ message: 'Task not found' })

    // Team isolation for employees
    if (user.role === 'EMPLOYEE' && task.teamId !== user.teamId) {
      return res.status(403).json({ message: 'Forbidden' })
    }
    res.json({ task: enhanceTask(task) })
  } catch (e) {
    res.status(500).json({ message: 'Failed to fetch task' })
  }
})

// ─── POST /tasks (MANAGER only) ───────────────────────────────────────────────
router.post('/', requireRole('MANAGER', 'ADMIN'), upload.single('image'), async (req, res) => {
  const { title, description, priority, status, deadline, assigneeId, teamId, projectId } = req.body
  if (!title) return res.status(400).json({ message: 'title is required' })

  try {
    const imageKey = req.file?.key ?? null

    const task = {
      taskId:      uuid(),
      title:       title.trim(),
      description: description ?? '',
      priority:    priority    ?? 'MEDIUM',
      status:      status      ?? 'TODO',
      deadline:    deadline    ?? null,
      assigneeId:  assigneeId  ?? null,
      teamId:      teamId      ?? null,
      projectId:   projectId   ?? null,
      imageKey,
      createdBy:   req.user.userId,
      createdAt:   new Date().toISOString(),
      updatedAt:   new Date().toISOString(),
      commentCount: 0,
    }

    // Enrich with names (best-effort)
    if (teamId) {
      const tr = await db.send(new GetCommand({ TableName: T.TEAMS, Key: { teamId } }))
      task.teamName = tr.Item?.name
    }
    if (assigneeId) {
      const ur = await db.send(new GetCommand({ TableName: T.USERS, Key: { userId: assigneeId } }))
      task.assigneeName  = ur.Item?.name
      task.assigneeEmail = ur.Item?.email
    }

    await db.send(new PutCommand({ TableName: T.TASKS, Item: task }))

    // Fire-and-forget event
    if (assigneeId) {
      publishTaskAssigned({ task, assigneeName: task.assigneeName, assigneeEmail: task.assigneeEmail, managerName: req.user.name })
      putMetric('TasksAssigned', 1, [{ Name: 'TeamId', Value: teamId ?? 'none' }])
    }
    putMetric('TasksCreated', 1)

    res.status(201).json({ task: enhanceTask(task) })
  } catch (e) {
    console.error(e)
    res.status(500).json({ message: 'Failed to create task' })
  }
})

// ─── PATCH /tasks/:id ─────────────────────────────────────────────────────────
router.patch('/:id', upload.single('image'), async (req, res) => {
  const { user } = req
  try {
    const existing = await db.send(new GetCommand({ TableName: T.TASKS, Key: { taskId: req.params.id } }))
    const task = existing.Item
    if (!task) return res.status(404).json({ message: 'Task not found' })

    // Team isolation for employees
    if (user.role === 'EMPLOYEE' && task.teamId !== user.teamId) {
      return res.status(403).json({ message: 'Forbidden' })
    }
    // Employees can only update status
    const isManager = user.role === 'MANAGER' || user.role === 'ADMIN'
    const allowedKeys = isManager
      ? ['title', 'description', 'priority', 'status', 'deadline', 'assigneeId', 'teamId', 'projectId']
      : ['status']

    const updates = {}
    for (const k of allowedKeys) {
      if (req.body[k] !== undefined) updates[k] = req.body[k]
    }

    // Status audit log
    if (updates.status && updates.status !== task.status) {
      const log = {
        logId:     uuid(),
        taskId:    task.taskId,
        fromStatus: task.status,
        toStatus:   updates.status,
        userId:     user.userId,
        userName:   user.name,
        createdAt:  new Date().toISOString(),
      }
      await db.send(new PutCommand({ TableName: T.AUDIT, Item: log }))
      if (updates.status === 'DONE') putMetric('TasksClosed', 1, [{ Name: 'TeamId', Value: task.teamId ?? 'none' }])
    }

    // Image replacement: keep prior object in S3 so previous versions are preserved
    if (req.file?.key) {
      updates.imageKey = req.file.key
    }

    updates.updatedAt = new Date().toISOString()

    // Enrich names if IDs changed
    if (updates.teamId) {
      const tr = await db.send(new GetCommand({ TableName: T.TEAMS, Key: { teamId: updates.teamId } }))
      updates.teamName = tr.Item?.name
    }
    if (updates.assigneeId) {
      const ur = await db.send(new GetCommand({ TableName: T.USERS, Key: { userId: updates.assigneeId } }))
      updates.assigneeName  = ur.Item?.name
      updates.assigneeEmail = ur.Item?.email
      // Notify new assignee
      publishTaskAssigned({ task: { ...task, ...updates }, assigneeName: updates.assigneeName, assigneeEmail: updates.assigneeEmail, managerName: user.name })
    }

    const { expression, names, vals } = buildUpdate(updates)
    const r = await db.send(new UpdateCommand({
      TableName: T.TASKS,
      Key: { taskId: task.taskId },
      UpdateExpression: expression,
      ExpressionAttributeNames: names,
      ExpressionAttributeValues: vals,
      ReturnValues: 'ALL_NEW',
    }))
    const updated = r.Attributes
    res.json({ task: enhanceTask(updated) })
  } catch (e) {
    console.error(e)
    res.status(500).json({ message: 'Failed to update task' })
  }
})

// ─── DELETE /tasks/:id ────────────────────────────────────────────────────────
router.delete('/:id', requireRole('MANAGER', 'ADMIN'), async (req, res) => {
  try {
    const r = await db.send(new GetCommand({ TableName: T.TASKS, Key: { taskId: req.params.id } }))
    if (!r.Item) return res.status(404).json({ message: 'Not found' })
    if (r.Item.imageKey) await deleteS3Object(r.Item.imageKey)
    await db.send(new DeleteCommand({ TableName: T.TASKS, Key: { taskId: req.params.id } }))
    res.json({ message: 'Deleted' })
  } catch (e) {
    res.status(500).json({ message: 'Failed to delete' })
  }
})

// ─── GET /tasks/:id/comments ──────────────────────────────────────────────────
router.get('/:id/comments', async (req, res) => {
  try {
    const r = await db.send(new QueryCommand({
      TableName: T.COMMENTS,
      IndexName: 'taskId-index',
      KeyConditionExpression: 'taskId = :t',
      ExpressionAttributeValues: { ':t': req.params.id },
    }))
    res.json({ comments: r.Items ?? [] })
  } catch { res.status(500).json({ message: 'Failed to fetch comments' }) }
})

// ─── POST /tasks/:id/comments ─────────────────────────────────────────────────
router.post('/:id/comments', async (req, res) => {
  const { body } = req.body
  if (!body?.trim()) return res.status(400).json({ message: 'body required' })
  const { user } = req

  // Verify task exists and user can access it
  const tr = await db.send(new GetCommand({ TableName: T.TASKS, Key: { taskId: req.params.id } }))
  if (!tr.Item) return res.status(404).json({ message: 'Task not found' })
  if (user.role === 'EMPLOYEE' && tr.Item.teamId !== user.teamId)
    return res.status(403).json({ message: 'Forbidden' })

  const comment = {
    commentId: uuid(),
    taskId:    req.params.id,
    body:      body.trim(),
    authorId:  user.userId,
    authorName: user.name,
    createdAt: new Date().toISOString(),
  }
  await db.send(new PutCommand({ TableName: T.COMMENTS, Item: comment }))

  // Increment comment count
  await db.send(new UpdateCommand({
    TableName: T.TASKS,
    Key: { taskId: req.params.id },
    UpdateExpression: 'ADD commentCount :one',
    ExpressionAttributeValues: { ':one': 1 },
  })).catch(() => {})

  res.status(201).json({ comment })
})

// ─── GET /tasks/:id/audit ─────────────────────────────────────────────────────
router.get('/:id/audit', async (req, res) => {
  try {
    const r = await db.send(new QueryCommand({
      TableName: T.AUDIT,
      IndexName: 'taskId-index',
      KeyConditionExpression: 'taskId = :t',
      ExpressionAttributeValues: { ':t': req.params.id },
    }))
    res.json({ logs: r.Items ?? [] })
  } catch { res.status(500).json({ message: 'Failed to fetch audit' }) }
})

module.exports = router
