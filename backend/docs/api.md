# Slashforge API Documentation

**Base URL:** `http://localhost:3000/api/v1` (development)

**Version:** 1.0.0

## Response Format

All responses follow a consistent JSON format:

```json
{
  "data": { /* response data */ },
  "error": null,
  "status": 200
}
```

On error:

```json
{
  "data": null,
  "error": "Error message",
  "status": 400
}
```

## Authentication

**Status:** Implemented with server-side sessions

Slashforge uses opaque, HTTP-only session cookies for browser and API requests.
The server stores session rows in PostgreSQL and validates them on every protected request.

Auth endpoints:
- `POST /auth/register` - Create a new account and start a session
- `POST /auth/login` - Verify credentials and start a session
- `POST /auth/logout` - Revoke the current session
- `GET /auth/session` - Return the current session if one exists

Cookie behavior:
- `slashforge_session` is HTTP-only
- `sameSite=lax` reduces CSRF risk
- `secure=true` in production
- Sessions are server-revocable and expire after 7 days

## Authorization

Roles:
- `STUDENT` - Regular users
- `OFFICIAL` - Department officials/staff
- `MODERATOR` - Content moderation
- `ADMIN` - Full system access

Authorization is enforced server-side. Never trust client-provided role/permissions.

---

## Issues API

### List Issues

**Endpoint:** `GET /issues`

**Authentication:** Not required

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| skip | number | No | Number of issues to skip (default: 0) |
| take | number | No | Number of issues to return (default: 20, max: 100) |
| status | string | No | Filter by status (REPORTED, UNDER_REVIEW, IN_PROGRESS, RESOLUTION_SUBMITTED, VERIFIED, CLOSED, REOPENED, DISPUTED) |
| priority | string | No | Filter by priority (LOW, MEDIUM, HIGH, CRITICAL) |
| reporterId | string | No | Filter by reporter ID |

**Response:**

```json
{
  "data": {
    "issues": [
      {
        "id": "issue_123",
        "title": "WiFi not working in Library",
        "description": "WiFi connection is unstable",
        "category": "NETWORK",
        "department": "IT",
        "location": "Library - 3rd Floor",
        "status": "UNDER_REVIEW",
        "priority": "HIGH",
        "moderationStatus": "NORMAL",
        "reporterId": "user_456",
        "affectedUserCount": 12,
        "createdAt": "2026-08-29T10:00:00Z",
        "updatedAt": "2026-08-29T14:30:00Z",
        "reporter": {
          "id": "user_456",
          "email": "student@campus.edu",
          "name": "John Doe"
        }
      }
    ],
    "total": 45,
    "pages": 3
  },
  "error": null,
  "status": 200
}
```

### Get Issue

**Endpoint:** `GET /issues/:id`

**Authentication:** Not required

**Response:**

```json
{
  "data": {
    "id": "issue_123",
    "title": "WiFi not working in Library",
    "description": "WiFi connection is unstable",
    "category": "NETWORK",
    "department": "IT",
    "location": "Library - 3rd Floor",
    "status": "UNDER_REVIEW",
    "priority": "HIGH",
    "moderationStatus": "NORMAL",
    "reporterId": "user_456",
    "affectedUserCount": 12,
    "createdAt": "2026-08-29T10:00:00Z",
    "updatedAt": "2026-08-29T14:30:00Z",
    "reporter": {
      "id": "user_456",
      "email": "student@campus.edu",
      "name": "John Doe"
    },
    "comments": [
      {
        "id": "comment_789",
        "content": "I'm also experiencing this issue",
        "authorId": "user_999",
        "author": {
          "id": "user_999",
          "email": "another@campus.edu",
          "name": "Jane Smith"
        },
        "createdAt": "2026-08-29T12:00:00Z"
      }
    ],
    "statusHistory": [
      {
        "id": "hist_1",
        "fromStatus": "REPORTED",
        "toStatus": "UNDER_REVIEW",
        "reason": "Escalated to IT team",
        "createdAt": "2026-08-29T11:00:00Z"
      }
    ],
    "analysis": {
      "category": "NETWORK",
      "suggestedDepartment": "IT",
      "aiPriority": "HIGH",
      "severity": "HIGH",
      "spamScore": 0.02,
      "toxicityScore": 0.0,
      "confidence": 0.95
    }
  },
  "error": null,
  "status": 200
}
```

### Create Issue

**Endpoint:** `POST /issues`

**Authentication:** Required (any authenticated user)

**Authorization:** STUDENT, OFFICIAL, ADMIN

**Server-side rule:** the session cookie must resolve to a valid session row before this endpoint will create an issue.

**Request Body:**

```json
{
  "title": "WiFi not working in Library",
  "description": "WiFi connection drops frequently on 3rd floor",
  "category": "NETWORK",
  "department": "IT",
  "location": "Library - 3rd Floor",
  "suspectedCause": "Router misconfiguration",
  "proposedSolution": "Check and reconfigure WiFi access points"
}
```

