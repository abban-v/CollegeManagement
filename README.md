# CET | CampusFix (Slashforge)
### Intelligent Campus Infrastructure Health & Crowdsourced Issue Resolution Platform

---

## 📌 Project Abstract

**CET | CampusFix** (formerly *Slashforge*) is an enterprise-grade campus infrastructure monitoring, problem reporting, and verified resolution platform built specifically for the **College of Engineering Trivandrum (CET)**. Designed to replace obsolete complaint registers and siloed helpdesks, CampusFix provides a closed-loop digital ecosystem where students, faculty, department heads, and campus facility officials collaborate to maintain institutional infrastructure.

The platform fuses modern web engineering with multi-modal Artificial Intelligence (Gemini Vision) to streamline the entire maintenance lifecycle—from initial anomaly reporting and real-time duplicate detection to automated department routing, community upvoting, proof-of-work resolution verification, and maintainable asset tracking.

---

## 🚨 Problem Statement

Higher education institutions and university campuses operate across extensive physical footprints consisting of academic blocks, high-voltage laboratories, computing centres, auditoriums, hostels, and recreational facilities. However, conventional campus infrastructure grievance mechanisms suffer from systemic deficiencies:

1. **High Reporting Friction & Opaque Progress**:
   Students and faculty encounter faulty equipment (e.g., non-functional projectors, water leakages, broken lab workstations, faulty air conditioning) but lack a swift, accessible channel to report them. Physical complaint registers or unmonitored email inboxes leave reporters in the dark, with no status tracking or expected resolution timelines.

2. **Triage Congestion & Duplicate Overload**:
   When a common-area asset fails (such as an amphitheatre audio system or high-traffic corridor lighting), dozens of campus members submit redundant reports. Support desks become overwhelmed by duplicate tickets, dispersing maintenance resources and obscuring actual problem severity.

3. **Lack of Resolution Accountability ("Ghost Resolutions")**:
   Traditional ticketing systems allow administrators or technicians to mark tickets as "Resolved" without verifiable evidence. Reporters often find that tickets have been closed while the physical defect remains unfixed, eroding trust in campus administration.

4. **Spam, Jokes, and Trolling Vulnerability**:
   Open reporting portals frequently get flooded with gibberish submissions, troll complaints, emotional rants, or non-infrastructure clutter, demanding significant manual effort to moderate and review.

5. **Disconnected Asset Maintenance Histories**:
   Facilities teams rarely maintain an integrated digital link between physical machinery (such as modular UPS units, chilled water pumps, oscilloscopes, or HVAC equipment) and their historical breakdown logs, hindering preventative maintenance and timely asset replacement.

---

## 💡 The Proposed Solution

**CET | CampusFix** introduces an intelligent, transparent, and crowd-verified infrastructure governance platform that closes the loop between reporting, triage, repair, and verification:

- **AI-Powered Sentinel & Vision Moderation**:
  Every incoming report is parsed in real time by an AI analyzer powered by Gemini Vision. The sentinel categorizes the problem, estimates urgency, inspects photographic attachments for safety and relevance, flags gibberish or spam, and checks against active campus tickets to identify duplicates before submission.

- **Crowdsourced Prioritization ("I'm Affected" Upvoting)**:
  Rather than filing repetitive tickets for existing problems, campus members can click **"I'm Affected"**, incrementing an impact counter that dynamically boosts the issue's priority score. This creates a real-time, community-ranked backlog of the most impactful institutional failures.

- **Cryptographically Audited Proof-of-Work Resolutions**:
  Officials and maintenance crews cannot mark an issue "Resolved" simply by changing a status flag. The platform enforces mandatory photographic evidence of the completed repair alongside technical work notes.

- **Community Dispute & 7-Day Reopen Protocol**:
  Once a resolution is submitted, a 7-day verification countdown begins. If the repair is inadequate, the original reporter or affected community members can dispute the resolution or reopen the ticket with additional evidence, preventing premature ticket closure.

- **Integrated Maintainable Asset Registry**:
  Critical campus machinery is registered as digital assets with unique asset tags and QR-binding capabilities. Reports can be directly linked to specific assets, automatically compiling maintenance logs, tracking Mean Time Between Failures (MTBF), and providing departmental failure analytics.

---

## ⚡ Key Platform Features

### 1. Intelligent Reporting Wizard
- **Context-Rich Ticket Creation**: Captures title, description, category, department, specific room/hallway locations, and photographic attachments.
- **Diagnostic Hypotheses**: Allows technical reporters to optionally contribute suspected root causes and proposed solutions, accelerating technical diagnostics for maintenance crews.
- **Pre-Submission Duplicate Warning**: Evaluates proximity, category, and textual similarity against active campus issues; if a match is found, users are seamlessly prompted to view and upvote the existing ticket instead of generating duplicate records.

### 2. Multi-Modal AI Sentinel (Gemini Intelligence)
- **Automated Categorization & Department Routing**: Accurately maps complaints to responsible departments (e.g., Computer Science, Electrical & Electronics, Mechanical, Civil, Campus Facilities).
- **Dual-Rubric Spam & Toxicity Detection**: Analyzes submissions against structured rubrics, assigning a `spamScore`, `toxicityScore`, and `confidence` metric.
- **Automated Quarantine (`UNDER_REVIEW`)**: Submissions exhibiting spam signals (`spamScore > 50%` and `confidence < 60%`) or containing non-infrastructure joke/meme patterns are quarantined for administrative review without being broadcast to the public feed.
- **High-Confidence Spam Rejection**: Outright rejects blatant spam or gibberish (`spamScore > 80%` and `confidence < 30%`), saving database and administrative bandwidth.

