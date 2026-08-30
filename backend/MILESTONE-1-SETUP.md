# Milestone 1 - SETUP INSTRUCTIONS

**Status:** Project structure complete. Database initialization requires manual setup on Windows Docker Desktop.

## Current Situation

The backend is fully scaffolded with:
- ✅ Next.js + TypeScript setup
- ✅ Prisma ORM schema (complete data model)
- ✅ API routes for CRUD operations
- ✅ Service layer with business logic
- ✅ Zod validation schemas
- ✅ Docker Compose for PostgreSQL
- ✅ Comprehensive documentation
- ⏳ Database initialization (Docker Desktop networking issue)

## Database Setup Workaround

Due to Docker Desktop on Windows networking, the database needs a slightly different setup:

### Option 1: Use Windows Subsystem for Linux (WSL 2) PostgreSQL

```bash
# Install PostgreSQL on WSL 2
wsl -d Ubuntu
sudo apt-get update
sudo apt-get install postgresql postgresql-contrib

# Start PostgreSQL
sudo service postgresql start

# Update .env.local to use WSL PostgreSQL
DATABASE_URL=postgresql://postgres:postgres@wsl.local:5432/slashforge
```

### Option 2: Use Local PostgreSQL Installation

```bash
# Install PostgreSQL 16 for Windows from:
# https://www.postgresql.org/download/windows/

# Create database and user
CREATE DATABASE slashforge;
CREATE USER slashforge_user WITH PASSWORD 'slashforge_dev_password';
ALTER ROLE slashforge_user SET client_encoding TO 'utf8';
ALTER ROLE slashforge_user SET default_transaction_isolation TO 'read committed';
ALTER ROLE slashforge_user SET default_transaction_deferrable TO on;
ALTER ROLE slashforge_user SET default_transaction_read_committed TO off;
GRANT ALL PRIVILEGES ON DATABASE slashforge TO slashforge_user;

# Update .env.local
DATABASE_URL=postgresql://slashforge_user:slashforge_dev_password@localhost:5432/slashforge
```

### Option 3: Run Backend in Docker

```bash
# Build Docker image for backend
docker build -t slashforge .

# Run with docker run using the Docker network
docker run -p 3000:3000 --network slashforge_default slashforge
```

## Next Steps

Once you have a database connection working:

```bash
# Initialize database schema
npx prisma db push

# Or create initial migration
npx prisma migrate dev --name init

# Start development server
npm run dev
```

## Test the API

Once the dev server is running:

```bash
# Health check
curl http://localhost:3000/api/v1/health

# List issues (should be empty)
curl http://localhost:3000/api/v1/issues

# Create test issue
curl -X POST http://localhost:3000/api/v1/issues \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Test Issue",
    "description": "This is a test issue for the Slashforge backend"
  }'
```

## Project Files Created

**API Routes:**
- [src/app/api/v1/health/route.ts](../src/app/api/v1/health/route.ts) - Health check
- [src/app/api/v1/issues/route.ts](../src/app/api/v1/issues/route.ts) - GET all, POST create
- [src/app/api/v1/issues/[id]/route.ts](../src/app/api/v1/issues/[id]/route.ts) - GET one, PATCH update, DELETE
- [src/app/api/v1/issues/[id]/status/route.ts](../src/app/api/v1/issues/[id]/status/route.ts) - Status transitions

**Business Logic:**
- [src/modules/issues/service.ts](../src/modules/issues/service.ts) - Issue lifecycle, state machine

**Validation & Types:**
- [src/lib/validation/issue.ts](../src/lib/validation/issue.ts) - Zod schemas
- [src/types/auth.ts](../src/types/auth.ts) - Auth types
- [src/lib/api.ts](../src/lib/api.ts) - API response helpers

**Database:**
- [prisma/schema.prisma](../prisma/schema.prisma) - Complete data model
- [docker-compose.yml](../docker-compose.yml) - PostgreSQL container

**Documentation:**
- [docs/api.md](../docs/api.md) - Complete API documentation
- [docs/architecture.md](../docs/architecture.md) - System architecture
- [docs/learning-log.md](../docs/learning-log.md) - Concepts learned
- [README.md](../README.md) - Project overview

## What You Should Review

1. **Architecture** - [docs/architecture.md](../docs/architecture.md)
   - System design and data flow
   - Technology choices
   - Layered architecture pattern

2. **Issue Service** - [src/modules/issues/service.ts](../src/modules/issues/service.ts)
   - Business logic encapsulation
   - State machine implementation
   - Database transaction usage

3. **API Routes** - [src/app/api/v1/issues/route.ts](../src/app/api/v1/issues/route.ts)
   - Input validation with Zod
   - Error handling patterns
   - Response format consistency

4. **Database Schema** - [prisma/schema.prisma](../prisma/schema.prisma)
   - Entity relationships
   - Constraints and indexes
   - Audit trail structure

## Concepts Covered in This Milestone

- Next.js API routes and routing
- TypeScript types and Zod validation
- Prisma ORM and database modeling
- Database transactions for atomicity
- State machines for issue lifecycle
- API design principles and versioning
- Role-Based Access Control (RBAC) structure
- Service layer pattern for business logic separation

See [docs/learning-log.md](../docs/learning-log.md) for detailed explanations.

## Common Issues & Solutions

**Issue:** "Port 5432 already in use"
```bash
# Kill existing process
netstat -ano | findstr :5432
taskkill /PID <PID> /F
```

**Issue:** Prisma TypeScript errors
```bash
# Regenerate Prisma client
npx prisma generate
```

**Issue:** "Cannot connect to database"
- Verify DATABASE_URL in .env.local
- Check PostgreSQL is running
- Verify credentials match database setup
- Try connecting with psql directly

## Next Milestone: Better Auth Integration

Once the database is connected, we'll implement:
- User authentication with Better Auth
- Session management
- RBAC enforcement on API routes
- Login/logout endpoints

**Estimated time:** 2-3 hours

---

**Questions?** The code is well-commented and documented. Start with the architecture doc.
