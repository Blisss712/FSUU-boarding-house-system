import React, { useState, useMemo } from 'react';
import Header from './components/Header';
import GateFilterBar from './components/GateFilterBar';
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
import LandlordSmsBotModal from './components/LandlordSmsBotModal';
import ScheduleVisitModal from './components/ScheduleVisitModal';
import ChatModal from './components/ChatModal';
import BottomNav from './components/BottomNav';
import { SavedView, MyRoomView, ProfileView } from './components/TabViews';
import { INITIAL_HOUSES } from './data/boardingHouses';
import { LayoutGrid, Rows3, MapPin, Calculator, Video, Share2, Bot, SlidersHorizontal, List } from 'lucide-react';

export default function App() {
  const [properties, setProperties] = useState(INITIAL_HOUSES);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Mobile View Mode: 'list' (feed) vs 'map' (full-screen map on phone)
  const [mobileFeedMode, setMobileFeedMode] = useState('list'); // 'list' | 'map'
  
  // Card Density: 'expanded' (full inspection card) vs 'compact' (fast scanning)
  const [cardDensity, setCardDensity] = useState('expanded'); // 'expanded' | 'compact'

  // Hierarchical Filter State
  const [selectedCampus, setSelectedCampus] = useState('fsuu-main'); // 'all' | 'fsuu-main' | 'fsuu-morelos'
  const [selectedGate, setSelectedGate] = useState('sf-gate'); // 'all' | 'sf-gate' | 'jc-gate' | 'morelos-main'
  const [selectedZone, setSelectedZone] = useState('All Zones');
  const [floodFreeOnly, setFloodFreeOnly] = useState(true);
  const [powerBackupOnly, setPowerBackupOnly] = useState(false);
  const [boosterPumpOnly, setBoosterPumpOnly] = useState(false);
  const [maxBudget, setMaxBudget] = useState(7000);
  const [selectedRoomType, setSelectedRoomType] = useState('All');
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);

  // Sorting
  const [sortBy, setSortBy] = useState('nearest');

  // Navigation & Selected States
  const [activeTab, setActiveTab] = useState('explore');
  const [selectedProperty, setSelectedProperty] = useState(null);
  const [savedPropertyIds, setSavedPropertyIds] = useState(['villa-guingona']);
  const [hoveredPropertyId, setHoveredPropertyId] = useState(null);

  // Modals
  const [costCalcProperty, setCostCalcProperty] = useState(null);
  const [walkPovProperty, setWalkPovProperty] = useState(null);
  const [parentShareProperty, setParentShareProperty] = useState(null);
  const [scheduleVisitProperty, setScheduleVisitProperty] = useState(null);
  const [chatProperty, setChatProperty] = useState(null);
  const [isSmsBotOpen, setIsSmsBotOpen] = useState(false);

  // Filter Logic
  const filteredProperties = useMemo(() => {
    return properties.filter(p => {
      // Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = p.name.toLowerCase().includes(q);
        const matchesArea = p.area.toLowerCase().includes(q);
        const matchesRoom = p.roomType.toLowerCase().includes(q);
        const matchesLandlord = p.landlord.name.toLowerCase().includes(q);
        if (!matchesName && !matchesArea && !matchesRoom && !matchesLandlord) return false;
      }

      // Campus Filter
      if (selectedCampus !== 'all' && p.campusId !== selectedCampus) {
        return false;
      }

      // Specific Gate Filter
      if (selectedGate === 'sf-gate' && p.gateProximities.primaryGate !== 'sf-gate') {
        return false;
      }
      if (selectedGate === 'jc-gate' && p.gateProximities.primaryGate !== 'jc-gate') {
        return false;
      }
      if (selectedGate === 'morelos-main' && p.gateProximities.primaryGate !== 'morelos-main') {
        return false;
      }

      // Zone Filter
      if (selectedZone !== 'All Zones' && p.zone !== selectedZone) {
        return false;
      }

      // Climate & Resilience
      if (floodFreeOnly && !p.floodRating.isFloodFree) return false;
      if (powerBackupOnly && (!p.powerSystem.hasSolarBackup && !p.powerSystem.hasGenerator)) return false;
      if (boosterPumpOnly && (!p.waterSystem.hasBoosterPump || !p.waterSystem.hasReserveTank)) return false;

      // Budget & Room Type
      if (p.price > maxBudget) return false;
      if (selectedRoomType !== 'All' && !p.roomType.toLowerCase().includes(selectedRoomType.toLowerCase())) return false;

      return true;
    }).sort((a, b) => {
      if (sortBy === 'price-asc') return a.price - b.price;
      if (sortBy === 'rating') return b.rating - a.rating;
      const distA = a.gateProximities.mainSFGate?.distanceMeters || 9999;
      const distB = b.gateProximities.mainSFGate?.distanceMeters || 9999;
      return distA - distB;
    });
  }, [properties, searchQuery, selectedCampus, selectedGate, selectedZone, floodFreeOnly, powerBackupOnly, boosterPumpOnly, maxBudget, selectedRoomType, sortBy]);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (selectedCampus !== 'all') count++;
    if (selectedGate !== 'all') count++;
    if (selectedZone !== 'All Zones') count++;
    if (floodFreeOnly) count++;
    if (powerBackupOnly) count++;
    if (boosterPumpOnly) count++;
    if (maxBudget < 7000) count++;
    return count;
  }, [selectedCampus, selectedGate, selectedZone, floodFreeOnly, powerBackupOnly, boosterPumpOnly, maxBudget]);

  const handleToggleSave = (id) => {
    setSavedPropertyIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const handleUpdatePropertyAvailability = (propertyId, count, tag, color) => {
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
  };

  const handleResetFilters = () => {
    setSelectedCampus('all');
    setSelectedGate('all');
    setSelectedZone('All Zones');
    setFloodFreeOnly(false);
    setPowerBackupOnly(false);
    setBoosterPumpOnly(false);
    setMaxBudget(7000);
    setSelectedRoomType('All');
    setSearchQuery('');
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
        selectedCampus={selectedCampus}
        setSelectedCampus={setSelectedCampus}
        openFilterModal={() => setIsFilterModalOpen(true)}
        activeFilterCount={activeFilterCount}
        savedCount={savedPropertyIds.length}
        activeTab={activeTab}
        setActiveTab={(tab) => {
          setActiveTab(tab);
          setSelectedProperty(null);
        }}
        onOpenSmsBot={() => setIsSmsBotOpen(true)}
      />

      {/* ========================================================== */}
      {/* VIEW CONDITIONAL: PAD DETAILS vs EXPLORE vs TABS           */}
      {/* ========================================================== */}
      {selectedProperty ? (
        <PadDetails
          property={selectedProperty}
          onBack={() => setSelectedProperty(null)}
          onOpenCostCalc={(p) => setCostCalcProperty(p)}
          onOpenWalkPov={(p) => setWalkPovProperty(p)}
          onOpenParentShare={(p) => setParentShareProperty(p)}
          onOpenScheduleVisit={(p) => setScheduleVisitProperty(p)}
          onOpenChat={(p) => setChatProperty(p)}
        />
      ) : activeTab === 'saved' ? (
        <div className="flex-1 max-w-6xl mx-auto w-full px-4 py-6">
          <SavedView
            savedProperties={savedProperties}
            onSelectProperty={(p) => setSelectedProperty(p)}
            onToggleSave={handleToggleSave}
          />
        </div>
      ) : activeTab === 'myroom' ? (
        <div className="flex-1 max-w-4xl mx-auto w-full px-4 py-6">
          <MyRoomView />
        </div>
      ) : activeTab === 'profile' ? (
        <div className="flex-1 max-w-4xl mx-auto w-full px-4 py-6">
          <ProfileView />
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
                selectedCampus={selectedCampus}
                setSelectedCampus={setSelectedCampus}
                floodFreeOnly={floodFreeOnly}
                setFloodFreeOnly={setFloodFreeOnly}
              />
            ) : null}
          </div>

          {/* Main Feed Container: Split-Screen on Desktop, Stacked on Mobile */}
          <div className={`${mobileFeedMode === 'map' ? 'hidden lg:block' : 'block'} flex-1 max-w-[1700px] w-full mx-auto px-4 lg:px-8 py-3 lg:py-5`}>
            
            {/* Quick Gate & Filter Pill Bar */}
            <div className="mb-3">
              <GateFilterBar
                selectedGate={selectedGate}
                setSelectedGate={setSelectedGate}
                floodFreeOnly={floodFreeOnly}
                setFloodFreeOnly={setFloodFreeOnly}
                powerBackupOnly={powerBackupOnly}
                setPowerBackupOnly={setPowerBackupOnly}
                boosterPumpOnly={boosterPumpOnly}
                setBoosterPumpOnly={setBoosterPumpOnly}
                onOpenAdvancedFilter={() => setIsFilterModalOpen(true)}
                selectedZone={selectedZone}
              />
            </div>

            {/* Split Screen Layout (Desktop: 58% List / 42% Sticky Map) */}
            <div className="flex flex-col lg:flex-row gap-6 lg:gap-8 items-start">
              
              {/* LEFT COLUMN: LISTINGS STREAM (58% width on desktop) */}
              <div className="w-full lg:w-[58%] xl:w-[60%] space-y-4 pb-28 lg:pb-12">
                
                {/* 100% In-Person Inspected Rosette Banner */}
                <VerificationBanner />

                {/* Feed Header with Scalable Density Controls */}
                <div className="flex items-center justify-between pb-2 border-b border-slate-200/80">
                  <div>
                    <h2 className="font-extrabold text-base sm:text-lg text-[#0b1a30] tracking-tight leading-snug">
                      {selectedGate === 'sf-gate' ? 'Verified Pads near San Francisco St. Gate' : 
                       selectedGate === 'jc-gate' ? 'Verified Pads near JC Aquino Ave Gate' :
                       selectedGate === 'morelos-main' ? 'Verified Pads near Morelos Campus' :
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
                {filteredProperties.length === 0 ? (
                  <div className="text-center py-16 px-4 space-y-3 bg-white rounded-3xl border border-dashed border-slate-200">
                    <p className="text-base font-bold text-slate-800">No boarding houses match your exact criteria.</p>
                    <p className="text-xs text-slate-500">Try loosening your budget or clearing gate filters.</p>
                    <button
                      onClick={handleResetFilters}
                      className="px-5 py-2.5 bg-[#0b1a30] hover:bg-[#152a4d] text-white rounded-xl text-xs font-bold shadow-xs transition-colors"
                    >
                      Reset All Filters
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
                            onToggleSave={handleToggleSave}
                          />
                        ) : (
                          <PropertyCard
                            property={property}
                            onSelectProperty={(p) => setSelectedProperty(p)}
                            isSaved={savedPropertyIds.includes(property.id)}
                            onToggleSave={handleToggleSave}
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
                  selectedCampus={selectedCampus}
                  setSelectedCampus={setSelectedCampus}
                />
              </div>
            </div>
          </div>

          {/* Floating Mobile Map View Button (Only on Mobile List View) */}
          {mobileFeedMode === 'list' && (
            <div className="lg:hidden fixed bottom-20 left-1/2 -translate-x-1/2 z-40 pointer-events-auto">
              <button
                onClick={() => setMobileFeedMode('map')}
                className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#0b1a30] text-white text-xs font-black shadow-2xl border border-white/20 transition-all hover:scale-105 active:scale-95"
              >
                <MapPin className="w-4 h-4 text-amber-400" />
                <span>Map View & Proximity</span>
              </button>
            </div>
          )}

          {/* Mobile Bottom Navigation (< 1024px) */}
          <div className="lg:hidden">
            <BottomNav
              activeTab={activeTab}
              setActiveTab={(tab) => {
                setActiveTab(tab);
                setMobileFeedMode('list');
              }}
              onOpenMap={() => setMobileFeedMode('map')}
              savedCount={savedPropertyIds.length}
            />
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* INTERACTIVE MODALS                                       */}
      {/* ======================================================== */}
      {isFilterModalOpen && (
        <HierarchicalFilterModal
          selectedCampus={selectedCampus}
          setSelectedCampus={setSelectedCampus}
          selectedGate={selectedGate}
          setSelectedGate={setSelectedGate}
          selectedZone={selectedZone}
          setSelectedZone={setSelectedZone}
          maxBudget={maxBudget}
          setMaxBudget={setMaxBudget}
          selectedRoomType={selectedRoomType}
          setSelectedRoomType={setSelectedRoomType}
          floodFreeOnly={floodFreeOnly}
          setFloodFreeOnly={setFloodFreeOnly}
          powerBackupOnly={powerBackupOnly}
          setPowerBackupOnly={setPowerBackupOnly}
          boosterPumpOnly={boosterPumpOnly}
          setBoosterPumpOnly={setBoosterPumpOnly}
          matchingCount={filteredProperties.length}
          onResetFilters={handleResetFilters}
          onClose={() => setIsFilterModalOpen(false)}
        />
      )}

      {costCalcProperty && (
        <TrueCostCalculatorModal
          property={costCalcProperty}
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
          onClose={() => setChatProperty(null)}
        />
      )}

      {isSmsBotOpen && (
        <LandlordSmsBotModal
          properties={properties}
          onUpdatePropertyAvailability={handleUpdatePropertyAvailability}
          onClose={() => setIsSmsBotOpen(false)}
        />
      )}
    </div>
  );
}
