# Balay Urios (Serjon) — FSUU Student Housing Hub

> The easiest way for Urios students to find a verified boarding house near campus, and for landlords to fill their rooms.

Built specifically for the student and landlord community of **Father Saturnino Urios University (FSUU)** in **Butuan City, Agusan del Norte**.

---

## 🌟 Highlights & Butuan-Specific Innovations

1. **Hyper-Local Gate & Commute Proximity:**
   - Filters tailored directly to FSUU Main Campus gates: **San Francisco St. Gate (Main Entrance)** and **J.C. Aquino Ave Gate (College Wing)**.
   - Standard tricycle fares (₱15) and walking times for each location.

2. **Student Reality Checklist (Butuan Verified):**
   - **Flood-Risk & Monsoon Elevation Rating:** Audited relative to regional Agusan River surge markers (+2.4m high ground certification) and historical 2022–2024 typhoon access.
   - **Uninterrupted Water System:** Verified 1,000L+ overhead stainless reserve tanks + automated booster pumps to eliminate low-pressure bottlenecks before 7:30 AM university classes.
   - **Brownout Resilience Kit:** Solar-powered automated hallway/stairwell lighting and emergency laptop charging ports during ANECO power outages.
   - **Speedtest™ On-Site Audit:** Verified Mbps download/upload reports and in-room signal bars for Globe 5G, Smart 4G LTE, and DITO.

3. **Student-Centric Lifestyle & Cost Features:**
   - **"True Monthly Cost" Calculator:** Students toggle appliances they plan to bring (laptop, rice cooker, electric fan, mini fridge) or estimate aircon sub-metering to see their true monthly total with zero hidden surcharges.
   - **60-Second "Walk-to-Campus" POV Videos:** Sped-up first-person vertical route preview from the boarding house gate to the nearest FSUU gate showing streetlights, pavement quality, and security posts.

4. **Trust, Safety & Landlord Automation:**
   - **"Parent Peace-of-Mind" Share Card:** Generates a clean, printable or Messenger-ready summary highlighting CCTV, curfews, resident caretaker status, and fire exits.
   - **SMS One-Tap Vacancy Bot for Non-Tech Landlords:** Automated bi-weekly check-in via Philippine SMS (*"Reply 1 for Yes, 0 for Full"*) keeping listings accurate without requiring older landlords to use an app.
   - **Verified Tenant "Vibe Checks":** Exclusive ratings from verified `@urios.edu.ph` students on Study Noise, Landlady Strictness, CR Cleanliness, and Kitchen Access.

---

## 🚀 Getting Started

### 1. Prerequisites
Ensure you have Node.js (v18+) and npm installed.

### 2. Install Dependencies
```bash
npm install
```

### 3. Run Development Server (Supabase Powered)

With Supabase handling the backend database and API, you only need to run Vite:
```bash
npm run dev
```
- App UI: `http://localhost:5173`

---

## ⚡ Supabase Setup & Data Export Guide

Balay Urios is now configured to use **Supabase** (PostgreSQL + REST API) as its cloud backend.

### Quick Setup in 3 Easy Steps:

