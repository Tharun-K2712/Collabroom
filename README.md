# CollabRoom — Secure Collaborative Room & Document Management Platform

> **"One Room. One Team. Everything Connected."**

CollabRoom is a production-ready, cloud-based collaborative workspace and document management platform where users can create private rooms, invite team members, assign fine-grained permissions, upload and version documents securely via AWS S3 signed URLs, collaborate in real-time with Socket.IO, and query documents through the **RoomAI** document assistant.

---

## 🌟 Architecture Overview

```mermaid
graph TD
    Client[Next.js 14 Frontend<br/>React + Tailwind CSS + Framer Motion]
    Gateway[Express.js REST API & Socket.IO<br/>Authentication & RBAC Middleware]
    DB[(PostgreSQL Database<br/>Prisma ORM)]
    S3[(AWS S3 Cloud Storage<br/>Encrypted Presigned URLs)]
    AI[RoomAI Document Assistant<br/>RAG Semantic Engine]

    Client -->|JWT Bearer + Socket.IO| Gateway
    Gateway -->|CRUD & Relations| DB
    Gateway -->|Generate Short-Lived Signed URLs| S3
    Gateway -->|Permission-Scoped Chunk Retrieval| AI
    Client -.->|Direct Binary Upload/Download via Signed URLs| S3
```

---

## 🚀 Key Features

1. **Independent Collaborative Rooms (Workspaces)**:
   - Create private or invite-only workspaces with custom icons, color themes, and descriptions.
   - Distinct host ownership with full administrative authority.

2. **10-Point Role-Based Access Control (RBAC)**:
   - Built-in Roles: `OWNER`, `MANAGER`, `EDITOR`, `VIEWER`.
   - Granular customizable permissions per member: `canView`, `canUpload`, `canDownload`, `canEdit`, `canDelete`, `canRename`, `canMove`, `canShare`, `canManageMembers`, `canManagePermissions`.
   - **Zero-Trust Backend Security**: Independent verification on every API request.

3. **Cloud Document Management (AWS S3)**:
   - Direct-to-cloud upload & download via temporary signed URLs (no permanent public URLs exposed).
   - Zero-setup local storage fallback for immediate development without AWS credentials.
   - Embedded inline previewers for **PDFs**, **Images**, **Videos**, **Audio**, and **Code files**.

4. **File Versioning & Revision History**:
   - Track every update with version numbers, timestamps, uploader attribution, and change summaries.
   - Rollback to or download any previous revision with a single click.

5. **Hierarchical Folder Structure**:
   - Organize files into nested subfolders with breadcrumb navigation.
   - Move, rename, and color-code folders.

6. **Real-Time Collaboration & Socket.IO**:
   - Live synchronization of room updates, file uploads, comments, and member actions.
   - In-app notification center with instant unread badges.

7. **Document Comments & Feedback**:
   - Threaded discussions attached directly to documents.

8. **RoomAI (Document RAG Assistant)**:
   - Ask questions, extract key points, and summarize documents in natural language.
   - **Strict authorization boundary**: AI retrieval is strictly restricted to documents the inquiring user has explicit permission to access.

9. **Security Audit Event Logging**:
   - Immutable audit trail of every upload, download, permission change, and login event.

10. **Admin Super-Dashboard**:
    - Platform telemetry: total users, active sessions, total storage utilized, workspace monitoring, and user suspension controls.

---

## 🛠️ Technology Stack

| Layer | Technology |
|---|---|
| **Frontend** | Next.js 14 (App Router), React 18, TypeScript, Tailwind CSS, Framer Motion, TanStack Query |
| **Backend** | Node.js, Express.js, TypeScript, Controller-Service-Repository Architecture |
| **Database** | PostgreSQL with Prisma ORM |
| **Cloud Storage** | AWS S3 (with `@aws-sdk/client-s3` and `@aws-sdk/s3-request-presigner`) + Local fallback |
| **Authentication** | JWT Access Tokens, Refresh Token Rotation, bcrypt password hashing, HTTP-Only cookies |
| **Real-Time** | Socket.IO (Room channels + User-specific notification streams) |
| **DevOps** | Docker, Docker Compose |

---

## 🔒 Permission & RBAC Matrix