**Validation Rules:**

- `title`: Required, min 5 chars, max 200 chars
- `description`: Required, min 10 chars
- Other fields: Optional

**Response:** `201 Created`

### Update Issue

**Endpoint:** `PATCH /issues/:id`

**Authentication:** Required

**Authorization:** Issue reporter or ADMIN

**Server-side rule:** the server checks ownership before applying updates. A client cannot change the reporter or role in the request to bypass this rule.

**Request Body:**

```json
{
  "title": "WiFi connectivity issues in Library",
  "priority": "CRITICAL"
}
```

**Fields that can be updated:**

- `title`
- `description`
- `category`
- `department`
- `location`
- `suspectedCause`
- `proposedSolution`
- `priority`

**Note:** Use the `/issues/:id/status` endpoint to change issue status.

**Response:** `200 OK`

### Transition Issue Status

**Endpoint:** `POST /issues/:id/status`

**Authentication:** Required

**Authorization:** OFFICIAL, MODERATOR, ADMIN (depending on status)

**Server-side rule:** the authenticated user must have one of the allowed roles before the state machine is evaluated.

**Request Body:**

```json
{
  "toStatus": "IN_PROGRESS",
  "reason": "Assigned to IT team for investigation"
}
```

**Valid Status Transitions:**

```
REPORTED → UNDER_REVIEW, CLOSED
UNDER_REVIEW → IN_PROGRESS, CLOSED
IN_PROGRESS → RESOLUTION_SUBMITTED, CLOSED
RESOLUTION_SUBMITTED → VERIFIED, DISPUTED
VERIFIED → CLOSED
CLOSED → REOPENED
REOPENED → IN_PROGRESS, CLOSED
DISPUTED → REOPENED, CLOSED
```

**Response:** `200 OK`

### Delete Issue

**Endpoint:** `DELETE /issues/:id`

**Authentication:** Required

**Authorization:** ADMIN, MODERATOR

**Server-side rule:** delete requests are rejected unless the session belongs to a moderator or admin.

**Note:** This is a soft delete. The issue's `moderationStatus` is set to `REMOVED`.

**Response:** `200 OK`

### List Comments

**Endpoint:** `GET /issues/:id/comments`

**Authentication:** Not required

**Behavior:** Returns the issue comments with author metadata.

### Add Comment

**Endpoint:** `POST /issues/:id/comments`

**Authentication:** Required

**Request Body:**

```json
{
  "content": "I am also experiencing this issue."
}
```

**Authorization:** Any authenticated user

**Response:** `201 Created`

### Follow Issue

**Endpoint:** `POST /issues/:id/followers`

**Authentication:** Required

**Authorization:** Any authenticated user

**Behavior:** Adds the current user as a follower of the issue.

### Unfollow Issue

**Endpoint:** `DELETE /issues/:id/followers`

**Authentication:** Required

**Authorization:** Any authenticated user

**Behavior:** Removes the current user from the issue follower list.

---

## Workflow API

### Mark Affected

**Endpoint:** `POST /issues/:id/affected`

**Authentication:** Required

**Authorization:** Any authenticated user

**Behavior:** Adds the current user as affected by the issue and automatically follows the issue.

### Unmark Affected

**Endpoint:** `DELETE /issues/:id/affected`

**Authentication:** Required

**Authorization:** Any authenticated user

**Behavior:** Removes the current user's affected marker and recalculates `affectedUserCount`.

### List Resolution Proof

**Endpoint:** `GET /issues/:id/resolutions`

**Authentication:** Not required

**Behavior:** Returns official resolution submissions and evidence metadata.

### Submit Resolution Proof

**Endpoint:** `POST /issues/:id/resolutions`

**Frontend alias:** `POST /admin/issues/:id/resolve`

**Authentication:** Required

**Authorization:** OFFICIAL, MODERATOR, ADMIN

**Request Body:**

```json
{
  "description": "Replaced the faulty access point and verified connectivity.",
  "evidenceImages": [
    {
      "storageKey": "proof/wifi-fix.jpg",
      "mimeType": "image/jpeg",
      "fileSize": 245000
    }
  ]
}
```

**Server-side rule:** At least one proof image is required. The state machine must allow transition to `RESOLUTION_SUBMITTED`.

### Dispute Resolution

**Endpoint:** `POST /issues/:id/dispute`

**Authentication:** Required

**Authorization:** Reporter or affected users only

**Behavior:** Stores the dispute, moves the issue through `DISPUTED`, and reopens it to `REOPENED` for follow-up.

### Upload File

**Endpoint:** `POST /upload`

**Authentication:** Required

**Request:** multipart/form-data with `file` field

**Behavior:** Uploads evidence images to Google Cloud Storage with validation.

