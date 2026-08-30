# Slashforge Learning Log

Your personal backend study guide. After each milestone, reflect on the concepts you've learned.

---

## Milestone 1: Project Foundation + Core Auth + Issue CRUD

### What We Built

A minimal Next.js backend with:
- PostgreSQL database with Prisma ORM
- Issue CRUD endpoints (GET all, GET one, POST, PATCH, DELETE)
- Status transition endpoint with state machine validation
- Zod validation schemas
- Consistent API response format
- Docker Compose setup for local PostgreSQL

### Concepts Learned

#### 1. Next.js API Routes
**What it does:**
- Files in `app/api/` automatically become HTTP endpoints
- `GET`, `POST`, `PATCH`, `DELETE` functions handle methods
- No need to define routes in a config file

**Why Slashforge needs it:**
- Clean separation between API and data logic
- TypeScript support out of the box
- Middleware support for auth/logging

**Key Points:**
```typescript
// app/api/v1/issues/route.ts
export async function GET(request: NextRequest) {
  // Called for GET /api/v1/issues
}

export async function POST(request: NextRequest) {
  // Called for POST /api/v1/issues
}
```

**What you should be able to explain:**
- How endpoints are auto-routed based on file structure
- How to differentiate between HTTP methods
- The difference between `route.ts` and `[id]/route.ts` for dynamic routes

---

#### 2. TypeScript Types & Validation

**What it does:**
- Types provide compile-time safety (catch bugs before runtime)
- Schemas (Zod) provide runtime validation (verify user input)

**Why Slashforge needs it:**
- Prevent type errors like `issue.title.toUpperCase()` when `title` could be null
- Validate user input before trusting it in business logic
- Self-document API contracts

**Pipeline:**
```
User sends JSON
     ↓
Parse JSON
     ↓
Validate with Zod Schema
     ↓
If invalid → return error
     ↓
If valid → use type-safe object in code
```

**Key Points:**
- Zod runs at **runtime** (catches malicious/wrong input)
- TypeScript runs at **compile-time** (catches programmer mistakes)
- Both are necessary

**What you should be able to explain:**
- Why you can't trust JSON from the client
- How Zod validation works
- The difference between TypeScript types and Zod schemas

---

#### 3. Prisma ORM & Database

**What it does:**
- Defines database schema in `prisma/schema.prisma`
- Generates migrations automatically
- Provides type-safe query builder
- Prevents SQL injection

**Why Slashforge needs it:**
- Never write raw SQL (prone to injection)
- Schema is version-controlled
- Database changes are tracked in migrations
- TypeScript knows exactly what fields each table has

**Example:**
```typescript
// ✅ Type-safe, prevents typos and injection
const issue = await prisma.issue.create({
  data: {
    title: userInput.title,
    status: "REPORTED"
  }
});

// ❌ Raw SQL (vulnerable + error-prone)
const issue = await db.query(
  `INSERT INTO issues (title) VALUES ('${userInput.title}')`
);
```

**Key Points:**
- `@relation()` defines foreign keys
- `onDelete: Cascade` deletes related records
- Migrations live in `prisma/migrations/`
- Always validate schema for your data model

**What you should be able to explain:**
- How relationships work (1-to-many, many-to-many)
- Why cascading deletes can be dangerous
- What a migration is and why it matters

---

#### 4. Transactions (Atomicity)

**What it does:**
- Groups multiple database operations into one atomic unit
- Either all succeed or all fail (no partial updates)

**Why Slashforge needs it:**
Example without transaction:
```
1. Update Issue status: REPORTED → UNDER_REVIEW ✅
2. Create IssueStatusHistory record ❌ (database error!)
Result: Issue shows UNDER_REVIEW but history is missing
         Issue and history are out of sync
```

With transaction:
```
BEGIN TRANSACTION
  1. Update Issue status: REPORTED → UNDER_REVIEW
  2. Create IssueStatusHistory record
  3. Create AuditLog
COMMIT (all 3 succeed or all 3 fail)
```

**Prisma syntax:**
```typescript
await prisma.$transaction(async (tx) => {
  await tx.issue.update(...);
  await tx.issueStatusHistory.create(...);
  await tx.auditLog.create(...);
});
```

**Key Points:**
- Transactions ensure consistency
- If any operation fails, nothing is committed
- Critical for operations spanning multiple tables
- Can have performance cost (locks resources)

**What you should be able to explain:**
- What "atomic" means in databases
- Why you need transactions for status changes
- How to spot code that needs a transaction

---

#### 5. State Machines

**What it does:**
- Defines valid state transitions
- Prevents invalid transitions (e.g., CLOSED → REPORTED)

