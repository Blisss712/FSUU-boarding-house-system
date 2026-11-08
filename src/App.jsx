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
import AuthModal from './components/AuthModal';
import LandlordProfilePage from './components/LandlordProfilePage';
import BottomNav from './components/BottomNav';
import MessagesView from './components/MessagesView';
import { SavedView, MyRoomView, ProfileView, MyListingsView, AdminAuditPortalView } from './components/TabViews';
import AiNeedsSearchModal from './components/AiNeedsSearchModal';
import { api } from './services/api';
import { useAuth } from './context/AuthContext';
import VerificationScopeToggle from './components/VerificationScopeToggle';
import { isListingVerified, countListingsByVerification } from './utils/verification';
import { isGoodConditionClaimed } from './utils/checklist';
import { padHasCurfew } from './utils/curfew';
import { LayoutGrid, Rows3, Loader2, LayoutList, Sparkles, ListChecks, AlertTriangle, X } from 'lucide-react';

export default function App() {
  const { user, token, logout } = useAuth();
  const [properties, setProperties] = useState([]);
  const [loadingProperties, setLoadingProperties] = useState(true);
  const [availableZones, setAvailableZones] = useState(['All Zones']);
  const [availableAppliances, setAvailableAppliances] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  
  // AI Needs Search: the student's sentence, the resulting needs list, and the
  // subset of those needs that currently filters the Explore feed.
  const [aiSearchOpen, setAiSearchOpen] = useState(false);
  const [aiSearchSeed, setAiSearchSeed] = useState('');
  const [aiNeeds, setAiNeeds] = useState(null); // { result, needs, appliedIds, unmetIds }

  // Auth modal
  const [authModal, setAuthModal] = useState(null); // null | 'login' | 'signup'

  // Landlord full profile page
  const [viewingLandlord, setViewingLandlord] = useState(null); // { landlord, fromProperty }
  
  // Mobile View Mode: 'list' (feed) vs 'map' (full-screen map on phone)
  const [mobileFeedMode, setMobileFeedMode] = useState('list'); // 'list' | 'map'
  
  // Card Density: 'expanded' (full inspection card) vs 'compact' (fast scanning)
  const [cardDensity, setCardDensity] = useState('expanded'); // 'expanded' | 'compact'

  // Explore feed scope: every listing landlords posted, or only the pads the
  // FSUU committee audited and badged "Urios Verified".
  const [verificationScope, setVerificationScope] = useState('all'); // 'all' | 'verified'

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
  const [noCurfewOnly, setNoCurfewOnly] = useState(false); // AI need: pads whose landlord removed the gate curfew

  // General Filters (Defaulted to FSUU Main Campus)
  const [selectedCampus, setSelectedCampus] = useState('fsuu-main');
  const [selectedZone, setSelectedZone] = useState('All Zones');
  const [maxBudget, setMaxBudget] = useState(8000);
  const [selectedRoomType, setSelectedRoomType] = useState('All');
  const [genderFilter, setGenderFilter] = useState('All');
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);

  // Sorting
  const [sortBy, setSortBy] = useState('nearest');

  // Navigation & Selected States
  const [activeTab, setActiveTab] = useState('explore');
  const [selectedProperty, setSelectedProperty] = useState(null);
  const [savedPropertyIds, setSavedPropertyIds] = useState([]);
  const [hoveredPropertyId, setHoveredPropertyId] = useState(null);

  // A specific chat requested from outside the Messages tab (the "Message
  // landlord" button on a listing, in My Room, or in a landlord profile).
  // `key` makes a repeat request for the same thread open it again.
  const [chatTarget, setChatTarget] = useState(null);

  // Modals
  const [costCalcProperty, setCostCalcProperty] = useState(null);
  const [walkPovProperty, setWalkPovProperty] = useState(null);
  const [parentShareProperty, setParentShareProperty] = useState(null);
  const [scheduleVisitProperty, setScheduleVisitProperty] = useState(null);

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

  /**
   * Opens the Messages tab on one specific conversation. Used by the
   * "Message landlord" buttons scattered across the feed, pad details and
   * My Room — the chat itself is the existing in-app messaging system.
   */
  const openChat = useCallback((conversationId, options = {}) => {
    if (!conversationId) return;

    setChatTarget({
      conversationId,
      draft: options.draft || '',
      key: `${conversationId}-${Date.now()}`
    });
    setSelectedProperty(null);
    setViewingLandlord(null);
    setActiveTab('messages');
    if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const openAuth = useCallback((mode = 'login') => setAuthModal(mode), []);

  // The target has been opened inside MessagesView; forget it so returning to
  // the tab later does not hijack the conversation list again.
  const clearChatTarget = useCallback(() => setChatTarget(null), []);

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

  // Enforce role-based navigation and reset restricted views on logout, so a
  // signed-out user (or someone who logs in with a different role) can never
  // see the previous account's My Listings or the admin Audit Portal.
  useEffect(() => {
    const isAdmin = user?.role === 'admin' || Boolean(user?.isAdmin);
    const isLandlord = user?.role === 'landlord';

    if (!user) {
      // Signed out: only public views remain.
      if (activeTab === 'audits' || activeTab === 'listings') {
        setActiveTab('explore');
      }
      setSelectedProperty(null);
      setViewingLandlord(null);
      return;
    }

    if (activeTab === 'audits' && !isAdmin) {
      setActiveTab(isLandlord ? 'listings' : 'explore');
    } else if (activeTab === 'listings' && !isLandlord) {
      setActiveTab('explore');
    } else if ((activeTab === 'myroom' || activeTab === 'saved') && isLandlord) {
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
      // 0. Verification scope: "Urios Verified" only, or every posted listing.
      if (verificationScope === 'verified' && !isListingVerified(p)) return false;

      // Campus Filter
      if (selectedCampus !== 'all' && p.campusId !== selectedCampus) {
        return false;
      }

      // Zone Filter
      if (selectedZone !== 'All Zones' && p.zone !== selectedZone) {
        return false;
      }

      // Room Type Filter
      if (selectedRoomType && selectedRoomType !== 'All') {
        const rt = (p.roomType || '').toLowerCase();
        // "Single Room" is a solo room too — matching only "solo"/"private"
        // silently dropped every listing that used the single-room wording.
        if (selectedRoomType === 'Solo Room' && !(rt.includes('solo') || rt.includes('private') || rt.includes('single'))) return false;
        else if (selectedRoomType === 'Bedspace' && !rt.includes('bedspace')) return false;
        else if (selectedRoomType !== 'Solo Room' && selectedRoomType !== 'Bedspace' && !rt.includes(selectedRoomType.toLowerCase())) return false;
      }

      // Gender Filter
      if (genderFilter && genderFilter !== 'All') {
        const g = (p.gender || '').toLowerCase();
        if (genderFilter === 'Female Only' && !(g.includes('female') && !g.includes('male') && !g.includes('co-ed'))) return false;
        else if (genderFilter === 'Male Only' && !(g.includes('male') && !g.includes('female') && !g.includes('co-ed'))) return false;
        else if (genderFilter !== 'Female Only' && genderFilter !== 'Male Only' && !g.includes(genderFilter.toLowerCase())) return false;
      }

      // Budget (8000 = no max limit / ₱8,000+)
      if (maxBudget < 8000 && p.price > maxBudget) return false;

      // =========================================================
      // THE 6 STUDENT REALITY CHECKLIST EVALUATIONS:
      // =========================================================

      // 1. Building Condition in Good Condition (Rain or Shine)
      // Only pads whose host actually declared a good condition qualify — the
      // old version defaulted to `true`, so the filter returned unaudited pads
      // (and every pad with no claim at all).
      if (rainOrShineOnly && !isGoodConditionClaimed(p)) return false;

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

      // 4b. No gate curfew (only pads whose landlord marked "No Curfew")
      if (noCurfewOnly && padHasCurfew(p)) return false;

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
      if (sortBy === 'rating') return (b.rating || 0) - (a.rating || 0);
      const distA = a.gateProximities?.mainSFGate?.distanceMeters || 9999;
      const distB = b.gateProximities?.mainSFGate?.distanceMeters || 9999;
      return distA - distB;
    });
  }, [
    properties,
    selectedCampus,
    selectedZone,
    selectedRoomType,
    genderFilter,
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
    noCurfewOnly,
    mobileProvider,
    mobile5GOnly,
    minWifiSpeed,
    fastWifiOnly,
    selectedAmenities,
    sortBy,
    verificationScope
  ]);

  // How many pads are audited vs posted — shown on the scope toggle itself.
  const verificationCounts = useMemo(
    () => countListingsByVerification(properties),
    [properties]
  );

  // Feed heading + subtitle follow the active scope so "Verified" is never
  // claimed while every listing is shown.
  const feedHeading = useMemo(() => {
    const prefix = verificationScope === 'verified' ? 'Verified ' : '';
    if (aiNeeds) return 'Pads matched to the needs you listed';
    if (rainOrShineOnly) return `${prefix}Pads in Good Condition (Rain or Shine)`;
    if (floodFreeOnly) return `${prefix}Flood-Safe Boarding Houses`;
    if (boosterPumpOnly) return 'Pads with 24/7 Booster Water System';
    if (powerBackupOnly) return 'Pads with Solar / Generator Brownout Backup';
    if (noCurfewOnly) return `${prefix}Pads with No Gate Curfew`;
    if (mobile5GOnly) return 'Pads with Fast 5G Mobile Data Coverage';
    if (fastWifiOnly) return 'Pads with 50+ Mbps High-Speed Wi-Fi';
    if (walkOnly || maxWalkMinutes === 5) return `${prefix}Pads within 5 min Walk`;
    if (selectedZone !== 'All Zones') return `${prefix}Pads in ${selectedZone}`;
    return verificationScope === 'verified'
      ? 'Urios Verified Student Pads in Butuan'
      : 'All Student Pads in Butuan';
  }, [
    verificationScope,
    aiNeeds,
    rainOrShineOnly,
    floodFreeOnly,
    boosterPumpOnly,
    powerBackupOnly,
    noCurfewOnly,
    mobile5GOnly,
    fastWifiOnly,
    walkOnly,
    maxWalkMinutes,
    selectedZone
  ]);

  const feedSubheading = verificationScope === 'verified'
    ? `Showing ${filteredProperties.length} Urios Verified ${filteredProperties.length === 1 ? 'pad' : 'pads'} audited on-site`
    : `Showing ${filteredProperties.length} of ${verificationCounts.all} boarding ${verificationCounts.all === 1 ? 'house' : 'houses'} posted`;

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (rainOrShineOnly) count++;
    if (walkOnly || maxWalkMinutes > 0 || minWalkMinutes > 0 || maxDistanceMeters > 0 || minDistanceMeters > 0) count++;
    if (floodFreeOnly) count++;
    if (boosterPumpOnly) count++;
    if (powerBackupOnly) count++;
    if (noCurfewOnly) count++;
    if (mobile5GOnly || mobileProvider !== 'all') count++;
    if (fastWifiOnly || minWifiSpeed > 0) count++;
    if (selectedAmenities.length > 0) count++;
    if (selectedZone !== 'All Zones') count++;
    if (selectedRoomType && selectedRoomType !== 'All') count++;
    if (genderFilter && genderFilter !== 'All') count++;
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
    noCurfewOnly,
    mobile5GOnly,
    mobileProvider,
    fastWifiOnly,
    minWifiSpeed,
    selectedAmenities,
    selectedZone,
    selectedRoomType,
    genderFilter,
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

  /**
   * Put the Explore feed back to its neutral state. Used by "Clear All Filters"
   * and as the base state an AI needs result is applied on top of — the AI list
   * replaces manual filters instead of silently stacking on top of them.
   */
  const resetExploreFilters = useCallback(() => {
    setVerificationScope('all');
    setRainOrShineOnly(false);
    setWalkOnly(false);
    setMaxWalkMinutes(0);
    setMinWalkMinutes(0);
    setMaxDistanceMeters(0);
    setMinDistanceMeters(0);
    setFloodFreeOnly(false);
    setBoosterPumpOnly(false);
    setPowerBackupOnly(false);
    setNoCurfewOnly(false);
    setMobileProvider('all');
    setMobile5GOnly(false);
    setMinWifiSpeed(0);
    setFastWifiOnly(false);
    setSelectedCampus('fsuu-main');
    setSelectedZone('All Zones');
    setSelectedRoomType('All');
    setGenderFilter('All');
    setSelectedAmenities([]);
    setMaxBudget(8000);
    setSearchQuery('');
  }, []);

  const handleResetFilters = useCallback(() => {
    resetExploreFilters();
    setAiNeeds(null);
  }, [resetExploreFilters]);

  const openAiNeeds = useCallback((seed = '') => {
    setAiSearchSeed(typeof seed === 'string' ? seed : '');
    setAiSearchOpen(true);
    // The header input is only a draft that launches AI search — clear it once
    // the sentence has been handed to the panel.
    setSearchQuery('');
  }, []);

  const clearAiNeeds = useCallback(() => {
    setAiNeeds(null);
    resetExploreFilters();
  }, [resetExploreFilters]);

  /**
   * Apply the needs the AI listed. Only "must" needs that at least one listing
   * can actually prove become filters — an unmet must-have stays visible in the
   * needs banner instead of emptying the feed.
   */
  const handleApplyAiNeeds = useCallback(({ result, needs, patch, appliedIds, unmetIds }) => {
    resetExploreFilters();

    if (patch.maxBudget) setMaxBudget(patch.maxBudget);
    if (patch.gender) setGenderFilter(patch.gender);
    if (patch.zone) setSelectedZone(patch.zone);
    if (patch.roomType) setSelectedRoomType(patch.roomType);
    if (patch.maxWalkMinutes) setMaxWalkMinutes(patch.maxWalkMinutes);
    if (patch.amenity?.length) setSelectedAmenities(patch.amenity);
    if (patch.minWifiSpeed) setMinWifiSpeed(patch.minWifiSpeed);
    if (patch.mobileProvider) setMobileProvider(patch.mobileProvider);

    if (patch.floodFreeOnly) setFloodFreeOnly(true);
    if (patch.boosterPumpOnly) setBoosterPumpOnly(true);
    if (patch.powerBackupOnly) setPowerBackupOnly(true);
    if (patch.fastWifiOnly) setFastWifiOnly(true);
    if (patch.mobile5GOnly) setMobile5GOnly(true);
    if (patch.rainOrShineOnly) setRainOrShineOnly(true);
    if (patch.noCurfewOnly) setNoCurfewOnly(true);

    setAiNeeds({ result, needs, appliedIds, unmetIds });
    setAiSearchOpen(false);
    setActiveTab('explore');
    setSelectedProperty(null);
    setViewingLandlord(null);
    if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [resetExploreFilters]);

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
        user={user}
        onLogin={() => setAuthModal('login')}
        onSignup={() => setAuthModal('signup')}
        onLogout={logout}
        onOpenAiSearch={openAiNeeds}
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
          onOpenChat={openChat}
          onOpenAuth={openAuth}
          onLandlordUpdated={(socials) => {
            const target = viewingLandlord.landlord || {};
            const matches = (owner) => {
              if (!owner) return false;
              if (target.userId && owner.userId && String(owner.userId) === String(target.userId)) return true;
              if (target.email && owner.email && String(owner.email).toLowerCase() === String(target.email).toLowerCase()) return true;
              return Boolean(
                target.name && owner.name &&
                String(owner.name).toLowerCase() === String(target.name).toLowerCase()
              );
            };
            const patch = (list) => list.map(p => (
              matches(p.landlord)
                ? { ...p, landlord: { ...p.landlord, ...socials } }
                : p
            ));

            setProperties(patch);
            setMyListings(patch);
            setViewingLandlord(prev => (
              prev ? { ...prev, landlord: { ...prev.landlord, ...socials } } : prev
            ));
          }}
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
          onViewLandlord={(landlord) => setViewingLandlord({ landlord, fromProperty: selectedProperty })}
          onSelectProperty={(p) => setSelectedProperty(p)}
          onOpenChat={openChat}
          onBoardSuccess={(_newTenancy) => {
            api.getProperties().then(res => setProperties(Array.isArray(res) ? res : (res?.data || []))).catch(() => {});
            setSelectedProperty(null);
            setActiveTab('myroom');
          }}
          onOpenAuth={(mode) => setAuthModal(mode)}
          onUpdateProperty={handleEditProperty}
          onPropertyRated={(propertyId, rating, reviewCount) => {
            const patch = (list) => list.map(p => (
              p.id === propertyId ? { ...p, rating, reviewCount } : p
            ));
            setProperties(patch);
            setMyListings(patch);
            setSelectedProperty(prev => (
              prev && prev.id === propertyId ? { ...prev, rating, reviewCount } : prev
            ));
          }}
        />
      ) : activeTab === 'audits' && (user?.role === 'admin' || user?.isAdmin) ? (
        <div className="flex-1 max-w-6xl mx-auto w-full px-4 py-6">
          <AdminAuditPortalView
            properties={properties}
            onSelectProperty={(p) => setSelectedProperty(p)}
            onUpdateProperty={handleEditProperty}
            onViewLandlord={(landlord, fromProperty) => {
              setViewingLandlord({ landlord, fromProperty: fromProperty || null });
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
          />
        </div>
      ) : user?.role === 'landlord' && (activeTab === 'listings' || activeTab === 'saved') ? (
        <div className="flex-1 max-w-6xl mx-auto w-full px-4 py-6">
          <MyListingsView
            properties={myListings}
            onSelectProperty={(p) => setSelectedProperty(p)}
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
              onViewLandlord={(landlord) => setViewingLandlord({ landlord, fromProperty: null })}
            onOpenAuth={(mode) => setAuthModal(mode)}
            onOpenChat={openChat}
          />
        </div>
      ) : activeTab === 'myroom' ? (
        <div className="flex-1 max-w-4xl mx-auto w-full px-4 py-6">
          {user?.role === 'landlord' ? (
            <MyListingsView
              properties={myListings}
              onSelectProperty={(p) => setSelectedProperty(p)}
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
              onOpenChat={openChat}
            />
          )}
        </div>
      ) : activeTab === 'profile' ? (
        <div className="flex-1 max-w-4xl mx-auto w-full px-4 py-6">
          <ProfileView
            onOpenAuth={(mode) => setAuthModal(mode)}
            onOpenLandlordProfile={(landlord) => {
              setViewingLandlord({
                landlord,
                fromProperty: myListings[0] || properties.find(p => p.landlord?.email === user?.email) || null
              });
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
          />
        </div>
      ) : activeTab === 'messages' ? (
        <MessagesView
          user={user}
          onOpenAuth={(mode) => setAuthModal(mode)}
          onOpenProperty={(listing) => {
            const full = properties.find(prop => prop.id === listing?.id);
            if (!full) return;
            setSelectedProperty(full);
            if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          initialConversationId={chatTarget?.conversationId || null}
          initialConversationKey={chatTarget?.key || null}
          initialDraft={chatTarget?.draft || ''}
          onInitialTargetConsumed={clearChatTarget}
        />
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
              <div className="w-full lg:w-[58%] xl:w-[60%] space-y-4 pb-28">
                
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

                {/* Verification scope: audited pads only vs everything posted */}
                <VerificationScopeToggle
                  scope={verificationScope}
                  counts={verificationCounts}
                  onChange={setVerificationScope}
                />

                {/* The AI needs list that is currently driving the feed */}
                {aiNeeds && (
                  <div className="rounded-2xl border border-violet-200 bg-gradient-to-r from-violet-50/90 via-white to-blue-50/80 p-3">
                    <div className="flex items-start gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-violet-100 border border-violet-200 flex items-center justify-center shrink-0">
                        <Sparkles className="w-4 h-4 text-violet-700" />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-[10px] font-black uppercase tracking-wider text-violet-900 flex items-center gap-1">
                            <ListChecks className="w-3 h-3" />
                            Needs you listed (AI)
                          </p>
                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              type="button"
                              onClick={() => openAiNeeds('')}
                              className="px-2 py-1 rounded-lg text-[10px] font-bold text-violet-900 bg-white/70 hover:bg-white border border-violet-200 transition-colors cursor-pointer"
                            >
                              Edit list
                            </button>
                            <button
                              type="button"
                              onClick={clearAiNeeds}
                              title="Clear AI needs and filters"
                              className="w-6 h-6 rounded-lg text-violet-500 hover:text-rose-600 hover:bg-rose-50 flex items-center justify-center transition-colors cursor-pointer"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        {aiNeeds.result?.summary && (
                          <p className="text-[11px] text-slate-600 mt-1 leading-snug">
                            {aiNeeds.result.summary}
                          </p>
                        )}

                        <div className="flex flex-wrap gap-1 mt-1.5">
                          {(aiNeeds.needs || []).map((need) => {
                            const isUnmet = (aiNeeds.unmetIds || []).includes(need.id);
                            const isApplied = (aiNeeds.appliedIds || []).includes(need.id);

                            return (
                              <span
                                key={need.id}
                                title={isUnmet
                                  ? 'No listing proves this yet — kept as a need, not applied as a filter'
                                  : need.priority === 'must'
                                    ? 'Must-have — filters the feed'
                                    : 'Nice-to-have — used for ranking only'}
                                className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold border ${
                                  isUnmet
                                    ? 'bg-amber-50 text-amber-900 border-amber-200'
                                    : isApplied
                                      ? 'bg-emerald-50 text-emerald-900 border-emerald-200'
                                      : 'bg-white text-slate-600 border-slate-200'
                                }`}
                              >
                                {isUnmet
                                  ? <AlertTriangle className="w-2.5 h-2.5" />
                                  : isApplied
                                    ? <ListChecks className="w-2.5 h-2.5" />
                                    : <Sparkles className="w-2.5 h-2.5" />}
                                {need.label}
                              </span>
                            );
                          })}
                        </div>

                        {(aiNeeds.unmetIds || []).length > 0 && (
                          <p className="text-[10px] text-amber-800 mt-1.5 leading-snug">
                            Not filtered on: no listing proves those yet, so they stay visible here instead of
                            emptying the feed.
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Feed Header with Scalable Density Controls */}
                <div className="flex items-center justify-between pb-2 border-b border-slate-200/80">
                  <div>
                    <h2 className="font-extrabold text-base sm:text-lg text-[#0b1a30] tracking-tight leading-snug">
                      {feedHeading}
                    </h2>
                    <p className="text-xs sm:text-[13px] text-slate-500 font-medium mt-0.5">
                      {feedSubheading}
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
                    <p className="text-xs font-bold text-slate-500">Loading boarding houses from Supabase...</p>
                  </div>
                ) : filteredProperties.length === 0 ? (
                  <div className="text-center py-16 px-6 bg-white rounded-3xl border border-dashed border-slate-200 space-y-4">
                    <div className="w-14 h-14 rounded-full bg-slate-100 flex items-center justify-center mx-auto text-2xl">
                      {aiNeeds ? '🎯' : verificationScope === 'verified' ? '🛡️' : '🏠'}
                    </div>
                    <div>
                      <p className="text-base font-extrabold text-slate-800">
                        {aiNeeds
                          ? 'No pad meets every need on your list.'
                          : verificationScope === 'verified'
                            ? 'No Urios Verified pads match your filters.'
                            : 'No pads match your filters.'}
                      </p>
                      <p className="text-xs text-slate-500 mt-1">
                        {aiNeeds
                          ? 'Each need is proven by some pad, but not all at once. Drop one must-have or raise the budget in your needs list — the AI will re-rank instantly.'
                          : verificationScope === 'verified'
                            ? verificationCounts.verified === 0
                              ? 'No pad has been audited yet — switch to all listings to see what landlords have posted.'
                              : 'Switch to all listings, or widen your budget and filters.'
                            : 'Try widening your budget or removing one filter.'}
                      </p>
                    </div>
                    <div className="flex items-center justify-center gap-2 flex-wrap">
                      {aiNeeds ? (
                        <button
                          onClick={() => openAiNeeds('')}
                          className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-violet-600 to-blue-700 hover:from-violet-700 hover:to-blue-800 active:scale-95 text-white rounded-xl text-xs font-bold shadow-sm transition-all"
                        >
                          <Sparkles className="w-3.5 h-3.5" />
                          Edit my needs list
                        </button>
                      ) : (
                        <button
                          onClick={() => openAiNeeds(searchQuery)}
                          className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-violet-600 to-blue-700 hover:from-violet-700 hover:to-blue-800 active:scale-95 text-white rounded-xl text-xs font-bold shadow-sm transition-all"
                        >
                          <Sparkles className="w-3.5 h-3.5" />
                          Ask AI instead
                        </button>
                      )}
                      {verificationScope === 'verified' && (
                        <button
                          onClick={() => setVerificationScope('all')}
                          className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white rounded-xl text-xs font-bold shadow-sm transition-all"
                        >
                          <LayoutList className="w-3.5 h-3.5" />
                          Show all listings
                        </button>
                      )}
                      <button
                        onClick={handleResetFilters}
                        className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#0b1a30] hover:bg-blue-900 active:scale-95 text-white rounded-xl text-xs font-bold shadow-sm transition-all"
                      >
                        Clear All Filters
                      </button>
                    </div>
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
                            onOpenChat={openChat}
                            onOpenAuth={openAuth}
                                            />
                        ) : (
                          <PropertyCard
                            property={property}
                            onSelectProperty={(p) => setSelectedProperty(p)}
                            isSaved={savedPropertyIds.includes(property.id)}
                            onToggleSave={user?.role === 'landlord' ? null : handleToggleSave}
                            allProperties={properties}
                            onViewLandlord={(landlord) => setViewingLandlord({ landlord, fromProperty: property })}
                            onOpenChat={openChat}
                            onOpenAuth={openAuth}
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

      {/* Bottom Navigation - Available on every screen size */}
      {!selectedProperty && !viewingLandlord && (
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
          selectedRoomType={selectedRoomType}
          setSelectedRoomType={setSelectedRoomType}
          genderFilter={genderFilter}
          setGenderFilter={setGenderFilter}
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

      <AiNeedsSearchModal
        isOpen={aiSearchOpen}
        onClose={() => setAiSearchOpen(false)}
        properties={properties}
        initialQuery={aiSearchSeed}
        initialResult={aiNeeds?.result || null}
        initialNeeds={aiNeeds?.needs || null}
        onApply={handleApplyAiNeeds}
        onOpenProperty={(property) => {
          setActiveTab('explore');
          setSelectedProperty(property);
          if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
      />

      {authModal && (
        <AuthModal
          defaultMode={authModal}
          onClose={() => setAuthModal(null)}
        />
      )}
    </div>
  );
}
