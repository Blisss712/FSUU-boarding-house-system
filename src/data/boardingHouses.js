// Scalable dataset for Balay Urios (Serjon) - FSUU Student Housing Hub

export const CAMPUSES = [
  {
    id: 'fsuu-main',
    name: 'FSUU Main Campus',
    gates: [
      { id: 'sf-gate', name: 'San Francisco St. Gate (Main Entrance)', shortName: 'SF Gate' },
      { id: 'jc-gate', name: 'J.C. Aquino Ave Gate (College Wing)', shortName: 'JC Aquino Gate' }
    ],
    zones: ['Guingona Subdivision', 'San Ignacio', 'Montilla Boulevard', 'R. Calo Extension', 'Brgy. Bayanihan']
  },
  {
    id: 'fsuu-morelos',
    name: 'FSUU Morelos Campus',
    gates: [
      { id: 'morelos-main', name: 'Morelos Campus Main Gate (Libertad)', shortName: 'Morelos Gate' }
    ],
    zones: ['Libertad Area', 'Purok 4 Morelos', 'Capitol Bypass']
  }
];

export const BUTUAN_ZONES = [
  'All Zones',
  'Guingona Subdivision',
  'San Ignacio',
  'Montilla Boulevard',
  'R. Calo Extension',
  'Brgy. Bayanihan',
  'Libertad Area'
];

