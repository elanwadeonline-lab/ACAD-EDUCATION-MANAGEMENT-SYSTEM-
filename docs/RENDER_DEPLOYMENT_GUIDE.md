# Render Deployment Guide — ACQAD Education Management System

This guide explains how to deploy the **ACQAD Education Management System** on [Render](https://render.com) as a production-grade Web Service.

---

## Architecture on Render

```
                             Internet
                                │
                                ▼
                   ┌──────────────────────────┐
                   │   Render Web Service     │
                   │ (port 10000 -> 0.0.0.0)  │
                   └────────────┬─────────────┘
                                │
          ┌─────────────────────┴─────────────────────┐
          │                                           │
          ▼                                           ▼
┌──────────────────┐                       ┌──────────────────┐
│  Bun Backend     │                       │ Static Next.js   │
│  API Engine      │                       │ Frontend Bundle  │
│  (/api/*, auth,  │                       │ (/student,       │
│   websocket, SSE)│                       │  /guardian, etc.)│
└─────────┬────────┘                       └──────────────────┘
          │
          ▼
┌─────────────────────────────────────────────┐
│  Persistent Storage (/app/data)             │
│  - SQLite DB: exampool.db                   │
│  - Auxiliary DBs: content_bank, practice    │
│  - User Uploads: /app/data/uploads          │
└─────────────────────────────────────────────┘
```

---

## Option 1: Blueprint Deployment (Recommended — 1-Click)

Render Blueprints configure the web service, health check, environment variables, and persistent disk automatically using [`render.yaml`](../render.yaml).

### Steps:
1. Log in to your [Render Dashboard](https://dashboard.render.com).
2. Click **New +** (top right) → **Blueprint**.
3. Connect your GitHub repository:
   `https://github.com/elanwadeonline-lab/ACAD-EDUCATION-MANAGEMENT-SYSTEM-.git`
4. Render will parse `render.yaml` and display the service summary:
   - **Service Name**: `acad-education-management-system`
   - **Runtime**: `Docker`
   - **Health Check Path**: `/api/health`
   - **Persistent Disk**: 1 GB mounted at `/app/data`
   - **Plan**: Starter ($7/month — enables persistent disk so data survives redeploys)
5. Click **Apply**.
6. Render will build the Docker container, run `next build`, start the Bun server, and verify `/api/health`.

---

## Option 2: Free Tier Deployment (Manual Web Service)

Render's Free tier does not support persistent disks. If deploying on the free tier, the database and uploads will live inside the container.

### Steps:
1. Log in to [Render Dashboard](https://dashboard.render.com).
2. Click **New +** → **Web Service**.
3. Select your repository: `ACAD-EDUCATION-MANAGEMENT-SYSTEM-`.
4. Configure the settings:
   | Setting | Value |
   |---|---|
   | **Name** | `acad-education-management-system` |
   | **Region** | Oregon, Frankfurt, or Ohio |
   | **Branch** | `main` |
   | **Runtime** | **Docker** |
   | **Dockerfile Path** | `./Dockerfile` |
   | **Instance Type** | **Free** (0.5 CPU, 512 MB RAM) |

5. Under **Health Check Path**, enter:
   ```
   /api/health
   ```

6. In **Environment Variables**, add:
   | Key | Value | Description |
   |---|---|---|
   | `NODE_ENV` | `production` | Enables production optimizations |
   | `PORT` | `10000` | Port listened to by Render |
   | `ALLOWED_ORIGIN` | `*` | Allows cross-origin API calls |
   | `JWT_SECRET` | *(Click "Generate" or enter a random string)* | Secure session signing |

7. Click **Create Web Service**.

---

## Environment Variables Reference

| Variable | Default / Recommended | Purpose |
|---|---|---|
| `PORT` | `10000` | Port the web service binds to (Render sets this automatically). |
| `NODE_ENV` | `production` | Configures production mode for Bun and Next.js. |
| `ALLOWED_ORIGIN` | `*` | CORS origin allowlist (can be set to your Render URL: `https://<app>.onrender.com`). |
| `EXAMPOOL_DB` | `/app/data/exampool.db` | Path to the SQLite database file on the persistent disk. |
| `UPLOADS_DIR` | `/app/data/uploads` | Path to store uploaded PDFs, question banks, and images on the persistent disk. |
| `JWT_SECRET` | *(Random 32-char string)* | Key used to sign and verify authentication tokens. |
| `VAPID_PUBLIC_KEY` | *(Optional)* | Custom Web Push notification public key. |
| `VAPID_PRIVATE_KEY` | *(Optional)* | Custom Web Push notification private key. |

---

## Verification & Health Check

Once deployed, Render will verify the service using:
```http
GET https://<your-service-name>.onrender.com/api/health
```

Expected Response (`200 OK`):
```json
{
  "status": "ok",
  "service": "ACQAD Education Management System",
  "uptime": 124,
  "timestamp": "2026-11-05T02:50:00.000Z"
}
```

---

## Post-Deployment Setup

1. **Initial Setup**:
   Open `https://<your-service-name>.onrender.com/setup` in your browser to run the initial school configuration wizard (School Name, Campus ID, Academic Terms, and Initial Administrator Account).
2. **Admin Portal**:
   Log in at `https://<your-service-name>.onrender.com/ADMIN`.
3. **Guardian Portal**:
   Direct parents to `https://<your-service-name>.onrender.com/guardian`.
4. **Student Portal**:
   Students access their CBT exam and practice arena at `https://<your-service-name>.onrender.com/student`.