**Response:**
```json
{
  "data": {
    "storageKey": "evidence/1690123456789-abc123-image.jpg",
    "publicUrl": "https://storage.googleapis.com/slashforge-bucket/evidence/1690123456789-abc123-image.jpg",
    "mimeType": "image/jpeg",
    "fileSize": 245000
  },
  "error": null,
  "status": 201
}
```

### Report Abuse

**Endpoint:** `POST /issues/:id/report`

**Authentication:** Required

**Behavior:** Persists a user report, de-duplicates repeated reports by the same user/reason, and sets `moderationStatus` to `FLAGGED`.

**Request Body:**

```json
{
  "reason": "duplicate",
  "details": "This appears to match another open WiFi report."
}
```

---

## Admin & Moderation API

### List Moderation Reports

**Endpoint:** `GET /admin/moderation`

**Authentication:** Required

**Authorization:** MODERATOR, ADMIN

### Moderate Issue

**Endpoint:** `PATCH /admin/moderation/:id`

**Authentication:** Required

**Authorization:** MODERATOR, ADMIN

**Request Body:**

```json
{
  "moderationStatus": "APPROVED",
  "reason": "Reviewed by campus moderation."
}
```

### Admin Status Update

**Endpoint:** `POST /admin/issues/:id/status`

**Also accepts:** `PATCH /admin/issues/:id/status`

**Authentication:** Required

**Authorization:** OFFICIAL, MODERATOR, ADMIN

**Behavior:** Frontend-compatible alias for `POST /issues/:id/status`.

---

## Notifications API

### List Notifications

**Endpoint:** `GET /notifications`

**Authentication:** Required

### Mark All Notifications Read

**Endpoint:** `PATCH /notifications`

**Authentication:** Required

### Mark Notification Read

**Endpoint:** `POST /notifications/:id/read`

**Authentication:** Required

**Server-side rule:** Users can only mark their own notifications as read.

---

## AI Assistance

Issue creation now runs AI analysis using Google Gemini AI that:
- Classifies issue category and suggested department
- Estimates priority and severity
- Flags likely spam/toxic/duplicate content
- Stores results in `AIAnalysis`
- Records duplicate candidates using text similarity over recent issues

The system uses Gemini 2.5 Flash for analysis with graceful fallback to local keyword-based rules if the AI service is unavailable. The AI integration is properly abstracted behind `src/modules/ai/analyzer.ts` and can be configured via environment variables.

---

## Status Codes

| Code | Meaning |
|------|---------|
| 200 | Success |
| 201 | Created |
| 400 | Bad Request (validation error) |
| 401 | Unauthorized (not authenticated) |
| 403 | Forbidden (authenticated but not authorized) |
| 404 | Not Found |
| 500 | Server Error |

---

## Error Responses

**Validation Error:**

```json
{
  "data": null,
  "error": "Validation error: title must be at least 5 characters",
  "status": 400
}
```

**Authentication Error:**

```json
{
  "data": null,
  "error": "Unauthorized",
  "status": 401
}
```

**Authorization Error:**

```json
{
  "data": null,
  "error": "Forbidden",
  "status": 403
}
```

---

## Frontend Integration

### Base URL Configuration

```javascript
// In your frontend .env
NEXT_PUBLIC_API_BASE_URL=http://localhost:3000
```

### Example: Create Issue

```typescript
const response = await fetch(
  `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/v1/issues`,
  {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include", // Include cookies for session
    body: JSON.stringify({
      title: "WiFi not working",
      description: "WiFi is down on 3rd floor",
    }),
  }
);

const { data, error } = await response.json();
```

### Pagination Example

```typescript
// Get second page (20 items per page)
const response = await fetch(
  `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/v1/issues?skip=20&take=20`
);
```

---

## Authentication Endpoints

### Register

**Endpoint:** `POST /auth/register`

**Authentication:** Not required

**Body:**

```json
{
  "email": "student@campus.edu",
  "password": "secure-password",
  "name": "John Doe"
}
```

**Behavior:** Creates the user, hashes the password with bcrypt, starts a session, and returns the new user profile plus session metadata.

### Login

**Endpoint:** `POST /auth/login`

**Authentication:** Not required

**Body:**

```json
{
  "email": "student@campus.edu",
  "password": "secure-password"
}
```

**Behavior:** Verifies the password, creates a new session row, and sets the `slashforge_session` cookie.

### Logout

**Endpoint:** `POST /auth/logout`

**Authentication:** Required

**Behavior:** Deletes the current session from the database and clears the cookie.

### Session

**Endpoint:** `GET /auth/session`

**Authentication:** Required

**Behavior:** Returns the authenticated user and session expiry details.

## Still Planned

- Dedicated status history endpoint
- Dedicated audit log endpoint
- Direct binary upload pipeline for proof images
- Provider-backed embeddings for stronger duplicate detection
