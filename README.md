# PatientPilot — Multilingual AI-Powered OPD Intake & Triage System

PatientPilot is an intelligent hospital outpatient intake and red-flag triage platform. It combines multilingual voice-enabled conversational clinical reasoning, deterministic red-flag triage safety enforcement, OCR prescription/lab document intelligence, and FHIR interoperability for modern hospital EMR systems.

---

## 🏗 System Architecture

- **Frontend**: React 18, Vite, TypeScript, Lucide Icons, Canvas Confetti
- **Backend Framework**: Python 3.10+, FastAPI (Versioned REST API under `/api/v1`)
- **Data Layer & ORM**: PostgreSQL hosted via Supabase, SQLAlchemy 2.0 (async), Alembic migrations
- **Authentication**: Supabase Auth with JWT verification, role-based authorization (`doctor` vs `patient`)
- **Clinical Safety Engine**: Authoritative deterministic red-flag safety matrix (ACS, Stroke, Airway, SAH, Meningism, Acute Pain)
- **AI & NLP**: Server-side Google GenAI (Gemini) client for SOCRATES history reasoning, AYUSH Dashavidha Pariksha constitutional evaluation, and multilingual translation across all 23 constitutional and regional languages
- **Interoperability**: FHIR R4-styled JSON documents (`Patient`, `Condition`, `MedicationStatement`, `Observation`, `Composition`, `Bundle`)

---

## 🚀 Getting Started

### 1. Supabase Project Setup

1. Log in to [Supabase](https://supabase.com) and create a new project.
2. In the Supabase Dashboard, go to **Project Settings** -> **API**:
   - Copy the **Project URL** (`SUPABASE_URL`)
   - Copy the **anon public key** (`SUPABASE_KEY`)
   - Copy the **service_role secret key** (`SUPABASE_SERVICE_ROLE_KEY`)
   - Copy the **JWT Secret** under *JWT Settings* (`SUPABASE_JWT_SECRET`)
3. Go to **Project Settings** -> **Database** -> **Connection string**:
   - Select **URI** (Direct connection or Session pooler)
   - Copy the connection string and prefix with `postgresql+asyncpg://`
4. Go to **Storage**:
   - Create a new bucket named `medical_documents` (Public or authenticated access).

---

### 2. Backend Environment Setup

Navigate to the `server/` directory and configure environment variables:

```bash
cd server
cp .env.example .env
```

Edit `.env` with your actual credentials:

```env
SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key
SUPABASE_JWT_SECRET=your-supabase-jwt-secret

DATABASE_URL=postgresql+asyncpg://postgres:[YOUR-PASSWORD]@db.your-project-ref.supabase.co:5432/postgres

LLM_API_KEY=AIzaSy...
LLM_MODEL=gemini-2.5-flash
SPEECH_TO_TEXT_API_KEY=

CORS_ORIGINS=http://localhost:5173,http://127.0.0.1:5173
```

---

### 3. Install Backend Dependencies & Run Migrations

Create a virtual environment and install dependencies:

```bash
# In /server directory
python -m venv venv

# Windows
.\venv\Scripts\activate
# macOS / Linux
# source venv/bin/activate

pip install -r requirements.txt
```

Apply database migrations to Supabase Postgres:

```bash
alembic upgrade head
```

---

### 4. Seed Demo Accounts & Data

Run the database seed script to populate demo accounts and initial clinical test cases:

```bash
python scripts/seed_demo.py
```

This provisions:
- **Demo Doctor Account**: `doctor@patientpilot.org` (Role: `doctor`)
- **Demo Patient Account**: `patient@patientpilot.org` (Role: `patient`, OPD ID: `OPD-2026-0001`) with active intake, medications, abnormal lab values, and red-flag triage results.

---

### 5. Start the FastAPI Server

Launch the development server with automatic reload:

```bash
uvicorn app.main:app --reload --port 8000
```

- Interactive OpenAPI Swagger UI: [http://localhost:8000/docs](http://localhost:8000/docs)
- Interactive ReDoc: [http://localhost:8000/redoc](http://localhost:8000/redoc)
- Health Check: [http://localhost:8000/health](http://localhost:8000/health)

---

### 6. Start Frontend Development Server

From the repository root:

```bash
npm install
npm run dev
```

The Vite frontend runs at [http://localhost:5173](http://localhost:5173).

---

## 📡 API Endpoint Overview (`/api/v1`)

| Module | Method | Endpoint | Description | Access |
|---|---|---|---|---|
| **Auth** | `POST` | `/auth/register` | Patient self-registration (role forced to `patient`) | Public |
| **Auth** | `POST` | `/auth/login` | Supabase login (returns JWTs & role) | Rate limited |
| **Auth** | `POST` | `/auth/refresh` | Session refresh via refresh token | Public |
| **Auth** | `POST` | `/auth/logout` | Session invalidation | Authenticated |
| **Patients** | `GET` | `/patients/{id}` | Retrieve patient profile & FHIR demographics | Patient/Doctor |
| **Patients** | `PATCH` | `/patients/{id}` | Update patient profile / vitals | Patient/Doctor |
| **Patients** | `GET` | `/patients/{id}/intake-sessions` | List patient intake sessions | Patient/Doctor |
| **Patients** | `POST` | `/patients/{id}/intake-sessions` | Start new clinical intake session | Patient/Doctor |
| **Intake** | `PATCH` | `/intake-sessions/{id}` | Update ongoing intake session | Patient/Doctor |
| **Intake** | `POST` | `/intake-sessions/{id}/medications` | Record active medication (FHIR MedicationStatement) | Patient/Doctor |
| **Intake** | `POST` | `/intake-sessions/{id}/lab-values` | Record lab observation (FHIR Observation) | Patient/Doctor |
| **Intake** | `POST` | `/intake-sessions/{id}/documents` | Multipart document upload + OCR + entity extraction | Patient/Doctor |
| **Intake** | `POST` | `/intake-sessions/{id}/triage` | Authoritative deterministic safety evaluation | Patient/Doctor |
| **Intake** | `POST` | `/intake-sessions/{id}/transcribe` | Speech-to-Text audio transcription | Patient/Doctor |
| **Intake** | `GET` | `/intake-sessions/{id}/fhir` | Complete FHIR bundle export | Patient/Doctor |
| **AI** | `POST` | `/intake/chat` | LLM conversational SOCRATES intake reasoning | Authenticated |
| **AI** | `POST` | `/intake/ayush` | Ayurvedic Dashavidha Pariksha assessment | Authenticated |
| **AI** | `POST` | `/intake/translate` | Multilingual translation across 23 languages | Authenticated |
| **Doctor** | `GET` | `/doctor/briefings` | Filterable doctor queue (by `triage_level`) | **Doctor only** |
| **Doctor** | `GET` | `/doctor/briefings/{id}` | Detail view of patient clinical briefing | **Doctor only** |
| **Doctor** | `PATCH` | `/doctor/briefings/{id}` | Attending physician review and notes | **Doctor only** |

---

## 🔒 Security & Privacy Features

- **No Exposed Secrets**: Gemini API keys, Supabase Service Role keys, and STT tokens are contained exclusively within the FastAPI environment.
- **Strict Role Enforcement**: FastAPI dependencies ensure patients cannot invoke doctor routes, and self-registration rejects role escalation.
- **Deterministic Red-Flag Guarantees**: Triage is computed authoritatively server-side via rule matrices, ensuring patient safety regardless of network or client tampering.
- **Automatic 401 Session Replay**: The frontend `apiClient.ts` intercepts expired tokens, triggers a refresh cycle, and seamlessly replays in-flight requests.