**Why Slashforge needs it:**
- Issues have a lifecycle: REPORTED → UNDER_REVIEW → IN_PROGRESS → RESOLVED → CLOSED
- Not every transition should be allowed
- State machine prevents bugs like "marking a closed issue as UNDER_REVIEW"

**Implementation:**
```typescript
private isValidTransition(from: IssueStatus, to: IssueStatus): boolean {
  const validTransitions: Record<IssueStatus, IssueStatus[]> = {
    REPORTED: [UNDER_REVIEW, CLOSED],
    UNDER_REVIEW: [IN_PROGRESS, CLOSED],
    // ...
  };
  return validTransitions[from]?.includes(to) ?? false;
}
```

**Key Points:**
- State machine is self-documenting
- Easier to test than scattered `if` statements
- Can be visualized as a diagram
- Easy to modify when lifecycle changes

**What you should be able to explain:**
- What a state machine is
- Why it's better than `if (status === REPORTED) { ... }`
- How to design one for your domain

---

#### 6. API Design

**What it does:**
- Consistent response format
- Predictable error handling
- Clear authentication/authorization requirements

**Why Slashforge needs it:**
- Frontend developer can integrate without inspecting code
- Errors are consistent and parseable
- Scaling to multiple clients is easier

**Consistent Response Format:**
```json
// Success
{
  "data": { /* actual data */ },
  "error": null,
  "status": 200
}

// Error
{
  "data": null,
  "error": "Validation error: title is required",
  "status": 400
}
```

**Separate Endpoints for Different Operations:**
- `PATCH /issues/:id` - update fields
- `POST /issues/:id/status` - change status

Why separate?
- Status changes have special validation (state machine)
- Status changes require audit logging
- Conceptually different from field updates

**Key Points:**
- Choose one response format, stick with it
- Use correct HTTP status codes
- Document everything
- Never return HTML or raw errors

**What you should be able to explain:**
- Why a consistent response format matters
- The difference between `PATCH` and `POST`
- When to create a separate endpoint vs. using query parameters

---

#### 7. Role-Based Access Control (RBAC)

**What it does:**
- Different roles have different permissions
- Enforced server-side

**Why Slashforge needs it:**
- Students should not be able to mark issues resolved
- Moderators should not be able to delete users
- Admin should have full access

**Example:**
```typescript
// ✅ CORRECT: Check on server before allowing mutation
async function transitionStatus(id, newStatus, user) {
  if (user.role !== "OFFICIAL" && user.role !== "ADMIN") {
    return 403 Forbidden;  // Client cannot override this
  }
  // Now transition
}

// ❌ WRONG: Trust client role
if (request.user.role === "ADMIN") {
  // User can fake this in the browser!
}
```

**Key Points:**
- Authentication: "Who are you?" (verified by session/token)
- Authorization: "What can you do?" (checked server-side)
- Never trust `request.user.role` from client
- Always re-verify permissions before sensitive operations

**What you should be able to explain:**
- Authentication vs. Authorization
- Why client-provided roles are a security bug
- How to check permissions on the server

---

### What I Should Inspect

1. **Database Schema** ([prisma/schema.prisma](../prisma/schema.prisma))
   - Notice the relationships and constraints
   - How data flows through the system

2. **Issue Service** ([src/modules/issues/service.ts](../src/modules/issues/service.ts))
   - How business logic is separated from API routes
   - Transactions and state machine
   - Audit logging

3. **API Routes** ([src/app/api/v1/issues/](../src/app/api/v1/issues/))
   - Input validation with Zod
   - Consistent response format
   - Error handling

4. **Architecture Diagram** ([architecture.md](./architecture.md))
   - Mental model of the system
   - How data flows end-to-end

---

### How to Test It

Once npm install completes and Prisma is initialized:

```bash
# Start PostgreSQL
docker-compose up -d

# Run Prisma migrations (creates tables)
npx prisma migrate dev --name init

# Start dev server
npm run dev

# Test endpoints
curl http://localhost:3000/api/v1/issues
curl -X POST http://localhost:3000/api/v1/issues \
  -H "Content-Type: application/json" \
  -d '{"title": "WiFi down", "description": "No internet access"}'
```

---

### Common Mistakes to Avoid

1. **Trust client-provided permissions**
   ```typescript
   // ❌ WRONG
   if (request.body.role === "ADMIN") {
     // User set themselves to admin!
   }
   
   // ✅ CORRECT
   const user = await getSessionUser(request);
   if (user.role !== "ADMIN") return 403;
   ```

2. **Skip validation**
   ```typescript
   // ❌ WRONG
   const issue = await prisma.issue.create({
     data: request.body  // Blind trust!
   });
   
   // ✅ CORRECT
   const validated = CreateIssueSchema.parse(request.body);
   const issue = await prisma.issue.create({
     data: validated
   });
   ```