export const INITIAL_HOUSES = [
  {
    id: 'villa-guingona',
    name: 'Villa Guingona Student Pad',
    campusId: 'fsuu-main',
    zone: 'Guingona Subdivision',
    area: 'Guingona Subd., Brgy. JP Rizal, Butuan City',
    shortLocation: 'Villa Guingona Subd.',
    roomType: 'Solo Room',
    gender: 'FEMALE & MALE FLOORS • SOLO PAD',
    statusTag: '2 Rooms Available',
    statusColor: 'green',
    availableCount: 2,
    price: 3800,
    priceSubtext: '/month',
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
      'https://images.unsplash.com/photo-1598928506311-c55ded91a20c?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?auto=format&fit=crop&w=1200&q=80'
    ],
    gateProximities: {
      primaryGate: 'sf-gate',
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
    mapCoordinates: { x: 34, y: 38 }, // Percentage coordinates on Butuan Map
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
      description: 'Solar-powered automated hallway, stairwell, and perimeter lighting stay illuminated during ANECO unscheduled power outages.'
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
      { num: 1, title: '3 mins walk (260m) to FSUU Main Gate', desc: 'Direct stroll through well-lit residential Guingona Subdivision pathway.' },
      { num: 2, title: '5 mins walk to FSUU Gym & Canteen', desc: 'Fast shortcut across the corner bakery lane.' },
      { num: 3, title: '1 Direct Tricycle Ride (₱15) to Morelos Campus', desc: 'Abundant tricycles waiting right at the corner of JP Rizal Street.' }
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
      { title: '10:00 PM Gate Curfew', desc: 'Overnight hospital duty requires digital notification slip to caretaker.' },
      { title: 'Visitors Until 7:00 PM', desc: 'Entertained in study pavilion. No mixed-gender guest access on residential floor halls.' },
      { title: '9:00 PM Quiet Study Hours', desc: 'Headphones required for video calls and multimedia lectures.' },
      { title: 'Rooftop Laundry Deck', desc: 'Covered drying racks + washing bucket bays available 6 AM - 9 PM.' }
    ],
    vibeChecks: {
      studyNoise: 4.8,
      landladyStrictness: 3.6,
      landladyNote: 'Strict on curfew but very motherly, brings hot Lugaw during midterm exam week!',
      crCleanliness: 4.7,
      kitchenAccess: 4.3,
      studentTestimonial: '"Literal life-saver during Typhoon Kabayan. Water pressure never dropped, and our laptops were fully charged for thesis."'
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
    campusId: 'fsuu-main',
    zone: 'San Ignacio',
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
      'https://images.unsplash.com/photo-1555854877-bab0e564b8d5?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1595526114035-0d45ed16cfbf?auto=format&fit=crop&w=1200&q=80'
    ],
    gateProximities: {
      primaryGate: 'jc-gate',
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
    mapCoordinates: { x: 58, y: 44 },
    floodRating: {
      isFloodFree: true,
      elevation: 'Elevated Concrete Pathway',
      badge: 'Dry Elevated Concrete Path to University',
      tagBadge: 'Elevated Path',
      description: 'Built on a reinforced raised foundation. Walking path towards JC Aquino avenue is paved and does not form mud during rainy season.',
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
      { num: 1, title: '6 mins walk to JC Aquino Campus Gate', desc: 'Direct elevated sidewalk along JC Aquino educational corridor.' },
      { num: 2, title: '10 mins walk to SF Gate & Main Quadrangle', desc: 'Straight pass through university perimeter.' }
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
      { title: '10:30 PM Gate Curfew', desc: 'Strict door lock. Late arrivals require valid reason and advance text to Sir Danilo.' },
      { title: 'Dining Area for Meals', desc: 'Meals must be consumed in the ground-floor dining hall.' }
    ],
    vibeChecks: {
      studyNoise: 4.6,
      landladyStrictness: 4.2,
      landladyNote: 'Sir Danilo is strict about quiet hours after 10 PM, which is awesome if you want to pass Accountancy.',
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
    campusId: 'fsuu-main',
    zone: 'Montilla Boulevard',
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
      'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=1200&q=80'
    ],
    gateProximities: {
      primaryGate: 'sf-gate',
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
    mapCoordinates: { x: 48, y: 24 },
    floodRating: {
      isFloodFree: true,
      elevation: 'Commercial Grade Drainage',
      badge: 'Flood-Protected Commercial Strip',
      tagBadge: 'Commercial Grade',
      description: 'Directly along Montilla Blvd with upgraded municipal street drainage.',
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
      description: 'Automatic Transfer Switch 25kVA generator powers air conditioning, lights, and sockets.'
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
      { num: 1, title: '8 mins walk or 1 Trike to San Francisco Gate', desc: 'Wide commercial sidewalk with banks and pharmacy.' }
    ],
    amenities: [
      { name: 'Private En-Suite T&B with Water Heater', icon: 'water' },
      { name: 'Split-Type Inverter Aircon', icon: 'meter' },
      { name: '24/7 RFID Biometrics & CCTV', icon: 'cctv' },
      { name: 'Kitchenette with Exhaust & Sink', icon: 'fridge' },
      { name: 'Queen Bed with Orthopedic Mattress', icon: 'bed' }
    ],
    rules: [
      { title: 'No Curfew (24/7 RFID Keycard)', desc: 'Freedom for Nursing duty or Law students.' }
    ],
    vibeChecks: {
      studyNoise: 4.9,
      landladyStrictness: 3.0,
      landladyNote: 'Engr. Alex handles things very professionally. Fast repairs.',
      crCleanliness: 5.0,
      kitchenAccess: 4.9,
      studentTestimonial: '"Worth every peso for Law school. Aircon runs on generator during power failures."'
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
  },
  {
    id: 'bayanihan-ladies-pad',
    name: 'Bayanihan Ladies Residences',
    campusId: 'fsuu-main',
    zone: 'Brgy. Bayanihan',
    area: 'Brgy. Bayanihan, near JC Aquino Ave, Butuan City',
    shortLocation: 'Brgy. Bayanihan',
    roomType: 'Solo / 2-Sharing',
    gender: 'FEMALE ONLY • SECURE DORM',
    statusTag: '2 Rooms Available',
    statusColor: 'green',
    availableCount: 2,
    price: 3200,
    priceSubtext: '/month',
    advanceDeposit: '1 Mo. Adv + 1 Mo. Dep',
    minContract: 'Min. 5 Mos. (1 Sem)',
    rating: 4.9,
    reviewCount: 31,
    landlord: {
      name: 'Mrs. Lourdes V.',
      tag: 'Verified Urian Parent Host',
      initials: 'LV',
      experience: 'Hosting FSUU students for 9 years',
      phone: '+63 919 444 8821',
      avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=200&q=80',
      verified: true
    },
    images: [
      'https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1540518614846-7ede433c4ef0?auto=format&fit=crop&w=1200&q=80'
    ],
    gateProximities: {
      primaryGate: 'jc-gate',
      mainSFGate: { distanceMeters: 550, walkingMinutes: 7, label: '7 min to SF Gate' },
      jcAquinoGate: { distanceMeters: 380, walkingMinutes: 5, label: '5 min to JC Aquino' },
      morelosCampus: { rides: 1, fare: 15, minutes: 11, label: '1 Trike Ride (₱15) to Morelos' }
    },
    trikeFare: '₱15',
    badges: {
      walk: '5 min to JC Aquino',
      fare: 'Trike Fare: ₱15',
      flood: '100% Flood-Free Street',
      wifi: '45 Mbps PLDT Fiber',
      utility: '2,000L Water Reservoir'
    },
    mapCoordinates: { x: 42, y: 56 },
    floodRating: {
      isFloodFree: true,
      elevation: '+1.8m High Ground',
      badge: '100% Flood-Free Street',
      tagBadge: 'Dry Stroll',
      description: 'Elevated pocket in Bayanihan. Street stays totally dry during heavy monsoons.',
      history: '10 years flood-free history.'
    },
    waterSystem: {
      hasBoosterPump: true,
      hasReserveTank: true,
      badge: '2,000L Reservoir',
      tankCapacity: '2,000L Dual Reservoir Tank',
      description: 'Dual tank setup ensures steady high water pressure across all 3 floors.'
    },
    powerSystem: {
      hasSolarBackup: true,
      hasGenerator: false,
      badge: 'Solar Emergency System',
      description: 'Powers corridor lighting, Wi-Fi router, and emergency ground-floor charging bay.'
    },
    wifiAudit: {
      downloadMbps: '45.0',
      uploadMbps: '22.0',
      provider: 'PLDT Home Fiber',
      verifiedDate: 'Aug 20, 2024 • Floor 2',
      ratingBadge: 'Great',
      badge: '45 Mbps PLDT',
      carrierSignals: {
        globe: '5G • 4 Bars',
        smart: '4G LTE • 5 Bars',
        dito: '4G • 4 Bars'
      }
    },
    commuteSteps: [
      { num: 1, title: '5 mins walk to JC Aquino Gate', desc: 'Direct safe walk through Bayanihan student street.' }
    ],
    amenities: [
      { name: 'Biometric Fingerprint Gate Entry', icon: 'cctv' },
      { name: 'Study Cubicle with Reading Lamp', icon: 'desk' },
      { name: 'Hot & Cold Water Dispenser', icon: 'water' },
      { name: 'Shared Refrigerator & Microwave', icon: 'fridge' }
    ],
    rules: [
      { title: '9:30 PM Gate Curfew', desc: 'Strict curfew for safety. Hospital endorsements honored.' }
    ],
    vibeChecks: {
      studyNoise: 4.9,
      landladyStrictness: 4.6,
      landladyNote: 'Mrs. Lourdes treats everyone like daughters. Parents love her.',
      crCleanliness: 4.8,
      kitchenAccess: 4.2,
      studentTestimonial: '"Super safe! Biometric gate means no strangers can enter."'
    },
    povRoute: {
      durationSeconds: 60,
      steps: [
        { time: '0:00', title: 'Bayanihan Gate', note: 'Turnstile fingerprint scanner' },
        { time: '0:30', title: 'Bayanihan Road', note: 'Peaceful subdivision street' },
        { time: '0:55', title: 'FSUU Gate', note: 'Direct arrival at JC Aquino entrance' }
      ]
    }
  },
  {
    id: 'morelos-transit-pad',
    name: 'Morelos Campus Maritime & Tech Pad',
    campusId: 'fsuu-morelos',
    zone: 'Libertad Area',
    area: 'Brgy. Libertad, 2 mins walk to FSUU Morelos Campus',
    shortLocation: 'Near Morelos Campus',
    roomType: 'Bedspace & Solo',
    gender: 'CO-ED SEPARATE WINGS • STUDENT DORM',
    statusTag: '4 Bedspaces Left',
    statusColor: 'green',
    availableCount: 4,
    price: 2400,
    priceSubtext: '/mo (All-In)',
    advanceDeposit: '1 Mo. Adv + 1 Mo. Dep',
    minContract: 'Min. 4 Mos. (1 Sem)',
    rating: 4.7,
    reviewCount: 22,
    landlord: {
      name: 'Manong Berting S.',
      tag: 'Verified Local Landlord',
      initials: 'BS',
      experience: 'Hosting Maritime & Tech Urians',
      phone: '+63 945 331 9901',
      avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=200&q=80',
      verified: true
    },
    images: [
      'https://images.unsplash.com/photo-1595526114035-0d45ed16cfbf?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?auto=format&fit=crop&w=1200&q=80'
    ],
    gateProximities: {
      primaryGate: 'morelos-main',
      mainSFGate: { distanceMeters: 2800, walkingMinutes: 30, rides: 1, fare: 15, label: '1 Trike (₱15) to Main SF' },
      jcAquinoGate: { distanceMeters: 2600, walkingMinutes: 28, rides: 1, fare: 15, label: '1 Trike to JC Aquino' },
      morelosCampus: { distanceMeters: 180, walkingMinutes: 2, label: '2 min walk to Morelos Campus' }
    },
    trikeFare: '₱15',
    badges: {
      walk: '2 min walk to Morelos Campus',
      fare: '1 Trike to Main (₱15)',
      flood: 'Elevated High Ground Zone',
      wifi: '40 Mbps DITO/Smart',
      utility: '1,200L Tank + Filtration'
    },
    mapCoordinates: { x: 22, y: 78 },
    floodRating: {
      isFloodFree: true,
      elevation: 'High Ground Zone',
      badge: 'Elevated High Ground Zone',
      tagBadge: 'Ridge Zone',
      description: 'Libertad ridge area, totally immune to river floods.',
      history: '100% dry year-round.'
    },
    waterSystem: {
      hasBoosterPump: true,
      hasReserveTank: true,
      badge: 'Filtered Deep Tank',
      tankCapacity: '1,200L Overhead Tank',
      description: 'Deep well with multi-stage filtration system + overhead stainless tank.'
    },
    powerSystem: {
      hasSolarBackup: true,
      hasGenerator: false,
      badge: 'Solar Emergency Lights',
      description: 'Automatic solar emergency lighting in corridors and study rooms.'
    },
    wifiAudit: {
      downloadMbps: '40.5',
      uploadMbps: '20.0',
      provider: 'DITO 5G / Smart',
      verifiedDate: 'Aug 15, 2024 • Wing A',
      ratingBadge: 'Good',
      badge: '40 Mbps DITO/Smart',
      carrierSignals: {
        globe: '4G • 3 Bars',
        smart: '5G • 5 Bars',
        dito: '5G • Full Bars'
      }
    },
    commuteSteps: [
      { num: 1, title: '2 mins walk to FSUU Morelos Gate', desc: 'Direct stroll to Morelos campus gate.' }
    ],
    amenities: [
      { name: 'Spacious Motorcycle & Bike Parking', icon: 'desk' },
      { name: 'Communal Kitchen with Gas Stove', icon: 'fridge' },
      { name: 'Individual Desk & Fan', icon: 'desk' },
      { name: '24/7 Caretaker on premises', icon: 'caretaker' }
    ],
    rules: [
      { title: '10:00 PM Curfew', desc: 'Gate closed. Early morning duty keys available from caretaker.' }
    ],
    vibeChecks: {
      studyNoise: 4.5,
      landladyStrictness: 3.2,
      landladyNote: 'Manong Berting is very chill and helps fix anything immediately.',
      crCleanliness: 4.4,
      kitchenAccess: 4.8,
      studentTestimonial: '"Best place if your classes or maritime training are in Morelos Campus. Walk 2 mins and you are in class."'
    },
    povRoute: {
      durationSeconds: 60,
      steps: [
        { time: '0:00', title: 'Morelos Transit Pad Gate', note: 'Motorbike driveway' },
        { time: '0:35', title: 'Libertad Road pathway', note: 'Direct wide sidewalk' },
        { time: '0:58', title: 'Urios Morelos Quadrangle', note: 'Arrival at campus quad' }
      ]
    }
  },
  {
    id: 'r-calo-scholastic',
    name: 'R. Calo Scholastic Residences',
    campusId: 'fsuu-main',
    zone: 'R. Calo Extension',
    area: 'R. Calo Extension, near FSUU Main, Butuan City',
    shortLocation: 'R. Calo Extension',
    roomType: 'Solo / Semi-Private',
    gender: 'CO-ED SEPARATE FLOORS • SOLO PAD',
    statusTag: '1 Room Available',
    statusColor: 'green',
    availableCount: 1,
    price: 3500,
    priceSubtext: '/month',
    advanceDeposit: '1 Mo. Adv + 1 Mo. Dep',
    minContract: 'Min. 5 Mos. (1 Sem)',
    rating: 4.9,
    reviewCount: 29,
    landlord: {
      name: 'Atty. Greg B.',
      tag: 'Verified FSUU Alum Host',
      initials: 'GB',
      experience: 'Urios Law Alumnus',
      phone: '+63 920 771 3345',
      avatar: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=200&q=80',
      verified: true
    },
    images: [
      'https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?auto=format&fit=crop&w=1200&q=80'
    ],
    gateProximities: {
      primaryGate: 'sf-gate',
      mainSFGate: { distanceMeters: 320, walkingMinutes: 4, label: '4 min to SF Gate' },
      jcAquinoGate: { distanceMeters: 650, walkingMinutes: 8, label: '8 min to JC Aquino' },
      morelosCampus: { rides: 1, fare: 15, minutes: 10, label: '1 Trike Ride (₱15) to Morelos' }
    },
    trikeFare: '₱15',
    badges: {
      walk: '4 min to SF Gate',
      fare: 'Standby Generator',
      flood: 'Flood-Free Elevation',
      wifi: '60 Mbps Fiber',
      utility: '1,500L Tank + Booster'
    },
    mapCoordinates: { x: 26, y: 32 },
    floodRating: {
      isFloodFree: true,
      elevation: '+2.1m Elevated Street',
      badge: 'Flood-Free Elevation',
      tagBadge: 'Elevated Zone',
      description: 'R. Calo street segment with upgraded city drainage. Always clear of flooding.',
      history: 'Safe during major monsoons.'
    },
    waterSystem: {
      hasBoosterPump: true,
      hasReserveTank: true,
      badge: 'Booster Pump',
      tankCapacity: '1,500L Tank + Booster',
      description: 'Heavy duty pressure pump ensures constant pressure on all floors.'
    },
    powerSystem: {
      hasSolarBackup: false,
      hasGenerator: true,
      badge: 'Standby Generator',
      description: 'Powers all room lights, sockets, and Wi-Fi within 3 minutes of an outage.'
    },
    wifiAudit: {
      downloadMbps: '62.0',
      uploadMbps: '58.0',
      provider: 'PLDT Enterprise Fiber',
      verifiedDate: 'Sep 10, 2024 • Floor 3',
      ratingBadge: 'Ultra Fast',
      badge: '60 Mbps Fiber',
      carrierSignals: {
        globe: '5G • 5 Bars',
        smart: '5G • 5 Bars',
        dito: '4G • 4 Bars'
      }
    },
    commuteSteps: [
      { num: 1, title: '4 mins walk to FSUU San Francisco Gate', desc: 'Direct straight road with student eateries.' }
    ],
    amenities: [
      { name: 'Dedicated Air-Conditioned Study Lounge', icon: 'desk' },
      { name: 'High-Speed Fiber WiFi with Mesh repeaters', icon: 'meter' },
      { name: 'Microwave & Induction Station', icon: 'fridge' },
      { name: 'Electronic Keycard Entry', icon: 'cctv' }
    ],
    rules: [
      { title: '11:00 PM Gate Curfew', desc: 'Flexible for law students with library pass.' },
      { title: 'Strict Quiet Lounge Policy', desc: 'Study lounge is 100% silent 24/7.' }
    ],
    vibeChecks: {
      studyNoise: 5.0,
      landladyStrictness: 3.4,
      landladyNote: 'Atty. Greg is very supportive of academic life. Study lounge is heaven during exam week.',
      crCleanliness: 4.8,
      kitchenAccess: 4.4,
      studentTestimonial: '"The air-conditioned study lounge on the 3rd floor is the best study space in Butuan."'
    },
    povRoute: {
      durationSeconds: 60,
      steps: [
        { time: '0:00', title: 'R. Calo Residences Gate', note: 'Card access front glass door' },
        { time: '0:20', title: 'R. Calo Extension Walk', note: 'Direct straight road' },
        { time: '0:55', title: 'FSUU San Francisco Gate', note: 'Immediate campus entry' }
      ]
    }
  }
];

export const APPLIANCE_CATALOG = [
  { id: 'electric-fan', name: 'Electric Desk / Stand Fan', monthlyCost: 120, note: 'Flat monthly landlord fee' },
  { id: 'laptop', name: 'Laptop / PC Workstation', monthlyCost: 150, note: 'Charging & thesis usage' },
  { id: 'rice-cooker', name: 'Rice Cooker (Standard)', monthlyCost: 200, note: 'In-room cooking appliance' },
  { id: 'mini-fridge', name: 'Personal Mini Refrigerator', monthlyCost: 400, note: 'Continuous cooling appliance' },
  { id: 'induction', name: 'Single Induction Cooker', monthlyCost: 250, note: 'For personal meal prep' },
  { id: 'hair-dryer', name: 'Hair Dryer / Straightener', monthlyCost: 100, note: 'Occasional heating device' },
  { id: 'electric-kettle', name: 'Electric Kettle / Water Heater', monthlyCost: 150, note: 'Instant noodles & coffee' }
];
