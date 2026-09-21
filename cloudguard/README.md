# CloudGuard (🛡️)
### Intelligent Cloud Security Misconfiguration Scanner & Remediation Assistant

> **Deterministic Vulnerability Detection • Zero-Hallucination Rule Engine • Isolated AI Guidance • 1-Click Automated Remediation**

---

## 📌 Problem Statement
Cloud infrastructure misconfigurations remain the leading cause of enterprise data breaches. However, relying directly on Large Language Models (LLMs) to scan infrastructure introduces critical risks: **hallucinations, non-deterministic security scoring, and missed vulnerabilities**.

**CloudGuard** solves this by establishing a strict architectural separation:
1. **Security Detection is 100% Deterministic & Rule-Based**: Evaluated strictly through auditable, modular security rules.
2. **AI is Isolated as an Explainer**: The AI service (Google Gemini API) only receives verified findings to generate developer-friendly explanations and remediation guidance. It never determines whether a vulnerability exists.
3. **Provider-Neutral Normalized Schema**: Decouples cloud configuration formats (JSON, YAML, Terraform, CloudFormation) from security rules.

---

## 🏛️ System Architecture

```
[ Developer / DevSecOps Engineer ]
                │
                ▼
      ┌──────────────────┐
      │  React Frontend   │  (Vite + Tailwind CSS + Recharts + Lucide)
      └─────────┬────────┘
                │ HTTP REST / JWT
                ▼
      ┌──────────────────┐
      │  Express REST    │
      │  API & Multer    │  (In-Memory Untrusted Input Buffer)
      └─────────┬────────┘
                │
                ├──► [ Configuration Parser ] (JSON / YAML Syntax Validation)
                │              │
                │              ▼
                ├──► [ Provider-Neutral Normalizer ] (Standardized Schema)
                │              │
                │              ▼
                ├──► [ Deterministic Rule Engine ]
                │         ├── STORAGE-001 (Public Access)
                │         ├── STORAGE-002 (Disabled Encryption)
                │         ├── NETWORK-001 (Open SSH 22)
                │         ├── NETWORK-002 (Open DB 3306/5432/27017)
                │         └── IAM-001     (Wildcard Permissions)
                │              │
                │              ▼
                ├──► [ Transparent Severity & Security Score Engine ]
                │              │
                │              ▼
                ├──► [ MongoDB / Resilient Persistence Layer ]
                │
                └─► [ Optional Isolated AI Assistant (Gemini) ]
                           │ (Explains Verified Findings & Generates Fix Guidance)
                           ▼
                     [ 1-Click Auto-Remediation & Instant Re-Scan ]
```

---

## 📋 Deterministic Security Rule Matrix

| Rule ID | Name | Category | Severity | Detection Condition | Score Penalty |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **`STORAGE-001`** | Publicly Accessible Storage | Storage | `CRITICAL` | `storage.publicAccess === true` | **-20 pts** |
| **`STORAGE-002`** | Storage Encryption Disabled | Storage | `HIGH` | `storage.encryptionEnabled === false` | **-10 pts** |
| **`NETWORK-001`** | SSH Port Open to Internet | Network | `CRITICAL` | `port === 22 && source === "0.0.0.0/0"` | **-20 pts** |
| **`NETWORK-002`** | Database Port Open to Internet | Network | `CRITICAL` | `port ∈ [3306, 5432, 27017] && source === "0.0.0.0/0"` | **-20 pts** |
| **`IAM-001`** | Wildcard IAM Permission | IAM | `HIGH` | `permissions.includes("*")` | **-10 pts** |

### 🧮 CloudGuard Security Score Formula
$$\text{Score} = \max(0,\, 100 - \sum \text{Penalties})$$
- **Start**: `100`
- **Penalties**: `CRITICAL: -20`, `HIGH: -10`, `MEDIUM: -5`, `LOW: -2`
- *Clearly labeled as CloudGuard Security Score; not claimed to be CVSS.*

---

## 🛠️ Tech Stack

- **Frontend**: React 18, Vite, Tailwind CSS, React Router v7, Axios, Recharts, Lucide Icons
- **Backend**: Node.js, Express.js, Multer (Memory Storage), js-yaml, CORS
- **Security & Auth**: JWT (`jsonwebtoken`), bcrypt password hashing (`bcryptjs`)
- **Database**: MongoDB & Mongoose (with seamless local memory fallback when database is offline)
- **AI Service**: Google Gemini API (`@google/generative-ai` with isolated fallback mode)

