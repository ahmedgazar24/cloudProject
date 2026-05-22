const { DynamoDBClient, ScanCommand } = require('@aws-sdk/client-dynamodb')
const { DynamoDBDocumentClient } = require('@aws-sdk/lib-dynamodb')
const { SNSClient, PublishCommand } = require('@aws-sdk/client-sns')
const { getDynamoClientConfig } = require('../lib/dynamoConfig')

const ddb = new DynamoDBClient(getDynamoClientConfig())
const db  = DynamoDBDocumentClient.from(ddb, {
  marshallOptions:   { removeUndefinedValues: true },
  unmarshallOptions: { wrapNumbers: false },
})
const sns = new SNSClient({ region: process.env.AWS_REGION ?? 'us-east-1' })

const TABLE_TASKS = process.env.TABLE_TASKS ?? 'mj-tasks'
const TOPIC_ARN   = process.env.SNS_TOPIC_DAILY_DIGEST
const APP_URL     = process.env.APP_URL ?? 'https://flowboard.app'

function getTodayDate() {
  const now = new Date()
  return now.toISOString().slice(0, 10)
}

function formatTaskList(tasks) {
  return tasks.map(t => `- ${t.title} (${t.status || 'TODO'})\n  ${APP_URL}/tasks?task=${t.taskId}`).join('\n')
}

exports.handler = async () => {
  if (!TOPIC_ARN) {
    console.warn('SNS_TOPIC_DAILY_DIGEST is not configured. Skipping daily digest.')
    return
  }

  const today = getTodayDate()
  console.log(`Running daily digest for ${today}`)

  const scan = new ScanCommand({
    TableName: TABLE_TASKS,
    FilterExpression: '#deadline = :today',
    ExpressionAttributeNames: { '#deadline': 'deadline' },
    ExpressionAttributeValues: { ':today': today },
  })

  const result = await db.send(scan)
  const tasks = result.Items ?? []
  if (!tasks.length) {
    console.log('No tasks due today.')
    return
  }

  const tasksByAssignee = tasks.reduce((acc, task) => {
    if (!task.assigneeEmail) return acc
    const email = task.assigneeEmail.toLowerCase()
    acc[email] ??= []
    acc[email].push(task)
    return acc
  }, {})

  for (const [assigneeEmail, assigneeTasks] of Object.entries(tasksByAssignee)) {
    const assigneeName = assigneeTasks[0].assigneeName || 'Team member'
    const subject = `Daily digest: ${assigneeTasks.length} task(s) due today`
    const bodyText = `Hi ${assigneeName},\n\nYou have ${assigneeTasks.length} task(s) due today (${today}):\n\n${formatTaskList(assigneeTasks)}\n\nPlease check FlowBoard for details.`
    const bodyHtml = `
      <div style="font-family:Arial,sans-serif;max-width:640px;margin:0 auto;padding:24px">
        <h2 style="color:#1a202c">Daily digest for ${today}</h2>
        <p>Hi ${assigneeName},</p>
        <p>You have <strong>${assigneeTasks.length}</strong> task(s) due today:</p>
        <ul style="padding-left:18px">
          ${assigneeTasks.map(task => `<li><strong>${task.title}</strong> (${task.status || 'TODO'})<br/><a href="${APP_URL}/tasks?task=${task.taskId}">View task</a></li>`).join('')}
        </ul>
        <p>Open FlowBoard to review the details and update progress.</p>
      </div>
    `

    try {
      await sns.send(new PublishCommand({
        TopicArn: TOPIC_ARN,
        Subject: subject,
        Message: bodyText,
        MessageAttributes: {
          'recipient': {
            DataType: 'String',
            StringValue: assigneeEmail,
          },
        },
      }))
      console.log(`Published daily digest for ${assigneeEmail}`)
    } catch (err) {
      console.error(`Failed to publish daily digest for ${assigneeEmail}:`, err.message)
    }
  }
}
