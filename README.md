# PatientPilot — Multilingual AI-Powered OPD Intake & Triage System

[![FastAPI](https://img.shields.io/badge/Backend-FastAPI-009688.svg?style=flat&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/Frontend-React_18-61DAFB.svg?style=flat&logo=react&logoColor=black)](https://reactjs.org/)
[![Supabase](https://img.shields.io/badge/Database-Supabase_PostgreSQL-3ECF8E.svg?style=flat&logo=supabase&logoColor=white)](https://supabase.com)
[![Gemini](https://img.shields.io/badge/AI-Google_Gemini-4285F4.svg?style=flat&logo=google&logoColor=white)](https://ai.google.dev/)
[![FHIR](https://img.shields.io/badge/Standards-FHIR_R4-E01A22.svg?style=flat)](https://hl7.org/fhir/)
[![Vibe Coded](https://img.shields.io/badge/Vibe%20Coded-100%25-ff69b4.svg?style=flat)](https://github.com/)

PatientPilot is an intelligent hospital outpatient intake and red-flag triage platform. It combines multilingual voice-enabled conversational clinical reasoning, deterministic red-flag triage safety enforcement, OCR prescription/lab document intelligence, and FHIR interoperability for modern hospital EMR systems.

> ⚡ **Note: Proudly Vibe Coded**  
> This entire codebase was architected, scaffolded, and iterated using AI-assisted vibe coding workflows—pairing rapid prompting and LLM reasoning with production-focused engineering patterns (deterministic clinical safety matrices, async SQLAlchemy, and FHIR R4 schema compliance).

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
   - Copy the connection string and ensure it uses the async driver prefix: `postgresql+asyncpg://`
4. Go to **Storage**:
   - Create a new bucket named `medical_documents` (configure public or authenticated read as needed).

---

### 2. Backend Environment Setup

Navigate to the `server/` directory and configure your environment variables:

```bash
cd server
cp .env.example .env
