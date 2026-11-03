import React, { useState, useMemo, useEffect, useCallback } from 'react';
import Header from './components/Header';
import VerificationBanner from './components/VerificationBanner';
import PropertyCard from './components/PropertyCard';
import CompactPropertyCard from './components/CompactPropertyCard';
import PadDetails from './components/PadDetails';
import DesktopStickyMap from './components/DesktopStickyMap';
import FullScreenMapView from './components/FullScreenMapView';
import HierarchicalFilterModal from './components/HierarchicalFilterModal';
import TrueCostCalculatorModal from './components/TrueCostCalculatorModal';
import WalkPovModal from './components/WalkPovModal';
import ParentShareModal from './components/ParentShareModal';
import ScheduleVisitModal from './components/ScheduleVisitModal';
import ChatModal from './components/ChatModal';
import AuthModal from './components/AuthModal';
import LandlordProfilePage from './components/LandlordProfilePage';
import BottomNav from './components/BottomNav';
import { SavedView, MyRoomView, ProfileView, MyListingsView, AdminAuditPortalView } from './components/TabViews';
import { api } from './services/api';
import { useAuth } from './context/AuthContext';
import { LayoutGrid, Rows3, Loader2 } from 'lucide-react';

export default function App() {
  const { user, token, logout } = useAuth();
  const [properties, setProperties] = useState([]);
  const [loadingProperties, setLoadingProperties] = useState(true);
  const [availableZones, setAvailableZones] = useState(['All Zones']);
  const [availableAppliances, setAvailableAppliances] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Auth modal
  const [authModal, setAuthModal] = useState(null); // null | 'login' | 'signup'

  // Landlord full profile page
  const [viewingLandlord, setViewingLandlord] = useState(null); // { landlord, fromProperty }
  
  // Mobile View Mode: 'list' (feed) vs 'map' (full-screen map on phone)
  const [mobileFeedMode, setMobileFeedMode] = useState('list'); // 'list' | 'map'
  
  // Card Density: 'expanded' (full inspection card) vs 'compact' (fast scanning)
  const [cardDensity, setCardDensity] = useState('expanded'); // 'expanded' | 'compact'

  // The 6 Student Reality Checklist Filters
  const [rainOrShineOnly, setRainOrShineOnly] = useState(false); // Quick pill & modal: Good Condition (Rain or Shine)
  const [maxWalkMinutes, setMaxWalkMinutes] = useState(0); // 0 = any, 5 = <=5min, 10 = <=10min
  const [minWalkMinutes, setMinWalkMinutes] = useState(0); // 0 = no min
  const [maxDistanceMeters, setMaxDistanceMeters] = useState(0); // 0 = any meters
  const [minDistanceMeters, setMinDistanceMeters] = useState(0); // 0 = no min meters
  const [walkOnly, setWalkOnly] = useState(false); // Commute filter: < 5 min walk
  const [floodFreeOnly, setFloodFreeOnly] = useState(false); // Quick pill & modal: Flood-safe elevation
  const [boosterPumpOnly, setBoosterPumpOnly] = useState(false); // Quick pill & modal: 1,000L tank + booster
  const [powerBackupOnly, setPowerBackupOnly] = useState(false); // Quick pill & modal: Solar / generator
  const [mobileProvider, setMobileProvider] = useState('all'); // 'all' | 'dito' | 'smart' | 'globe'
  const [mobile5GOnly, setMobile5GOnly] = useState(false); // Quick pill: 5G mobile data
  const [minWifiSpeed, setMinWifiSpeed] = useState(0); // 0 = any, 35, 50, 60
  const [fastWifiOnly, setFastWifiOnly] = useState(false); // Quick pill: 50+ Mbps Wi-Fi
  const [selectedAmenities, setSelectedAmenities] = useState([]); // Array of required amenity names

  // General Filters (Defaulted to FSUU Main Campus)
  const [selectedCampus, setSelectedCampus] = useState('fsuu-main');
  const [selectedZone, setSelectedZone] = useState('All Zones');
  const [maxBudget, setMaxBudget] = useState(8000);
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);

  // Sorting
  const [sortBy, setSortBy] = useState('nearest');

  // Navigation & Selected States
  const [activeTab, setActiveTab] = useState('explore');
  const [selectedProperty, setSelectedProperty] = useState(null);
  const [savedPropertyIds, setSavedPropertyIds] = useState([]);
  const [hoveredPropertyId, setHoveredPropertyId] = useState(null);

  // Modals
  const [costCalcProperty, setCostCalcProperty] = useState(null);
  const [walkPovProperty, setWalkPovProperty] = useState(null);
  const [parentShareProperty, setParentShareProperty] = useState(null);
  const [scheduleVisitProperty, setScheduleVisitProperty] = useState(null);
  const [chatProperty, setChatProperty] = useState(null);

  // Notifications: recent messages from other users for the bell icon
  const [notifications, setNotifications] = useState([]);

  // The landlord's own listings, hydrated straight from Supabase so the
  // My Listings view always reflects the live backend (not a stale client copy).
  const [myListings, setMyListings] = useState([]);

  const refreshMyListings = useCallback(async () => {
    if (user?.role !== 'landlord') {
      setMyListings([]);
      return;
    }
    try {
      const list = await api.getMyListings();
      setMyListings(Array.isArray(list) ? list : []);
    } catch {
      setMyListings([]);
    }
  }, [user]);

  // Re-sync My Listings whenever the auth session changes (login/logout).
  useEffect(() => {
    refreshMyListings();
  }, [refreshMyListings]);

  // Refresh the full feed and My Listings after a tenancy change (approving an
  // application changes vacancy counts, so both views must re-read the backend).
  const refreshAfterTenancyChange = useCallback(async () => {
    try {
      const all = await api.getProperties();
      setProperties(Array.isArray(all) ? all : []);
    } catch {
      // ignore
    }
    await refreshMyListings();
  }, [refreshMyListings]);

  // Fetch new messages for notifications (for logged-in users)
  const fetchNotifications = useCallback(async () => {
    if (!user) return;

    try {
      // Determine which properties to poll
      let targetProperties = [];
      if (user.role === 'landlord') {
        // Landlord: their own listings (same source as the My Listings view)
        targetProperties = myListings;
      } else {
        // Boarder: any property they've chatted on (stored in localStorage)
        const chattedIds = JSON.parse(localStorage.getItem('balay_chatted_properties') || '[]');
        targetProperties = properties.filter(p => chattedIds.includes(p.id));
      }

      if (!targetProperties.length) return;

      const allNotifs = [];
      const seenIds = JSON.parse(localStorage.getItem('balay_seen_notif_ids') || '[]');

      for (const prop of targetProperties.slice(0, 5)) {
        const msgs = await api.getChatHistory(prop.id, user.role === 'landlord' ? null : user.id);
        // Get messages from the other side (not sent by current user)
        const incoming = msgs.filter(m => {
          const role = m.senderRole || m.parsedSender?.role || 'boarder';
          const isFromMe = user.role === 'landlord' ? role === 'landlord' : role === 'boarder';
          return !isFromMe && !m.id.startsWith('chat-init-') && m.id !== 'chat-001';
        });

        // Take the last 3
        for (const m of incoming.slice(-3)) {
          if (allNotifs.some(n => n.id === m.id)) continue;
          allNotifs.push({
            id: m.id,
            senderName: m.senderName || m.parsedSender?.name || 'Someone',
            propertyName: prop.name,
            propertyId: prop.id,
            text: m.text,
            time: m.time || '',
            read: seenIds.includes(m.id)
          });
        }
      }

      // Sort newest first (by index order, since we don't have reliable timestamps)
      setNotifications(allNotifs.reverse());
    } catch {
      // Silent fail — notifications are non-critical
    }
  }, [user, properties, myListings]);

  // Poll for notifications every 15 seconds when logged in
  useEffect(() => {
    if (!user) {
      setNotifications([]);
      return;
    }
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 15000);
    return () => clearInterval(interval);
  }, [user, fetchNotifications]);

  const handleMarkAllRead = useCallback(() => {
    const allIds = notifications.map(n => n.id);
    localStorage.setItem('balay_seen_notif_ids', JSON.stringify(allIds));
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  }, [notifications]);

  // Track properties a boarder has opened chat for, so we can poll their notifications
  const handleOpenChat = useCallback((p) => {
    const prop = p || { id: 'all' };
    setChatProperty(prop);
    if (prop?.id && prop.id !== 'all' && user?.role !== 'landlord') {
      const existing = JSON.parse(localStorage.getItem('balay_chatted_properties') || '[]');
      if (!existing.includes(prop.id)) {
        localStorage.setItem('balay_chatted_properties', JSON.stringify([...existing, prop.id]));
      }
    }
    handleMarkAllRead();
  }, [user, handleMarkAllRead]);

  // Initial fetch strictly from Supabase
  useEffect(() => {
    setLoadingProperties(true);
    api.getProperties()
      .then(data => {
        setProperties(Array.isArray(data) ? data : []);
      })
      .catch(err => {
        console.error('[Supabase Error] Failed to fetch properties:', err.message);
        setProperties([]);
      })
      .finally(() => {
        setLoadingProperties(false);
      });

    api.getZones().then(z => {
      if (Array.isArray(z) && z.length > 0) setAvailableZones(z);
    });

    api.getAppliances().then(a => {
      if (Array.isArray(a) && a.length > 0) setAvailableAppliances(a);
    });
  }, []);

  // Fetch account-specific bookmarks whenever the authenticated user or token changes
  useEffect(() => {
    if (!user) {
      setSavedPropertyIds([]);
      return;
    }

    api.getSavedProperties(token, user.id)
      .then(res => {
        if (Array.isArray(res?.savedIds)) {
          setSavedPropertyIds(res.savedIds);
        } else {
          setSavedPropertyIds([]);
        }
      })
      .catch(() => {
        setSavedPropertyIds([]);
      });
  }, [user, token]);

  // Keep landlord navigation strictly on landlord tabs (listings / explore / profile)
  useEffect(() => {
    if (user?.role === 'landlord' && (activeTab === 'myroom' || activeTab === 'saved')) {
      setActiveTab('listings');
    }
  }, [user, activeTab]);

  // Dynamic list of all available amenities across properties plus university staples
  const availableAmenities = useMemo(() => {
    const set = new Set();
    const defaults = [
      'Study Table & Chair',
      'Free Purified Drinking Water',
      'Inverter Aircon',
      'Submetered Electric (₱14/kWh)',
      '24/7 CCTV Security',
      'Biometric / RFID Gate Access',
      'Private En-Suite Bathroom',
      'Shared Kitchen & Induction Cooktop',
      'Refrigerator & Microwave Access',
      'Individual Steel Locker',
      'Rooftop Clothes Drying Deck'
    ];
    defaults.forEach(d => set.add(d));
    properties.forEach(p => {
      (p.amenities || []).forEach(a => {
        const name = typeof a === 'string' ? a : a?.name;
        if (name && name.trim()) set.add(name.trim());
      });
    });
    return Array.from(set);
  }, [properties]);

  // Filter Logic Based on The Student Reality Checklist + Amenities
  const filteredProperties = useMemo(() => {
    return properties.filter(p => {
      // 0. Comprehensive Search: Pad Name, Area, Zone, Room, Landlord, ALL Amenities, and All 6 Checklist items
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = p.name?.toLowerCase().includes(q);
        const matchesArea = p.area?.toLowerCase().includes(q);
        const matchesZone = p.zone?.toLowerCase().includes(q);
        const matchesRoom = p.roomType?.toLowerCase().includes(q);
        const matchesGender = p.gender?.toLowerCase().includes(q);
        const matchesLandlord = (p.landlord?.name || '').toLowerCase().includes(q);

        // Search by Amenities
        const matchesAmenity = (p.amenities || []).some(a => {
          const str = typeof a === 'string' ? a : (a?.name || '');
          return str.toLowerCase().includes(q);
        });

        // Checklist: Flood rating
        const floodText = `${p.floodRating?.badge || ''} ${p.floodRating?.tagBadge || ''} ${p.floodRating?.description || ''} ${p.floodRating?.elevation || ''}`.toLowerCase();
        const matchesFlood = floodText.includes(q) || (q.includes('flood') && p.floodRating?.isFloodFree);

        // Checklist: Water system
        const waterText = `${p.waterSystem?.badge || ''} ${p.waterSystem?.tankCapacity || ''} ${p.waterSystem?.description || ''}`.toLowerCase();
        const matchesWater = waterText.includes(q) || (q.includes('booster') && p.waterSystem?.hasBoosterPump) || (q.includes('tank') && p.waterSystem?.hasReserveTank);

        // Checklist: Power system
        const powerText = `${p.powerSystem?.badge || ''} ${p.powerSystem?.description || ''}`.toLowerCase();
        const matchesPower = powerText.includes(q) || (q.includes('solar') && p.powerSystem?.hasSolarBackup) || (q.includes('generator') && p.powerSystem?.hasGenerator);

        // Checklist: Wi-Fi & Carrier signals
        const carriers = p.wifiAudit?.carrierSignals || {};
        const carrierStr = Object.entries(carriers).map(([k, v]) => `${k} ${v}`).join(' ').toLowerCase();
        const wifiText = `${p.wifiAudit?.provider || ''} ${p.wifiAudit?.badge || ''} ${p.wifiAudit?.ratingBadge || ''} ${carrierStr}`.toLowerCase();
        const matchesWifi = wifiText.includes(q);

        // Checklist: Gate proximities & commute
        const gateText = `${p.gateProximities?.mainSFGate?.label || ''} ${p.gateProximities?.jcAquinoGate?.label || ''} ${p.gateProximities?.primaryGate || ''}`.toLowerCase();
        const matchesGate = gateText.includes(q);

        // House rules
        const rulesText = (p.rules || []).map(r => typeof r === 'string' ? r : `${r.title || ''} ${r.desc || ''}`).join(' ').toLowerCase();
        const matchesRules = rulesText.includes(q);

        if (!matchesName && !matchesArea && !matchesZone && !matchesRoom && !matchesGender && !matchesLandlord && !matchesAmenity && !matchesFlood && !matchesWater && !matchesPower && !matchesWifi && !matchesGate && !matchesRules) {
          return false;
        }
      }

      // Campus Filter
      if (selectedCampus !== 'all' && p.campusId !== selectedCampus) {
        return false;
      }

      // Zone Filter
      if (selectedZone !== 'All Zones' && p.zone !== selectedZone) {
        return false;
      }

      // Budget (8000 = no max limit / ₱8,000+)
      if (maxBudget < 8000 && p.price > maxBudget) return false;

      // =========================================================
      // THE 6 STUDENT REALITY CHECKLIST EVALUATIONS:
      // =========================================================

      // 1. Building Condition in Good Condition (Rain or Shine)
      if (rainOrShineOnly) {
        const isGood = p.buildingCondition?.isCertified ?? 
                       p.badges?.verifiedItems?.goodCondition ?? 
                       p.badges?.verifiedItems?.distance ?? 
                       p.badges?.isUriosVerified ?? 
                       true;
        if (!isGood) return false;
      }

      // Distance & Commute Preferences (Walking minutes & distance meters)
      const distMeters = p.gateProximities?.mainSFGate?.distanceMeters ?? (p.gateProximities?.mainSFGate?.walkingMinutes ? p.gateProximities.mainSFGate.walkingMinutes * 75 : 9999);
      const walkMinutes = p.gateProximities?.mainSFGate?.walkingMinutes ?? 99;

      if (walkOnly && walkMinutes > 5) return false;
      if (maxWalkMinutes > 0 && walkMinutes > maxWalkMinutes) return false;
      if (minWalkMinutes > 0 && walkMinutes < minWalkMinutes) return false;
      if (maxDistanceMeters > 0 && distMeters > maxDistanceMeters) return false;
      if (minDistanceMeters > 0 && distMeters < minDistanceMeters) return false;

      // 2. Flood Safe Zone
      if (floodFreeOnly && !p.floodRating?.isFloodFree) return false;

      // 3. Water System Condition (Booster pump & reserve tank)
      if (boosterPumpOnly && (!p.waterSystem?.hasBoosterPump || !p.waterSystem?.hasReserveTank)) return false;

      // 4. Brownout Resilience Condition (Solar / Generator)
      if (powerBackupOnly && (!p.powerSystem?.hasSolarBackup && !p.powerSystem?.hasGenerator)) return false;

      // 5. Mobile Data Speed / Signal Providers (DITO, Smart, Globe)
      const carriers = p.wifiAudit?.carrierSignals || {};
      const globeStr = (carriers.globe || '').toLowerCase();
      const smartStr = (carriers.smart || '').toLowerCase();
      const ditoStr = (carriers.dito || '').toLowerCase();

      if (mobile5GOnly) {
        const has5G = globeStr.includes('5g') || smartStr.includes('5g') || ditoStr.includes('5g');
        if (!has5G) return false;
      }

      if (mobileProvider === 'dito') {
        const isDitoGood = ditoStr.includes('5g') || ditoStr.includes('full') || ditoStr.includes('4 bars') || ditoStr.includes('solid');
        if (!isDitoGood) return false;
      } else if (mobileProvider === 'smart') {
        const isSmartGood = smartStr.includes('5g') || smartStr.includes('full') || smartStr.includes('5 bars') || smartStr.includes('solid');
        if (!isSmartGood) return false;
      } else if (mobileProvider === 'globe') {
        const isGlobeGood = globeStr.includes('5g') || globeStr.includes('full') || globeStr.includes('5 bars') || globeStr.includes('solid');
        if (!isGlobeGood) return false;
      }

      // 6. Wi-Fi Speed
      const wifiSpeed = Number(p.wifiAudit?.downloadMbps) || 0;
      if (fastWifiOnly && wifiSpeed < 50) return false;
      if (minWifiSpeed > 0 && wifiSpeed < minWifiSpeed) return false;

      // 7. Included Amenities & Facilities Filter
      if (selectedAmenities.length > 0) {
        const propAmenityNames = (p.amenities || []).map(a =>
          (typeof a === 'string' ? a : a?.name || '').toLowerCase()
        );
        const matchesAllAmenities = selectedAmenities.every(req =>
          propAmenityNames.some(name => name.includes(req.toLowerCase()))
        );
        if (!matchesAllAmenities) return false;
      }

      return true;
    }).sort((a, b) => {
      if (sortBy === 'price-asc') return a.price - b.price;
      if (sortBy === 'rating') return b.rating - a.rating;
      const distA = a.gateProximities?.mainSFGate?.distanceMeters || 9999;
      const distB = b.gateProximities?.mainSFGate?.distanceMeters || 9999;
      return distA - distB;
    });
  }, [
    properties,
    searchQuery,
    selectedCampus,
    selectedZone,
    maxBudget,
    rainOrShineOnly,
    walkOnly,
    maxWalkMinutes,
    minWalkMinutes,
    maxDistanceMeters,
    minDistanceMeters,
    floodFreeOnly,
    boosterPumpOnly,
    powerBackupOnly,
    mobileProvider,
    mobile5GOnly,
    minWifiSpeed,
    fastWifiOnly,
    selectedAmenities,
    sortBy
  ]);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (rainOrShineOnly) count++;
    if (walkOnly || maxWalkMinutes > 0 || minWalkMinutes > 0 || maxDistanceMeters > 0 || minDistanceMeters > 0) count++;
    if (floodFreeOnly) count++;
    if (boosterPumpOnly) count++;
    if (powerBackupOnly) count++;
    if (mobile5GOnly || mobileProvider !== 'all') count++;
    if (fastWifiOnly || minWifiSpeed > 0) count++;
    if (selectedAmenities.length > 0) count++;
    if (selectedZone !== 'All Zones') count++;
    if (maxBudget < 8000) count++;
    return count;
  }, [
    rainOrShineOnly,
    walkOnly,
    maxWalkMinutes,
    minWalkMinutes,
    maxDistanceMeters,
    minDistanceMeters,
    floodFreeOnly,
    boosterPumpOnly,
    powerBackupOnly,
    mobile5GOnly,
    mobileProvider,
    fastWifiOnly,
    minWifiSpeed,
    selectedAmenities,
    selectedZone,
    maxBudget
  ]);

  const handleToggleSave = async (id) => {
    if (!user) {
      // Prompt user to log in before saving bookmarks
      setAuthModal('login');
      return;
    }

    setSavedPropertyIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );

    try {
      const res = await api.toggleSaved(id, token, user.id);
      if (Array.isArray(res?.savedIds)) {
        setSavedPropertyIds(res.savedIds);
      }
    } catch {
      // Revert if request failed
      setSavedPropertyIds(prev => 
        prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
      );
    }
  };

  const handleUpdatePropertyAvailability = async (propertyId, count, tag, color) => {
    setProperties(prev => prev.map(p => {
      if (p.id === propertyId) {
        return {
          ...p,
          availableCount: count,
          statusTag: tag,
          statusColor: color
        };
      }
      return p;
    }));

    try {
      await api.updateAvailability(propertyId, count, tag, color);
    } catch {
      // Local state fallback preserved
    }
  };

  const handleResetFilters = () => {
    setRainOrShineOnly(false);
    setWalkOnly(false);
    setMaxWalkMinutes(0);
    setMinWalkMinutes(0);
    setMaxDistanceMeters(0);
    setMinDistanceMeters(0);
    setFloodFreeOnly(false);
    setBoosterPumpOnly(false);
    setPowerBackupOnly(false);
    setMobileProvider('all');
    setMobile5GOnly(false);
    setMinWifiSpeed(0);
    setFastWifiOnly(false);
    setSelectedCampus('fsuu-main');
    setSelectedZone('All Zones');
    setSelectedAmenities([]);
    setMaxBudget(8000);
    setSearchQuery('');
  };

  const handleCreateProperty = (newProperty) => {
    setProperties(prev => [newProperty, ...prev.filter(p => p.id !== newProperty.id)]);
    setMyListings(prev => [newProperty, ...prev.filter(p => p.id !== newProperty.id)]);
  };

  const handleEditProperty = (propertyId, updatedProperty) => {
    setProperties(prev => prev.map(p => p.id === propertyId ? updatedProperty : p));
    setMyListings(prev => prev.map(p => p.id === propertyId ? updatedProperty : p));
    if (selectedProperty?.id === propertyId) {
      setSelectedProperty(updatedProperty);
    }
  };

  const handleDeleteProperty = (propertyId) => {
    setProperties(prev => prev.filter(p => p.id !== propertyId));
    setMyListings(prev => prev.filter(p => p.id !== propertyId));
    if (selectedProperty?.id === propertyId) {
      setSelectedProperty(null);
    }
  };

  const savedProperties = useMemo(() => {
    return properties.filter(p => savedPropertyIds.includes(p.id));
  }, [properties, savedPropertyIds]);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 antialiased flex flex-col">
      
      {/* Responsive Global Navigation Bar */}
      <Header
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        openFilterModal={() => setIsFilterModalOpen(true)}
        activeFilterCount={activeFilterCount}
        savedCount={savedPropertyIds.length}
        myListingsCount={myListings.length}
        activeTab={activeTab}
        setActiveTab={(tab) => {
          setActiveTab(tab);
          setSelectedProperty(null);
        }}
        onOpenMessages={(propertyId) => {
          if (propertyId && typeof propertyId === 'string') {
            const prop = properties.find(p => p.id === propertyId);
            setChatProperty(prop || { id: 'all' });
          } else {
            setChatProperty({ id: 'all' });
          }
          // Mark all notifications read when opening messages
          handleMarkAllRead();
        }}
        unreadMessagesCount={notifications.filter(n => !n.read).length}
        notifications={notifications}
        onMarkAllRead={handleMarkAllRead}
        user={user}
        onLogin={() => setAuthModal('login')}
        onSignup={() => setAuthModal('signup')}
        onLogout={logout}
        properties={properties}
        availableAmenities={availableAmenities}
        onSelectProperty={(property) => {
          setSelectedProperty(property);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
      />

      {/* ========================================================== */}
      {/* VIEW CONDITIONAL: PAD DETAILS vs EXPLORE vs TABS           */}
      {/* ========================================================== */}
      {viewingLandlord ? (
        <LandlordProfilePage
          landlord={viewingLandlord.landlord}
          allProperties={properties}
          currentProperty={viewingLandlord.fromProperty}
          onSelectProperty={(p) => {
            setViewingLandlord(null);
            setSelectedProperty(p);
          }}
          onBack={() => setViewingLandlord(null)}
          onOpenChat={handleOpenChat}
        />
      ) : selectedProperty ? (
        <PadDetails
          property={selectedProperty}
          appliances={availableAppliances}
          allProperties={properties}
          onBack={() => setSelectedProperty(null)}
          onOpenCostCalc={(p) => setCostCalcProperty(p)}
          onOpenWalkPov={(p) => setWalkPovProperty(p)}
          onOpenParentShare={(p) => setParentShareProperty(p)}
          onOpenScheduleVisit={(p) => setScheduleVisitProperty(p)}
          onOpenChat={handleOpenChat}
          onViewLandlord={(landlord) => setViewingLandlord({ landlord, fromProperty: selectedProperty })}
          onSelectProperty={(p) => setSelectedProperty(p)}
          onBoardSuccess={(_newTenancy) => {
            api.getProperties().then(res => setProperties(Array.isArray(res) ? res : (res?.data || []))).catch(() => {});
            setSelectedProperty(null);
            setActiveTab('myroom');
          }}
          onOpenAuth={(mode) => setAuthModal(mode)}
          onUpdateProperty={handleEditProperty}
        />
      ) : activeTab === 'audits' ? (
        <div className="flex-1 max-w-6xl mx-auto w-full px-4 py-6">
          <AdminAuditPortalView
            properties={properties}
            onSelectProperty={(p) => setSelectedProperty(p)}
            onUpdateProperty={handleEditProperty}
          />
        </div>
      ) : activeTab === 'listings' || (activeTab === 'saved' && user?.role === 'landlord') ? (
        <div className="flex-1 max-w-6xl mx-auto w-full px-4 py-6">
          <MyListingsView
            properties={myListings}
            onSelectProperty={(p) => setSelectedProperty(p)}
            onOpenChat={(p) => p && handleOpenChat(p)}
            onOpenParentShare={(p) => setParentShareProperty(p)}
            onUpdateAvailability={handleUpdatePropertyAvailability}
            onCreateProperty={handleCreateProperty}
            onEditProperty={handleEditProperty}
            onDeleteProperty={handleDeleteProperty}
            onRefresh={refreshAfterTenancyChange}
          />
        </div>
      ) : activeTab === 'saved' ? (
        <div className="flex-1 max-w-6xl mx-auto w-full px-4 py-6">
          <SavedView
            savedProperties={savedProperties}
            allProperties={properties}
            onSelectProperty={(p) => setSelectedProperty(p)}
            onToggleSave={handleToggleSave}
            onOpenCostCalc={(p) => setCostCalcProperty(p)}
            onOpenWalkPov={(p) => setWalkPovProperty(p)}
            onOpenChat={handleOpenChat}
            onViewLandlord={(landlord) => setViewingLandlord({ landlord, fromProperty: null })}
            onOpenAuth={(mode) => setAuthModal(mode)}
          />
        </div>
      ) : activeTab === 'myroom' ? (
        <div className="flex-1 max-w-4xl mx-auto w-full px-4 py-6">
          {user?.role === 'landlord' ? (
            <MyListingsView
              properties={myListings}
              onSelectProperty={(p) => setSelectedProperty(p)}
              onOpenChat={(p) => p && handleOpenChat(p)}
              onOpenParentShare={(p) => setParentShareProperty(p)}
              onUpdateAvailability={handleUpdatePropertyAvailability}
              onCreateProperty={handleCreateProperty}
              onEditProperty={handleEditProperty}
              onDeleteProperty={handleDeleteProperty}
              onRefresh={refreshAfterTenancyChange}
            />
          ) : (
            <MyRoomView
              user={user}
              token={token}
              onOpenAuth={(mode) => setAuthModal(mode)}
              onExplore={() => setActiveTab('explore')}
              onSelectProperty={(p) => setSelectedProperty(p)}
            />
          )}
        </div>
      ) : activeTab === 'profile' ? (
        <div className="flex-1 max-w-4xl mx-auto w-full px-4 py-6">
          <ProfileView
            onOpenAuth={(mode) => setAuthModal(mode)}
            onOpenChat={() => properties[0] && handleOpenChat(properties[0])}
          />
        </div>
      ) : (
        /* ======================================================== */
        /* EXPLORE FEED: FULLY SCALABLE DESKTOP & MOBILE ARCHITECTURE */
        /* ======================================================== */
        <div className="flex-1 flex flex-col">
          
          {/* Mobile Full-Screen Map View Toggle State (< 1024px) */}
          <div className="lg:hidden">
            {mobileFeedMode === 'map' ? (
              <FullScreenMapView
                properties={filteredProperties}
                onSelectProperty={(p) => setSelectedProperty(p)}
                onSwitchToList={() => setMobileFeedMode('list')}
                floodFreeOnly={floodFreeOnly}
                setFloodFreeOnly={setFloodFreeOnly}
              />
            ) : null}
          </div>

          {/* Main Feed Container: Split-Screen on Desktop, Stacked on Mobile */}
          <div className={`${mobileFeedMode === 'map' ? 'hidden lg:block' : 'block'} flex-1 max-w-[1700px] w-full mx-auto px-4 lg:px-8 py-3 lg:py-5`}>
            
            {/* Split Screen Layout (Desktop: 58% List / 42% Sticky Map) */}
            <div className="flex flex-col lg:flex-row gap-6 lg:gap-8 items-start">
              
              {/* LEFT COLUMN: LISTINGS STREAM (58% width on desktop) */}
              <div className="w-full lg:w-[58%] xl:w-[60%] space-y-4 pb-28 lg:pb-12">
                
                {/* 100% In-Person Inspected Rosette Banner with Integrated Audit Filters */}
                <VerificationBanner
                  rainOrShineOnly={rainOrShineOnly}
                  setRainOrShineOnly={setRainOrShineOnly}
                  walkOnly={walkOnly}
                  setWalkOnly={setWalkOnly}
                  floodFreeOnly={floodFreeOnly}
                  setFloodFreeOnly={setFloodFreeOnly}
                  powerBackupOnly={powerBackupOnly}
                  setPowerBackupOnly={setPowerBackupOnly}
                  boosterPumpOnly={boosterPumpOnly}
                  setBoosterPumpOnly={setBoosterPumpOnly}
                  fastWifiOnly={fastWifiOnly}
                  setFastWifiOnly={setFastWifiOnly}
                  mobile5GOnly={mobile5GOnly}
                  setMobile5GOnly={setMobile5GOnly}
                  onOpenAdvancedFilter={() => setIsFilterModalOpen(true)}
                  activeFilterCount={activeFilterCount}
                />

                {/* Feed Header with Scalable Density Controls */}
                <div className="flex items-center justify-between pb-2 border-b border-slate-200/80">
                  <div>
                    <h2 className="font-extrabold text-base sm:text-lg text-[#0b1a30] tracking-tight leading-snug">
                      {rainOrShineOnly ? 'Verified Pads in Good Condition (Rain or Shine)' :
                       floodFreeOnly ? 'Verified Flood-Safe Boarding Houses' :
                       boosterPumpOnly ? 'Pads with 24/7 Booster Water System' :
                       powerBackupOnly ? 'Pads with Solar / Generator Brownout Backup' :
                       mobile5GOnly ? 'Pads with Fast 5G Mobile Data Coverage' :
                       fastWifiOnly ? 'Pads with 50+ Mbps High-Speed Wi-Fi' :
                       walkOnly || maxWalkMinutes === 5 ? 'Verified Pads within 5 min Walk' :
                       selectedZone !== 'All Zones' ? `Verified Pads in ${selectedZone}` :
                       'Verified Student Pads in Butuan'}
                    </h2>
                    <p className="text-xs sm:text-[13px] text-slate-500 font-medium mt-0.5">
                      Showing {filteredProperties.length} on-site inspected boarding houses
                    </p>
                  </div>

                  {/* Density Switcher + Sort Options */}
                  <div className="flex items-center gap-2 shrink-0">
                    {/* Compact vs Expanded Density Switcher */}
                    <div className="flex items-center bg-slate-100 p-0.5 rounded-xl border border-slate-200">
                      <button
                        onClick={() => setCardDensity('compact')}
                        className={`p-1.5 rounded-lg transition-all ${
                          cardDensity === 'compact'
                            ? 'bg-white text-[#0b1a30] shadow-2xs font-bold'
                            : 'text-slate-400 hover:text-slate-700'
                        }`}
                        title="Compact View (High Density Scan)"
                      >
                        <Rows3 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setCardDensity('expanded')}
                        className={`p-1.5 rounded-lg transition-all ${
                          cardDensity === 'expanded'
                            ? 'bg-white text-[#0b1a30] shadow-2xs font-bold'
                            : 'text-slate-400 hover:text-slate-700'
                        }`}
                        title="Expanded View (Full Inspection Cards)"
                      >
                        <LayoutGrid className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Sort Dropdown */}
                    <select
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value)}
                      className="bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-bold text-[#0b1a30] focus:outline-none cursor-pointer"
                    >
                      <option value="nearest">Nearest</option>
                      <option value="price-asc">Price (Low)</option>
                      <option value="rating">Top Rated</option>
                    </select>
                  </div>
                </div>

                {/* Listings Grid: Responsive 1, 2, or 3 columns based on density */}
                {loadingProperties ? (
                  <div className="text-center py-16 px-6 bg-white rounded-3xl border border-slate-200/80 space-y-3">
                    <Loader2 className="w-8 h-8 text-[#0b1a30] animate-spin mx-auto" />
                    <p className="text-xs font-bold text-slate-500">Loading verified pads from Supabase...</p>
                  </div>
                ) : filteredProperties.length === 0 ? (
                  <div className="text-center py-16 px-6 bg-white rounded-3xl border border-dashed border-slate-200 space-y-4">
                    <div className="w-14 h-14 rounded-full bg-slate-100 flex items-center justify-center mx-auto text-2xl">🏠</div>
                    <div>
                      <p className="text-base font-extrabold text-slate-800">No pads match your filters.</p>
                      <p className="text-xs text-slate-500 mt-1">Try widening your budget or removing one filter.</p>
                    </div>
                    <button
                      onClick={handleResetFilters}
                      className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#0b1a30] hover:bg-blue-900 active:scale-95 text-white rounded-xl text-xs font-bold shadow-sm transition-all"
                    >
                      Clear All Filters
                    </button>
                  </div>
                ) : (
                  <div className={`grid gap-4 ${
                    cardDensity === 'compact'
                      ? 'grid-cols-1 md:grid-cols-2'
                      : 'grid-cols-1 sm:grid-cols-2'
                  }`}>
                    {filteredProperties.map(property => (
                      <div
                        key={property.id}
                        onMouseEnter={() => setHoveredPropertyId(property.id)}
                        onMouseLeave={() => setHoveredPropertyId(null)}
                      >
                        {cardDensity === 'compact' ? (
                          <CompactPropertyCard
                            property={property}
                            onSelectProperty={(p) => setSelectedProperty(p)}
                            isSaved={savedPropertyIds.includes(property.id)}
                            onToggleSave={user?.role === 'landlord' ? null : handleToggleSave}
                            allProperties={properties}
                            onViewLandlord={(landlord) => setViewingLandlord({ landlord, fromProperty: property })}
                            onOpenChat={handleOpenChat}
                          />
                        ) : (
                          <PropertyCard
                            property={property}
                            onSelectProperty={(p) => setSelectedProperty(p)}
                            isSaved={savedPropertyIds.includes(property.id)}
                            onToggleSave={user?.role === 'landlord' ? null : handleToggleSave}
                            allProperties={properties}
                            onViewLandlord={(landlord) => setViewingLandlord({ landlord, fromProperty: property })}
                            onOpenChat={handleOpenChat}
                          />
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* RIGHT COLUMN: STICKY INTERACTIVE MAP (42% width on desktop, hidden on mobile) */}
              <div className="hidden lg:block lg:w-[42%] xl:w-[40%] self-stretch">
                <DesktopStickyMap
                  properties={filteredProperties}
                  hoveredPropertyId={hoveredPropertyId}
                  selectedPropertyId={selectedProperty?.id}
                  onSelectProperty={(p) => setSelectedProperty(p)}
                  floodFreeOnly={floodFreeOnly}
                  setFloodFreeOnly={setFloodFreeOnly}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Mobile Bottom Navigation (< 1024px) - Available on all tab views */}
      {!selectedProperty && !viewingLandlord && (
        <div className="lg:hidden">
          <BottomNav
            activeTab={activeTab}
            setActiveTab={(tab) => {
              setActiveTab(tab);
              setMobileFeedMode('list');
            }}
            onOpenMap={() => setMobileFeedMode('map')}
            savedCount={savedPropertyIds.length}
            user={user}
            myListingsCount={myListings.length}
          />
        </div>
      )}

      {/* ======================================================== */}
      {/* INTERACTIVE MODALS                                       */}
      {/* ======================================================== */}
      {isFilterModalOpen && (
        <HierarchicalFilterModal
          selectedZone={selectedZone}
          setSelectedZone={setSelectedZone}
          zones={availableZones}
          maxBudget={maxBudget}
          setMaxBudget={setMaxBudget}
          rainOrShineOnly={rainOrShineOnly}
          setRainOrShineOnly={setRainOrShineOnly}
          maxWalkMinutes={maxWalkMinutes}
          setMaxWalkMinutes={setMaxWalkMinutes}
          minWalkMinutes={minWalkMinutes}
          setMinWalkMinutes={setMinWalkMinutes}
          maxDistanceMeters={maxDistanceMeters}
          setMaxDistanceMeters={setMaxDistanceMeters}
          minDistanceMeters={minDistanceMeters}
          setMinDistanceMeters={setMinDistanceMeters}
          floodFreeOnly={floodFreeOnly}
          setFloodFreeOnly={setFloodFreeOnly}
          boosterPumpOnly={boosterPumpOnly}
          setBoosterPumpOnly={setBoosterPumpOnly}
          powerBackupOnly={powerBackupOnly}
          setPowerBackupOnly={setPowerBackupOnly}
          mobile5GOnly={mobile5GOnly}
          setMobile5GOnly={setMobile5GOnly}
          mobileProvider={mobileProvider}
          setMobileProvider={setMobileProvider}
          fastWifiOnly={fastWifiOnly}
          setFastWifiOnly={setFastWifiOnly}
          minWifiSpeed={minWifiSpeed}
          setMinWifiSpeed={setMinWifiSpeed}
          selectedAmenities={selectedAmenities}
          setSelectedAmenities={setSelectedAmenities}
          availableAmenities={availableAmenities}
          matchingCount={filteredProperties.length}
          onResetFilters={handleResetFilters}
          onClose={() => setIsFilterModalOpen(false)}
        />
      )}

      {costCalcProperty && (
        <TrueCostCalculatorModal
          property={costCalcProperty}
          appliances={availableAppliances}
          onClose={() => setCostCalcProperty(null)}
        />
      )}

      {walkPovProperty && (
        <WalkPovModal
          property={walkPovProperty}
          onClose={() => setWalkPovProperty(null)}
        />
      )}

      {parentShareProperty && (
        <ParentShareModal
          property={parentShareProperty}
          onClose={() => setParentShareProperty(null)}
        />
      )}

      {scheduleVisitProperty && (
        <ScheduleVisitModal
          property={scheduleVisitProperty}
          onClose={() => setScheduleVisitProperty(null)}
        />
      )}

      {chatProperty && (
        <ChatModal
          property={chatProperty}
          allProperties={properties}
          onClose={() => setChatProperty(null)}
        />
      )}

      {authModal && (
        <AuthModal
          defaultMode={authModal}
          onClose={() => setAuthModal(null)}
        />
      )}
    </div>
  );
}
