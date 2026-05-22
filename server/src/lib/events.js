const { SNSClient, PublishCommand }    = require('@aws-sdk/client-sns')
const { SQSClient, SendMessageCommand } = require('@aws-sdk/client-sqs')
const { CloudWatchClient, PutMetricDataCommand } = require('@aws-sdk/client-cloudwatch')

const sns = new SNSClient({ region: process.env.AWS_REGION ?? 'us-east-1' })
const sqs = new SQSClient({ region: process.env.AWS_REGION ?? 'us-east-1' })
const cw  = new CloudWatchClient({ region: process.env.AWS_REGION ?? 'us-east-1' })

const TOPIC_ARN = process.env.SNS_TOPIC_TASK_ASSIGNMENT
const QUEUE_URL = process.env.SQS_QUEUE_ASSIGNMENT_WORKER

function buildAssignmentEmail({ task, assigneeName, managerName }) {
  const appUrl = process.env.APP_URL ?? 'https://flowboard.app'
  const taskUrl = `${appUrl}/tasks?task=${task.taskId}`
  const deadline = task.deadline ? `\nDeadline: ${task.deadline}` : ''
  const priority = task.priority ? `\nPriority: ${task.priority}` : ''
  const team = task.teamName || task.teamId ? `\nTeam: ${task.teamName ?? task.teamId}` : ''

  return [
    `Hi ${assigneeName ?? 'there'},`,
    '',
    `${managerName ?? 'Your manager'} assigned you a new task in FlowBoard.`,
    '',
    `Task: ${task.title}`,
    `${priority}${deadline}${team}`.trim(),
    '',
    `Open task: ${taskUrl}`,
    '',
    'FlowBoard - Team Task Management',
  ].filter(Boolean).join('\n')
}

/**
 * Publish task-assignment event to SNS (fans out to email + SQS worker).
 * Called whenever a manager assigns/creates a task.
 */
async function publishTaskAssigned({ task, assigneeName, assigneeEmail, managerName }) {
  if (!TOPIC_ARN) return   // skip if not configured

  const message = JSON.stringify({
    eventType:  'TASK_ASSIGNED',
    taskId:     task.taskId,
    taskTitle:  task.title,
    assigneeId: task.assigneeId,
    assigneeName,
    assigneeEmail,
    teamId:     task.teamId,
    managerName,
    timestamp:  new Date().toISOString(),
  })
  const emailMessage = buildAssignmentEmail({ task, assigneeName, managerName })

  try {
    await sns.send(new PublishCommand({
      TopicArn: TOPIC_ARN,
      Message: JSON.stringify({
        default: message,
        sqs: message,
        email: emailMessage,
      }),
      MessageStructure: 'json',
      Subject:  `[FlowBoard] You've been assigned: ${task.title}`,
    }))
  } catch (e) {
    console.warn('SNS publish failed:', e.message)
  }
}

/**
 * Publish a custom CloudWatch metric.
 */
async function putMetric(metricName, value, dimensions = [], unit = 'Count') {
  try {
    await cw.send(new PutMetricDataCommand({
      Namespace:  process.env.CW_NAMESPACE ?? 'FlowBoard',
      MetricData: [{
        MetricName: metricName,
        Value:      value,
        Unit:       unit,
        Dimensions: dimensions,
        Timestamp:  new Date(),
      }],
    }))
  } catch (e) {
    console.warn('CloudWatch metric failed:', e.message)
  }
}

module.exports = { publishTaskAssigned, putMetric }