| Permission | OWNER | MANAGER | EDITOR | VIEWER |
|---|:---:|:---:|:---:|:---:|
| **View Workspace & Files** (`canView`) | ✅ | ✅ | ✅ | ✅ |
| **Upload Files & Folders** (`canUpload`) | ✅ | ✅ | ✅ | ❌ |
| **Download Files** (`canDownload`) | ✅ | ✅ | ✅ | ✅* |
| **Edit & Add Versions** (`canEdit`) | ✅ | ✅ | ✅ | ❌ |
| **Rename Files** (`canRename`) | ✅ | ✅ | ✅ | ❌ |
| **Move Files** (`canMove`) | ✅ | ✅ | ✅ | ❌ |
| **Delete to Trash** (`canDelete`) | ✅ | ✅ | ❌ | ❌ |
| **Invite & Manage Members** (`canManageMembers`) | ✅ | ✅ | ❌ | ❌ |
| **Change Permissions** (`canManagePermissions`) | ✅ | ❌ | ❌ | ❌ |
| **Delete Workspace** | ✅ | ❌ | ❌ | ❌ |

*\* Download permissions can be individually revoked by the room owner.*

---

## 📂 Project Structure

```text
collabroom/
├── docker-compose.yml
├── .env.example
├── package.json
├── packages/
│   └── shared/              # Shared DTOs, Enums, RBAC definitions
├── apps/
│   ├── api/                 # Express + Prisma + Socket.IO Backend
│   │   ├── prisma/
│   │   │   ├── schema.prisma
│   │   │   └── seed.ts
│   │   ├── src/
│   │   │   ├── config/      # Env, DB, S3 Storage Provider
│   │   │   ├── controllers/ # REST Route Controllers
│   │   │   ├── services/    # Business Logic & S3 presigner
│   │   │   ├── repositories/# Database abstraction layer
│   │   │   ├── middleware/  # JWT Auth, RBAC, Rate limiting, Error handler
│   │   │   ├── routes/      # Express API Routers
│   │   │   ├── socket/      # Socket.IO event handlers
│   │   │   └── server.ts
│   │   └── tests/           # Automated security & RBAC tests
│   │
│   └── web/                 # Next.js 14 Frontend Application
│       ├── app/
│       │   ├── (auth)/      # Login, Register, Forgot/Reset password
│       │   ├── (dashboard)/ # Main dashboard, Rooms, Files, Trash, Admin
│       │   ├── invite/      # Room invitation handler
│       │   └── page.tsx     # Modern SaaS Landing Page
│       └── components/      # UI components, Modals, Drawers, RoomAI
```

---

## ⚡ Quick Start & Local Setup

### 1. Prerequisites
- Node.js 18+ (tested on Node v20/v22/v25)
- npm 9+
- PostgreSQL (or Docker)

### 2. Installation
```bash
# Clone repository and navigate to folder
cd collabroom

# Install all dependencies across monorepo workspaces
npm install
```

### 3. Environment Setup
Create `.env` file in the root or in `apps/api`:
```env
PORT=5000
NODE_ENV=development
FRONTEND_URL=http://localhost:3000
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/collabroom?schema=public"

JWT_SECRET="collabroom_super_secret_jwt_access_key_2026_production_ready"
JWT_REFRESH_SECRET="collabroom_super_secret_refresh_token_key_2026_production_ready"

STORAGE_PROVIDER="local" # Set to "s3" when AWS credentials are provided
```

### 4. Database Setup & Seeding
```bash
# Generate Prisma client
npm run prisma:generate

# Run migrations / push schema
npm run prisma:push

# Seed demo data (Demo Users, AI Research Room, Documents, Comments)
npm run prisma:seed
```

### 5. Running the Application
```bash
# Start API server and Next.js frontend concurrently
npm run dev

# Or run separately:
npm run dev:api   # Runs on http://localhost:5000
npm run dev:web   # Runs on http://localhost:3000
```

### 6. Demo Login Accounts
- **User Account**: `tharun@collabroom.io` / `Password123!`
- **Team Members**: `arun@collabroom.io`, `priya@collabroom.io`, `kumar@collabroom.io` / `Password123!`
- **System Admin**: `admin@collabroom.io` / `Password123!`

---

## 🧪 Automated Testing
Run the comprehensive security and RBAC test suite:
```bash
npm run test
```
Tests cover:
- Password salting & hashing validation
- JWT Access and Refresh token lifecycle
- Role-based Access Control matrix guarantees
- Storage key namespace isolation (`rooms/{id}/files/...`)
- Malicious file extension rejection

---

## 🐳 Docker Deployment
Run PostgreSQL, Redis, Express Backend, and Next.js Frontend with Docker Compose:
```bash
docker-compose up --build
```

---

## 📜 License
MIT License. Built for advanced collaborative engineering.
