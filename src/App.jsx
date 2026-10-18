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
import { Smartphone, Monitor, Sparkles, SlidersHorizontal, Calculator, Video, Share2, Bot, MapPin } from 'lucide-react';

export default function App() {
  const [properties, setProperties] = useState(INITIAL_HOUSES);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGate, setSelectedGate] = useState('sf'); // Default SF Gate (Main)
  const [floodFreeOnly, setFloodFreeOnly] = useState(true); // Default true matching screenshot
  const [powerBackupOnly, setPowerBackupOnly] = useState(false);
  const [boosterPumpOnly, setBoosterPumpOnly] = useState(false);

  // Advanced Filters
  const [maxBudget, setMaxBudget] = useState(7000);
  const [selectedRoomType, setSelectedRoomType] = useState('All');
  const [genderFilter, setGenderFilter] = useState('All');
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);

  // Sorting
  const [sortBy, setSortBy] = useState('nearest');

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

  // Presentation State: Mobile Phone Chassis vs Responsive
  const [isMobileChassis, setIsMobileChassis] = useState(true);

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
    setSelectedGate('all');
    setFloodFreeOnly(false);
    setPowerBackupOnly(false);
    setBoosterPumpOnly(false);
    setMaxBudget(7000);
    setSelectedRoomType('All');
    setGenderFilter('All');
    setSearchQuery('');
  };

  // Filtered Properties
  const filteredProperties = useMemo(() => {
    return properties.filter(p => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = p.name.toLowerCase().includes(q);
        const matchesArea = p.area.toLowerCase().includes(q);
        const matchesRoom = p.roomType.toLowerCase().includes(q);
        const matchesLandlord = p.landlord.name.toLowerCase().includes(q);
        if (!matchesName && !matchesArea && !matchesRoom && !matchesLandlord) return false;
      }

      if (selectedGate === 'sf' && (!p.gateProximities.mainSFGate || p.gateProximities.mainSFGate.walkingMinutes > 15)) {
        return false;
      }
      if (selectedGate === 'jc' && (!p.gateProximities.jcAquinoGate || p.gateProximities.jcAquinoGate.walkingMinutes > 12)) {
        return false;
      }
      if (selectedGate === 'morelos' && (!p.gateProximities.morelosCampus || (p.gateProximities.morelosCampus.walkingMinutes > 5 && p.gateProximities.morelosCampus.rides === undefined))) {
        return false;
      }

      if (floodFreeOnly && !p.floodRating.isFloodFree) return false;
      if (powerBackupOnly && (!p.powerSystem.hasSolarBackup && !p.powerSystem.hasGenerator)) return false;
      if (boosterPumpOnly && (!p.waterSystem.hasBoosterPump || !p.waterSystem.hasReserveTank)) return false;

      if (p.price > maxBudget) return false;
      if (selectedRoomType !== 'All' && !p.roomType.toLowerCase().includes(selectedRoomType.toLowerCase())) return false;
      if (genderFilter === 'Female Only' && !p.gender.toLowerCase().includes('female')) return false;
      if (genderFilter === 'Male Only' && !p.gender.toLowerCase().includes('male')) return false;

      return true;
    }).sort((a, b) => {
      if (sortBy === 'price-asc') return a.price - b.price;
      if (sortBy === 'rating') return b.rating - a.rating;
      const distA = a.gateProximities.mainSFGate?.distanceMeters || 9999;
      const distB = b.gateProximities.mainSFGate?.distanceMeters || 9999;
      return distA - distB;
    });
  }, [properties, searchQuery, selectedGate, floodFreeOnly, powerBackupOnly, boosterPumpOnly, maxBudget, selectedRoomType, genderFilter, sortBy]);

  const savedProperties = useMemo(() => {
    return properties.filter(p => savedPropertyIds.includes(p.id));
  }, [properties, savedPropertyIds]);

  return (
    <div className="min-h-screen bg-[#071120] text-slate-100 flex flex-col items-center">
      {/* Top Presentation Bar */}
      <div className="w-full bg-[#0b1a30] border-b border-slate-800/80 px-4 py-2.5 z-50 sticky top-0 shadow-md">
        <div className="max-w-4xl mx-auto flex flex-wrap items-center justify-between gap-2.5 text-xs">
          {/* Quick Screen Selector */}
          <div className="flex items-center gap-1 bg-slate-900/90 p-1 rounded-xl border border-slate-700/80">
            <button
              onClick={() => setSelectedProperty(null)}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all flex items-center gap-1.5 ${
                !selectedProperty
                  ? 'bg-amber-500 text-slate-950 shadow-xs'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <span>📱 Screen 1: Explore Feed</span>
            </button>
            <button
              onClick={() => setSelectedProperty(properties[0])}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all flex items-center gap-1.5 ${
                selectedProperty?.id === 'villa-guingona'
                  ? 'bg-amber-500 text-slate-950 shadow-xs'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <span>📱 Screen 2: Pad Details</span>
            </button>
          </div>

          {/* Quick Feature Launcher Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
            <button
              onClick={() => setCostCalcProperty(properties[0])}
              className="px-2.5 py-1 rounded-lg bg-emerald-950/80 text-emerald-300 border border-emerald-700/60 font-semibold hover:bg-emerald-900 transition-colors flex items-center gap-1"
            >
              <Calculator className="w-3.5 h-3.5" />
              <span>True Cost</span>
            </button>

            <button
              onClick={() => setWalkPovProperty(properties[0])}
              className="px-2.5 py-1 rounded-lg bg-blue-950/80 text-blue-300 border border-blue-700/60 font-semibold hover:bg-blue-900 transition-colors flex items-center gap-1"
            >
              <Video className="w-3.5 h-3.5 text-amber-400" />
              <span>60s Walk POV</span>
            </button>

            <button
              onClick={() => setParentShareProperty(properties[0])}
              className="px-2.5 py-1 rounded-lg bg-indigo-950/80 text-indigo-300 border border-indigo-700/60 font-semibold hover:bg-indigo-900 transition-colors flex items-center gap-1"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>Parent Card</span>
            </button>

            <button
              onClick={() => setIsSmsBotOpen(true)}
              className="px-2.5 py-1 rounded-lg bg-amber-950/80 text-amber-300 border border-amber-700/60 font-semibold hover:bg-amber-900 transition-colors flex items-center gap-1"
            >
              <Bot className="w-3.5 h-3.5" />
              <span>SMS Bot</span>
            </button>

            {/* Chassis Toggle */}
            <button
              onClick={() => setIsMobileChassis(!isMobileChassis)}
              className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition-colors border border-slate-700"
              title={isMobileChassis ? "Switch to fluid view" : "Switch to mobile phone frame"}
            >
              {isMobileChassis ? <Monitor className="w-4 h-4" /> : <Smartphone className="w-4 h-4 text-amber-400" />}
            </button>
          </div>
        </div>
      </div>

      {/* Main Viewport Container */}
      <div className={`w-full flex justify-center ${isMobileChassis ? 'py-4 sm:py-8' : ''}`}>
        <div className={`w-full bg-white text-slate-900 relative transition-all duration-300 ${
          isMobileChassis
            ? 'max-w-[412px] rounded-[48px] shadow-[0_25px_70px_rgba(0,0,0,0.6)] border-[10px] border-slate-900 overflow-hidden min-h-[860px]'
            : 'max-w-xl min-h-screen border-x border-slate-200'
        }`}>

          {/* iOS Status Bar (When in mobile chassis) */}
          {isMobileChassis && (
            <div className="bg-white px-6 pt-3 pb-1 flex items-center justify-between text-xs font-bold text-slate-800 select-none">
              <span>9:41</span>
              {/* Dynamic Island Pill */}
              <div className="w-24 h-4 bg-slate-950 rounded-full mx-auto" />
              <div className="flex items-center gap-1.5">
                <span className="text-[10px]">5G</span>
                <span>📶</span>
                <span>🔋</span>
              </div>
            </div>
          )}

          {/* Main App Content View */}
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
              {/* Header matching explore mockup */}
              <Header
                searchQuery={searchQuery}
                setSearchQuery={setSearchQuery}
                openFilterModal={() => setIsFilterModalOpen(true)}
                activeFilterCount={activeFilterCount}
                savedCount={savedPropertyIds.length}
                onOpenSaved={() => setActiveTab('saved')}
              />

              {/* Tab 1: Explore View */}
              {activeTab === 'explore' && (
                <main className="pb-28">
                  {/* Gate Filter Chips */}
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

                  {/* Verification Banner */}
                  <VerificationBanner />

                  {/* Feed Header */}
                  <div className="px-4 py-2 flex items-center justify-between">
                    <div>
                      <h2 className="font-extrabold text-[16px] text-[#0b1a30] tracking-tight leading-snug">
                        {selectedGate === 'sf' ? 'Verified Pads near San Francisco St.' : 
                         selectedGate === 'jc' ? 'Verified Pads near JC Aquino Ave' :
                         selectedGate === 'morelos' ? 'Verified Pads near Morelos Campus' :
                         'Verified Student Pads in Butuan'}
                      </h2>
                      <p className="text-[12px] text-slate-400 font-medium">
                        Showing {filteredProperties.length} inspected boarding houses
                      </p>
                    </div>

                    <div className="flex items-center gap-1 text-xs">
                      <span className="text-slate-400 font-medium text-[11px]">Sort by:</span>
                      <select
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value)}
                        className="bg-transparent font-extrabold text-[#0b1a30] text-xs focus:outline-none cursor-pointer"
                      >
                        <option value="nearest">Nearest ▾</option>
                        <option value="price-asc">Price (Low)</option>
                        <option value="rating">Top Rated</option>
                      </select>
                    </div>
                  </div>

                  {/* Property Listings Feed */}
                  <div className="px-4 space-y-4 mt-1">
                    {filteredProperties.length === 0 ? (
                      <div className="text-center py-12 px-4 space-y-3 bg-slate-50 rounded-3xl border border-dashed border-slate-200">
                        <p className="text-sm font-bold text-slate-700">No inspected pads match these exact filters.</p>
                        <button
                          onClick={handleResetFilters}
                          className="px-4 py-2 bg-[#0b1a30] text-white rounded-xl text-xs font-bold"
                        >
                          Reset Filters
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
                        />
                      ))
                    )}
                  </div>
                </main>
              )}

              {/* Tab 2: Saved View */}
              {activeTab === 'saved' && (
                <SavedView
                  savedProperties={savedProperties}
                  onSelectProperty={(p) => setSelectedProperty(p)}
                  onToggleSave={handleToggleSave}
                />
              )}

              {/* Tab 3: My Room View */}
              {activeTab === 'myroom' && <MyRoomView />}

              {/* Tab 4: Profile View */}
              {activeTab === 'profile' && <ProfileView />}

              {/* Bottom Nav & Floating Map Pill */}
              <BottomNav
                activeTab={activeTab}
                setActiveTab={setActiveTab}
                onOpenMap={() => setIsMapOpen(true)}
                savedCount={savedPropertyIds.length}
              />
            </>
          )}

          {/* iOS Home Indicator Bar (When in mobile chassis) */}
          {isMobileChassis && (
            <div className="absolute bottom-1 left-0 right-0 py-1 pointer-events-none flex justify-center z-50">
              <div className="w-32 h-1 bg-slate-900/30 rounded-full" />
            </div>
          )}
        </div>
      </div>

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
  );
}