3. **Forget transactions**
   ```typescript
   // ❌ WRONG: Issue status and history out of sync if error occurs
   await prisma.issue.update({ data: { status: "IN_PROGRESS" } });
   await prisma.issueStatusHistory.create({ ... });
   
   // ✅ CORRECT
   await prisma.$transaction(async (tx) => {
     await tx.issue.update({ data: { status: "IN_PROGRESS" } });
     await tx.issueStatusHistory.create({ ... });
   });
   ```

4. **Ignore state machines**
   ```typescript
   // ❌ WRONG: Allow invalid transitions
   if (newStatus) {
     await prisma.issue.update({ data: { status: newStatus } });
   }
   
   // ✅ CORRECT
   if (!isValidTransition(issue.status, newStatus)) {
     return 400 "Invalid status transition";
   }
   ```

---

### Suggested Git Commit

```
feat: milestone 1 - project foundation + issue CRUD

- Initialize Next.js with TypeScript and Tailwind
- Set up PostgreSQL with Prisma ORM
- Create Prisma schema: User, Issue, StatusHistory, AuditLog
- Implement Issue CRUD endpoints (GET all, GET one, POST, PATCH, DELETE)
- Add issue status transition endpoint with state machine
- Add Zod validation schemas for requests/responses
- Create consistent API response format
- Implement Docker Compose for local PostgreSQL
- Document API contracts in docs/api.md
- Document architecture in docs/architecture.md
- Add learning log for future reference

Technologies: Next.js, TypeScript, PostgreSQL, Prisma, Zod
Status: API routes are functional but auth/AI not yet integrated
Next: Better Auth integration for authentication + RBAC
```

---

### You Now Understand:

✅ How Next.js API routes work  
✅ Why TypeScript + Zod validation matter  
✅ How Prisma ORM keeps database code safe  
✅ What transactions are and why they're important  
✅ How state machines prevent invalid transitions  
✅ API design principles (consistency, versioning, error handling)  
✅ RBAC and why server-side checks are mandatory  
✅ How service layer separates business logic from HTTP handling  

### Milestone 2: Session Auth + RBAC

#### What We Built

A session-backed auth layer with:
- `POST /api/v1/auth/register` to create accounts and start sessions
- `POST /api/v1/auth/login` to verify credentials and issue sessions
- `POST /api/v1/auth/logout` to revoke the active session
- `GET /api/v1/auth/session` to inspect the current login state
- DB-backed RBAC checks on sensitive issue endpoints

#### Concepts Learned

##### 1. Authentication vs Authorization
**Authentication** asks "who are you?"
- We verify the user with a server-side session lookup
- The session cookie is just an identifier

**Authorization** asks "what can you do?"
- We check roles and ownership before mutations
- A valid login does not imply permission to edit everything

**Key idea:**
- Authentication proves identity
- Authorization proves capability
- They are related, but they are not the same thing

##### 2. Sessions and Cookies
**What it does:**
- A cookie stores an opaque token in the browser
- The server stores the real session record in PostgreSQL
- The cookie is HTTP-only, so JavaScript cannot read it

**Why Slashforge uses this pattern:**
- Sessions can be revoked server-side
- Roles are resolved from the database, not from the client
- It is safer than trusting a role value in the request body

**Request flow:**
```
Browser sends cookie
     ↓
API hashes token
     ↓
Database session lookup
     ↓
User + role resolved
     ↓
RBAC / ownership check
     ↓
Service layer mutation
```

##### 3. Server-Side Permission Checks
**What it does:**
- Blocks unauthorized writes before business logic runs
- Prevents IDOR bugs where users access records they do not own

**Examples:**
- Only the reporter or admin can patch an issue
- Only moderator/admin can delete an issue
- Only official/moderator/admin can change issue status

**Why it matters:**
- Client-side checks are easy to bypass
- Server-side checks are the real security boundary

##### 4. Common Auth Pitfalls
**Avoid these mistakes:**
- Trusting `userId` from the request body
- Trusting `role` from the browser
- Returning different errors for "user not found" and "wrong password"
- Storing raw session tokens without revocation support
- Forgetting to clear stale sessions on logout

**Safer approach:**
- Keep the session opaque
- Look up the user on the server
- Re-check permission on every sensitive endpoint
- Make logout invalidate the server-side session too

#### What You Should Be Able to Explain
- Authentication vs authorization
- Why cookies are useful for sessions
- Why server-side RBAC is mandatory
- How ownership checks prevent IDOR
- Why session revocation matters

--- 

### Next Milestone: AI Classification

Now that identity and permissions are in place, we can safely move to issue intelligence:
- AI classification
- Priority estimation
- Moderation signals
- Duplicate detection

---

**Remember:** You're building a real backend that could handle thousands of issues. Each concept here prevents real bugs that happen in production. Don't skip understanding.
