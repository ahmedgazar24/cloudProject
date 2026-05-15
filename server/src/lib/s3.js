const { S3Client, DeleteObjectCommand, GetObjectCommand } = require('@aws-sdk/client-s3')
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner')
const multer  = require('multer')
const multerS3 = require('multer-s3')
const { v4: uuid } = require('uuid')

const s3 = new S3Client({ region: process.env.AWS_REGION ?? 'us-east-1' })

const BUCKET_ORIGINALS = process.env.S3_BUCKET_ORIGINALS ?? 'mj-task-images'
const BUCKET_RESIZED   = process.env.S3_BUCKET_RESIZED   ?? 'mj-task-images-resized'

// Multer-S3 upload middleware
const upload = multer({
  storage: multerS3({
    s3,
    bucket: BUCKET_ORIGINALS,
    contentType: multerS3.AUTO_CONTENT_TYPE,
    key: (req, file, cb) => {
      const ext = file.originalname.split('.').pop()
      cb(null, `tasks/${uuid()}.${ext}`)
    },
  }),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith('image/')) {
      return cb(new Error('Only image files are allowed'), false)
    }
    cb(null, true)
  },
})

async function deleteS3Object(key, bucket = BUCKET_ORIGINALS) {
  if (!key) return
  try {
    await s3.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }))
  } catch (e) {
    console.warn('S3 delete failed:', e.message)
  }
}

// Build public/CDN URL for an S3 key
function getImageUrl(key, bucket = BUCKET_ORIGINALS) {
  if (!key) return null
  if (process.env.CLOUDFRONT_DOMAIN) {
    return `https://${process.env.CLOUDFRONT_DOMAIN}/${key}`
  }
  return `https://${bucket}.s3.${process.env.AWS_REGION ?? 'us-east-1'}.amazonaws.com/${key}`
}

module.exports = { s3, upload, deleteS3Object, getImageUrl, BUCKET_ORIGINALS, BUCKET_RESIZED }
