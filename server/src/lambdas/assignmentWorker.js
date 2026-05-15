/**
 * Lambda: assignment-worker
 * Trigger: SQS queue (mj-assignment-queue) — messages published via SNS fan-out
 * Action : Sends assignment notification email via SES
 */
const { SESClient, SendEmailCommand } = require('@aws-sdk/client-ses')

const ses        = new SESClient({ region: process.env.AWS_REGION ?? 'us-east-1' })
const FROM_EMAIL = process.env.SES_FROM_EMAIL ?? 'noreply@flowboard.app'

exports.handler = async (event) => {
  for (const record of event.Records) {
    let payload
    try {
      // SNS wraps the message inside SQS body
      const sqsBody = JSON.parse(record.body)
      payload       = JSON.parse(sqsBody.Message ?? record.body)
    } catch {
      console.error('Failed to parse SQS message:', record.body)
      continue
    }

    const { taskTitle, assigneeName, assigneeEmail, managerName, taskId } = payload

    if (!assigneeEmail) {
      console.warn('No assignee email, skipping SES send for task', taskId)
      continue
    }

    const appUrl  = process.env.APP_URL ?? 'https://flowboard.app'
    const taskUrl = `${appUrl}/tasks?task=${taskId}`

    const html = `
      <div style="font-family:sans-serif;max-width:520px;margin:0 auto">
        <h2 style="color:#3558f7">You have a new task!</h2>
        <p>Hi ${assigneeName},</p>
        <p><strong>${managerName}</strong> has assigned you a task on FlowBoard:</p>
        <div style="background:#f0f4ff;border-left:4px solid #3558f7;padding:16px 20px;border-radius:8px;margin:20px 0">
          <strong style="font-size:16px">${taskTitle}</strong>
        </div>
        <a href="${taskUrl}" style="display:inline-block;background:#3558f7;color:white;padding:10px 24px;border-radius:8px;text-decoration:none;font-weight:600">
          View Task →
        </a>
        <p style="color:#999;font-size:12px;margin-top:32px">FlowBoard · Team Task Management</p>
      </div>
    `

    try {
      await ses.send(new SendEmailCommand({
        Source: FROM_EMAIL,
        Destination: { ToAddresses: [assigneeEmail] },
        Message: {
          Subject: { Data: `[FlowBoard] New task assigned: ${taskTitle}`, Charset: 'UTF-8' },
          Body: {
            Html: { Data: html, Charset: 'UTF-8' },
            Text: { Data: `Hi ${assigneeName}, you've been assigned: "${taskTitle}". View it at ${taskUrl}`, Charset: 'UTF-8' },
          },
        },
      }))
      console.log(`Email sent to ${assigneeEmail} for task ${taskId}`)
    } catch (err) {
      console.error(`SES send failed for ${assigneeEmail}:`, err.message)
    }
  }
}
