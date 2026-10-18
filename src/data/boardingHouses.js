// Mock database for Balay Urios (Serjon) - FSUU Student Boarding House Hub

export const INITIAL_HOUSES = [
  {
    id: 'villa-guingona',
    name: 'Villa Guingona Student Pad',
    area: 'Guingona Subd., Brgy. JP Rizal, Butuan City',
    shortLocation: 'Villa Guingona Subd.',
    roomType: 'Solo Room',
    gender: 'Female & Male Floors (Separate)',
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
      verified: true
    },
    images: [
      'https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?auto=format&fit=crop&w=1000&q=80',
      'https://images.unsplash.com/photo-1598928506311-c55ded91a20c?auto=format&fit=crop&w=1000&q=80',
      'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?auto=format&fit=crop&w=1000&q=80',
      'https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=1000&q=80'
    ],
    gateProximities: {
      mainSFGate: { distanceMeters: 260, walkingMinutes: 3, label: '3 min to SF Gate' },
      jcAquinoGate: { distanceMeters: 600, walkingMinutes: 8, label: '8 min to JC Aquino' },
      morelosCampus: { rides: 1, fare: 15, minutes: 10, label: '1 Trike Ride (₱15) to Morelos' }
    },
    trikeFare: '₱15',
    floodRating: {
      isFloodFree: true,
      elevation: '+2.4m High Ground Zone',
      badge: 'Flood-Safe Street (+2.4m)',
      description: 'Elevated +2.4m above the regional Agusan River surge marker. Zero standing water along the 260-meter stroll to San Francisco gate even during heavy monsoon downpours.',
      history: 'Historical 2022-2024 typhoons: 100% dry road access maintained.'
    },
    waterSystem: {
      hasBoosterPump: true,
      hasReserveTank: true,
      tankCapacity: '1,000L Overhead Stainless Tank',
      description: 'Equipped with a 1,000-Liter overhead stainless steel reserve tank and automatic booster pump. Eliminates low-pressure morning delays before 7:30 AM university classes.'
    },
    powerSystem: {
      hasSolarBackup: true,
      hasGenerator: false,
      badge: 'Solar Equipped Brownout Kit',
      description: 'Solar-powered automated hallway, stairwell, and perimeter lighting stay illuminated during ANECO unscheduled power outages. Ground floor common station has dedicated emergency solar charging ports for laptops and mobile phones.'
    },
    wifiAudit: {
      downloadMbps: 54.2,
      uploadMbps: 28.4,
      provider: 'PLDT Fiber',
      verifiedDate: 'Aug 12, 2024 • Room 204',
      badge: '52 Mbps PLDT Fiber',
      carrierSignals: {
        globe: '5G • Full Bars',
        smart: '4G LTE • Solid',
        dito: '4G • Good'
      }
    },
    amenities: [
      { name: 'Study Table & Chair', icon: 'table' },
      { name: 'Free Purified Drinking Water', icon: 'droplet' },
      { name: 'Shared Fridge & Induction', icon: 'fridge' },
      { name: 'Submetered (₱14/kWh)', icon: 'zap' },
      { name: 'Hallway CCTV 24/7', icon: 'shield' },
      { name: 'On-Site Resident Caretaker', icon: 'user-check' },
      { name: 'Individual Locker / Wardrobe', icon: 'lock' },
      { name: 'Fire Extinguisher & Fire Exit', icon: 'flame' }
    ],
    rules: [
      { title: '10:00 PM Gate Curfew', detail: 'Overnight hospital duty or university projects require prior digital notification slip to caretaker.' },
      { title: 'Visitors Until 7:00 PM', detail: 'Entertained at lobby or ground floor study pavilion. Strictly no mixed-gender guest access on residential floor halls.' },
      { title: '9:00 PM Quiet Study Hours', detail: 'Headphones required for video calls, thesis zoom rooms, and multimedia lectures.' },
      { title: 'Rooftop Laundry Deck', detail: 'Spacious covered drying racks + individual washing bucket bays available 6:00 AM - 9:00 PM.' }
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
        { time: '0:15', title: 'Guingona Subdivision Ave', note: 'Concrete, elevated street with zero canal overflow' },
        { time: '0:35', title: 'Corner Bakery & Sari-Sari Lane', note: 'Safe shortcut, well-lit even at 9:00 PM' },
        { time: '0:55', title: 'FSUU San Francisco Gate', note: 'Arrival at main university security guard post' }
      ]
    }
  },
  {
    id: 'san-ignacio-dorm',
    name: 'San Ignacio Dormitory & Bedspace',
    area: 'San Ignacio, JC Aquino Area, Butuan City',
    shortLocation: 'San Ignacio, JC Aquino Area',
    roomType: 'Bedspace for 4',
    gender: 'Male Dormitory Only',
    statusTag: '3 Bedspaces Left',
    statusColor: 'green',
    availableCount: 3,
    price: 2200,
    priceSubtext: 'All-In (Water & Basic Electricity Included)',
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
      verified: true
    },
    images: [
      'https://images.unsplash.com/photo-1555854877-bab0e564b8d5?auto=format&fit=crop&w=1000&q=80',
      'https://images.unsplash.com/photo-1595526114035-0d45ed16cfbf?auto=format&fit=crop&w=1000&q=80',
      'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=1000&q=80'
    ],
    gateProximities: {
      mainSFGate: { distanceMeters: 750, walkingMinutes: 10, label: '10 min to SF Gate' },
      jcAquinoGate: { distanceMeters: 450, walkingMinutes: 6, label: '6 min to JC Aquino' },
      morelosCampus: { rides: 1, fare: 15, minutes: 12, label: '1 Trike Ride (₱15) to Morelos' }
    },
    trikeFare: '₱15',
    floodRating: {
      isFloodFree: true,
      elevation: 'Elevated Concrete Pathway',
      badge: 'Dry Elevated Concrete Path',
      description: 'Built on a reinforced raised foundation. Walking path towards JC Aquino avenue is paved and does not form mud or ankle-deep puddles during rainy season.',
      history: 'Maintained dry access throughout 2023-2024 rainy season.'
    },
    waterSystem: {
      hasBoosterPump: true,
      hasReserveTank: true,
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
      downloadMbps: 35.8,
      uploadMbps: 18.2,
      provider: 'Globe Fiber',
      verifiedDate: 'Sep 01, 2024 • Male Hall B',
      badge: '35 Mbps (Smart/DITO...)',
      carrierSignals: {
        globe: '4G LTE • 4 Bars',
        smart: '5G • Full Bars',
        dito: '4G • Solid'
      }
    },
    amenities: [
      { name: 'Individual Steel Locker with Padlock Loop', icon: 'lock' },
      { name: 'Bunk Bed with High-Density Uratex Mattress', icon: 'bed' },
      { name: 'Common Study Lounge with Ceiling Fans', icon: 'table' },
      { name: 'Purified Water Refill Dispenser', icon: 'droplet' },
      { name: 'Biometric Gate Access', icon: 'shield' },
      { name: 'Night Guard on Duty (7 PM - 6 AM)', icon: 'user-check' }
    ],
    rules: [
      { title: '10:30 PM Gate Curfew', detail: 'Strict door lock. Late arrivals require valid reason and advance text to Sir Danilo.' },
      { title: 'No Outside Food in Bedrooms', detail: 'Meals must be consumed in the ground-floor canteen/dining hall.' },
      { title: 'Strictly No Alcohol / Vaping', detail: 'Zero tolerance policy for peaceful communal living.' }
    ],
    vibeChecks: {
      studyNoise: 4.6,
      landladyStrictness: 4.2,
      landladyNote: 'Sir Danilo is strict about quiet hours after 10 PM, which is awesome if you actually want to pass Engineering/Nursing.',
      crCleanliness: 4.5,
      kitchenAccess: 4.0,
      studentTestimonial: '"Very brotherhood vibe. Most of us here are Criminology and Accountancy urians. Solar setup saved our online quizzes twice already."'
    },
    povRoute: {
      durationSeconds: 60,
      steps: [
        { time: '0:00', title: 'San Ignacio Dorm Gate', note: 'Secure perimeter fence with gate lamp' },
        { time: '0:20', title: 'San Ignacio St. Elevated Walkway', note: 'Newly concreted sidewalk above gutter level' },
        { time: '0:40', title: 'Crossing JC Aquino Ave', note: 'Pedestrian lane with traffic enforcer' },
        { time: '0:58', title: 'FSUU JC Aquino Gate', note: 'Direct entrance beside Urios High/College wing' }
      ]
    }
  },
  {
    id: 'montilla-blvd-studio',
    name: 'Montilla Blvd Studio Suite',
    area: 'Montilla Boulevard, Butuan City',
    shortLocation: 'Montilla Boulevard',
    roomType: 'Private Studio Suite',
    gender: 'Co-ed / Exclusive Units',
    statusTag: '1 Last Unit Available',
    statusColor: 'orange',
    availableCount: 1,
    price: 5500,
    priceSubtext: 'Submetered Electricity & Water',
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
      verified: true
    },
    images: [
      'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=1000&q=80',
      'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=1000&q=80',
      'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=1000&q=80'
    ],
    gateProximities: {
      mainSFGate: { distanceMeters: 650, walkingMinutes: 8, label: '8 min walk / 1 Trike' },
      jcAquinoGate: { distanceMeters: 550, walkingMinutes: 7, label: '7 min walk to JC Aquino' },
      morelosCampus: { rides: 1, fare: 15, minutes: 8, label: '1 Trike Ride (₱15) to Morelos' }
    },
    trikeFare: '₱15',
    floodRating: {
      isFloodFree: true,
      elevation: 'Commercial Grade Drainage',
      badge: 'Flood-Protected Commercial Strip',
      description: 'Directly along Montilla Blvd. Clean street drainage system that drains rapidly during torrential storms.',
      history: 'Zero flooding recorded inside building or driveway.'
    },
    waterSystem: {
      hasBoosterPump: true,
      hasReserveTank: true,
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
      downloadMbps: 75.4,
      uploadMbps: 72.1,
      provider: 'Converge FiberX',
      verifiedDate: 'Oct 04, 2024 • Suite 3A',
      badge: '75 Mbps Converge',
      carrierSignals: {
        globe: '5G • 5 Bars',
        smart: '5G • 5 Bars',
        dito: '5G • 4 Bars'
      }
    },
    amenities: [
      { name: 'Private En-Suite T&B with Water Heater', icon: 'droplet' },
      { name: 'Split-Type Inverter Aircon', icon: 'zap' },
      { name: '24/7 RFID Biometrics & CCTV', icon: 'shield' },
      { name: 'Kitchenette with Exhaust & Sink', icon: 'coffee' },
      { name: 'Queen Bed with Orthopedic Mattress', icon: 'bed' },
      { name: 'Personal Balcony / Window View', icon: 'eye' }
    ],
    rules: [
      { title: 'No Curfew (24/7 RFID Keycard)', detail: 'Freedom for Nursing duty / Law school students. Strict visitor registration.' },
      { title: 'No Smoking in Units', detail: 'Dedicated outdoor terrace smoking zone only.' },
      { title: 'Quiet Hours after 11:00 PM', detail: 'Soundproofed doors ensure quiet environment.' }
    ],
    vibeChecks: {
      studyNoise: 4.9,
      landladyStrictness: 3.0,
      landladyNote: 'Engr. Alex handles things very professionally via app & receipts. Repairs are done within 2 hours.',
      crCleanliness: 5.0,
      kitchenAccess: 4.9,
      studentTestimonial: '"Worth every peso for Law school. Aircon runs on generator during power failures so review is never disrupted."'
    },
    povRoute: {
      durationSeconds: 60,
      steps: [
        { time: '0:00', title: 'Montilla Blvd Suite Lobby', note: 'Glass door with RFID scanner & security guard' },
        { time: '0:20', title: 'Montilla Boulevard Walkway', note: 'Commercial sidewalk with banks, Mercury Drug, convenience store' },
        { time: '0:45', title: 'Turn to San Francisco St.', note: 'Short crossing to university block' },
        { time: '0:59', title: 'FSUU Main Campus Entrance', note: 'Right in front of College Building' }
      ]
    }
  },
  {
    id: 'libertad-ladies-hall',
    name: 'Libertad Urian Ladies Hall',
    area: 'Brgy. Bayanihan, near JC Aquino Ave, Butuan City',
    shortLocation: 'Brgy. Bayanihan, JC Aquino',
    roomType: '2-in-a-Room Shared',
    gender: 'Female Only',
    statusTag: '2 Slots Available',
    statusColor: 'green',
    availableCount: 2,
    price: 2600,
    priceSubtext: 'Free Purified Water + WiFi included',
    advanceDeposit: '1 Mo. Adv + 1 Mo. Dep',
    minContract: 'Min. 5 Mos. (1 Sem)',
    rating: 4.8,
    reviewCount: 31,
    landlord: {
      name: 'Mrs. Lourdes V.',
      tag: 'Verified Urian Parent Host',
      initials: 'LV',
      experience: 'Hosting FSUU students for 9 years',
      phone: '+63 919 444 8821',
      verified: true
    },
    images: [
      'https://images.unsplash.com/photo-1540518614846-7ede433c4ef0?auto=format&fit=crop&w=1000&q=80',
      'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=1000&q=80'
    ],
    gateProximities: {
      mainSFGate: { distanceMeters: 550, walkingMinutes: 7, label: '7 min to SF Gate' },
      jcAquinoGate: { distanceMeters: 380, walkingMinutes: 5, label: '5 min to JC Aquino' },
      morelosCampus: { rides: 1, fare: 15, minutes: 11, label: '1 Trike Ride (₱15) to Morelos' }
    },
    trikeFare: '₱15',
    floodRating: {
      isFloodFree: true,
      elevation: '+1.8m High Ground',
      badge: '100% Flood-Free St.',
      description: 'Located in Bayanihan elevated pocket. Street stays totally dry during typhoons.',
      history: 'Zero flooding in 10 years of operation.'
    },
    waterSystem: {
      hasBoosterPump: true,
      hasReserveTank: true,
      tankCapacity: '2,000L Water Reservoir',
      description: 'Dual tank setup ensures steady high water pressure across all 3 floors.'
    },
    powerSystem: {
      hasSolarBackup: true,
      hasGenerator: false,
      badge: 'Solar Emergency System',
      description: 'Powers corridor lighting, Wi-Fi router, and emergency ground-floor charging bay.'
    },
    wifiAudit: {
      downloadMbps: 45.0,
      uploadMbps: 22.0,
      provider: 'PLDT Home Fiber',
      verifiedDate: 'Aug 20, 2024 • Floor 2',
      badge: '45 Mbps PLDT',
      carrierSignals: {
        globe: '5G • 4 Bars',
        smart: '4G LTE • 5 Bars',
        dito: '4G • 4 Bars'
      }
    },
    amenities: [
      { name: 'Biometric Fingerprint Gate Entry', icon: 'shield' },
      { name: 'Study Cubicle with Reading Lamp', icon: 'table' },
      { name: 'Hot & Cold Water Dispenser', icon: 'droplet' },
      { name: 'Shared Refrigerator & Microwave', icon: 'coffee' },
      { name: 'Spacious Laundry Area with Washtubs', icon: 'droplet' }
    ],
    rules: [
      { title: '9:30 PM Gate Curfew', detail: 'Strict curfew for safety. Nursing interns with hospital endorsement slips accommodated.' },
      { title: 'Strictly No Male Visitors in Hallways', detail: 'Male guests strictly limited to open-air ground floor reception.' }
    ],
    vibeChecks: {
      studyNoise: 4.9,
      landladyStrictness: 4.6,
      landladyNote: 'Mrs. Lourdes is strict like a grandmother, which our parents in Surigao love. Very safe.',
      crCleanliness: 4.8,
      kitchenAccess: 4.2,
      studentTestimonial: '"Super safe! CCTV is everywhere, fingerprint gate means no strangers can ever enter."'
    },
    povRoute: {
      durationSeconds: 60,
      steps: [
        { time: '0:00', title: 'Libertad Hall Gate', note: 'Fingerprint turnstile gate' },
        { time: '0:25', title: 'Bayanihan Road', note: 'Peaceful subdivision street' },
        { time: '0:45', title: 'JC Aquino Intersection', note: 'Well-patrolled corner with student eateries' },
        { time: '0:59', title: 'FSUU Gate', note: 'Direct arrival at JC Aquino entrance' }
      ]
    }
  },
  {
    id: 'morelos-transit-pad',
    name: 'Morelos Campus Transit Pad',
    area: 'Brgy. Libertad, 2 mins walk to FSUU Morelos Campus',
    shortLocation: 'Near Morelos Campus',
    roomType: 'Bedspace & Solo',
    gender: 'Co-ed Separate Wings',
    statusTag: '4 Bedspaces Left',
    statusColor: 'green',
    availableCount: 4,
    price: 2400,
    priceSubtext: 'Electricity & Water Included',
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
      verified: true
    },
    images: [
      'https://images.unsplash.com/photo-1595526114035-0d45ed16cfbf?auto=format&fit=crop&w=1000&q=80',
      'https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?auto=format&fit=crop&w=1000&q=80'
    ],
    gateProximities: {
      mainSFGate: { distanceMeters: 2800, walkingMinutes: 30, rides: 1, fare: 15, label: '1 Trike (₱15) to Main SF' },
      jcAquinoGate: { distanceMeters: 2600, walkingMinutes: 28, rides: 1, fare: 15, label: '1 Trike to JC Aquino' },
      morelosCampus: { distanceMeters: 180, walkingMinutes: 2, label: '2 min walk to Morelos Campus' }
    },
    trikeFare: '₱15',
    floodRating: {
      isFloodFree: true,
      elevation: 'High Ground Zone',
      badge: 'Elevated High Ground',
      description: 'Libertad ridge area, totally immune to river floods.',
      history: '100% dry year-round.'
    },
    waterSystem: {
      hasBoosterPump: true,
      hasReserveTank: true,
      tankCapacity: '1,200L Overhead Tank',
      description: 'Deep well with filtration system + overhead stainless tank.'
    },
    powerSystem: {
      hasSolarBackup: true,
      hasGenerator: false,
      badge: 'Solar Emergency Lights',
      description: 'Automatic solar emergency lighting in corridors and study rooms.'
    },
    wifiAudit: {
      downloadMbps: 40.5,
      uploadMbps: 20.0,
      provider: 'DITO 5G / Smart',
      verifiedDate: 'Aug 15, 2024 • Wing A',
      badge: '40 Mbps DITO/Smart',
      carrierSignals: {
        globe: '4G • 3 Bars',
        smart: '5G • 5 Bars',
        dito: '5G • Full Bars'
      }
    },
    amenities: [
      { name: 'Spacious Motorcycle & Bike Parking', icon: 'car' },
      { name: 'Communal Kitchen with Gas Stove', icon: 'coffee' },
      { name: 'Individual Desk & Fan', icon: 'table' },
      { name: '24/7 Caretaker on premises', icon: 'user-check' }
    ],
    rules: [
      { title: '10:00 PM Curfew', detail: 'Gate closed. Early morning duty keys available from caretaker.' },
      { title: 'Strictly No Drinking Parties', detail: 'Quiet atmosphere for students.' }
    ],
    vibeChecks: {
      studyNoise: 4.5,
      landladyStrictness: 3.2,
      landladyNote: 'Manong Berting is very chill and helps fix anything immediately. Super friendly.',
      crCleanliness: 4.4,
      kitchenAccess: 4.8,
      studentTestimonial: '"Best place if your classes or training are in Morelos Campus. Walk 2 mins and you are inside the gate."'
    },
    povRoute: {
      durationSeconds: 60,
      steps: [
        { time: '0:00', title: 'Morelos Transit Pad Gate', note: 'Covered motorbike driveway' },
        { time: '0:20', title: 'Libertad Road pathway', note: 'Direct wide sidewalk' },
        { time: '0:45', title: 'Morelos Campus Guardhouse', note: 'Security inspection gate' },
        { time: '0:58', title: 'Urios Morelos Quadrangle', note: 'Immediate arrival at campus quad' }
      ]
    }
  },
  {
    id: 'r-calo-scholastic',
    name: 'R. Calo Scholastic Residences',
    area: 'R. Calo Extension, near FSUU Main, Butuan City',
    shortLocation: 'R. Calo Extension',
    roomType: 'Solo / Semi-Private',
    gender: 'Co-ed Separate Floors',
    statusTag: '1 Room Available',
    statusColor: 'green',
    availableCount: 1,
    price: 3500,
    priceSubtext: 'Submetered (₱13/kWh) + Free High Speed WiFi',
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
      verified: true
    },
    images: [
      'https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=1000&q=80',
      'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?auto=format&fit=crop&w=1000&q=80'
    ],
    gateProximities: {
      mainSFGate: { distanceMeters: 320, walkingMinutes: 4, label: '4 min to SF Gate' },
      jcAquinoGate: { distanceMeters: 650, walkingMinutes: 8, label: '8 min to JC Aquino' },
      morelosCampus: { rides: 1, fare: 15, minutes: 10, label: '1 Trike Ride (₱15) to Morelos' }
    },
    trikeFare: '₱15',
    floodRating: {
      isFloodFree: true,
      elevation: '+2.1m Elevated Street',
      badge: 'Flood-Free Elevation',
      description: 'R. Calo street segment with upgraded city drainage. Always clear of flooding.',
      history: 'Safe during major monsoons.'
    },
    waterSystem: {
      hasBoosterPump: true,
      hasReserveTank: true,
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
      downloadMbps: 62.0,
      uploadMbps: 58.0,
      provider: 'PLDT Enterprise Fiber',
      verifiedDate: 'Sep 10, 2024 • Floor 3',
      badge: '60 Mbps Fiber',
      carrierSignals: {
        globe: '5G • 5 Bars',
        smart: '5G • 5 Bars',
        dito: '4G • 4 Bars'
      }
    },
    amenities: [
      { name: 'Dedicated Air-Conditioned Study Lounge', icon: 'table' },
      { name: 'High-Speed Fiber WiFi with Mesh repeaters', icon: 'zap' },
      { name: 'Microwave & Induction Station', icon: 'coffee' },
      { name: 'Electronic Keycard Entry', icon: 'shield' }
    ],
    rules: [
      { title: '11:00 PM Gate Curfew', detail: 'Flexible for working students and law students with valid library pass.' },
      { title: 'Strict Quiet Lounge Policy', detail: 'Study lounge is 100% silent 24/7.' }
    ],
    vibeChecks: {
      studyNoise: 5.0,
      landladyStrictness: 3.4,
      landladyNote: 'Atty. Greg is very supportive of academic life. Quiet lounge is heaven during bar / board review.',
      crCleanliness: 4.8,
      kitchenAccess: 4.4,
      studentTestimonial: '"The air-conditioned study lounge on the 3rd floor is the best study space in Butuan. Generator kicked in during a brownout while I was taking an online exam."'
    },
    povRoute: {
      durationSeconds: 60,
      steps: [
        { time: '0:00', title: 'R. Calo Residences Gate', note: 'Card access front glass door' },
        { time: '0:20', title: 'R. Calo Extension Walk', note: 'Direct straight road with student eateries' },
        { time: '0:40', title: 'San Francisco Street Turn', note: 'Wide avenue beside university perimeter' },
        { time: '0:59', title: 'FSUU San Francisco Gate', note: 'Immediate campus entry' }
      ]
    }
  }
];

export const APPLIANCE_CATALOG = [
  { id: 'rice-cooker', name: 'Rice Cooker (Standard)', monthlyCost: 200, icon: 'bowl', note: 'Flat monthly landlord appliance fee' },
  { id: 'electric-fan', name: 'Electric Desk / Stand Fan', monthlyCost: 120, icon: 'fan', note: 'Per unit monthly charge' },
  { id: 'laptop', name: 'Laptop / PC Workstation', monthlyCost: 150, icon: 'laptop', note: 'Charging & continuous thesis usage' },
  { id: 'mini-fridge', name: 'Personal Mini Refrigerator', monthlyCost: 400, icon: 'fridge', note: 'High power continuous appliance' },
  { id: 'induction', name: 'Single Induction Cooker', monthlyCost: 250, icon: 'flame', note: 'For personal in-room cooking' },
  { id: 'hair-dryer', name: 'Hair Dryer / Iron', monthlyCost: 100, icon: 'zap', note: 'Occasional high wattage heating device' },
  { id: 'electric-kettle', name: 'Electric Kettle / Water Heater', monthlyCost: 150, icon: 'coffee', note: 'Instant noodles & coffee morning prep' }
];
