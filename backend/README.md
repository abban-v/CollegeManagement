# Slashforge Backend

A campus issue-reporting platform with AI-assisted classification, prioritization, and moderation.

**Status:** Milestone 2 Complete (Session Auth + RBAC)

## Quick Start

### Prerequisites
- Node.js 22+
- Supabase account (for PostgreSQL database)

### Setup

1. **Clone and install dependencies:**
   ```bash
   cd slashforge
   npm install
   ```

2. **Copy environment variables:**
   ```bash
   cp .env.example .env.local
   # Edit .env.local with your Supabase and Gemini credentials
   ```

3. **Set up database:**
   ```bash
   npx prisma migrate dev --name init
   ```

5. **Start dev server:**
   ```bash
   npm run dev
   ```

   Server runs on http://localhost:3000

### Verify It Works

```bash
# Health check
curl http://localhost:3000/api/v1/health

# List issues
curl http://localhost:3000/api/v1/issues

# Create an issue
curl -X POST http://localhost:3000/api/v1/issues \
  -H "Content-Type: application/json" \
  -d '{"title": "WiFi down", "description": "No internet access on 3rd floor"}'
```

---

## Architecture

**Backend Stack:**
- Next.js 16 + TypeScript
- PostgreSQL + Prisma ORM
- Zod validation
- Docker Compose (local dev)

**Layered Architecture:**
1. **API Layer** - Request/response handling, validation
2. **Service Layer** - Business logic, state machines, transactions
3. **Library Layer** - Auth, database, storage, validation
4. **Database** - PostgreSQL with Prisma ORM

See [docs/architecture.md](docs/architecture.md) for detailed overview.

---

## API Documentation

**Base URL:** `http://localhost:3000/api/v1`

All endpoints return:
```json
{
  "data": { /* response data */ },
  "error": null,
  "status": 200
}
```

### Current Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Health check |
| GET | `/issues` | List all issues |
| POST | `/issues` | Create new issue |
| GET | `/issues/:id` | Get issue by ID |
| PATCH | `/issues/:id` | Update issue |
| POST | `/issues/:id/status` | Transition issue status |
| DELETE | `/issues/:id` | Soft-delete issue |
| GET | `/issues/:id/comments` | List issue comments |
| POST | `/issues/:id/comments` | Add a comment |
| POST | `/issues/:id/followers` | Follow an issue |
| DELETE | `/issues/:id/followers` | Unfollow an issue |
| POST | `/auth/register` | Create account and session |
| POST | `/auth/login` | Authenticate and create session |
| POST | `/auth/logout` | End current session |
| GET | `/auth/session` | Inspect current session |

Full API docs: [docs/api.md](docs/api.md)

---

## Project Structure

```
src/
├── app/api/v1/          # API routes
├── modules/issues/      # Business logic
├── lib/                 # Shared utilities
└── types/               # TypeScript types

docs/
├── api.md               # API documentation
├── architecture.md      # System design
└── learning-log.md      # Learning guide

prisma/
├── schema.prisma        # Data model
└── migrations/          # Database changes
```

---

## Database

PostgreSQL with Prisma ORM.

**Key Tables:**
- `users` - User accounts with roles
- `issues` - Problem reports
- `issue_status_history` - Audit trail of status changes
- `issue_participants` - Users affected by issue
- `issue_followers` - Users following an issue
- `comments` - User comments on issues
- `issue_resolutions` - Official resolutions with evidence
- `ai_analysis` - AI classification and analysis
- `audit_logs` - System audit trail

Schema: [prisma/schema.prisma](prisma/schema.prisma)

### Database Commands

```bash
# Create migration
npx prisma migrate dev --name <name>

# View database in GUI
npx prisma studio

# Push schema to database
npx prisma db push

# Reset database (development only!)
npx prisma migrate reset
```

---

## Development

### Code Style
- TypeScript for type safety
- Zod for runtime validation
- Consistent error handling
- Server-side authorization checks

### Key Concepts

1. **Transactions** - Multi-step operations are atomic
2. **State Machine** - Issue status transitions are validated
3. **RBAC** - Role-based access control enforced server-side
4. **Validation** - Zod schemas validate all input
5. **Services** - Business logic separated from API routes

Learn more: [docs/learning-log.md](docs/learning-log.md)

### Running Tests

```bash
npm test              # Run smoke tests
npm run lint          # Lint the codebase
npm run typecheck     # TypeScript typecheck
```

---

## Authentication

Session-backed authentication is implemented with:
- Opaque, HTTP-only session cookies
- Session rows in PostgreSQL for server-side validation and revocation
- Role-based access control enforced in route handlers
- Ownership checks to prevent IDOR-style access to issue records

Authentication endpoints:
- `POST /api/v1/auth/register`
- `POST /api/v1/auth/login`
- `POST /api/v1/auth/logout`
- `GET /api/v1/auth/session`

---

## AI Features (Coming Soon - Milestone 3+)

Planned AI capabilities:
- Issue classification (Gemini Flash-Lite)
- Priority estimation (Gemini Flash)
- Duplicate detection (embeddings + semantic search)
- Content moderation (AI + human review)

---

## Deployment

### Environment Setup
```bash
cp .env.example .env.production
# Update with production values
```

### Production Checklist
- ✅ HTTPS only
- ✅ Database: Managed PostgreSQL (RDS, Neon, Render)
- ✅ Authentication: Session-backed auth configured
- ✅ Storage: S3-compatible service
- ✅ Monitoring: Error tracking (Sentry, etc.)
- ✅ Rate limiting: Implement based on load
- ✅ CORS: Configure for frontend origin

---

## Git Workflow

**Branch naming:**
- `feat/` - New feature
- `fix/` - Bug fix
- `docs/` - Documentation
- `refactor/` - Code cleanup

**Commit messages:**
```
type: brief description

Longer explanation if needed.
- Bullet point 1
- Bullet point 2
```

---

## Troubleshooting

### Database connection error
```bash
# Verify DATABASE_URL in .env.local
echo $DATABASE_URL

# Test Supabase connection
npx prisma db push

# Check Supabase status at https://app.supabase.com
```

### Prisma type errors
```bash
# Regenerate Prisma client
npx prisma generate

# Check schema for errors
npx prisma validate
```

### Port 3000 already in use
```bash
# Find process using port 3000
lsof -i :3000

# Run on different port
npm run dev -- -p 3001
```

---

## Learning

New to backend development? Start here:
1. Read [docs/architecture.md](docs/architecture.md) for system overview
2. Review [docs/learning-log.md](docs/learning-log.md) for concepts
3. Explore `src/modules/issues/service.ts` for business logic example
4. Try the API endpoints with curl

---

## Next Milestones

- **Milestone 2:** Session auth + RBAC
- **Milestone 3:** AI classification
- **Milestone 4:** Duplicate detection
- **Milestone 5:** Moderation workflow
- **Milestone 6:** Resolution system
- **Milestone 7:** Comments & followers
- **Milestone 8:** Notifications
- **Milestone 9:** Admin dashboard
- **Milestone 10:** Testing & security
- **Milestone 11:** Deployment

---

## Contributing

This is a team project. Follow the development philosophy:

**For boilerplate code** → I implement directly  
**For learning-critical features** → We discuss first, then I implement

See [docs/architecture.md](docs/architecture.md#development-philosophy) for details.

---

**Questions?** Read the docs or the code. Both are designed to teach.
