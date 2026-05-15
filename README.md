# FlowBoard — Team Task Management

A full-stack task management web app (mini-Jira) built with **React**, **Node.js/Express**, and **AWS** (DynamoDB, S3, Cognito, SNS, SQS, Lambda, CloudWatch).

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                    Browser (React)                       │
│  Dashboard · Kanban Board · Task Form · Analytics       │
└────────────────────┬────────────────────────────────────┘
                     │ HTTPS / REST
┌────────────────────▼────────────────────────────────────┐
│              Express API  (Node.js)                      │
│  /api/auth  /api/tasks  /api/teams  /api/projects       │
│  JWT (dev) or Cognito JWT (prod) auth                    │
└──┬───────────┬──────────────┬───────────────────────────┘
   │           │              │
   ▼           ▼              ▼
DynamoDB      S3            SNS Topic
(6 tables)  (images)    (task assignments)
                              │
                    ┌─────────┴──────────┐
                    ▼                    ▼
               SES Email           SQS Queue
             (Lambda worker)    (assignment-worker Lambda)
                                         │
                                   S3 ObjectCreated
                                         ▼
                                  image-resizer Lambda
```

---

## Project Structure

```
mini-jira/
├── client/                    # React frontend (Vite)
│   └── src/
│       ├── components/
│       │   ├── kanban/        # KanbanBoard, KanbanColumn, TaskCard
│       │   ├── tasks/         # TaskForm, TaskDetail (with comments)
│       │   ├── layout/        # Sidebar, Header, AppShell
│       │   └── ui/            # Avatar, Badge, Modal, Select, Spinner, EmptyState
│       ├── context/           # AuthContext (JWT + Cognito)
│       ├── lib/               # api.js (Axios), utils.js
│       └── pages/             # Dashboard, Tasks, Projects, Teams, Analytics, Login, Register
│
├── server/                    # Express backend
│   ├── src/
│   │   ├── index.js           # Entry point
│   │   ├── lib/
│   │   │   ├── dynamo.js      # DynamoDB client
│   │   │   ├── s3.js          # S3 client + multer-s3 upload
│   │   │   └── events.js      # SNS publish, CloudWatch metrics
│   │   ├── middleware/
│   │   │   └── auth.js        # JWT / Cognito verify, requireRole
│   │   ├── routes/
│   │   │   ├── auth.js        # POST /auth/register, /auth/login
│   │   │   ├── tasks.js       # Full CRUD + comments + audit
│   │   │   ├── teams.js       # Team management
│   │   │   ├── projects.js    # Project management
│   │   │   └── users.js       # User listing (with team isolation)
│   │   └── lambdas/
│   │       ├── imageResizer.js     # S3 trigger → sharp resize → resized bucket
│   │       └── assignmentWorker.js # SQS trigger → SES email notification
│   └── scripts/
│       ├── createTables.js    # One-time DynamoDB table setup
│       └── seed.js            # Demo data seeder
│
└── .env.example               # Environment variable template
```

---

## Quick Start (Local Development)

### Prerequisites
- Node.js 18+
- AWS account with credentials configured (or DynamoDB Local)
- An S3 bucket created (or skip image uploads in dev)

### 1. Install dependencies

```bash
cd mini-jira
npm install          # root (concurrently)
cd client && npm install
cd ../server && npm install
```

### 2. Configure environment

```bash
cp .env.example server/.env
# Edit server/.env — at minimum set JWT_SECRET and AWS credentials
```

### 3. Create DynamoDB tables

```bash
cd server
node scripts/createTables.js

