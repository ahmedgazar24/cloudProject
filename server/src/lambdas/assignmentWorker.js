/**
 * Lambda: assignment-worker
 * Trigger: SQS queue subscribed to the task-assignment SNS topic
 * Action : Writes an activity log entry and publishes a CloudWatch metric
 */
const { CloudWatchClient, PutMetricDataCommand } = require('@aws-sdk/client-cloudwatch')
const { db, T, PutCommand } = require('../lib/dynamo')

const cloudwatch = new CloudWatchClient({ region: process.env.AWS_REGION ?? 'us-east-1' })
const ACTIVITY_TABLE = process.env.TABLE_ACTIVITY ?? T.AUDIT
const CW_NAMESPACE = process.env.CW_NAMESPACE ?? 'FlowBoard'

function parsePayload(recordBody) {
  const body = JSON.parse(recordBody)

  if (body.Type === 'Notification' && body.Message) {
    return JSON.parse(body.Message)
  }

  if (typeof body.Message === 'string') {
    return JSON.parse(body.Message)
  }

  return body
}

function buildActivityLog(payload, messageId) {
  const createdAt = payload.timestamp ?? new Date().toISOString()

  return {
    logId: messageId ? `assignment-${messageId}` : `assignment-${Date.now()}`,
    taskId: payload.taskId,
    eventType: payload.eventType ?? payload.action ?? 'TASK_ASSIGNED',
    taskTitle: payload.taskTitle ?? payload.title,
    assigneeId: payload.assigneeId,
    assigneeName: payload.assigneeName,
    assigneeEmail: payload.assigneeEmail,
    teamId: payload.teamId,
    managerName: payload.managerName,
    message: `${payload.managerName ?? 'Manager'} assigned "${payload.taskTitle ?? payload.title ?? 'a task'}" to ${payload.assigneeName ?? payload.assigneeEmail ?? 'an employee'}`,
    createdAt,
  }
}

async function writeActivityLog(activityLog) {
  await db.send(new PutCommand({
    TableName: ACTIVITY_TABLE,
    Item: activityLog,
  }))
}

async function publishMetric(payload) {
  await cloudwatch.send(new PutMetricDataCommand({
    Namespace: CW_NAMESPACE,
    MetricData: [{
      MetricName: 'TasksAssignedPerTeam',
      Value: 1,
      Unit: 'Count',
      Dimensions: [{
        Name: 'TeamId',
        Value: payload.teamId ?? 'none',
      }],
      Timestamp: new Date(),
    }],
  }))
}

exports.handler = async (event) => {
  console.log('EVENT RECEIVED:', JSON.stringify(event, null, 2))

  const batchItemFailures = []

  for (const record of event.Records ?? []) {
    try {
      const payload = parsePayload(record.body)
      console.log('Parsed Payload:', payload)

      const activityLog = buildActivityLog(payload, record.messageId)
      await writeActivityLog(activityLog)
      await publishMetric(payload)

      console.log(`Assignment processed for task ${payload.taskId}`)
    } catch (err) {
      console.error('ERROR PROCESSING MESSAGE:', err)

      if (record.messageId) {
        batchItemFailures.push({ itemIdentifier: record.messageId })
      }
    }
  }

  return { batchItemFailures }
}

module.exports._internals = {
  parsePayload,
  buildActivityLog,
}