---

## 🚀 Quickstart Guide (Local Development)

### Prerequisites
- Node.js v18+ (tested on Node v24)
- npm v9+

### 1. Clone & Configure Environment
```bash
# Clone the repository
git clone https://github.com/your-username/cloudguard.git
cd cloudguard

# Configure environment variables
cp .env.example .env
```

### 2. Run the Backend API Server
```bash
cd server
npm install
npm start
```
The server will start on `http://localhost:5000`.
- Health Check: `GET http://localhost:5000/api/health`

### 3. Run the Frontend Development Client
In a new terminal:
```bash
cd client
npm install
npm run dev
```
The application will open on `http://localhost:5173`.

---

## 🧪 Automated Test Suite
CloudGuard includes 58 automated unit, integration, security, and end-to-end tests using Node.js's native test runner:

```bash
cd server
npm test
```

### Expected Output:
```text
ℹ tests 58
ℹ suites 9
ℹ pass 58
ℹ fail 0
```

---

## 🎯 Judge & Hackathon Demo Workflow (Step-by-Step)

Follow this 5-minute walk-through to evaluate the system:

1. **Open the App**: Visit `http://localhost:5173` to see the dark SOC Cybersecurity Dashboard.
2. **Click "New Scan"**:
   - In the top bar, click the **"Vulnerable Sample (JSON)"** button.
   - The editor will populate with `sample-configs/vulnerable.json` (contains public S3, unencrypted storage, exposed SSH on 22, open DB on 5432, and wildcard `*` IAM).
3. **Execute Scan**:
   - Click **"Run Security Scan"**.
   - You will immediately be redirected to the **Scan Results** screen.
   - Observe the **CloudGuard Security Score** dropped (e.g. `20/100`), with all 5 deterministic findings clearly categorized.
4. **Inspect Finding & Ask AI**:
   - Click **"Inspect"** on `NETWORK-001 (SSH Port Open to Internet)`.
   - Review the configuration evidence snippet, threat impact, and deterministic fix guidance.
   - Click **"Ask AI Assistant"** to see Gemini generate developer-friendly remediation explanations and corrected configurations.
5. **1-Click Auto-Remediation & Instant Re-Scan**:
   - On the results page, click the green **"Auto-Remediate All & Re-Scan"** button.
   - Watch the score instantly jump from **20 to 100/100**!
   - Click **"View Remediated Config"** to inspect the hardened JSON with closed CIDRs and scoped permissions.
6. **Check Scan History & Dashboard**:
   - Navigate to **Dashboard** to see updated KPI metrics and vulnerability charts.
   - Navigate to **Scan History** to view both original and remediated scans saved in persistent storage.

---

## ☁️ Deployment Instructions

### Frontend (Vercel)
1. Push project to GitHub.
2. Import repository in [Vercel](https://vercel.com).
3. Set **Root Directory** to `client`.
4. Build command: `npm run build`, Output directory: `dist`.
5. Environment Variables: `VITE_API_BASE_URL=https://your-render-api.onrender.com/api`.
6. SPA routing is preconfigured in `client/vercel.json`.

### Backend (Render)
1. Create a new **Web Service** in [Render](https://render.com).
2. Set **Root Directory** to `server`.
3. Build Command: `npm install`, Start Command: `npm start`.
4. Configure Environment Variables:
   - `NODE_ENV=production`
   - `PORT=5000`
   - `CLIENT_URL=https://your-vercel-app.vercel.app`
   - `MONGODB_URI=mongodb+srv://<user>:<password>@cluster.mongodb.net/cloudguard`
   - `JWT_SECRET=<strong-random-key>`
   - `GEMINI_API_KEY=<your-gemini-key>`

---

## 🔒 Security Safeguards
- **Zero Real Cloud Deployments**: Evaluates configuration statically; never invokes `terraform apply` or executes uploaded files.
- **In-Memory Uploads**: Multer runs memory storage buffers; untrusted configuration files are never written to the server's executable filesystem.
- **Sanitized Secrets**: Password hashes are never returned in user payloads; API keys are never exposed to the client.
- **Fail-Safe Operation**: If external databases or AI APIs are unreachable, deterministic detection, scoring, and remediation continue to function seamlessly.