# For DynamoDB Local:
# DYNAMODB_ENDPOINT=http://localhost:8000 node scripts/createTables.js
```

### 4. Seed demo data (optional)

```bash
node scripts/seed.js
# Creates demo users, teams, projects, and tasks
# Login: manager@demo.com / Password1!
```

### 5. Start dev servers

```bash
# From the root:
npm run dev
# Client → http://localhost:3000
# Server → http://localhost:5000
```

---

## AWS Infrastructure Setup

### DynamoDB Tables
Run `node scripts/createTables.js` — creates 6 tables with GSIs:
- `mj-users` (GSI: email-index, teamId-index)
- `mj-teams`
- `mj-projects`
- `mj-tasks` (GSI: teamId-index with status sort key)
- `mj-comments` (GSI: taskId-index)
- `mj-audit` (GSI: taskId-index)

All tables use **PAY_PER_REQUEST** billing.

### S3 Buckets
Create two buckets:
- `mj-task-images` — original uploads (private, CORS enabled)
- `mj-task-images-resized` — Lambda-generated thumbnails

CORS configuration for originals bucket:
```json
[{"AllowedHeaders":["*"],"AllowedMethods":["GET","PUT","POST"],"AllowedOrigins":["*"],"ExposeHeaders":[]}]
```

### Lambda Functions (deploy separately)

| Function | Trigger | Handler file |
|---|---|---|
| `mj-image-resizer` | S3 ObjectCreated on `mj-task-images` | `lambdas/imageResizer.js` |
| `mj-assignment-worker` | SQS `mj-assignment-queue` | `lambdas/assignmentWorker.js` |

Deploy with SAM, CDK, or Serverless Framework. The `imageResizer` requires a **sharp** Lambda layer.

### SNS + SQS
- Create SNS topic: `mj-task-assignments`
- Create SQS queue: `mj-assignment-queue`
- Subscribe SQS to SNS (with raw message delivery OFF — Lambda parses the SNS envelope)
- Subscribe an SES email endpoint to SNS (optional, for direct email fan-out)

### Cognito (Production Auth)
1. Create User Pool with custom attributes: `custom:role`, `custom:teamId`
2. Set `COGNITO_USER_POOL_ID` and `COGNITO_CLIENT_ID` in `.env`
3. The server will automatically switch from local JWT to Cognito RS256 verification

### CloudFront (Optional)
Point CloudFront at the S3 originals and resized buckets. Set `CLOUDFRONT_DOMAIN` in `.env` for fast image delivery.

---

## Role-Based Access Control

| Feature | Employee | Manager | Admin |
|---|:---:|:---:|:---:|
| View own team's tasks | ✅ | ✅ | ✅ |
| View all teams' tasks | ❌ | ✅ | ✅ |
| Create / edit / delete tasks | ❌ | ✅ | ✅ |
| Update task status | ✅ | ✅ | ✅ |
| Add comments | ✅ | ✅ | ✅ |
| Manage teams | ❌ | ✅ | ✅ |
| Manage projects | ❌ | ✅ | ✅ |
| View analytics | ❌ | ✅ | ✅ |

Team isolation is enforced **server-side** in every route — employees can only access their own team's data regardless of what the client sends.

---

## API Reference

### Auth
| Method | Path | Body |
|---|---|---|
| POST | `/api/auth/register` | `{ name, email, password, role, teamId }` |
| POST | `/api/auth/login` | `{ email, password }` → returns `{ user: { ...fields, token } }` |

### Tasks
| Method | Path | Auth |
|---|---|---|
| GET | `/api/tasks` | All roles |
| GET | `/api/tasks/:id` | All roles |
| POST | `/api/tasks` | Manager |
| PATCH | `/api/tasks/:id` | Manager (full) / Employee (status only) |
| DELETE | `/api/tasks/:id` | Manager |
| GET | `/api/tasks/:id/comments` | All roles |
| POST | `/api/tasks/:id/comments` | All roles |
| GET | `/api/tasks/:id/audit` | All roles |

### Teams, Projects, Users
Standard CRUD — see route files for details.

---

## Event-Driven Flows (AWS)

### Task Assignment Flow
```
Manager creates/updates task with assignee
  → Express publishes to SNS topic
    → SQS queue receives message
      → Lambda (assignmentWorker) sends SES email to assignee
```

### Image Processing Flow
```
Manager uploads task image
  → multer-s3 uploads to S3 originals bucket
    → S3 triggers Lambda (imageResizer)
      → Lambda resizes to 300px wide
        → Saves thumbnail to S3 resized bucket
```

Both flows are **fire-and-forget** from the web server — failures in Lambda don't affect API responses.
