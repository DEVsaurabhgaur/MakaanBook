# MakaanBook 🏠⚡
**Smart Rent & Electricity Bill Manager for Indian Landlords and Tenants**

MakaanBook is a modern, responsive web application built to simplify rental management, utility billing, and landlord-tenant communication. It handles complex billing scenarios, maintains financial histories, and integrates a smart AI assistant to query records in conversational Hinglish.

---

## Features ✨

### 🏠 Property & Tenant Management
- **House & Room Tracking**: Manage multiple buildings, units, monthly rent rates, and billing cycles.
- **Active & Vacated Tenants**:
  - Split view for currently residing and vacated tenants.
  - Vacating a tenant frees their room, preserves their historical ledgers, and highlights them as inactive (greyed out) for future audits.
- **Aadhar & ID Verification**: Secure upload and storage of ID proofs and profile pictures.

### ⚡ Electricity Bill Calculator (Fault-Tolerance)
- **Standard Calculations**: Automatically calculates charges using configurable per-unit rates and fixed charges.
- **Meter Replacement Handling**:
  - Supports split-meter calculations when a faulty meter is replaced.
  - Uses the formula:  
    $$\text{Units} = (\text{Old Meter Final} - \text{Previous}) + (\text{Current} - \text{New Meter Start})$$
  - Keeps accurate past records and seamlessly charts the transition.

### 📝 Ledgers & PDF Reports
- **Detailed Ledgers**: Track rent due dates, collections, pending balances, transaction IDs, or cash notes.
- **Dynamic PDF Reports**: Generate structured monthly reports for houses, collections, and electricity statements directly using standard printing engines.

### 🤖 Hinglish AI Assistant (Google Gemini)
- **Conversational Queries**: Ask questions like *"Rahul ka electricity bill pending hai kya?"* or *"Iss mahine total rent kitna collect hua?"*.
- **Live Database Context**: Securely feeds real-time building and ledger metrics to Gemini 1.5 Flash to generate context-aware answers.

---

## Technology Stack 🛠️

- **Framework**: [TanStack Start](https://tanstack.com/router/v1/docs/start/overview) (React SSR powered by Vite & Nitro)
- **Database & Auth**: [Supabase](https://supabase.com/) (PostgreSQL with Row-Level Security, Native OAuth, and Storage Buckets)
- **Styling**: Tailwind CSS & Radix UI primitives (shadcn/ui style component tokens)
- **AI Engine**: Google Gemini 1.5 Flash API
- **Client State**: TanStack Query (React Query)
- **Reporting**: JS-PDF & AutoTable

---

## Local Setup & Testing Guidelines 🚀

Follow these steps to run and test MakaanBook on your local machine:

### 1. Prerequisites
Ensure you have **Node.js** (v18+) or **Bun** installed.

### 2. Clone and Install Dependencies
```bash
# Install dependencies
npm install
# OR using Bun
bun install
```

### 3. Setup Environment Variables
Create a `.env` file in the root directory and populate it with your Supabase and Gemini credentials (refer to `.env.example`):
```env
SUPABASE_PROJECT_ID="your-project-id"
SUPABASE_URL="https://your-project.supabase.co"
SUPABASE_PUBLISHABLE_KEY="your-anon-key"
SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"

# Client side access prefixes
VITE_SUPABASE_PROJECT_ID="your-project-id"
VITE_SUPABASE_URL="https://your-project.supabase.co"
VITE_SUPABASE_PUBLISHABLE_KEY="your-anon-key"

# Google AI key for conversational Hinglish support
GEMINI_API_KEY="your-google-ai-studio-gemini-key"
```

### 4. Apply Database Schema & Migrations
Import the schema files located in the `supabase/migrations/` directory directly into your Supabase SQL Editor. Apply them in this order:
1. `20260614172239_17f4f0f5-324c-4e54-a8ea-0f3ff4503af2.sql` (Tables, RLS, functions)
2. `20260614172314_a8ace137-347f-4ac7-b5e0-3fc721b3c105.sql` (Triggers)
3. `20260614174520_f3f4d8f8-09c5-448e-8824-097a2c661fc0.sql` (Storage buckets configuration)
4. `20260614180000_features_and_meter.sql` (Split meter columns & auto-link triggers)

### 5. Launch the Development Server
```bash
npm run dev
# OR
bun dev
```
Open your browser and navigate to **`http://localhost:3000`** to test the application!

---

## Live Deployment (Production) 🌐

To deploy the application to a public HTTPS server:

### Vercel Deployment
1. Connect your repository on [Vercel](https://vercel.com).
2. Vercel automatically detects the **TanStack Start** framework.
3. Configure the environment variables in the project settings.
4. Click **Deploy**.

---

## License 📄
This project is private and owned by Saurabh Gaur.
