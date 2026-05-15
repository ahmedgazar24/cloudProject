/**
 * Lambda: image-resizer
 * Trigger: S3 ObjectCreated on mj-task-images bucket
 * Action : Creates a 300px-wide thumbnail in mj-task-images-resized
 *
 * Dependencies (Lambda layer): sharp
 */
const { S3Client, GetObjectCommand, PutObjectCommand } = require('@aws-sdk/client-s3')
const sharp = require('sharp')

const s3            = new S3Client({})
const RESIZED_BUCKET = process.env.S3_BUCKET_RESIZED ?? 'mj-task-images-resized'
const MAX_WIDTH      = 300

exports.handler = async (event) => {
  const records = event.Records ?? []

  for (const record of records) {
    const srcBucket = record.s3.bucket.name
    const srcKey    = decodeURIComponent(record.s3.object.key.replace(/\+/g, ' '))

    console.log(`Processing: s3://${srcBucket}/${srcKey}`)

    try {
      // Fetch original
      const getCmd = new GetObjectCommand({ Bucket: srcBucket, Key: srcKey })
      const orig   = await s3.send(getCmd)

      // Stream to buffer
      const chunks = []
      for await (const chunk of orig.Body) chunks.push(chunk)
      const buffer = Buffer.concat(chunks)

      // Resize with sharp
      const resized = await sharp(buffer)
        .resize({ width: MAX_WIDTH, withoutEnlargement: true })
        .jpeg({ quality: 80 })
        .toBuffer()

      // Upload thumbnail
      const destKey = srcKey  // same key, different bucket
      await s3.send(new PutObjectCommand({
        Bucket:      RESIZED_BUCKET,
        Key:         destKey,
        Body:        resized,
        ContentType: 'image/jpeg',
      }))

      console.log(`Resized → s3://${RESIZED_BUCKET}/${destKey}`)
    } catch (err) {
      console.error(`Failed to resize ${srcKey}:`, err)
      // Don't throw — let the rest of the batch proceed
    }
  }
}
