const { SNSClient, PublishCommand }    = require('@aws-sdk/client-sns')
const { SQSClient, SendMessageCommand } = require('@aws-sdk/client-sqs')
const { CloudWatchClient, PutMetricDataCommand } = require('@aws-sdk/client-cloudwatch')

const sns = new SNSClient({ region: process.env.AWS_REGION ?? 'us-east-1' })
const sqs = new SQSClient({ region: process.env.AWS_REGION ?? 'us-east-1' })
const cw  = new CloudWatchClient({ region: process.env.AWS_REGION ?? 'us-east-1' })

const TOPIC_ARN = process.env.SNS_TOPIC_TASK_ASSIGNMENT
const QUEUE_URL = process.env.SQS_QUEUE_ASSIGNMENT_WORKER

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

  try {
    await sns.send(new PublishCommand({
      TopicArn: TOPIC_ARN,
      Message:  message,
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
