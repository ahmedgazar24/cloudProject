/**
 * scripts/seed.js
 * Seeds DynamoDB with demo data for local development.
 * Run: node scripts/seed.js
 */
require('dotenv').config({ path: require('path').join(__dirname, '../.env') })
const bcrypt  = require('bcryptjs')
const { v4: uuid } = require('uuid')
const { DynamoDBClient }        = require('@aws-sdk/client-dynamodb')
const { DynamoDBDocumentClient, PutCommand, ScanCommand } = require('@aws-sdk/lib-dynamodb')
const { getDynamoClientConfig, stripNulls } = require('../src/lib/dynamoConfig')

const client = new DynamoDBClient(getDynamoClientConfig())
const db = DynamoDBDocumentClient.from(client, { marshallOptions: { removeUndefinedValues: true } })

const T = {
  USERS:    'mj-users',
  TEAMS:    'mj-teams',
  PROJECTS: 'mj-projects',
  TASKS:    'mj-tasks',
}

async function put(TableName, Item) {
  await db.send(new PutCommand({ TableName, Item: stripNulls(Item) }))
}

async function main() {
  const hash = await bcrypt.hash('Password1!', 10)
  const now  = new Date().toISOString()

  // Teams
  const frontendTeam = { teamId: uuid(), name: 'Frontend',  createdAt: now, memberCount: 2 }
  const backendTeam  = { teamId: uuid(), name: 'Backend',   createdAt: now, memberCount: 2 }
  const qaTeam       = { teamId: uuid(), name: 'QA',        createdAt: now, memberCount: 1 }
  await put(T.TEAMS, frontendTeam)
  await put(T.TEAMS, backendTeam)
  await put(T.TEAMS, qaTeam)
  console.log('✅ Teams seeded')

  // Users
  const manager = {
    userId: uuid(), name: 'Sarah Manager', email: 'manager@demo.com',
    password: hash, role: 'MANAGER', teamId: null, createdAt: now,
  }
  const emp1 = {
    userId: uuid(), name: 'Ali Hassan', email: 'ali@demo.com',
    password: hash, role: 'EMPLOYEE', teamId: frontendTeam.teamId, createdAt: now,
  }
  const emp2 = {
    userId: uuid(), name: 'Nour Salem', email: 'nour@demo.com',
    password: hash, role: 'EMPLOYEE', teamId: frontendTeam.teamId, createdAt: now,
  }
  const emp3 = {
    userId: uuid(), name: 'Omar Khaled', email: 'omar@demo.com',
    password: hash, role: 'EMPLOYEE', teamId: backendTeam.teamId, createdAt: now,
  }
  await put(T.USERS, manager)
  await put(T.USERS, emp1)
  await put(T.USERS, emp2)
  await put(T.USERS, emp3)
  console.log('✅ Users seeded')

  // Projects
  const project = {
    projectId: uuid(), name: 'FlowBoard v2', description: 'Main product redesign',
    createdBy: manager.userId, createdAt: now, taskCount: 0,
  }
  await put(T.PROJECTS, project)
  console.log('✅ Projects seeded')

  // Tasks
  const tasks = [
    { title: 'Design new dashboard layout',   priority: 'HIGH',     status: 'IN_PROGRESS', teamId: frontendTeam.teamId, teamName: 'Frontend', assigneeId: emp1.userId, assigneeName: emp1.name, projectId: project.projectId },
    { title: 'Implement drag-and-drop board', priority: 'HIGH',     status: 'TODO',        teamId: frontendTeam.teamId, teamName: 'Frontend', assigneeId: emp1.userId, assigneeName: emp1.name },
    { title: 'Build REST API for tasks',      priority: 'CRITICAL', status: 'IN_REVIEW',   teamId: backendTeam.teamId,  teamName: 'Backend',  assigneeId: emp3.userId, assigneeName: emp3.name },
    { title: 'Set up DynamoDB tables',        priority: 'HIGH',     status: 'DONE',        teamId: backendTeam.teamId,  teamName: 'Backend',  assigneeId: emp3.userId, assigneeName: emp3.name },
    { title: 'Write unit tests for auth',     priority: 'MEDIUM',   status: 'TODO',        teamId: qaTeam.teamId,       teamName: 'QA' },
    { title: 'Mobile responsive fixes',       priority: 'MEDIUM',   status: 'TODO',        teamId: frontendTeam.teamId, teamName: 'Frontend', assigneeId: emp2.userId, assigneeName: emp2.name },
    { title: 'S3 image upload integration',   priority: 'MEDIUM',   status: 'IN_PROGRESS', teamId: backendTeam.teamId,  teamName: 'Backend',  assigneeId: emp3.userId, assigneeName: emp3.name, projectId: project.projectId },
    { title: 'Fix deadline overdue styling',  priority: 'LOW',      status: 'DONE',        teamId: frontendTeam.teamId, teamName: 'Frontend', assigneeId: emp2.userId, assigneeName: emp2.name, deadline: '2024-12-01' },
  ]

  for (const t of tasks) {
    await put(T.TASKS, {
      taskId:       uuid(),
      description:  `This is the description for: ${t.title}. More details can be added here.`,
      commentCount: 0,
      createdBy:    manager.userId,
      createdAt:    now,
      updatedAt:    now,
      ...t,
    })
  }
  console.log('✅ Tasks seeded')

  console.log(`
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Demo credentials (password for all: Password1!)
  Manager : manager@demo.com
  Employee: ali@demo.com  (Frontend team)
  Employee: omar@demo.com (Backend team)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  `)
}

main().catch(console.error)
