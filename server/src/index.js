require('dotenv').config()
const express  = require('express')
const cors     = require('cors')
const helmet   = require('helmet')
const morgan   = require('morgan')
const path     = require('path')

const authRoutes     = require('./routes/auth')
const taskRoutes     = require('./routes/tasks')
const projectRoutes  = require('./routes/projects')
const teamRoutes     = require('./routes/teams')
const userRoutes     = require('./routes/users')
const { authenticate } = require('./middleware/auth')

const app = express()

// Security & logging
app.use(helmet({ contentSecurityPolicy: false }))
app.use(cors({ origin: process.env.CLIENT_ORIGIN ?? '*', credentials: true }))
app.use(morgan('dev'))
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// Public routes
app.use('/api/auth', authRoutes)

// Protected routes
app.use('/api/tasks',    authenticate, taskRoutes)
app.use('/api/projects', authenticate, projectRoutes)
app.use('/api/teams',    authenticate, teamRoutes)
app.use('/api/users',    authenticate, userRoutes)

// Health check
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});


// Serve React build in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../public')))
  app.get('*', (_, res) => res.sendFile(path.join(__dirname, '../public/index.html')))
}

// Error handler
app.use((err, req, res, next) => {
  console.error(err)
  res.status(err.status ?? 500).json({ message: err.message ?? 'Internal server error' })
})

const PORT = process.env.PORT ?? 5001
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`))

module.exports = app
