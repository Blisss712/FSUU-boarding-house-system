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
   - This creates all 10 tables (`properties`, `campuses`, `appliances`, `users`, `ocular_visits`, `sms_logs`, `saved_properties`, `tenancy`, `curfew_slips`, `receipts`) and sets up Row Level Security (RLS) policies. No demo accounts or listings are inserted — real accounts are created through Supabase Auth and real listings through the app.
   - Then run `supabase/add-messaging.sql` the same way. It adds the chat tables and the automatic **pad group** for every listing (see [In-App Messaging](#in-app-messaging)).

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

### Landlord Account Verification (Auditor Tab):

Admins can now approve landlord accounts as **Urios Verified** from the bottom
**Auditor** tab. Open **Landlord Accounts**, choose a host, and approve the
account. The badge is account-level, so it applies to every pad the landlord owns.

- New/updated databases: `supabase/full-setup.sql` includes the verification
  columns automatically.
- Existing databases: run `supabase/add-landlord-verification.sql` once. It
  adds `isUriosVerified`, `verificationStatus`, `verifiedAt`, `verifiedBy`, and
  `verificationNotes`, and normalizes an older integer `isUriosVerified` flag to
  a real boolean.

### In-App Messaging

The **Messages** tab is a Messenger-style inbox with three kinds of chat:

- **Pad groups (automatic):** every listing gets exactly one dedicated group chat, named `"<Pad name> · Pad Group"`. It is created by the database the moment the listing is created, the landlord who owns the listing is added automatically, and every **approved boarder** of that pad (an active `tenancy` row) is added automatically too. Approving a boarding application puts the new boarder in the group; ending a tenancy takes them out. Nobody has to create it or invite anyone, and it stays correct even if the boarder never opens the tab.
- **Direct chats:** any signed-in user can search for another account (landlord, student, or auditor) and start a 1:1 conversation. Starting a chat that already exists reopens it instead of duplicating it.
- **Manual group chats:** only landlord accounts can create one. The landlord who created the group is recorded as its landlord, and only that account can add or remove members. Everyone else sees the member list read-only.

#### Messaging a landlord straight from a board listing

Every listing now has a **Message** action, so a student never has to hunt for the
Messages tab or a phone number:

- **Explore feed** — the chat button on each card (expanded and compact views).
- **Pad details** — a message button on the landlord card and a "Message the
  Landlord" button in the booking panel.
- **Landlord profile** — the bottom sheet and the full profile page both have a
  "Message landlord" button.
- **My Room** — active boarders get a "Talk to your landlord" card, and a
  **pending or declined application** gets the same button (it resolves the pad
  from the application row).

Tapping one opens (or reuses) the 1:1 direct chat with that host in the Messages
tab, with a listing-specific opening line pre-filled in the composer — it is
**never sent automatically**, the student can edit or clear it. Nothing is
duplicated: starting a chat that already exists reopens the same thread.

The host account is resolved client-side from the listing's `landlord` JSON, in
the same order ownership is resolved elsewhere: `landlord.userId` →
`landlord.email` → `landlord.name` (landlord accounts only). The button hides on
a landlord's own listing, and if the host has no Balay Urios account yet the app
says so and points at the phone number instead of failing silently.

No migration is needed for this — it is a UI entry point onto the messaging
tables and RPCs created by `supabase/add-messaging.sql`.

Pad-group membership is **derived** from the pad, so it is read-only in the UI: a landlord cannot remove an active boarder by hand (the database re-adds them on the next sync, and the RPC refuses outright).

Run `supabase/add-messaging.sql` once in the Supabase **SQL Editor**. It creates the `conversations`, `conversation_members`, and `messages` tables with their RLS policies and membership functions, adds them to the `supabase_realtime` publication, and installs the pad-group triggers. It also **backfills a pad group for every listing that already exists** (landlord + current boarders added), so old listings get their group on the next run.

It is safe to re-run — re-running is also the repair step when messaging looks empty:

- `full-setup.sql` / `rls-policies.sql` used to drop **every** policy in `public`, including the messaging policies. Re-running them left RLS enabled with no policy, so chat lists came back empty and inserts failed with `permission denied for table messages`. Both files now skip the messaging tables, and re-running `add-messaging.sql` restores the policies.

Membership changes are rejected by the database unless the caller manages that group, so the rules hold even outside this UI.

> Realtime note: if new messages do not stream in live, check **Database → Replication** in the Supabase dashboard and confirm `messages`, `conversation_members`, and `conversations` are in the `supabase_realtime` publication (the migration adds them).

### Pad groups (details)

| Piece | Where | What it does |
|---|---|---|
| `conversations."propertyId"` | `add-messaging.sql` | Marks a conversation as the pad group of a listing (unique, cascades on listing delete) |
| `pad_group_sync(property_id)` | `add-messaging.sql` | Creates/repairs the pad group and rebuilds membership from the landlord + active boarders |
| `ensure_pad_group(property_id)` | RPC | Open/repair a pad group (pad's landlord, its boarders, admins) |
| `sync_pad_group(property_id)` | RPC | Force a membership re-sync (pad's landlord, admins) |
| Triggers on `properties`, `tenancy`, `users` | `add-messaging.sql` | Create the group on listing insert; add a boarder on approval; remove them when the tenancy ends |

Every trigger is exception-safe: a messaging error can never block creating a listing, boarding a pad, or editing a profile.

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
| `sms_logs` | Audit trail of automated landlord vacancy check-ins |
| `tenancy` | Official digital tenancy passes, room assignments, and live submeter tracking |
| `curfew_slips` | Digital curfew exemption slips for hospital/clinical duties |
| `receipts` | Official verified rent escrow receipts |
| `saved_properties` | Student bookmarks and saved boarding houses |
| `conversations` | Direct chats, manual group chats, and one automatic **pad group** per listing (`propertyId`) |
| `conversation_members` | Chat participants, roles, and per-user read markers (pad groups stay in sync with tenancies) |
| `messages` | Chat messages streamed live through Supabase Realtime |

---

## 📁 Project Architecture

```
serjon/
├── src/                                  # Pure Client-Side Supabase-Powered React App
│   ├── components/                       # UI components (Pads, Tenancy, Filters, Maps, Messages, Modals)
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

