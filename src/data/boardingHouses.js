// High-fidelity dataset for Balay Urios (Serjon) - FSUU Student Housing Hub

export const INITIAL_HOUSES = [
  {
    id: 'villa-guingona',
    name: 'Villa Guingona Student Pad',
    area: 'Guingona Subd., Brgy. JP Rizal, Butuan City',
    shortLocation: 'Villa Guingona Subd.',
    roomType: 'Solo Room',
    gender: 'FEMALE & MALE FLOORS • SOLO PAD',
    statusTag: '2 Rooms Available',
    statusColor: 'green',
    availableCount: 2,
    price: 3800,
    priceSubtext: 'Submetered Electric + Free Water utility',
    advanceDeposit: '1 Mo. Adv + 1 Mo. Dep',
    minContract: 'Min. 5 Mos. (1 Sem)',
    rating: 4.9,
    reviewCount: 26,
    landlord: {
      name: 'Tita Corazon M.',
      tag: 'Verified Urios Alum Landlord',
      initials: 'TC',
      experience: 'Landlord since 2018',
      phone: '+63 917 842 1902',
      avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=200&q=80',
      verified: true
    },
    images: [
      // Exact aesthetic match: bright solo student room with desk, lamp, bed, window
      'https://images.unsplash.com/photo-1598928506311-c55ded91a20c?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=1200&q=80'
    ],
    gateProximities: {
      mainSFGate: { distanceMeters: 260, walkingMinutes: 3, label: '3 min to SF Gate' },
      jcAquinoGate: { distanceMeters: 600, walkingMinutes: 8, label: '8 min to JC Aquino' },
      morelosCampus: { rides: 1, fare: 15, minutes: 10, label: '1 Trike Ride (₱15) to Morelos' }
    },
    trikeFare: '₱15',
    badges: {
      walk: '3 min to SF Gate',
      fare: 'Trike Fare: ₱15',
      flood: 'Flood-Free Elevation (High Ground Zone)',
      wifi: '52 Mbps PLDT Fiber',
      utility: '1,000L Stainless Tank'
    },
    floodRating: {
      isFloodFree: true,
      elevation: '+2.4m High Ground Zone',
      badge: 'Flood-Safe Street (+2.4m)',
      tagBadge: 'Dry Footpath',
      description: 'Elevated +2.4m above the regional Agusan River surge marker. Zero standing water along the 260-meter stroll to San Francisco gate even during heavy monsoon downpours.',
      history: 'Historical 2022-2024 typhoons: 100% dry road access maintained.'
    },
    waterSystem: {
      hasBoosterPump: true,
      hasReserveTank: true,
      badge: '24/7 Water Pressure',
      tankCapacity: '1,000L Overhead Stainless Tank',
      description: 'Equipped with a 1,000-Liter overhead stainless steel reserve tank and automatic booster pump. Eliminates low-pressure morning delays before 7:30 AM university classes.'
    },
    powerSystem: {
      hasSolarBackup: true,
      hasGenerator: false,
      badge: 'Solar Equipped',
      description: 'Solar-powered automated hallway, stairwell, and perimeter lighting stay illuminated during ANECO unscheduled power outages. Ground floor common station has dedicated emergency solar charging ports for laptops and mobile phones.'
    },
    wifiAudit: {
      downloadMbps: '54.2',
      uploadMbps: '28.4',
      provider: 'PLDT Fiber',
      verifiedDate: 'Verified Aug 12, 2024 • Room 204',
      ratingBadge: 'Excellent',
      badge: '52 Mbps PLDT Fiber',
      carrierSignals: {
        globe: '5G • Full Bars',
        smart: '4G LTE • Solid',
        dito: '4G • Good'
      }
    },
    commuteSteps: [
      {
        num: 1,
        title: '3 mins walk (260m) to FSUU Main Gate',
        desc: 'Direct stroll through well-lit residential Guingona Subdivision pathway.'
      },
      {
        num: 2,
        title: '5 mins walk to FSUU Gym & Canteen',
        desc: 'Fast shortcut across the corner bakery lane.'
      },
      {
        num: 3,
        title: '1 Direct Tricycle Ride (₱15) to Morelos Campus',
        desc: 'Abundant tricycles waiting right at the corner of JP Rizal Street.'
      }
    ],
    amenities: [
      { name: 'Study Table & Chair', icon: 'desk' },
      { name: 'Free Purified Water', icon: 'water' },
      { name: 'Shared Fridge & Induction', icon: 'fridge' },
      { name: 'Submetered (₱14/kWh)', icon: 'meter' },
      { name: 'Hallway CCTV 24/7', icon: 'cctv' },
      { name: 'On-Site Caretaker', icon: 'caretaker' }
    ],
    rules: [
      {
        title: '10:00 PM Gate Curfew',
        icon: 'lock',
        desc: 'Overnight hospital duty or university projects require prior digital notification slip to caretaker.'
      },
      {
        title: 'Visitors Until 7:00 PM',
        icon: 'users',
        desc: 'Entertained at lobby or ground floor study pavilion. Strictly no mixed-gender guest access on residential floor halls.'
      },
      {
        title: '9:00 PM Quiet Study Hours',
        icon: 'volume',
        desc: 'Headphones required for video calls, thesis zoom rooms, and multimedia lectures.'
      },
      {
        title: 'Rooftop Laundry Deck',
        icon: 'laundry',
        desc: 'Spacious covered drying racks + individual washing bucket bays available 6:00 AM - 9:00 PM.'
      }
    ],
    vibeChecks: {
      studyNoise: 4.8,
      landladyStrictness: 3.6,
      landladyNote: 'Strict on curfew but very motherly, brings hot Lugaw during midterm exam week!',
      crCleanliness: 4.7,
      kitchenAccess: 4.3,
      studentTestimonial: '"Literal life-saver during Typhoon Kabayan. Water pressure never dropped, and our laptops were fully charged for thesis while the rest of the street had brownouts."'
    },
    povRoute: {
      durationSeconds: 60,
      steps: [
        { time: '0:00', title: 'Villa Guingona Gate', note: 'Gated entrance with RFID keycard & 24/7 security lamp' },
        { time: '0:18', title: 'Guingona Subdivision Ave', note: 'Concrete, elevated street with zero canal overflow' },
        { time: '0:38', title: 'Corner Bakery & Sari-Sari Lane', note: 'Safe shortcut, well-lit even at 9:00 PM' },
        { time: '0:58', title: 'FSUU San Francisco Gate', note: 'Arrival at main university security guard post' }
      ]
    }
  },
  {
    id: 'san-ignacio-dorm',
    name: 'San Ignacio Dormitory & Bedspace',
    area: 'San Ignacio, JC Aquino Area, Butuan City',
    shortLocation: 'San Ignacio, JC Aquino Area',
    roomType: 'Bedspace for 4',
    gender: 'MALE DORMITORY • BEDSPACE FOR 4',
    statusTag: '3 Bedspaces Left',
    statusColor: 'green',
    availableCount: 3,
    price: 2200,
    priceSubtext: '/mo (All-In)',
    advanceDeposit: '1 Mo. Adv + 1 Mo. Dep',
    minContract: 'Min. 4 Mos. (1 Sem)',
    rating: 4.8,
    reviewCount: 38,
    landlord: {
      name: 'Sir Danilo P.',
      tag: 'Verified Property Partner',
      initials: 'DP',
      experience: 'Retired Urian Faculty Member',
      phone: '+63 928 551 2290',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80',
      verified: true
    },
    images: [
      // Exact match: wooden bunk beds, student desk, guitar, sunlit room
      'https://images.unsplash.com/photo-1555854877-bab0e564b8d5?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1595526114035-0d45ed16cfbf?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=1200&q=80'
    ],
    gateProximities: {
      mainSFGate: { distanceMeters: 750, walkingMinutes: 10, label: '10 min to SF Gate' },
      jcAquinoGate: { distanceMeters: 450, walkingMinutes: 6, label: '6 min to JC Aquino' },
      morelosCampus: { rides: 1, fare: 15, minutes: 12, label: '1 Trike Ride (₱15) to Morelos' }
    },
    trikeFare: '₱15',
    badges: {
      walk: '6 min to JC Aquino',
      fare: '5kVA Solar Backup',
      flood: 'Dry Elevated Concrete Path to University',
      wifi: '35 Mbps (Smart/DITO...)',
      utility: 'Individual Lockers'
    },
    floodRating: {
      isFloodFree: true,
      elevation: 'Elevated Concrete Pathway',
      badge: 'Dry Elevated Concrete Path to University',
      tagBadge: 'Elevated Path',
      description: 'Built on a reinforced raised foundation. Walking path towards JC Aquino avenue is paved and does not form mud or ankle-deep puddles during rainy season.',
      history: 'Maintained dry access throughout 2023-2024 rainy season.'
    },
    waterSystem: {
      hasBoosterPump: true,
      hasReserveTank: true,
      badge: 'Pressure Verified',
      tankCapacity: '800L Reserve Tank',
      description: 'Equipped with direct line booster pump for morning shower hours (6:00 AM - 8:30 AM).'
    },
    powerSystem: {
      hasSolarBackup: true,
      hasGenerator: false,
      badge: '5kVA Solar Backup',
      description: '5kVA hybrid solar setup powers dorm Wi-Fi, hallway lights, and desk charging outlets during ANECO brownouts.'
    },
    wifiAudit: {
      downloadMbps: '35.8',
      uploadMbps: '18.2',
      provider: 'Globe Fiber',
      verifiedDate: 'Sep 01, 2024 • Male Hall B',
      ratingBadge: 'Reliable',
      badge: '35 Mbps (Smart/DITO...)',
      carrierSignals: {
        globe: '4G LTE • 4 Bars',
        smart: '5G • Full Bars',
        dito: '4G • Solid'
      }
    },
    commuteSteps: [
      {
        num: 1,
        title: '6 mins walk to JC Aquino Campus Gate',
        desc: 'Direct elevated sidewalk along JC Aquino educational corridor.'
      },
      {
        num: 2,
        title: '10 mins walk to SF Gate & Main Quadrangle',
        desc: 'Straight pass through university perimeter.'
      }
    ],
    amenities: [
      { name: 'Individual Steel Locker with Padlock Loop', icon: 'lock' },
      { name: 'Bunk Bed with Uratex Mattress', icon: 'bed' },
      { name: 'Common Study Lounge with Fans', icon: 'desk' },
      { name: 'Purified Water Refill Station', icon: 'water' },
      { name: 'Biometric Gate Access', icon: 'cctv' },
      { name: 'Night Guard on Duty (7 PM - 6 AM)', icon: 'caretaker' }
    ],
    rules: [
      {
        title: '10:30 PM Gate Curfew',
        icon: 'lock',
        desc: 'Strict door lock. Late arrivals require valid reason and advance text to Sir Danilo.'
      },
      {
        title: 'Dining Area for Meals',
        icon: 'users',
        desc: 'Meals must be consumed in the ground-floor dining hall.'
      }
    ],
    vibeChecks: {
      studyNoise: 4.6,
      landladyStrictness: 4.2,
      landladyNote: 'Sir Danilo is strict about quiet hours after 10 PM, which is awesome if you actually want to pass Engineering or Accountancy.',
      crCleanliness: 4.5,
      kitchenAccess: 4.0,
      studentTestimonial: '"Very brotherhood vibe. Solar setup saved our online quizzes twice already during ANECO brownouts."'
    },
    povRoute: {
      durationSeconds: 60,
      steps: [
        { time: '0:00', title: 'San Ignacio Dorm Gate', note: 'Secure perimeter fence with gate lamp' },
        { time: '0:20', title: 'San Ignacio Elevated Walkway', note: 'Newly concreted sidewalk above gutter level' },
        { time: '0:42', title: 'Crossing JC Aquino Ave', note: 'Pedestrian lane with traffic enforcer' },
        { time: '0:58', title: 'FSUU JC Aquino Gate', note: 'Direct entrance beside Urios College wing' }
      ]
    }
  },
  {
    id: 'montilla-blvd-studio',
    name: 'Montilla Blvd Studio Suite',
    area: 'Montilla Boulevard, Butuan City',
    shortLocation: 'Montilla Boulevard',
    roomType: 'Private Studio Suite',
    gender: 'CO-ED EXCLUSIVE UNITS • STUDIO SUITE',
    statusTag: '1 Last Unit Available',
    statusColor: 'orange',
    availableCount: 1,
    price: 5500,
    priceSubtext: '/month',
    advanceDeposit: '1 Mo. Adv + 2 Mos. Dep',
    minContract: 'Min. 6 Mos. (1 Sem)',
    rating: 5.0,
    reviewCount: 19,
    landlord: {
      name: 'Engr. Alex R.',
      tag: 'Verified Commercial Host',
      initials: 'EA',
      experience: 'Professional Property Manager',
      phone: '+63 908 123 7890',
      avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=200&q=80',
      verified: true
    },
    images: [
      // Exact match: modern studio suite with bed, kitchenette, bathroom visible
      'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=1200&q=80'
    ],
    gateProximities: {
      mainSFGate: { distanceMeters: 650, walkingMinutes: 8, label: '8 min walk / 1 Trike' },
      jcAquinoGate: { distanceMeters: 550, walkingMinutes: 7, label: '7 min walk to JC Aquino' },
      morelosCampus: { rides: 1, fare: 15, minutes: 8, label: '1 Trike Ride (₱15) to Morelos' }
    },
    trikeFare: '₱15',
    badges: {
      walk: '8 min walk / 1 Trike',
      fare: '75 Mbps Converge',
      flood: 'Flood-Protected Commercial Strip',
      wifi: 'Heater + Water Tank',
      utility: '24/7 RFID Biometrics'
    },
    floodRating: {
      isFloodFree: true,
      elevation: 'Commercial Grade Drainage',
      badge: 'Flood-Protected Commercial Strip',
      tagBadge: 'Commercial Grade',
      description: 'Directly along Montilla Blvd. Upgraded municipal street drainage system that drains rapidly during torrential storms.',
      history: 'Zero flooding recorded inside building or driveway.'
    },
    waterSystem: {
      hasBoosterPump: true,
      hasReserveTank: true,
      badge: 'Heater + Pressurized Tank',
      tankCapacity: '2,500L Multi-Tier Tank + Heater',
      description: 'Private in-room hot/cold shower heater paired with building 2,500L pressurized water system.'
    },
    powerSystem: {
      hasSolarBackup: false,
      hasGenerator: true,
      badge: 'Full Commercial Generator',
      description: 'Automatic Transfer Switch (ATS) 25kVA generator powers air conditioning, lights, and sockets within 15 seconds of blackout.'
    },
    wifiAudit: {
      downloadMbps: '75.4',
      uploadMbps: '72.1',
      provider: 'Converge FiberX',
      verifiedDate: 'Oct 04, 2024 • Suite 3A',
      ratingBadge: 'Ultra Fast',
      badge: '75 Mbps Converge',
      carrierSignals: {
        globe: '5G • 5 Bars',
        smart: '5G • 5 Bars',
        dito: '5G • 4 Bars'
      }
    },
    commuteSteps: [
      {
        num: 1,
        title: '8 mins walk or 1 Trike to San Francisco Gate',
        desc: 'Wide commercial sidewalk with banks, convenience stores, and pharmacy.'
      }
    ],
    amenities: [
      { name: 'Private En-Suite T&B with Water Heater', icon: 'water' },
      { name: 'Split-Type Inverter Aircon', icon: 'meter' },
      { name: '24/7 RFID Biometrics & CCTV', icon: 'cctv' },
      { name: 'Kitchenette with Exhaust & Sink', icon: 'fridge' },
      { name: 'Queen Bed with Orthopedic Mattress', icon: 'bed' }
    ],
    rules: [
      {
        title: 'No Curfew (24/7 RFID Keycard)',
        icon: 'lock',
        desc: 'Freedom for Nursing duty or Law school students. Strict visitor sign-in.'
      }
    ],
    vibeChecks: {
      studyNoise: 4.9,
      landladyStrictness: 3.0,
      landladyNote: 'Engr. Alex handles things very professionally. Repairs are done within 2 hours.',
      crCleanliness: 5.0,
      kitchenAccess: 4.9,
      studentTestimonial: '"Worth every peso for Law school. Aircon runs on generator during power failures so study review is never disrupted."'
    },
    povRoute: {
      durationSeconds: 60,
      steps: [
        { time: '0:00', title: 'Montilla Blvd Suite Lobby', note: 'Glass door with RFID scanner & security guard' },
        { time: '0:22', title: 'Montilla Boulevard Walkway', note: 'Commercial sidewalk with banks & Mercury Drug' },
        { time: '0:45', title: 'Turn to San Francisco St.', note: 'Short crossing to university block' },
        { time: '0:59', title: 'FSUU Main Campus Entrance', note: 'Right in front of College Building' }
      ]
    }
  }
];

export const APPLIANCE_CATALOG = [
  { id: 'electric-fan', name: 'Electric Desk / Stand Fan', monthlyCost: 120, note: 'Flat monthly landlord fee' },
  { id: 'laptop', name: 'Laptop / PC Workstation', monthlyCost: 150, note: 'Charging & continuous thesis usage' },
  { id: 'rice-cooker', name: 'Rice Cooker (Standard)', monthlyCost: 200, note: 'In-room cooking appliance' },
  { id: 'mini-fridge', name: 'Personal Mini Refrigerator', monthlyCost: 400, note: 'Continuous cooling appliance' },
  { id: 'induction', name: 'Single Induction Cooker', monthlyCost: 250, note: 'For personal meal prep' },
  { id: 'hair-dryer', name: 'Hair Dryer / Straightener', monthlyCost: 100, note: 'Occasional heating device' },
  { id: 'electric-kettle', name: 'Electric Kettle / Water Heater', monthlyCost: 150, note: 'Instant noodles & coffee' }
];
