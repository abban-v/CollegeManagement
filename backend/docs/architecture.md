# Slashforge Backend Architecture

## System Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    Frontend (Team)                          │
│               React/Next.js Client @ :3001                  │
└──────────────────────┬──────────────────────────────────────┘
                       │ HTTPS/JSON
                       │ /api/v1/*
                       ▼
┌──────────────────────────────────────────────────────────────┐
│              Next.js Backend (Monolith) @ :3000             │
│                                                              │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ API Layer (app/api/v1/)                             │   │
│  │ • Request/response handling                         │   │
│  │ • Input validation (Zod)                            │   │
│  │ • Status codes and error handling                   │   │
│  │ • Calls business logic services                     │   │
│  └─────────────────────────────────────────────────────┘   │
│                       ▼                                      │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ Service Layer (modules/)                            │   │
│  │ • IssueService: lifecycle, transitions              │   │
│  │ • CommentService: comment management                │   │
│  │ • NotificationService: notifications                │   │
│  │ • ModerationService: moderation workflow            │   │
│  │ • AIService: AI orchestration                       │   │
│  │ • Business logic & state machines                   │   │
│  │ • Database transactions                             │   │
│  └─────────────────────────────────────────────────────┘   │
│                       ▼                                      │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ Library Layer (lib/)                                │   │
│  │ • Authentication & RBAC                             │   │
│  │ • Database client (Prisma)                          │   │
│  │ • Validation schemas (Zod)                          │   │
│  │ • Storage client (S3)                               │   │
│  │ • API utilities                                     │   │
│  │ • Middleware                                        │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                              │
└──────────────────────┬──────────────────────────────────────┘
                       │
        ┌──────────────┼──────────────┐
        ▼              ▼              ▼
   ┌─────────┐   ┌──────────┐   ┌──────────┐
   │PostgreSQL   │pgvector  │   │S3 Storage│
   │(Prisma)     │(Embeddings)  │(Evidence)│
   │             │          │   │          │
   └─────────┘   └──────────┘   └──────────┘
```

## Technology Stack

### Backend Framework
- **Next.js 16** with App Router
- **TypeScript** for type safety
- **Node.js** 22+ runtime

### Database
- **PostgreSQL 16** via Docker
- **Prisma** ORM for database access
- **pgvector** for vector search (future)

### Authentication & Authorization
- **Session-backed authentication**
- Opaque HTTP-only cookies backed by session rows in PostgreSQL
- **Role-Based Access Control (RBAC)**
  - STUDENT: Report issues, comment, follow
  - OFFICIAL: Update status, resolve issues
  - MODERATOR: Moderation actions
  - ADMIN: Full system access

### Validation
- **Zod** for runtime schema validation
- Request/response validation at API boundaries
- AI output validation before business logic

### AI Integration
- **Gemini 2.5 Flash** for classification, priority, reasoning
- **Gemini 2.5 Flash-Lite** for simple tasks (moderation)
- **Provider abstraction layer** (modules/ai/gateway.ts)
- Structured output with Zod validation

### Storage
- **S3-compatible object storage** for evidence images
- Metadata stored in PostgreSQL
- Signed URLs for secure access

### Infrastructure (Development)
- **Docker Compose** for PostgreSQL + pgvector
- **.env.local** for development configuration
- **Hot reload** via Next.js dev server

## Directory Structure

```
slashforge/
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   └── v1/
│   │   │       ├── issues/          # Issue CRUD
│   │   │       ├── comments/        # Comments (future)
│   │   │       ├── admin/           # Admin endpoints (future)
│   │   │       └── moderation/      # Moderation (future)
│   │   └── page.tsx               # Root endpoint
│   │
│   ├── modules/                    # Business logic services
│   │   ├── issues/
│   │   │   ├── service.ts         # Issue lifecycle
│   │   │   ├── types.ts           # Issue types
│   │   │   └── validation.ts      # Issue schemas
│   │   ├── comments/              # (future)
│   │   ├── moderation/            # (future)
│   │   ├── ai/                    # (future)
│   │   │   ├── gateway.ts
│   │   │   ├── classifier.ts
│   │   │   ├── prioritizer.ts
│   │   │   ├── duplicate-detector.ts
│   │   │   └── moderator.ts
│   │   └── notifications/         # (future)
│   │
│   ├── lib/
│   │   ├── auth.ts               # Auth utilities
│   │   ├── db.ts                 # Prisma client
│   │   ├── api.ts                # Response helpers
│   │   ├── storage.ts            # S3 client (future)
│   │   ├── middleware/
│   │   │   ├── auth.ts           # Auth middleware
│   │   │   └── rbac.ts           # RBAC middleware
│   │   └── validation/
│   │       ├── issue.ts          # Issue schemas
│   │       ├── user.ts           # User schemas
│   │       └── common.ts         # Common schemas
│   │
│   └── types/
│       ├── auth.ts               # Auth types
│       └── common.ts             # Common types
│
├── prisma/
│   ├── schema.prisma             # Data model
│   └── migrations/               # Auto-generated
│
├── docs/
│   ├── architecture.md           # This file
│   ├── api.md                   # API documentation
│   ├── database.md              # Schema explanation (future)
│   ├── ai.md                    # AI strategy (future)
│   ├── learning-log.md          # Learning guide (future)
│   └── decisions.md             # ADRs (future)
│
├── tests/
│   ├── unit/                     # Unit tests
│   ├── integration/              # Integration tests
│   └── fixtures/                 # Test data
│
├── docker-compose.yml            # PostgreSQL + pgvector
├── .env.example                  # Example env vars
├── .env.local                    # Dev env vars (git ignored)
├── tsconfig.json                 # TypeScript config
├── next.config.js               # Next.js config
└── package.json                 # Dependencies
```

## Data Model

### Core Entities

**User**
- id, email, name, role, timestamps
- Roles: STUDENT, OFFICIAL, MODERATOR, ADMIN

**Issue**
- Reported by User
- Lifecycle: REPORTED → UNDER_REVIEW → IN_PROGRESS → RESOLUTION_SUBMITTED → VERIFIED → CLOSED
- Can be REOPENED or DISPUTED
- Has AI analysis, embedding, comments, followers
- Moderation status: NORMAL, FLAGGED, UNDER_REVIEW, APPROVED, DUPLICATE, REMOVED

**IssueStatusHistory**
- Audit trail of status changes
- Records: from status, to status, reason, timestamp

**Comment**
- Belongs to Issue
- Written by User
- Allows community input

**IssueResolution**
- Created by Official/Admin
- Contains description and evidence
- Links to ResolutionEvidence for images

**IssueReport**
- User reports issue for: SPAM, DUPLICATE, INAPPROPRIATE, MISLEADING, OTHER
- Moderation queue

**AIAnalysis**
- Classification: category, department
- Priority: AI + deterministic logic
- Moderation signals: spam score, toxicity score, flags
- Duplicate candidates

**IssueEmbedding**
- Vector representation for similarity search
- Used in duplicate detection

See [database.md](database.md) for detailed schema.

## Request/Response Flow

### Example: Create Issue

```
1. POST /api/v1/issues
   {
     "title": "WiFi down",
     "description": "...",
     "category": "NETWORK"
   }

2. API Route Handler (app/api/v1/issues/route.ts)
   - Parse JSON
   - Validate with Zod (CreateIssueSchema)
   - Call IssueService.createIssue()

3. IssueService
   - Start transaction
   - Create Issue record
   - Create IssueStatusHistory (REPORTED → REPORTED)
   - Create AuditLog (CREATE action)
   - Commit transaction

4. Return Response
   {
     "data": { issue object },
     "error": null,
     "status": 201
   }

Future: AI classification will be triggered here (async)
```

## State Machine: Issue Lifecycle

```
                    REPORTED
                       │
          ┌────────────┼────────────┐
          ▼            ▼            ▼
    UNDER_REVIEW   (CLOSED)    (DUPLICATE)
          │
          ├─────────────┐
          ▼             ▼
   IN_PROGRESS     (CLOSED)
          │
          ▼
RESOLUTION_SUBMITTED
          │
       ┌──┴──┐
       ▼     ▼
   VERIFIED DISPUTED
       │        │
       ▼        └──┐
    CLOSED         │
   (CLOSED) ◄──────┤
                   ▼
               REOPENED
                   │
            ┌──────┴──────┐
            ▼             ▼
       IN_PROGRESS    CLOSED
```

**Why a state machine?**
- Prevents invalid transitions (e.g., CLOSED → UNDER_REVIEW)
- Self-documents the lifecycle
- Makes testing easier
- Prevents bugs from concurrent requests

## Authentication & Authorization

### Authentication
- Who are you?
- Implemented with opaque session cookies
- Session rows stored in PostgreSQL
- Server-side session validation on every protected request

### Authorization
- What can you do?
- Server-side permission checks
- Never trust client-provided role/permissions
- RBAC on every sensitive endpoint

### Common Request Flow
1. Browser sends the `slashforge_session` cookie
2. The API route hashes the token and looks up the session row
3. The session lookup resolves the current user and role
4. The route checks role and ownership before calling the service layer
5. The service layer performs the business mutation

### Example: Update Issue Status
```typescript
// 1. Authenticate: Is the request from a real user?
const user = await getSession(request);
if (!user) return 401 Unauthorized;

// 2. Authorize: Does this user have permission?
if (user.role !== "OFFICIAL" && user.role !== "ADMIN") {
  return 403 Forbidden;
}

// 3. Ownership: Can they modify this specific issue?
const issue = await issueService.getIssueById(id);
if (issue.reporterId !== user.id && user.role !== "ADMIN") {
  return 403 Forbidden;  // IDOR prevention
}

// 4. Business logic: Is the status transition valid?
if (!issueService.isValidTransition(issue.status, newStatus)) {
  return 400 Invalid Transition;
}
```

### Auth Endpoints
- `POST /api/v1/auth/register` creates a user and session in one step
- `POST /api/v1/auth/login` verifies credentials and issues a new session
- `POST /api/v1/auth/logout` revokes the current session
- `GET /api/v1/auth/session` returns the current session state

## API Design Principles

### Consistent Response Format
- All endpoints return: `{ data, error, status }`
- Makes frontend integration predictable
- Error details in `error` field

### Versioning
- All endpoints at `/api/v1/`
- Prevents breaking frontend when backend changes
- Allows multiple versions if needed

### Separation of Concerns
- Status transitions: separate endpoint (`/issues/:id/status`)
- Field updates: `/issues/:id` (PATCH)
- Each has its own validation and business logic

### Pagination
- Default: 20 items
- Max: 100 items
- Parameters: `skip`, `take`
- Response includes `total` and `pages`

## Error Handling

```typescript
// Input validation error
GET /api/v1/issues?take=999
→ 400 Bad Request
→ "take parameter must be <= 100"

// Not found
GET /api/v1/issues/invalid_id
→ 404 Not Found

// Authorization error
PATCH /api/v1/issues/123 (as STUDENT)
→ 403 Forbidden

// Server error
POST /api/v1/issues (database down)
→ 500 Internal Server Error
```

## Deployment Considerations

### Production Environment
- Database: Managed PostgreSQL (RDS, Neon, Render, etc.)
- Authentication: Session store in PostgreSQL, cookies marked HTTP-only and secure
- Storage: AWS S3 or compatible service
- Redis: Optional, when scaling caching/rate-limiting
- Monitoring: Application logging and error tracking
- CORS: Configure for frontend origin

### Security Checklist
- ✅ HTTPS only in production
- ✅ CSRF protection (Next.js handles with SameSite cookies)
- ✅ SQL injection prevention (Prisma parameterized queries)
- ✅ XSS prevention (JSON responses, no HTML rendering)
- ✅ Rate limiting (future)
- ✅ Input validation (Zod)
- ✅ Server-side authorization
- ✅ IDOR prevention
- ✅ Audit logging

## Next Steps (Future Milestones)

1. **Milestone 2:** Session auth + RBAC + user management
2. **Milestone 3:** AI classification + priority estimation
3. **Milestone 4:** Duplicate detection + embeddings
4. **Milestone 5:** Moderation workflow + content flagging
5. **Milestone 6:** Resolution system + evidence upload
6. **Milestone 7:** Comments + followers
7. **Milestone 8:** Notifications
8. **Milestone 9:** Admin dashboard + analytics
9. **Milestone 10:** Testing + security hardening
10. **Milestone 11:** Deployment + performance optimization