1. **Create a Free Supabase Project**:
   - Go to [supabase.com](https://supabase.com) and create a new project.

2. **Run the Database Schema**:
   - In your Supabase Dashboard, click on **SQL Editor** (left sidebar).
   - Open and copy the contents of `supabase/full-setup.sql`.
   - Paste into the SQL Editor and click **Run**.
   - This creates all 11 tables (`properties`, `campuses`, `appliances`, `users`, `ocular_visits`, `chats`, `sms_logs`, `saved_properties`, `tenancy`, `curfew_slips`, `receipts`) and sets up Row Level Security (RLS) policies. No demo accounts or listings are inserted — real accounts are created through Supabase Auth and real listings through the app.

3. **Configure Environment Variables**:
   - In Supabase Dashboard, go to **Project Settings** -> **API**.
   - Copy **Project URL** and **anon public key**.
   - Open `.env` in this project and add:
     ```env
     VITE_SUPABASE_URL=https://your-project-id.supabase.co
     VITE_SUPABASE_ANON_KEY=your-anon-key-here
     ```
   - Restart `npm run dev`. Your app is now connected to live Supabase!

### Removing Old Demo Data:
If your project previously ran the older seed script, clean the demo listings and accounts with:
```bash
npm run clean:demo
```
The same deletions are documented in `supabase/clean-demo-data.sql`. Admin accounts are assigned directly in the database, not through self-registration.

### Admin Access:

Admins are **not** created through the sign-up form — `api.register()` explicitly rejects the `admin` role. Admin access is decided by `users.role = 'admin'` (and optionally `user_metadata.isAdmin = true`), and it unlocks the **Auditor** tab.

**1. If `users.role` rejects `'admin'`** (older projects have a check constraint limited to `boarder`/`landlord`, which makes admin login impossible and surfaces as `500 Error updating user`):

- Run `supabase/fix-admin-role.sql` once in the Supabase **SQL Editor**. It rebuilds the constraint and promotes the account named in the file.
- Re-running `supabase/full-setup.sql` also repairs the constraint now, but it will not promote anyone.

**2. Create or promote an admin account** (needs `SUPABASE_SERVICE_ROLE_KEY` in `.env`):

```bash
node scripts/create-admin.js admin@balayurios.app "A-strong-password" "Admin Name"
```

Omit the password to have a strong one generated and printed once. Re-running with an existing email promotes that account and resets its password. The script verifies the result by signing in through the anon key.

**3. Log in normally** at **Sign In** with that email/password. The Auditor tab appears in the header and bottom navigation.

### Fixing Listing Ownership & the Audit Crash:

If listings look "mixed up" between accounts, or the admin audit throws
`column properties.buildingCondition does not exist`, run:

- `supabase/fix-accounts.sql` — adds the missing `buildingCondition` column,
  stamps every listing with `landlord.userId` (matched from the landlord email),
  and points each landlord profile at their listing.

### Security & RLS:

The original setup enabled Row Level Security but wrote every policy with
`USING (true)` / `WITH CHECK (true)`. **That is a bad practice**: it means any
client holding the public anon key (including a guest or another user) could
update or delete anyone's listing, profile, tenancy, or curfew slip. That is
precisely how listing data gets overwritten or removed by the wrong account.

- `supabase/rls-policies.sql` replaces those policies with owner-scoped rules
  (a landlord can only modify their own listings; users can only modify their
  own profile; admins bypass via `user_metadata.isAdmin`).
- Run it **after** `fix-accounts.sql` (it requires `landlord.userId` to be set).
- `full-setup.sql` now ships with the same hardened policies for fresh projects.

---



## 🛠️ Supabase PostgreSQL Schema & Tables

All database queries are handled directly via the official Supabase Client (`@supabase/supabase-js`) with Row Level Security:

| Table | Description |
|---|---|
| `properties` | Detailed student pads, landlord information, 6-point reality audit, photos & amenities |
| `campuses` | FSUU Main Campus gates, coordinates, and nearby zones |
| `appliances` | Appliance catalog with monthly submeter electrical rates |
| `users` | Student boarders and verified landlord profiles linked with Supabase Auth |
| `ocular_visits` | Scheduled visits with student ID and time slot |
| `chats` | In-app messaging between students and boarding house hosts |
| `sms_logs` | Audit trail of automated landlord vacancy check-ins |
| `tenancy` | Official digital tenancy passes, room assignments, and live submeter tracking |
| `curfew_slips` | Digital curfew exemption slips for hospital/clinical duties |
| `receipts` | Official verified rent escrow receipts |
| `saved_properties` | Student bookmarks and saved boarding houses |

---

## 📁 Project Architecture

```
serjon/
├── src/                                  # Pure Client-Side Supabase-Powered React App
│   ├── components/                       # UI components (Pads, Tenancy, Filters, Maps, Modals)
│   ├── context/                          # AuthContext (Supabase Auth Session Management)
│   ├── lib/                              # supabase.js (createClient with persistSession)
│   ├── services/                         # api.js (100% direct-to-Supabase query layer)
│   ├── utils/                            # checklist.js (Student Reality Checklist helpers)
│   ├── App.jsx                           # Root layout & routing
│   └── main.jsx                          # React 19 entry point
├── supabase/                             # Database migrations
│   ├── full-setup.sql                    # Combined 1-click schema + RLS script
│   └── clean-demo-data.sql               # Removes legacy seeded demo rows
├── scripts/                              # Helper administrative scripts
│   └── clean-demo-data.js                # Deletes demo listings, users, and auth accounts
└── package.json                          # Vite + React + Tailwind v4 + Supabase client
```

