const jwt        = require('jsonwebtoken')
const jwksClient = require('jwks-rsa')

const COGNITO_REGION  = process.env.AWS_REGION     ?? 'us-east-1'
const USER_POOL_ID    = process.env.COGNITO_USER_POOL_ID
const CLIENT_ID       = process.env.COGNITO_CLIENT_ID
const JWT_SECRET      = process.env.JWT_SECRET ?? 'dev-secret-change-in-prod'

// JWKS client for Cognito token verification (prod)
let jwks
if (USER_POOL_ID) {
  jwks = jwksClient({
    jwksUri: `https://cognito-idp.${COGNITO_REGION}.amazonaws.com/${USER_POOL_ID}/.well-known/jwks.json`,
    cache: true,
    rateLimit: true,
  })
}

function getKey(header, callback) {
  jwks.getSigningKey(header.kid, (err, key) => {
    if (err) return callback(err)
    callback(null, key.getPublicKey())
  })
}

/**
 * authenticate middleware
 * In development (no Cognito configured): verifies local HS256 JWT.
 * In production: verifies Cognito RS256 token from Authorization header.
 */
function authenticate(req, res, next) {
  const header = req.headers['authorization']
  if (!header?.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Missing token' })
  }
  const token = header.slice(7)

  if (!USER_POOL_ID) {
    // Dev mode: local JWT
    try {
      const payload = jwt.verify(token, JWT_SECRET)
      req.user = payload
      return next()
    } catch (e) {
      return res.status(401).json({ message: 'Invalid token' })
    }
  }

  // Prod mode: Cognito JWT
  jwt.verify(token, getKey, { algorithms: ['RS256'] }, (err, decoded) => {
    if (err) return res.status(401).json({ message: 'Invalid token' })
    req.user = {
      userId: decoded.sub,
      email:  decoded.email,
      name:   decoded.name ?? decoded['cognito:username'],
      role:   decoded['custom:role']   ?? 'EMPLOYEE',
      teamId: decoded['custom:teamId'] ?? null,
    }
    next()
  })
}

/**
 * requireRole middleware factory
 */
function requireRole(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.user?.role)) {
      return res.status(403).json({ message: 'Forbidden' })
    }
    next()
  }
}

module.exports = { authenticate, requireRole, JWT_SECRET }
