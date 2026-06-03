# Cognigy Testing Framework

A web application for creating and running Cognigy AI simulator tests from Excel test case files. It uses Azure OpenAI to automatically generate simulator configurations from your test cases and pushes them directly to Cognigy via the API.

---

## How it works

1. **Configure** your Cognigy API connection and Azure OpenAI credentials in Settings.
2. **Upload** an Excel file containing your test cases (TC#, Test Case, Steps to Execute, Expected Result columns).
3. **Generate** — the app sends each selected test case to Azure OpenAI, which produces a structured Cognigy simulator config (persona, mission, success criteria, max turns).
4. **Review** the generated configs and push them to Cognigy with one click.
5. **Run** your simulators directly from the app — select a flow, locale, and LLM model, then trigger individual or batch runs.

---

## Pages

### Dashboard (`/`)
Overview of configuration status. Shows whether Cognigy and Azure OpenAI are configured and links to each step.

### Settings (`/settings`)
Configure two integrations:

- **Cognigy API** — Base URL, API key, and project selection. Click "Load Projects" to fetch all available projects for your API key and pick one.
- **Azure OpenAI** — Endpoint, API key, deployment name, and API version. Used to generate simulator configs from Excel rows.

All values are stored in browser `localStorage` — nothing is sent to a server except when proxying API calls.

### Create Simulators (`/create`)
1. Upload an `.xlsx` file (drag & drop or file picker).
2. Switch between sheets using the tab bar.
3. Select individual rows or use Select All.
4. Click **Generate** — each selected row is sent to Azure OpenAI, which fills in:
   - `name` — concise test name
   - `persona` / `personaName` — the caller's role and a realistic name
   - `mission` — what the persona needs to accomplish
   - `successCriteria` — 1–3 AI judge checks (e.g. "bot confirmed the claim was submitted")
   - `maxTurns` — estimated conversation length
5. Review expanded previews for each generated config.
6. Click **Create All in Cognigy** (or create individually) to POST each simulator to Cognigy.

### Run Tests (`/run`)
1. All simulators for the configured project are listed (fetched live from Cognigy).
2. Use the **Run Configuration** panel to select:
   - **Flow** — the Cognigy flow to test against
   - **Locale** — the locale to use
   - **LLM Model** — the model Cognigy uses to drive the simulator
3. Select simulators (individually or all) and click **Run Selected** to schedule them.
4. Per-simulator status updates in real time (Idle → Scheduling → Scheduled / Error).

---

## Excel file format

The app expects columns in this order (first row is treated as a header and skipped):

| Column | Description |
|--------|-------------|
| A | TC# — test case identifier (e.g. `TC-01`) |
| B | Test Case — short name |
| C | Steps to Execute — numbered steps, may be multi-line |
| D | Expected Result — expected bot behaviour |

Additional columns (pass/fail dates, notes, tester name) are ignored. Rows where column A contains a category heading and columns B–D are empty are also skipped automatically.

Multiple sheets are supported — each non-empty sheet appears as a tab in the Create page.

---

## Tech stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS v4 |
| Excel parsing | `xlsx` |
| LLM client | `openai` (Azure OpenAI) |
| Icons | `lucide-react` |
| API calls | Server-side proxy route to avoid CORS |

---

## Running locally

```bash
cd app
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Cognigy API reference (used internally)

| Action | Method | Path |
|--------|--------|------|
| List projects | GET | `/new/v2.0/projects` |
| List simulations | GET | `/testing/simulations?projectId=…` |
| Create simulation | POST | `/testing/simulations` |
| Schedule run | POST | `/testing/simulations/:id/schedule` |
| List flows | GET | `/new/v2.0/flows?projectId=…` |
| List locales | GET | `/new/v2.0/locales?projectId=…` |
| List LLM models | GET | `/new/v2.0/largelanguagemodels?projectId=…&useCase=gptConversation` |

All Cognigy requests are proxied through `/api/cognigy/proxy` to avoid browser CORS restrictions.