### 3. Community Engagement & Dynamic Triage
- **"I'm Affected" Upvote Engine**: Democratic crowd voting that elevates high-impact institutional emergencies to administrative prominence.
- **Discussion Feed & Status Auditing**: Interactive comment threads on each ticket enabling reporters, affected students, and assigned technicians to communicate in real time.
- **Custom Filtering & Sorting**: Multi-parameter search by department, category, status (`REPORTED`, `UNDER_REVIEW`, `IN_PROGRESS`, `RESOLUTION_SUBMITTED`, `VERIFIED`, `CLOSED`, `REOPENED`), priority (`LOW`, `MEDIUM`, `HIGH`, `CRITICAL`), or most upvoted.

### 4. Verified Resolution Lifecycle & Dispute Flow
```
[REPORTED] ──► [IN_PROGRESS] ──► [RESOLUTION_SUBMITTED] ──► [VERIFIED / CLOSED]
     ▲                                   │
     │                                   ▼ (Disputed within 7 days)
     └──────────────────────────── [REOPENED / DISPUTED]
```
- **Proof-of-Work Verification**: Resolving personnel must attach clear evidence photographs and describe remediation steps.
- **7-Day Auto-Closure Window**: Resolved tickets transition to permanently `CLOSED` after 7 days unless disputed by the reporter.
- **Community Reopen Mechanism**: Allows users to reopen tickets if the problem resurfaces, preserving the historical timeline and preventing lost context.

### 5. Campus Asset Registry
- **Hardware & Facilities Catalog**: Digital profiles for institutional assets (projectors, inverter air conditioners, digital storage oscilloscopes, modular UPS systems, water treatment pumps).
- **Operational Health States**: Tracks hardware states (`OPERATIONAL`, `DEGRADED`, `UNDER_MAINTENANCE`, `OUT_OF_SERVICE`).
- **Failure Telemetry**: Aggregates total logged issues per asset, enabling facilities teams to spot end-of-life hardware and schedule preventative servicing.

### 6. Administrative Operations & Moderation Hub
- **Quarantine Moderation Queue**: Dedicated triage interface for administrators to inspect flagged tickets, review AI reasoning strings, and approve or delete reports with a single click.
- **Departmental Load Distribution**: Analytics dashboard displaying open tickets, priority breakdowns, and resolution compliance rates across university departments.
- **Role Governance**: Granular role-based permissions separating standard `STUDENT` capabilities from `OFFICIAL`, `MODERATOR`, and `ADMIN` administrative actions.

### 7. Real-Time Notification & Audit Trail
- **Activity Drawer**: In-app notification drawer alerting users when their tickets are updated, commented upon, upvoted, disputed, or resolved.
- **Event-Sourced Audit Logging**: Immutable audit logs capturing every status transition, timestamp, and actor identity (student, technician, or automated AI system).

---

## 🛠️ Technology Stack

| Domain | Technologies & Libraries | Purpose |
|---|---|---|
| **Frontend Framework** | **Next.js 16 (App Router)** & **React 19** | Server-side rendering, React Server Components, and responsive client hydration |
| **Styling & Design System** | **Tailwind CSS v4** & **Lucide React** | Ultra-performant utility-first styling, glassmorphism dark theme, adaptive iconography |
| **Animation Engine** | **Quantum Burst (HTML5 Canvas Engine)** | Custom zero-overhead, GPU-composited radial particles and starlight ember animations |
| **Backend & API** | **Next.js 16 App Router API Routes** & **TypeScript** | Fully typed RESTful API monolith adhering to strict request/response contracts |
| **Validation & Security** | **Zod** | End-to-end runtime schema validation for requests, forms, and environment variables |
| **Database & ORM** | **PostgreSQL (Supabase)** & **Prisma ORM** | Relational schema modeling, foreign key constraints, connection pooling, and type-safe querying |
| **Artificial Intelligence** | **Google Generative AI (Gemini Vision)** | Multi-modal image inspection, spam classification, duplicate detection, and automated routing |
| **Object Storage** | **Google Cloud Storage (GCS)** | Secure, scalable storage for issue attachments and proof-of-work resolution photographs |
| **Session & Auth** | **Institutional Google OAuth 2.0 (`@cet.ac.in`)** & **Bcrypt** | Secure domain-restricted SSO, salted password hashing, HTTP-only SameSite session cookies |
| **Rate Limiting & Caching** | **Upstash Redis** & **Bounded In-Memory Store** | Distributed sliding-window rate limiting with automated expired-key eviction fallback |

---

## 🔒 Security & Data Privacy Highlights

- **Domain-Restricted Access**: Integration with `@cet.ac.in` Google Workspace accounts ensures that only verified campus members can submit and interact with tickets.
- **Zero Credential Exposure**: Passwords and session secret tokens are hashed with industry-standard one-way cryptographic algorithms; API responses strictly filter sensitive fields via dedicated sanitization layers.
- **Safe Media Ingestion**: All file uploads undergo strict MIME-type validation, size boundary enforcement, and anti-tamper reference consumption.
- **Defense-in-Depth Rate Limiting**: Dedicated rate-limiting tiers on authentication endpoints and issue submissions mitigate automated denial-of-service and credential stuffing attacks.