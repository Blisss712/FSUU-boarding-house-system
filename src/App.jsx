import React, { useState, useMemo } from 'react';
import Header from './components/Header';
import GateFilterBar from './components/GateFilterBar';
import VerificationBanner from './components/VerificationBanner';
import PropertyCard from './components/PropertyCard';
import PadDetails from './components/PadDetails';
import TrueCostCalculatorModal from './components/TrueCostCalculatorModal';
import WalkPovModal from './components/WalkPovModal';
import ParentShareModal from './components/ParentShareModal';
import LandlordSmsBotModal from './components/LandlordSmsBotModal';
import MapViewModal from './components/MapViewModal';
import ScheduleVisitModal from './components/ScheduleVisitModal';
import ChatModal from './components/ChatModal';
import FilterModal from './components/FilterModal';
import BottomNav from './components/BottomNav';
import { SavedView, MyRoomView, ProfileView } from './components/TabViews';
import { INITIAL_HOUSES } from './data/boardingHouses';
import { SlidersHorizontal, ArrowUpDown } from 'lucide-react';

export default function App() {
  const [properties, setProperties] = useState(INITIAL_HOUSES);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGate, setSelectedGate] = useState('sf'); // default SF Gate as in mockup
  const [floodFreeOnly, setFloodFreeOnly] = useState(true); // default true as in mockup
  const [powerBackupOnly, setPowerBackupOnly] = useState(false);
  const [boosterPumpOnly, setBoosterPumpOnly] = useState(false);

  // Advanced Filters
  const [maxBudget, setMaxBudget] = useState(7000);
  const [selectedRoomType, setSelectedRoomType] = useState('All');
  const [genderFilter, setGenderFilter] = useState('All');
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);

  // Sorting
  const [sortBy, setSortBy] = useState('nearest'); // 'nearest', 'price-asc', 'rating'

  // Navigation & Selected Views
  const [activeTab, setActiveTab] = useState('explore');
  const [selectedProperty, setSelectedProperty] = useState(null);
  const [savedPropertyIds, setSavedPropertyIds] = useState(['villa-guingona']);

  // Modals
  const [costCalcProperty, setCostCalcProperty] = useState(null);
  const [walkPovProperty, setWalkPovProperty] = useState(null);
  const [parentShareProperty, setParentShareProperty] = useState(null);
  const [scheduleVisitProperty, setScheduleVisitProperty] = useState(null);
  const [chatProperty, setChatProperty] = useState(null);
  const [isSmsBotOpen, setIsSmsBotOpen] = useState(false);
  const [isMapOpen, setIsMapOpen] = useState(false);

  // Layout View mode (mobile phone frame container or full responsive)
  const [isMobileFrame, setIsMobileFrame] = useState(false);

  // Toggle Saved Pad
  const handleToggleSave = (id) => {
    setSavedPropertyIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  // Landlord Bot updates property in real time
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

  // Active filter count
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (selectedGate !== 'all') count++;
    if (floodFreeOnly) count++;
    if (powerBackupOnly) count++;
    if (boosterPumpOnly) count++;
    if (maxBudget < 7000) count++;
    if (selectedRoomType !== 'All') count++;
    if (genderFilter !== 'All') count++;
    return count;
  }, [selectedGate, floodFreeOnly, powerBackupOnly, boosterPumpOnly, maxBudget, selectedRoomType, genderFilter]);

  // Reset Filters
  const handleResetFilters = () => {
    setSelectedGate('all');
    setFloodFreeOnly(false);
    setPowerBackupOnly(false);
    setBoosterPumpOnly(false);
    setMaxBudget(7000);
    setSelectedRoomType('All');
    setGenderFilter('All');
    setSearchQuery('');
  };

  // Filter & Sort Logic
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

      // Gate Proximity Filter
      if (selectedGate === 'sf' && (!p.gateProximities.mainSFGate || p.gateProximities.mainSFGate.walkingMinutes > 15)) {
        return false;
      }
      if (selectedGate === 'jc' && (!p.gateProximities.jcAquinoGate || p.gateProximities.jcAquinoGate.walkingMinutes > 12)) {
        return false;
      }
      if (selectedGate === 'morelos' && (!p.gateProximities.morelosCampus || p.gateProximities.morelosCampus.walkingMinutes > 5 && p.gateProximities.morelosCampus.rides === undefined)) {
        return false;
      }

      // Climate & Resilience Filters
      if (floodFreeOnly && !p.floodRating.isFloodFree) return false;
      if (powerBackupOnly && (!p.powerSystem.hasSolarBackup && !p.powerSystem.hasGenerator)) return false;
      if (boosterPumpOnly && (!p.waterSystem.hasBoosterPump || !p.waterSystem.hasReserveTank)) return false;

      // Budget & Room Type
      if (p.price > maxBudget) return false;
      if (selectedRoomType !== 'All' && !p.roomType.toLowerCase().includes(selectedRoomType.toLowerCase())) return false;
      if (genderFilter === 'Female Only' && !p.gender.toLowerCase().includes('female')) return false;
      if (genderFilter === 'Male Only' && !p.gender.toLowerCase().includes('male')) return false;

      return true;
    }).sort((a, b) => {
      if (sortBy === 'price-asc') return a.price - b.price;
      if (sortBy === 'rating') return b.rating - a.rating;
      // default nearest to SF gate
      const distA = a.gateProximities.mainSFGate?.distanceMeters || 9999;
      const distB = b.gateProximities.mainSFGate?.distanceMeters || 9999;
      return distA - distB;
    });
  }, [properties, searchQuery, selectedGate, floodFreeOnly, powerBackupOnly, boosterPumpOnly, maxBudget, selectedRoomType, genderFilter, sortBy]);

  const savedProperties = useMemo(() => {
    return properties.filter(p => savedPropertyIds.includes(p.id));
  }, [properties, savedPropertyIds]);

  return (
    <div className={`min-h-screen bg-slate-100 flex flex-col items-center ${isMobileFrame ? 'py-4 sm:py-8' : ''}`}>
      {/* Wrapper (Phone frame or full page) */}
      <div className={`w-full bg-white flex flex-col relative transition-all duration-300 ${
        isMobileFrame 
          ? 'max-w-[420px] rounded-[40px] shadow-2xl border-[8px] border-slate-900 overflow-hidden min-h-[844px]' 
          : 'max-w-xl min-h-screen border-x border-slate-200 shadow-sm'
      }`}>

        {/* If in Pad Details View, show PadDetails */}
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
        ) : (
          <>
            {/* Header */}
            <Header
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
              openFilterModal={() => setIsFilterModalOpen(true)}
              activeFilterCount={activeFilterCount}
              isMobileFrame={isMobileFrame}
              setIsMobileFrame={setIsMobileFrame}
              openSmsBotModal={() => setIsSmsBotOpen(true)}
              openMapModal={() => setIsMapOpen(true)}
              savedCount={savedPropertyIds.length}
            />

            {/* Tab Views */}
            {activeTab === 'explore' && (
              <main className="flex-1 pb-24">
                {/* Horizontal Gate Filter Pills */}
                <GateFilterBar
                  selectedGate={selectedGate}
                  setSelectedGate={setSelectedGate}
                  floodFreeOnly={floodFreeOnly}
                  setFloodFreeOnly={setFloodFreeOnly}
                  powerBackupOnly={powerBackupOnly}
                  setPowerBackupOnly={setPowerBackupOnly}
                  boosterPumpOnly={boosterPumpOnly}
                  setBoosterPumpOnly={setBoosterPumpOnly}
                />

                {/* 100% Inspected by Urian Volunteers Banner */}
                <VerificationBanner onLearnMore={() => setIsMapOpen(true)} />

                {/* Feed Header */}
                <div className="px-4 py-2 flex items-center justify-between">
                  <div>
                    <h2 className="font-extrabold text-sm sm:text-base text-slate-900">
                      {selectedGate === 'sf' ? 'Verified Pads near San Francisco St.' : 
                       selectedGate === 'jc' ? 'Verified Pads near JC Aquino Ave' :
                       selectedGate === 'morelos' ? 'Verified Pads near Morelos Campus' :
                       'All Verified Boarding Houses'}
                    </h2>
                    <p className="text-[11px] text-slate-500 font-medium">
                      Showing {filteredProperties.length} inspected boarding houses
                    </p>
                  </div>

                  {/* Sort Dropdown */}
                  <div className="flex items-center gap-1 text-xs">
                    <span className="text-slate-400 font-medium text-[11px]">Sort by:</span>
                    <select
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value)}
                      className="bg-transparent font-bold text-slate-800 text-xs focus:outline-none cursor-pointer"
                    >
                      <option value="nearest">Nearest</option>
                      <option value="price-asc">Price (Low)</option>
                      <option value="rating">Top Rated</option>
                    </select>
                  </div>
                </div>

                {/* Listings Grid / Feed */}
                <div className="px-4 space-y-4 mt-1">
                  {filteredProperties.length === 0 ? (
                    <div className="text-center py-12 px-4 space-y-3 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                      <p className="text-sm font-bold text-slate-700">No inspected pads match these exact filters.</p>
                      <p className="text-xs text-slate-500">Try adjusting your budget or clearing gate filters.</p>
                      <button
                        onClick={handleResetFilters}
                        className="px-4 py-2 bg-blue-900 text-white rounded-xl text-xs font-bold"
                      >
                        Reset All Filters
                      </button>
                    </div>
                  ) : (
                    filteredProperties.map(property => (
                      <PropertyCard
                        key={property.id}
                        property={property}
                        onSelectProperty={(p) => setSelectedProperty(p)}
                        isSaved={savedPropertyIds.includes(property.id)}
                        onToggleSave={handleToggleSave}
                        onOpenCostCalc={(p) => setCostCalcProperty(p)}
                        onOpenWalkPov={(p) => setWalkPovProperty(p)}
                      />
                    ))
                  )}
                </div>
              </main>
            )}

            {activeTab === 'saved' && (
              <SavedView
                savedProperties={savedProperties}
                onSelectProperty={(p) => setSelectedProperty(p)}
                onToggleSave={handleToggleSave}
                onOpenCostCalc={(p) => setCostCalcProperty(p)}
                onOpenWalkPov={(p) => setWalkPovProperty(p)}
              />
            )}

            {activeTab === 'myroom' && <MyRoomView />}

            {activeTab === 'profile' && <ProfileView />}

            {/* Bottom Navigation */}
            <BottomNav
              activeTab={activeTab}
              setActiveTab={setActiveTab}
              onOpenMap={() => setIsMapOpen(true)}
              savedCount={savedPropertyIds.length}
            />
          </>
        )}

        {/* ======================================================= */}
        {/* INTERACTIVE MODALS                                      */}
        {/* ======================================================= */}
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

        {isMapOpen && (
          <MapViewModal
            properties={properties}
            onSelectProperty={(p) => {
              setSelectedProperty(p);
              setIsMapOpen(false);
            }}
            onClose={() => setIsMapOpen(false)}
          />
        )}

        {isFilterModalOpen && (
          <FilterModal
            maxBudget={maxBudget}
            setMaxBudget={setMaxBudget}
            selectedRoomType={selectedRoomType}
            setSelectedRoomType={setSelectedRoomType}
            genderFilter={genderFilter}
            setGenderFilter={setGenderFilter}
            floodFreeOnly={floodFreeOnly}
            setFloodFreeOnly={setFloodFreeOnly}
            powerBackupOnly={powerBackupOnly}
            setPowerBackupOnly={setPowerBackupOnly}
            boosterPumpOnly={boosterPumpOnly}
            setBoosterPumpOnly={setBoosterPumpOnly}
            onResetFilters={handleResetFilters}
            onClose={() => setIsFilterModalOpen(false)}
          />
        )}
      </div>
    </div>
  );
}
