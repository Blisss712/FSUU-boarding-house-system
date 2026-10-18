# Balay Urios (Serjon) — FSUU Student Housing Hub

> The easiest way for Urios students to find a verified boarding house near campus, and for landlords to fill their rooms.

Built specifically for the student and landlord community of **Father Saturnino Urios University (FSUU)** in **Butuan City, Agusan del Norte**.

---

## 🌟 Highlights & Butuan-Specific Innovations

1. **Hyper-Local Gate & Commute Proximity:**
   - Filters tailored directly to FSUU gates: **San Francisco St. Gate (Main Campus)**, **J.C. Aquino Ave Gate**, and **Morelos Campus**.
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

### 3. Run Development Server
```bash
npm run dev
```
Open your browser at `http://localhost:5173`.

### 4. Build for Production
```bash
npm run build
```

---

## 📁 Project Architecture

```
serjon/
├── src/
│   ├── components/
│   │   ├── Header.jsx                 # Top branding, search, mobile view switch
│   │   ├── GateFilterBar.jsx          # Quick gate pills (SF, JC, Morelos, Flood-Free)
│   │   ├── VerificationBanner.jsx     # Urian QA inspector badge
│   │   ├── PropertyCard.jsx           # Listing card matching Explore mockup
│   │   ├── PadDetails.jsx             # Detailed view with Student Reality Checklist
│   │   ├── TrueCostCalculatorModal.jsx# Interactive appliance surcharge calculator
│   │   ├── WalkPovModal.jsx           # 60s walk-to-campus POV route simulator
│   │   ├── ParentShareModal.jsx       # Messenger-ready parent safety card generator
│   │   ├── LandlordSmsBotModal.jsx    # Automated SMS vacancy updater simulator
│   │   ├── MapViewModal.jsx           # Interactive Butuan map with flood elevation zones
│   │   ├── ScheduleVisitModal.jsx     # Student ocular visit scheduling
│   │   ├── ChatModal.jsx              # Direct landlady chat with auto-reply
│   │   ├── FilterModal.jsx            # Budget, room type, and climate filters
│   │   ├── BottomNav.jsx              # Floating map pill and bottom navigation
│   │   └── TabViews.jsx               # Saved, My Room, and Profile views
│   ├── data/
│   │   └── boardingHouses.js          # Realistic Butuan & FSUU boarding house database
│   ├── App.jsx                        # Root application logic and state
│   ├── main.jsx                       # React entry point
│   └── index.css                      # Tailwind CSS v4 styling
├── package.json
└── vite.config.js
```
