import React from 'react';
import { 
  Bookmark, Clock, FileText, Award, Building2, Plus, Minus, 
  Share2, MapPin, Eye, Home, Zap, CheckCircle2, XCircle,
  Calendar, ShieldCheck, X, RefreshCw,
  LogOut, DoorOpen, ChevronRight, Edit3, Users, UserCheck, MessageSquare
} from 'lucide-react';
import PropertyCard from './PropertyCard';
import MessageLandlordButton from './MessageLandlordButton';
import LeaveTenancyModal from './LeaveTenancyModal';
import PadEditorModal from './PadEditorModal';
import AdminAuditModal from './AdminAuditModal';
import LandlordVerificationModal from './LandlordVerificationModal';
import CurfewApprovalModal from './CurfewApprovalModal';
import StudentProfileModal from './StudentProfileModal';
import PadTenantsModal from './PadTenantsModal';
import SocialLinks from './SocialLinks';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { padHasCurfew } from '../utils/curfew';
import { getChecklistVerifiedCount, getStudentChecklist } from '../utils/checklist';

export function SavedView({ savedProperties, allProperties = [], onSelectProperty, onToggleSave, onOpenCostCalc, onOpenWalkPov, onViewLandlord, onOpenAuth, onOpenChat }) {
  const { user } = useAuth();

  if (!user) {
    return (
      <div className="p-8 text-center max-w-sm mx-auto my-12 space-y-4">
        <div className="w-16 h-16 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
          <Bookmark className="w-8 h-8" />
        </div>
        <h3 className="font-extrabold text-base text-slate-800">You're not signed in</h3>
        <p className="text-xs text-slate-500">
          Sign in or create an account to view and manage your saved boarding house bookmarks.
        </p>
        <div className="flex gap-2 justify-center pt-1">
          <button
            onClick={() => onOpenAuth?.('login')}
            className="px-4 py-2 rounded-xl text-xs font-bold bg-[#0b1a30] text-white hover:bg-[#1a3a6b] transition-colors cursor-pointer"
          >
            Log In
          </button>
          <button
            onClick={() => onOpenAuth?.('signup')}
            className="px-4 py-2 rounded-xl text-xs font-bold border border-[#0b1a30] text-[#0b1a30] hover:bg-slate-50 transition-colors cursor-pointer"
          >
            Sign Up
          </button>
        </div>
      </div>
    );
  }

  if (savedProperties.length === 0) {
    return (
      <div className="p-8 text-center max-w-sm mx-auto my-12 space-y-3">
        <div className="w-16 h-16 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
          <Bookmark className="w-8 h-8" />
        </div>
        <h3 className="font-extrabold text-base text-slate-800">No Saved Pads Yet</h3>
        <p className="text-xs text-slate-500">
          {user.role === 'landlord'
            ? 'As a landlord, your bookmark list is empty. You can save properties from the feed or manage your own listings.'
            : 'Tap the bookmark icon on any boarding house to save it to your personal list.'}
        </p>
      </div>
    );
  }

  return (
    <div className="p-4 max-w-2xl mx-auto space-y-3 pb-24">
      <div className="flex items-center justify-between">
        <h2 className="font-extrabold text-base text-slate-900">
          Saved Pads ({savedProperties.length})
        </h2>
        <span className="text-xs text-slate-500 font-medium">
          {user.name} ({user.role})
        </span>
      </div>
      <div className="space-y-4">
        {savedProperties.map(p => (
          <PropertyCard
            key={p.id}
            property={p}
            onSelectProperty={onSelectProperty}
            isSaved={true}
            onToggleSave={onToggleSave}
            allProperties={allProperties}
            onViewLandlord={onViewLandlord}
            onOpenCostCalc={onOpenCostCalc}
            onOpenWalkPov={onOpenWalkPov}
            onOpenChat={onOpenChat}
            onOpenAuth={onOpenAuth}
          />
        ))}
      </div>
    </div>
  );
}

export function MyListingsView({
  properties = [],
  onSelectProperty,
  onOpenParentShare,
  onUpdateAvailability,
  onCreateProperty,
  onEditProperty,
  onDeleteProperty,
  onRefresh
}) {
  const { user } = useAuth();
  const [updatingId, setUpdatingId] = React.useState(null);
  const [isEditorOpen, setIsEditorOpen] = React.useState(false);
  const [editorProperty, setEditorProperty] = React.useState(null); // null = add, property = edit
  const [selectedCurfewProperty, setSelectedCurfewProperty] = React.useState(null);
  const [isCurfewApprovalOpen, setIsCurfewApprovalOpen] = React.useState(false);
  const [pendingCounts, setPendingCounts] = React.useState({});

  // Pending tenant applications (student wants to board, landlord must approve)
  const [applicationsByProperty, setApplicationsByProperty] = React.useState({});
  const [actingApplicationId, setActingApplicationId] = React.useState(null);

  // Pad Tenants state
  const [tenantsByProperty, setTenantsByProperty] = React.useState({});
  const [selectedPropertyForTenants, setSelectedPropertyForTenants] = React.useState(null);
  const [isTenantsModalOpen, setIsTenantsModalOpen] = React.useState(false);
  const [selectedTenantForProfile, setSelectedTenantForProfile] = React.useState(null);

  const loadLandlordData = React.useCallback(async () => {
    if (!properties || properties.length === 0) return;
    try {
      const counts = {};
      const tenantsMap = {};

      await Promise.all(
        properties.map(async (p) => {
          try {
            // 1. Curfew slips count (pads without a curfew have no pass feature)
            if (padHasCurfew(p)) {
              const curfewRes = await api.getCurfewSlipsByProperty(p.id);
              if (curfewRes && Array.isArray(curfewRes.data)) {
                counts[p.id] = curfewRes.data.filter(s => (s.status || 'pending') === 'pending').length;
              }
            }

            // 2. Tenants directory
            const tenantsRes = await api.getTenantsByProperty(p.id);
            if (tenantsRes && Array.isArray(tenantsRes.data)) {
              tenantsMap[p.id] = tenantsRes.data;
            }
          } catch {
            // ignore
          }
        })
      );

      // 4. Pending tenant applications (approval required before tenancy)
      try {
        const appsRes = await api.getLandlordTenantApplications(properties.map(p => p.id));
        if (appsRes && Array.isArray(appsRes.data)) {
          const appMap = {};
          appsRes.data.forEach(a => {
            if (!appMap[a.propertyId]) appMap[a.propertyId] = [];
            appMap[a.propertyId].push(a);
          });
          setApplicationsByProperty(appMap);
        }
      } catch {
        // ignore
      }

      setPendingCounts(counts);
      setTenantsByProperty(tenantsMap);
    } catch {
      // ignore
    }
  }, [properties]);

  React.useEffect(() => {
    loadLandlordData();
  }, [loadLandlordData]);

  const totalRoomsAvailable = properties.reduce((sum, p) => sum + (p.availableCount || 0), 0);

  const handleQuickCountChange = async (property, delta) => {
    const current = property.availableCount || 0;
    const newCount = Math.max(0, current + delta);
    const newTag = newCount === 0 ? 'Fully Occupied' : `${newCount} ${newCount === 1 ? 'Room' : 'Rooms'} Available`;
    const newColor = newCount === 0 ? 'orange' : 'green';

    setUpdatingId(property.id);
    try {
      await onUpdateAvailability?.(property.id, newCount, newTag, newColor);
    } finally {
      setUpdatingId(null);
    }
  };

  const handleApproveApplication = async (application) => {
    setActingApplicationId(application.id);
    try {
      await api.approveTenantApplication(application.id);
      await loadLandlordData();
      onRefresh?.();
    } catch (err) {
      window.alert(err.message || 'Failed to approve tenant application.');
    } finally {
      setActingApplicationId(null);
    }
  };

  const handleRejectApplication = async (application) => {
    setActingApplicationId(application.id);
    try {
      await api.rejectTenantApplication(application.id);
      await loadLandlordData();
      onRefresh?.();
    } catch (err) {
      window.alert(err.message || 'Failed to decline tenant application.');
    } finally {
      setActingApplicationId(null);
    }
  };

  return (
    <div className="p-4 max-w-4xl mx-auto space-y-5 pb-24">
      {/* Header Banner */}
      <div className="p-5 rounded-3xl bg-gradient-to-br from-[#0b1a30] via-[#12284c] to-[#1a3a6b] text-white shadow-lg space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-400/40 flex items-center justify-center text-amber-400 shadow-sm shrink-0">
              <Building2 className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="font-black text-lg text-white leading-tight">My Managed Listings</h2>
                <span className="px-2.5 py-0.5 rounded-full bg-amber-500 text-slate-950 text-[10px] font-black uppercase tracking-wider">
                  Landlord Hub
                </span>
              </div>
              <p className="text-xs text-blue-200 mt-0.5">
                Host: <span className="font-bold text-white">{user?.name}</span> · Real-time vacancy control & student inquiries
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => {
                setEditorProperty(null);
                setIsEditorOpen(true);
              }}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-2xl bg-amber-500 hover:bg-amber-400 active:scale-95 text-slate-950 text-xs font-black shadow-md transition-all shrink-0 cursor-pointer"
              title="Add a new boarding pad to your listings"
            >
              <Plus className="w-4 h-4 text-slate-950" />
              <span>Add New Pad</span>
            </button>

          </div>
        </div>

        {/* Quick Stats Pill Row */}
        <div className="grid grid-cols-3 gap-2 pt-2 border-t border-white/10 text-center">
          <div className="bg-white/10 rounded-2xl p-2.5">
            <p className="text-[10px] uppercase tracking-wider font-extrabold text-blue-300">Managed Pads</p>
            <p className="text-lg font-black text-white mt-0.5">{properties.length}</p>
          </div>
          <div className="bg-white/10 rounded-2xl p-2.5">
            <p className="text-[10px] uppercase tracking-wider font-extrabold text-blue-300">Total Available</p>
            <p className="text-lg font-black text-emerald-400 mt-0.5">{totalRoomsAvailable} Rooms</p>
          </div>
          <div className="bg-white/10 rounded-2xl p-2.5">
            <p className="text-[10px] uppercase tracking-wider font-extrabold text-blue-300">Campus Link</p>
            <p className="text-xs font-bold text-white mt-1 truncate">FSUU Main Campus</p>
          </div>
        </div>
      </div>

      {/* Properties List */}
      {properties.length === 0 ? (
        <div className="p-8 text-center max-w-sm mx-auto my-8 space-y-4 bg-white rounded-3xl border border-slate-200 shadow-xs">
          <div className="w-16 h-16 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center mx-auto text-2xl">
            🏠
          </div>
          <div>
            <h3 className="font-black text-base text-slate-800">No Listings Linked Yet</h3>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              You haven't added any boarding houses yet under {user?.name}. Publish your first pad to start receiving student inquiries.
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              setEditorProperty(null);
              setIsEditorOpen(true);
            }}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-[#0b1a30] hover:bg-[#1a3a6b] text-white font-black text-xs shadow-md transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4 text-amber-400" />
            <span>Publish Your First Pad</span>
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {properties.map(p => {
            const isFull = (p.availableCount || 0) === 0;
            // Real residents for this pad — never a fabricated placeholder.
            const residents = tenantsByProperty[p.id] || [];
            const residentCount = residents.length;
            const residentsLabel = `${residentCount} Active ${residentCount === 1 ? 'Boarder' : 'Boarders'}`;

            return (
              <div
                key={p.id}
                className="bg-white rounded-3xl border border-slate-200/90 shadow-sm p-4 sm:p-5 transition-all hover:shadow-md space-y-4"
              >
                <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                  {/* Photo thumbnail */}
                  <div 
                    onClick={() => onSelectProperty?.(p)}
                    className="relative w-full sm:w-44 h-36 rounded-2xl overflow-hidden bg-slate-100 shrink-0 cursor-pointer group/thumb"
                    title="Click to view pad info"
                  >
                    <img
                      src={p.images?.[0] || 'https://images.unsplash.com/photo-1598928506311-c55ded91a20c?auto=format&fit=crop&w=600&q=80'}
                      alt={p.name}
                      className="w-full h-full object-cover group-hover/thumb:scale-105 transition-transform duration-300"
                    />
                    <div className="absolute inset-0 bg-black/30 opacity-0 group-hover/thumb:opacity-100 transition-opacity flex items-center justify-center">
                      <span className="px-2.5 py-1 rounded-lg bg-black/75 text-white text-[11px] font-bold flex items-center gap-1 shadow-sm">
                        <Eye className="w-3.5 h-3.5 text-amber-400" /> View Pad
                      </span>
                    </div>
                    <div className="absolute top-2 left-2 px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider backdrop-blur-md shadow-xs bg-[#0b1a30]/80 text-white">
                      {p.zone}
                    </div>
                  </div>

                  {/* Info Column */}
                  <div className="flex-1 min-w-0 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h3 
                          onClick={() => onSelectProperty?.(p)}
                          className="font-black text-base text-slate-900 leading-snug cursor-pointer hover:text-blue-900 transition-colors"
                          title="Click to view pad info"
                        >
                          {p.name}
                        </h3>
                        <p className="text-xs text-slate-500 font-medium flex items-center gap-1 mt-0.5">
                          <MapPin className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                          <span className="truncate">{p.area}</span>
                        </p>
                      </div>

                      <div className="text-right shrink-0">
                        <span className="font-black text-base text-[#0b1a30]">₱{p.price.toLocaleString()}</span>
                        <p className="text-[10px] text-slate-400 font-semibold">{p.priceSubtext || '/month'}</p>
                      </div>
                    </div>

                    {/* Quick Vacancy Status Editor */}
                    <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                      <div className="flex items-center gap-2">
                        <span className={`w-2.5 h-2.5 rounded-full ${isFull ? 'bg-orange-500' : 'bg-emerald-500 animate-pulse'}`} />
                        <div>
                          <p className="text-[10px] font-extrabold uppercase tracking-wide text-slate-400">Current Vacancy</p>
                          <p className={`text-xs font-black ${isFull ? 'text-orange-700' : 'text-emerald-700'}`}>
                            {p.statusTag || (isFull ? 'Fully Occupied' : `${p.availableCount} Rooms Available`)}
                          </p>
                        </div>
                      </div>

                      {/* Stepper Controls */}
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold text-slate-500 hidden sm:inline">Adjust:</span>
                        <div className="flex items-center border border-slate-300 rounded-xl bg-white overflow-hidden shadow-2xs">
                          <button
                            type="button"
                            disabled={updatingId === p.id || (p.availableCount || 0) <= 0}
                            onClick={() => handleQuickCountChange(p, -1)}
                            className="w-8 h-8 flex items-center justify-center hover:bg-slate-100 disabled:opacity-40 text-slate-700 font-bold transition-colors cursor-pointer"
                            title="Decrease vacancy"
                          >
                            <Minus className="w-3.5 h-3.5" />
                          </button>
                          <span className="px-3 text-xs font-black text-slate-800 select-none">
                            {p.availableCount ?? 0}
                          </span>
                          <button
                            type="button"
                            disabled={updatingId === p.id}
                            onClick={() => handleQuickCountChange(p, 1)}
                            className="w-8 h-8 flex items-center justify-center hover:bg-slate-100 text-slate-700 font-bold transition-colors cursor-pointer"
                            title="Increase vacancy"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Included Amenities Chips for Landlord Review */}
                {Array.isArray(p.amenities) && p.amenities.length > 0 && (
                  <div className="p-2.5 rounded-2xl bg-slate-50 border border-slate-200/70 text-xs space-y-1.5">
                    <div className="flex items-center justify-between text-[11px] font-bold text-slate-500">
                      <span className="uppercase tracking-wider">Posted Included Amenities:</span>
                      <span className="text-blue-900 bg-blue-100/70 px-2 py-0.5 rounded-full font-black text-[10px]">
                        {p.amenities.length} amenities
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {p.amenities.map((a, i) => {
                        const amName = typeof a === 'string' ? a : a?.name;
                        return (
                          <span
                            key={i}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-white border border-slate-200 text-slate-700 text-[11px] font-bold shadow-2xs"
                          >
                            <span className="w-1.5 h-1.5 rounded-full bg-blue-600 shrink-0" />
                            <span>{amName}</span>
                          </span>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Active Pad Occupants / Residents Preview */}
                <div className="p-3 rounded-2xl bg-gradient-to-r from-blue-50/70 via-indigo-50/40 to-slate-50 border border-blue-200/70 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1.5 font-black text-slate-800">
                      <Users className="w-4 h-4 text-blue-700" />
                      <span>Current Residents:</span>
                      <span className={`px-2 py-0.5 rounded-full text-white text-[11px] font-black ${residentCount === 0 ? 'bg-slate-400' : 'bg-blue-600'}`}>
                        {residentsLabel}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setSelectedPropertyForTenants(p);
                        setIsTenantsModalOpen(true);
                      }}
                      className="text-blue-900 hover:text-blue-700 font-extrabold text-[11px] flex items-center gap-0.5 cursor-pointer"
                      title="View all student residents and profiles"
                    >
                      <span>View All ({residentCount})</span>
                      <ChevronRight className="w-3 h-3" />
                    </button>
                  </div>

                  {/* Interactive Student Avatar Chips */}
                  {residentCount === 0 ? (
                    <p className="text-[11px] text-slate-500 font-medium px-1">
                      No active residents yet. Boarders appear here once a tenancy is registered for this pad.
                    </p>
                  ) : (
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {residents.slice(0, 4).map((t) => {
                        const student = t.student || t;
                        const name = student.name || t.studentName || 'Student';
                        const initials = student.avatarInitials || (name ? name.substring(0, 2).toUpperCase() : 'ST');
                        return (
                          <button
                            key={t.id}
                            type="button"
                            onClick={() => {
                              setSelectedTenantForProfile(t);
                              setSelectedPropertyForTenants(p);
                            }}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-white hover:bg-blue-50 border border-slate-200 hover:border-blue-300 text-slate-800 text-[11px] font-bold shadow-2xs transition-all cursor-pointer group"
                            title={`Click to view ${name}'s full student profile`}
                          >
                            <span className="w-4 h-4 rounded-full bg-[#0b1a30] text-amber-300 text-[9px] font-black flex items-center justify-center">
                              {initials}
                            </span>
                            <span className="truncate max-w-[110px] group-hover:text-blue-900">{name}</span>
                            <span className="text-[10px] text-slate-400 font-semibold">• {t.roomNumber?.split(' ')[1] || t.roomNumber}</span>
                          </button>
                        );
                      })}
                      {residentCount > 4 && (
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedPropertyForTenants(p);
                            setIsTenantsModalOpen(true);
                          }}
                          className="text-[11px] font-bold text-blue-900 hover:text-blue-700 px-2 py-1 rounded-xl hover:bg-blue-50 transition-colors cursor-pointer"
                        >
                          +{residentCount - 4} more
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {/* Pending Tenant Applications — landlord approves before tenancy */}
                {Array.isArray(applicationsByProperty[p.id]) && applicationsByProperty[p.id].length > 0 && (
                  <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-200/90 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1.5 font-black text-emerald-950">
                        <UserCheck className="w-4 h-4 text-emerald-700" />
                        <span>Pending Tenant Applications</span>
                        <span className="px-2 py-0.5 rounded-full bg-emerald-600 text-white text-[10px] font-black">
                          {applicationsByProperty[p.id].length}
                        </span>
                      </div>
                      <span className="text-[10px] text-emerald-700 font-semibold hidden sm:inline">
                        Approve to activate tenancy
                      </span>
                    </div>

                    <div className="space-y-2">
                      {applicationsByProperty[p.id].map(app => {
                        const student = app.student || {};
                        const name = student.name || app.studentName || 'Student Applicant';
                        const initials = student.avatarInitials || name.substring(0, 2).toUpperCase();
                        const busy = actingApplicationId === app.id;
                        return (
                          <div key={app.id} className="p-2.5 rounded-xl bg-white border border-emerald-200 flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="w-8 h-8 rounded-full bg-[#0b1a30] text-amber-300 text-[10px] font-black flex items-center justify-center shrink-0">
                                {initials}
                              </span>
                              <div className="min-w-0">
                                <p className="text-xs font-black text-slate-900 truncate">{name}</p>
                                <p className="text-[10px] text-slate-500 truncate">
                                  {student.course || app.course || 'FSUU Student'} • {app.roomNumber || 'Room TBD'}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0">
                              <button
                                type="button"
                                disabled={busy}
                                onClick={() => handleApproveApplication(app)}
                                className="px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-black disabled:opacity-50 transition-colors cursor-pointer flex items-center gap-1"
                                title="Approve — make this student an active tenant"
                              >
                                <CheckCircle2 className="w-3 h-3" />
                                <span>{busy ? 'Working...' : 'Approve'}</span>
                              </button>
                              <button
                                type="button"
                                disabled={busy}
                                onClick={() => handleRejectApplication(app)}
                                className="px-2.5 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-[10px] font-black disabled:opacity-50 transition-colors cursor-pointer flex items-center gap-1"
                                title="Decline this application"
                              >
                                <XCircle className="w-3 h-3" />
                                <span>Decline</span>
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Pending Curfew Exemption Notice Alert for Landlord */}
                {padHasCurfew(p) && (pendingCounts[p.id] || 0) > 0 && (
                  <div className="p-3 rounded-2xl bg-amber-50 border border-amber-200/90 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-ping shrink-0" />
                      <div>
                        <span className="font-extrabold text-amber-950 block">
                          {pendingCounts[p.id]} Student Curfew Exemption {pendingCounts[p.id] === 1 ? 'Notice Needs' : 'Notices Need'} Review
                        </span>
                        <span className="text-[11px] text-amber-800">
                          Late hospital or campus duty gate clearance awaiting your confirmation.
                        </span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedCurfewProperty(p);
                        setIsCurfewApprovalOpen(true);
                      }}
                      className="px-3.5 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-black text-[11px] transition-colors cursor-pointer shrink-0 shadow-xs flex items-center justify-center gap-1.5"
                    >
                      <Clock className="w-3.5 h-3.5 text-white" />
                      <span>Review & Approve</span>
                    </button>
                  </div>
                )}

                {/* Landlord Action Bar */}
                <div className="pt-2 border-t border-slate-100 flex items-center gap-2 flex-wrap justify-end">
                  {/* Edit Pad Button */}
                  <button
                    type="button"
                    onClick={() => {
                      setEditorProperty(p);
                      setIsEditorOpen(true);
                    }}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-amber-50 hover:bg-amber-100 text-amber-950 border border-amber-200 transition-colors cursor-pointer"
                    title="Edit pad details, rates, and facilities"
                  >
                    <Edit3 className="w-3.5 h-3.5 text-amber-700" />
                    <span>Edit Pad</span>
                  </button>

                  {onSelectProperty && (
                    <button
                      type="button"
                      onClick={() => onSelectProperty(p)}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
                    >
                      <Eye className="w-3.5 h-3.5 text-slate-600" />
                      <span>View Public Pad</span>
                    </button>
                  )}

                  {/* Curfew Passes Button (only for pads that enforce a curfew) */}
                  {padHasCurfew(p) && (
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedCurfewProperty(p);
                        setIsCurfewApprovalOpen(true);
                      }}
                      className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        (pendingCounts[p.id] || 0) > 0
                          ? 'bg-amber-500 text-slate-950 hover:bg-amber-400 shadow-xs ring-2 ring-amber-400/40'
                          : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-950 border border-emerald-200'
                      }`}
                      title="Review and approve student curfew exemption passes"
                    >
                      <Clock className={`w-3.5 h-3.5 ${(pendingCounts[p.id] || 0) > 0 ? 'text-slate-950' : 'text-emerald-700'}`} />
                      <span>Curfew Passes</span>
                      {(pendingCounts[p.id] || 0) > 0 && (
                        <span className="px-1.5 py-0.2 rounded-full bg-slate-950 text-white text-[10px] font-black leading-none">
                          {pendingCounts[p.id]}
                        </span>
                      )}
                    </button>
                  )}

                  {/* Pad Residents Button */}
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedPropertyForTenants(p);
                      setIsTenantsModalOpen(true);
                    }}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-indigo-50 hover:bg-indigo-100 text-indigo-950 border border-indigo-200 transition-colors cursor-pointer"
                    title="View which and how many students are in this pad"
                  >
                    <Users className="w-3.5 h-3.5 text-indigo-700" />
                    <span>Tenants ({residentCount})</span>
                  </button>

                  {onOpenParentShare && (
                    <button
                      type="button"
                      onClick={() => onOpenParentShare(p)}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-purple-50 hover:bg-purple-100 text-purple-900 border border-purple-200 transition-colors cursor-pointer"
                    >
                      <Share2 className="w-3.5 h-3.5 text-purple-600" />
                      <span>Parent Card</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pad Editor Modal (Add & Edit) */}
      <PadEditorModal
        isOpen={isEditorOpen}
        mode={editorProperty ? 'edit' : 'add'}
        property={editorProperty}
        user={user}
        onSave={(savedProp) => {
          if (editorProperty) {
            onEditProperty?.(editorProperty.id, savedProp);
          } else {
            onCreateProperty?.(savedProp);
          }
        }}
        onDelete={(id) => {
          onDeleteProperty?.(id);
        }}
        onClose={() => {
          setIsEditorOpen(false);
          setEditorProperty(null);
        }}
      />

      {/* Curfew Exemption Approval Modal */}
      <CurfewApprovalModal
        isOpen={isCurfewApprovalOpen}
        property={selectedCurfewProperty}
        onClose={() => {
          setIsCurfewApprovalOpen(false);
          setSelectedCurfewProperty(null);
        }}
        onPassUpdated={loadLandlordData}
      />

      {/* Pad Tenants Registry Modal */}
      <PadTenantsModal
        isOpen={isTenantsModalOpen}
        property={selectedPropertyForTenants}
        onClose={() => {
          setIsTenantsModalOpen(false);
          setSelectedPropertyForTenants(null);
        }}
      />

      {/* Individual Student Profile Modal */}
      <StudentProfileModal
        isOpen={Boolean(selectedTenantForProfile)}
        tenant={selectedTenantForProfile}
        property={selectedPropertyForTenants}
        onClose={() => setSelectedTenantForProfile(null)}
      />
    </div>
  );
}

function propertyBelongsToLandlord(property, landlord) {
  if (!property || !landlord) return false;
  const owner = property.landlord || {};
  const same = (a, b) => String(a || '').trim().toLowerCase() === String(b || '').trim().toLowerCase();

  if (owner.userId && landlord.id && same(owner.userId, landlord.id)) return true;
  if (owner.email && landlord.email && same(owner.email, landlord.email)) return true;
  return Boolean(owner.name && landlord.name && same(owner.name, landlord.name));
}

export function AdminAuditPortalView({
  properties = [],
  onSelectProperty,
  onUpdateProperty,
  onViewLandlord
}) {
  const { user } = useAuth();
  const [viewMode, setViewMode] = React.useState('accounts'); // 'accounts' | 'pads'
  const [filterMode, setFilterMode] = React.useState('all'); // 'all' | 'pending' | 'verified'
  const [search, setSearch] = React.useState('');
  const [selectedAuditProperty, setSelectedAuditProperty] = React.useState(null);

  // Landlord account approvals
  const [landlords, setLandlords] = React.useState([]);
  const [loadingLandlords, setLoadingLandlords] = React.useState(true);
  const [landlordError, setLandlordError] = React.useState('');
  const [selectedLandlord, setSelectedLandlord] = React.useState(null);
  // Valid-ID review state per landlord — step 1 gates step 2.
  const [idRecords, setIdRecords] = React.useState({});

  const loadLandlords = React.useCallback(async () => {
    setLoadingLandlords(true);
    setLandlordError('');
    try {
      const [rows, ids] = await Promise.all([
        api.getLandlords(),
        api.getLandlordIdStatuses()
      ]);
      setLandlords(Array.isArray(rows) ? rows : []);
      setIdRecords(ids && typeof ids === 'object' ? ids : {});
    } catch (err) {
      setLandlords([]);
      setLandlordError(err.message || 'Could not load landlord accounts.');
    } finally {
      setLoadingLandlords(false);
    }
  }, []);

  React.useEffect(() => {
    loadLandlords();
  }, [loadLandlords]);

  const handleLandlordSaved = (updated) => {
    if (!updated?.id) return;

    setLandlords(prev => prev.map(item => (item.id === updated.id ? { ...item, ...updated } : item)));

    // Keep the feed's landlord objects in sync so cards and host profiles
    // immediately show the new Urios Verified state without a full refresh.
    properties
      .filter(p => propertyBelongsToLandlord(p, updated))
      .forEach(p => {
        onUpdateProperty?.(p.id, {
          ...p,
          landlord: {
            ...p.landlord,
            isUriosVerified: updated.isUriosVerified,
            verificationStatus: updated.verificationStatus,
            verifiedAt: updated.verifiedAt,
            verifiedBy: updated.verifiedBy,
            verificationNotes: updated.verificationNotes
          }
        });
      });
  };

  const openLandlordProfile = (account) => {
    if (!account) return;
    const firstProperty = properties.find(p => propertyBelongsToLandlord(p, account)) || null;
    const initials = account.avatarInitials || (account.name || 'LL')
      .trim()
      .split(/\s+/)
      .map(word => word[0])
      .join('')
      .slice(0, 2)
      .toUpperCase();

    onViewLandlord?.({
      userId: account.id,
      name: account.name || 'Landlord',
      initials,
      avatar: account.avatar || null,
      email: account.email || null,
      phone: account.phone || null,
      tag: 'Landlord Account',
      isUriosVerified: Boolean(account.isUriosVerified),
      verificationStatus: account.verificationStatus || (account.isUriosVerified ? 'verified' : 'pending'),
      verifiedAt: account.verifiedAt || null,
      verifiedBy: account.verifiedBy || null,
      verificationNotes: account.verificationNotes || '',
      facebook: account.facebook || null,
      instagram: account.instagram || null,
      twitter: account.twitter || null,
      experience: 'Landlord'
    }, firstProperty);
  };

  const verifiedLandlordCount = landlords.filter(l => Boolean(l.isUriosVerified)).length;
  const pendingLandlordCount = landlords.length - verifiedLandlordCount;
  const verifiedPercent = landlords.length > 0
    ? Math.round((verifiedLandlordCount / landlords.length) * 100)
    : 0;

  const verifiedCount = properties.filter(p => Boolean(p.badges?.isUriosVerified)).length;
  const pendingCount = properties.length - verifiedCount;
  const padVerifiedPercent = properties.length > 0 ? Math.round((verifiedCount / properties.length) * 100) : 0;

  const filteredLandlords = landlords.filter(l => {
    const isVerified = Boolean(l.isUriosVerified);
    if (filterMode === 'verified' && !isVerified) return false;
    if (filterMode === 'pending' && isVerified) return false;

    if (search.trim()) {
      const q = search.toLowerCase();
      const matchName = (l.name || '').toLowerCase().includes(q);
      const matchEmail = (l.email || '').toLowerCase().includes(q);
      const matchPhone = (l.phone || '').toLowerCase().includes(q);
      return matchName || matchEmail || matchPhone;
    }
    return true;
  });

  const filteredProperties = properties.filter(p => {
    const isVerified = Boolean(p.badges?.isUriosVerified);
    if (filterMode === 'verified' && !isVerified) return false;
    if (filterMode === 'pending' && isVerified) return false;

    if (search.trim()) {
      const q = search.toLowerCase();
      const matchName = p.name?.toLowerCase().includes(q);
      const matchZone = p.zone?.toLowerCase().includes(q);
      const matchLandlord = (p.landlord?.name || '').toLowerCase().includes(q);
      return matchName || matchZone || matchLandlord;
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Mode switch: landlord accounts vs pad audits */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
        <button
          onClick={() => { setViewMode('accounts'); setFilterMode('all'); setSearch(''); }}
          className={`px-4 py-2.5 rounded-2xl text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 ${
            viewMode === 'accounts'
              ? 'bg-[#0b1a30] text-white shadow-sm'
              : 'bg-white border border-slate-200 hover:bg-slate-50 text-slate-700'
          }`}
        >
          <UserCheck className="w-4 h-4" />
          Landlord Accounts ({landlords.length})
        </button>
        <button
          onClick={() => { setViewMode('pads'); setFilterMode('all'); setSearch(''); }}
          className={`px-4 py-2.5 rounded-2xl text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 ${
            viewMode === 'pads'
              ? 'bg-[#0b1a30] text-white shadow-sm'
              : 'bg-white border border-slate-200 hover:bg-slate-50 text-slate-700'
          }`}
        >
          <Building2 className="w-4 h-4" />
          Pad Audits ({properties.length})
        </button>
      </div>

      {/* Header Banner */}
      <div className="p-6 rounded-3xl bg-gradient-to-r from-purple-900 via-indigo-900 to-[#0b1a30] text-white shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-purple-500/30 text-purple-200 border border-purple-400/30 inline-flex items-center gap-1.5 mb-2">
              <ShieldCheck className="w-3.5 h-3.5 text-purple-300" />
              FSUU Student Housing Committee
            </span>
            <h2 className="text-2xl font-black tracking-tight text-white">
              {viewMode === 'accounts' ? 'Landlord Account Verification' : 'Student Reality Audit Portal'}
            </h2>
            <p className="text-xs text-purple-200/90 mt-1 max-w-xl leading-relaxed">
              {viewMode === 'accounts'
                ? 'Fixed order: approve each host\'s valid ID first, then approve the account as Urios Verified. One account approval applies to all of that host\'s listings.'
                : 'Official university administration panel to audit landlord-declared checklists (Building condition rain or shine, Monsoon flooding, Water tanks, Blackouts & Wi-Fi) and certify units with the Urios Student Verified stamp.'}
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <span className="px-3.5 py-1.5 rounded-2xl bg-white/10 text-white font-bold text-xs border border-white/20">
              Admin: <b>{user?.name || 'Auditor'}</b>
            </span>
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-3 gap-3 pt-3 border-t border-white/15 text-center">
          <div className="bg-white/10 rounded-2xl p-3">
            <p className="text-[10px] uppercase font-black tracking-wider text-purple-300">
              {viewMode === 'accounts' ? 'Landlord Accounts' : 'Total Units'}
            </p>
            <p className="text-xl font-black text-white mt-0.5">
              {viewMode === 'accounts' ? landlords.length : properties.length}
            </p>
          </div>
          <div className="bg-white/10 rounded-2xl p-3">
            <p className="text-[10px] uppercase font-black tracking-wider text-emerald-300">Urios Verified</p>
            <p className="text-xl font-black text-emerald-400 mt-0.5">
              {viewMode === 'accounts'
                ? `${verifiedLandlordCount} (${verifiedPercent}%)`
                : `${verifiedCount} (${padVerifiedPercent}%)`}
            </p>
          </div>
          <div className="bg-white/10 rounded-2xl p-3">
            <p className="text-[10px] uppercase font-black tracking-wider text-amber-300">Pending Audit</p>
            <p className="text-xl font-black text-amber-400 mt-0.5">
              {viewMode === 'accounts' ? pendingLandlordCount : pendingCount}
            </p>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-3xl border border-slate-200 shadow-2xs">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          <button
            onClick={() => setFilterMode('all')}
            className={`px-3.5 py-2 rounded-2xl text-xs font-black transition-all cursor-pointer ${
              filterMode === 'all'
                ? 'bg-[#0b1a30] text-white shadow-xs'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
            }`}
          >
            All {viewMode === 'accounts' ? 'Landlords' : 'Pads'} ({viewMode === 'accounts' ? landlords.length : properties.length})
          </button>
          <button
            onClick={() => setFilterMode('pending')}
            className={`px-3.5 py-2 rounded-2xl text-xs font-black transition-all cursor-pointer ${
              filterMode === 'pending'
                ? 'bg-amber-500 text-white shadow-xs'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
            }`}
          >
            ⏳ Pending ({viewMode === 'accounts' ? pendingLandlordCount : pendingCount})
          </button>
          <button
            onClick={() => setFilterMode('verified')}
            className={`px-3.5 py-2 rounded-2xl text-xs font-black transition-all cursor-pointer ${
              filterMode === 'verified'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
            }`}
          >
            ✓ Urios Verified ({viewMode === 'accounts' ? verifiedLandlordCount : verifiedCount})
          </button>
        </div>

        <div className="w-full sm:w-auto flex items-center gap-2">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={viewMode === 'accounts' ? 'Search host name, email or phone...' : 'Search pad or host...'}
            className="flex-1 min-w-0 sm:w-64 px-3.5 py-2 rounded-2xl bg-slate-50 border border-slate-200 text-xs font-medium text-slate-800 focus:outline-none focus:border-purple-600"
          />
          {/* Re-reads public.users + landlord_ids from Supabase, so an account
              deleted in Authentication drops out without reloading the page. */}
          {viewMode === 'accounts' && (
            <button
              type="button"
              onClick={loadLandlords}
              disabled={loadingLandlords}
              title="Reload landlord accounts and valid-ID statuses from Supabase"
              className="shrink-0 px-3.5 py-2 rounded-2xl bg-slate-100 hover:bg-slate-200 disabled:opacity-60 disabled:cursor-wait text-slate-700 text-xs font-black transition-all cursor-pointer flex items-center gap-1.5"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loadingLandlords ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          )}
        </div>
      </div>

      {viewMode === 'accounts' ? (
        <>
          {landlordError && (
            <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold">
              {landlordError}
              <button
                type="button"
                onClick={loadLandlords}
                className="ml-2 underline font-black cursor-pointer"
              >
                Retry
              </button>
            </div>
          )}

          {loadingLandlords ? (
            <div className="p-10 text-center bg-white rounded-3xl border border-slate-200">
              <RefreshCw className="w-5 h-5 text-purple-600 animate-spin mx-auto mb-2" />
              <p className="text-xs font-bold text-slate-500">Loading landlord accounts…</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredLandlords.map(l => {
                const listingCount = properties.filter(p => propertyBelongsToLandlord(p, l)).length;
                const idRecord = idRecords[String(l.id)] || null;
                const idStatus = idRecord?.status || 'missing';
                const idApproved = idStatus === 'approved';
                // No approved ID means no Urios Verified badge, even if the
                // users row still carries an old approval flag.
                const isVerified = Boolean(l.isUriosVerified) && idApproved;
                const initials = l.avatarInitials || (l.name || 'LL')
                  .trim()
                  .split(/\s+/)
                  .map(word => word[0])
                  .join('')
                  .slice(0, 2)
                  .toUpperCase();

                return (
                  <div
                    key={l.id}
                    onClick={() => openLandlordProfile(l)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.target !== e.currentTarget) return;
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        openLandlordProfile(l);
                      }
                    }}
                    title={`Open ${l.name || 'landlord'}'s full profile`}
                    className="bg-white rounded-3xl p-5 border border-slate-200/90 shadow-sm hover:shadow-md hover:border-purple-300 transition-all space-y-4 cursor-pointer"
                  >
                    <div className="flex items-start gap-3.5">
                      <div className={`w-14 h-14 rounded-2xl flex items-center justify-center font-black text-sm shrink-0 ${
                        isVerified
                          ? 'bg-emerald-600 text-white'
                          : 'bg-[#0b1a30] text-white'
                      }`}>
                        {initials}
                      </div>

                      <div className="min-w-0 flex-1 space-y-1">
                        <div className="flex items-center justify-between gap-2">
                          <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider flex items-center gap-1 shadow-2xs ${
                            isVerified
                              ? 'bg-emerald-600 text-white'
                              : 'bg-amber-100 text-amber-900 border border-amber-300'
                          }`}>
                            {isVerified ? (
                              <>
                                <ShieldCheck className="w-3 h-3 text-amber-300 fill-amber-300 shrink-0" />
                                <span>Urios Verified</span>
                              </>
                            ) : (
                              <span>⏳ Pending Review</span>
                            )}
                          </span>
                          <span className="text-[10px] font-black text-slate-500 bg-slate-100 px-2 py-1 rounded-lg shrink-0">
                            {listingCount} listing{listingCount === 1 ? '' : 's'}
                          </span>
                        </div>

                        <h3 className="font-extrabold text-sm text-slate-900 truncate">{l.name || 'Unnamed Landlord'}</h3>
                        <p className="text-[11px] text-slate-500 font-medium truncate">{l.email || 'No email on file'}</p>
                        {l.phone && (
                          <p className="text-[11px] text-slate-500 font-medium truncate">{l.phone}</p>
                        )}

                        <div className="pt-0.5">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md border text-[10px] font-black ${
                            idApproved
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : idStatus === 'rejected'
                                ? 'bg-rose-50 text-rose-700 border-rose-200'
                                : idStatus === 'pending'
                                  ? 'bg-amber-50 text-amber-800 border-amber-200'
                                  : 'bg-slate-100 text-slate-600 border-slate-200'
                          }`}>
                            <FileText className="w-3 h-3 shrink-0" />
                            {idApproved
                              ? 'ID approved'
                              : idStatus === 'rejected'
                                ? 'ID rejected'
                                : idStatus === 'pending'
                                  ? 'ID awaiting review'
                                  : 'No ID submitted'}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200/70 text-[11px] flex items-center justify-between gap-2">
                      <span className="text-slate-500 font-bold">
                        {isVerified
                          ? 'Approved by'
                          : idApproved
                            ? 'ID approved — account pending'
                            : 'Step 1 of 2 · valid ID'}
                      </span>
                      <span className={`font-black truncate ${isVerified ? 'text-emerald-700' : 'text-amber-700'}`}>
                        {isVerified
                          ? (l.verifiedBy || 'FSUU Housing Committee')
                          : idApproved
                            ? 'Ready for account approval'
                            : 'Not approved yet'}
                      </span>
                    </div>

                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); openLandlordProfile(l); }}
                        className="text-[11px] font-black text-purple-700 hover:text-purple-900 hover:underline cursor-pointer"
                      >
                        View full profile →
                      </button>
                      {isVerified ? (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedLandlord({ landlord: l, listingCount });
                          }}
                          className="px-4 py-2 rounded-xl font-black text-xs shadow-md transition-all flex items-center gap-1.5 cursor-pointer bg-slate-100 hover:bg-slate-200 text-slate-700"
                        >
                          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Manage Verification</span>
                        </button>
                      ) : idApproved ? (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedLandlord({ landlord: l, listingCount });
                          }}
                          className="px-4 py-2 rounded-xl font-black text-xs shadow-md transition-all flex items-center gap-1.5 cursor-pointer bg-purple-700 hover:bg-purple-800 active:scale-95 text-white"
                        >
                          <ShieldCheck className="w-3.5 h-3.5 text-purple-200" />
                          <span>Approve as Urios Verified</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); openLandlordProfile(l); }}
                          title="Approve the valid ID first — the account cannot be verified without it"
                          className="px-4 py-2 rounded-xl font-black text-xs shadow-md transition-all flex items-center gap-1.5 cursor-pointer bg-amber-100 hover:bg-amber-200 text-amber-900 border border-amber-300"
                        >
                          <FileText className="w-3.5 h-3.5" />
                          <span>Review ID first</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {!loadingLandlords && filteredLandlords.length === 0 && !landlordError && (
            <div className="p-8 text-center bg-white rounded-3xl border border-slate-200 max-w-sm mx-auto space-y-2">
              <p className="text-2xl">👤</p>
              <h4 className="font-extrabold text-sm text-slate-800">No landlord accounts found</h4>
              <p className="text-xs text-slate-500">
                {landlords.length === 0
                  ? 'No landlord has signed up yet. New landlord accounts will appear here automatically.'
                  : 'Try adjusting your search query or filter selection.'}
              </p>
            </div>
          )}
        </>
      ) : (
        <>
          {/* Unit Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredProperties.map(p => {
              const isVerified = Boolean(p.badges?.isUriosVerified);
              // Count the six checklist items, not every stray key (legacy rows
              // stored the building-condition verdict as `distance`).
              const verifiedItemCount = getChecklistVerifiedCount(p);
              const claims = getStudentChecklist(p);

              return (
                <div
                  key={p.id}
                  className="bg-white rounded-3xl p-5 border border-slate-200/90 shadow-sm hover:shadow-md transition-all space-y-4"
                >
                  <div className="flex items-start gap-4">
                    <img
                      src={p.images?.[0] || 'https://images.unsplash.com/photo-1555854877-bab0e564b8d5?auto=format&fit=crop&w=600&q=80'}
                      alt={p.name}
                      className="w-24 h-24 rounded-2xl object-cover bg-slate-100 shrink-0 cursor-pointer"
                      onClick={() => onSelectProperty?.(p)}
                    />

                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider flex items-center gap-1 shadow-2xs ${
                          isVerified
                            ? 'bg-emerald-600 text-white'
                            : 'bg-amber-100 text-amber-900 border border-amber-300'
                        }`}>
                          {isVerified ? (
                            <>
                              <ShieldCheck className="w-3 h-3 text-amber-300 fill-amber-300 shrink-0" />
                              <span>Urios Verified</span>
                            </>
                          ) : (
                            <span>⏳ Pending Audit</span>
                          )}
                        </span>
                        <span className="text-xs font-black text-slate-900">₱{p.price?.toLocaleString()}/mo</span>
                      </div>

                      <h3
                        onClick={() => onSelectProperty?.(p)}
                        className="font-extrabold text-sm text-slate-900 hover:text-purple-800 transition-colors cursor-pointer truncate"
                      >
                        {p.name}
                      </h3>

                      <p className="text-[11px] text-slate-500 font-medium truncate flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                        <span>{p.zone} • {p.area}</span>
                      </p>

                      <p className="text-[11px] text-slate-600 font-semibold truncate">
                        Landlord: <b className="text-slate-800">{p.landlord?.name || 'Verified Landlord'}</b>
                      </p>
                    </div>
                  </div>

                  {/* 6 Checklist Quick Summary */}
                  <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200/70 text-[11px] space-y-1.5">
                    <div className="flex items-center justify-between font-bold">
                      <span className="text-slate-500 uppercase tracking-wide text-[10px]">Landlord Checklist Claims:</span>
                      <span className={`font-black ${isVerified ? 'text-emerald-700' : 'text-amber-700'}`}>
                        {isVerified ? `${verifiedItemCount}/6 Verified` : 'Needs Physical Check'}
                      </span>
                    </div>
                    <div className="grid grid-cols-3 gap-1.5 text-[10px] font-semibold text-slate-700">
                      <span className="truncate">☀️🌧️ {claims.goodCondition.declared ? claims.goodCondition.displayStatus : 'Condition n/d'}</span>
                      <span className="truncate">🛡️ {claims.floodSafe.declared ? (claims.floodSafe.isSafe ? 'Flood-Safe' : 'Watch Zone') : 'Flood n/d'}</span>
                      <span className="truncate">💧 {claims.waterSystem.hasBooster ? 'Booster Pump' : claims.waterSystem.hasTank ? 'Reserve Tank' : claims.waterSystem.declared ? 'Tap Only' : 'Water n/d'}</span>
                      <span className="truncate">⚡ {claims.brownoutResilience.hasSolar ? 'Solar Backup' : claims.brownoutResilience.hasGenerator ? 'Generator' : claims.brownoutResilience.declared ? 'Grid Only' : 'Power n/d'}</span>
                      <span className="truncate">📶 {claims.mobileData.declared ? `DITO • Smart • Globe (${claims.mobileData.carrierCount}/3)` : 'Signal n/d'}</span>
                      <span className="truncate">🌐 {claims.wifi.hasWifi ? `${claims.wifi.downloadMbps || '—'} Mbps` : claims.wifi.declared ? 'No Wi-Fi' : 'Wi-Fi n/d'}</span>
                    </div>
                  </div>

                  {/* Action Bar */}
                  <div className="pt-2 border-t border-slate-100 flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => onSelectProperty?.(p)}
                      className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors cursor-pointer"
                    >
                      View Pad
                    </button>

                    <button
                      type="button"
                      onClick={() => setSelectedAuditProperty(p)}
                      className="px-4 py-2 rounded-xl bg-purple-700 hover:bg-purple-800 active:scale-95 text-white font-black text-xs shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
                    >
                      <ShieldCheck className="w-3.5 h-3.5 text-purple-200" />
                      <span>{isVerified ? 'Edit Audit Status' : 'Audit & Verify Checklist'}</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {filteredProperties.length === 0 && (
            <div className="p-8 text-center bg-white rounded-3xl border border-slate-200 max-w-sm mx-auto space-y-2">
              <p className="text-2xl">📋</p>
              <h4 className="font-extrabold text-sm text-slate-800">No properties found</h4>
              <p className="text-xs text-slate-500">Try adjusting your search query or filter selection.</p>
            </div>
          )}
        </>
      )}

      {/* Admin Audit Modal */}
      {selectedAuditProperty && (
        <AdminAuditModal
          isOpen={Boolean(selectedAuditProperty)}
          property={selectedAuditProperty}
          onSave={(updated) => {
            onUpdateProperty?.(updated.id, updated);
            setSelectedAuditProperty(null);
          }}
          onClose={() => setSelectedAuditProperty(null)}
        />
      )}

      {/* Landlord Account Verification Modal */}
      <LandlordVerificationModal
        isOpen={Boolean(selectedLandlord)}
        landlord={selectedLandlord?.landlord}
        listingCount={selectedLandlord?.listingCount || 0}
        onSave={handleLandlordSaved}
        onReviewId={() => {
          const account = selectedLandlord?.landlord;
          setSelectedLandlord(null);
          if (account) openLandlordProfile(account);
        }}
        onClose={() => setSelectedLandlord(null)}
      />
    </div>
  );
}

export function MyRoomView({ onOpenAuth, onExplore, onSelectProperty, onOpenChat }) {
  const { user, token } = useAuth();
  const [loading, setLoading] = React.useState(true);
  const [tenancyData, setTenancyData] = React.useState(null);
  const [receipts, setReceipts] = React.useState([]);
  const [curfewSlips, setCurfewSlips] = React.useState([]);
  // A pending / declined board application (not yet an active tenancy)
  const [myApplication, setMyApplication] = React.useState(null);

  // Curfew pass form modal & state
  const [isCurfewModalOpen, setIsCurfewModalOpen] = React.useState(false);
  const [curfewForm, setCurfewForm] = React.useState(() => ({
    reason: 'Hospital Clinical Duty (ER / Ward)',
    dutyLocation: 'Butuan Medical Center / Campus Lab',
    date: new Date().toISOString().split('T')[0],
    expectedReturn: '06:00 AM'
  }));
  const [submittingCurfew, setSubmittingCurfew] = React.useState(false);
  const [curfewSuccess, setCurfewSuccess] = React.useState(null);
  const [curfewError, setCurfewError] = React.useState('');

  // Leave tenancy transaction window state
  const [isLeaveModalOpen, setIsLeaveModalOpen] = React.useState(false);
  const [leaveSuccess, setLeaveSuccess] = React.useState('');

  const fetchTenancyData = React.useCallback(async () => {
    if (!user || user.role !== 'boarder') {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const [roomRes, receiptsRes, slipsRes, applicationRes] = await Promise.all([
        api.getMyRoom(token).catch(() => ({ data: null })),
        api.getReceipts(token).catch(() => ({ data: [] })),
        api.getCurfewSlips(token).catch(() => ({ data: [] })),
        api.getMyTenancyApplication(token).catch(() => ({ data: null }))
      ]);

      setTenancyData(roomRes?.data || null);
      setReceipts(Array.isArray(receiptsRes?.data) ? receiptsRes.data : []);
      setCurfewSlips(Array.isArray(slipsRes?.data) ? slipsRes.data : []);
      setMyApplication(applicationRes?.data || null);
    } catch {
      setTenancyData(null);
    } finally {
      setLoading(false);
    }
  }, [user, token]);

  React.useEffect(() => {
    fetchTenancyData();
  }, [fetchTenancyData]);

  const handleCurfewSubmit = async (e) => {
    e.preventDefault();
    setSubmittingCurfew(true);
    setCurfewError('');
    setCurfewSuccess(null);

    try {
      const res = await api.submitCurfewSlip({
        reason: curfewForm.reason,
        dutyLocation: curfewForm.dutyLocation,
        date: curfewForm.date,
        expectedReturn: curfewForm.expectedReturn,
        studentName: user.name,
        studentId: user.studentId || '',
        course: user.course || '',
        propertyId: tenancy?.propertyId || property?.id || user?.propertyId || null,
        status: 'pending'
      }, token);

      if (res?.data) {
        setCurfewSuccess(res.data);
        setCurfewSlips(prev => [res.data, ...prev]);
        setIsCurfewModalOpen(false);
      }
    } catch (err) {
      setCurfewError(err.message || 'Failed to submit curfew exemption notice.');
    } finally {
      setSubmittingCurfew(false);
    }
  };


  // 1. Not logged in state
  if (!user) {
    return (
      <div className="p-8 text-center max-w-md mx-auto my-12 space-y-5 bg-white rounded-3xl border border-slate-200/80 shadow-xs">
        <div className="w-16 h-16 rounded-2xl bg-[#0b1a30]/5 text-[#0b1a30] flex items-center justify-center mx-auto text-3xl">
          <Home className="w-8 h-8 text-[#0b1a30]" />
        </div>
        <div className="space-y-1">
          <h3 className="font-extrabold text-lg text-slate-900">Sign in to View My Tenancy</h3>
          <p className="text-xs text-slate-500 leading-relaxed max-w-sm mx-auto">
            My Tenancy is the official digital room pass for FSUU student boarders. Sign in to monitor live submeter electricity, official rent receipts, and submit digital curfew exemption passes.
          </p>
        </div>

        <div className="flex gap-2 justify-center pt-1">
          <button
            onClick={() => onOpenAuth?.('login')}
            className="px-5 py-2.5 rounded-xl text-xs font-bold bg-[#0b1a30] text-white hover:bg-[#152a4d] transition-colors cursor-pointer shadow-xs"
          >
            Log In
          </button>
          <button
            onClick={() => onOpenAuth?.('signup')}
            className="px-5 py-2.5 rounded-xl text-xs font-bold border border-slate-200 hover:bg-slate-50 text-slate-700 transition-colors cursor-pointer"
          >
            Sign Up
          </button>
        </div>

      </div>
    );
  }

  // 2. Landlord guard state (landlords manage listings, not tenancy passes)
  if (user?.role === 'landlord') {
    return (
      <div className="p-8 text-center max-w-md mx-auto my-12 space-y-4 bg-white rounded-3xl border border-slate-200 shadow-xs">
        <div className="w-16 h-16 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto">
          <Building2 className="w-8 h-8" />
        </div>
        <h3 className="font-extrabold text-base text-slate-900">Landlord Account Detected</h3>
        <p className="text-xs text-slate-500 leading-relaxed">
          Tenancy passes and room submeter tracking are reserved exclusively for student boarders. Manage your property listings, occupancy, and tenant inquiries in My Listings.
        </p>
      </div>
    );
  }

  // 3. Loading state
  if (loading) {
    return (
      <div className="p-12 text-center max-w-md mx-auto my-12 space-y-3">
        <RefreshCw className="w-6 h-6 text-blue-900 animate-spin mx-auto" />
        <p className="text-xs font-bold text-slate-500">Loading your verified tenancy pass...</p>
      </div>
    );
  }

  const { tenancy, property } = tenancyData || {};

  // 3.5 Board application pending landlord approval (not yet a tenant)
  if (!tenancy && myApplication) {
    const isRejected = myApplication.status === 'rejected';
    return (
      <div className="p-8 text-center max-w-md mx-auto my-12 space-y-4 bg-white rounded-3xl border border-dashed border-slate-200 shadow-xs">
        <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mx-auto ${isRejected ? 'bg-rose-50 text-rose-600' : 'bg-amber-50 text-amber-600'}`}>
          {isRejected ? <XCircle className="w-8 h-8" /> : <Clock className="w-8 h-8" />}
        </div>
        <div>
          <h3 className="font-extrabold text-base text-slate-900">
            {isRejected ? 'Application Declined' : 'Application Pending Approval'}
          </h3>
          <p className="text-xs text-slate-500 mt-1 leading-relaxed">
            {isRejected
              ? `Your application to board ${myApplication.propertyName} (${myApplication.roomNumber}) was declined by the landlord. You are not a tenant of this pad.`
              : `Your application to board ${myApplication.propertyName} (${myApplication.roomNumber}) is waiting for the landlord to approve it. Your tenancy pass activates once approved.`}
          </p>
        </div>

        <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 text-left space-y-1">
          <div className="flex items-center justify-between text-[11px] text-slate-500">
            <span>Pad</span>
            <span className="font-bold text-slate-800">{myApplication.propertyName}</span>
          </div>
          <div className="flex items-center justify-between text-[11px] text-slate-500">
            <span>Room</span>
            <span className="font-bold text-slate-800">{myApplication.roomNumber}</span>
          </div>
          <div className="flex items-center justify-between text-[11px] text-slate-500">
            <span>Status</span>
            <span className={`font-black ${isRejected ? 'text-rose-700' : 'text-amber-700'}`}>
              {isRejected ? 'Declined' : 'Pending landlord approval'}
            </span>
          </div>
          <div className="flex items-center justify-between text-[11px] text-slate-500">
            <span>Application ID</span>
            <span className="font-mono font-bold text-slate-700">{myApplication.id}</span>
          </div>
        </div>

        {onExplore && (
          <div className="flex justify-center pt-1">
            <button
              onClick={onExplore}
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-[#0b1a30] text-white rounded-xl text-xs font-bold hover:bg-[#152a4d] transition-all cursor-pointer shadow-xs"
            >
              {isRejected ? 'Browse Other Pads' : 'Explore More Pads'}
            </button>
          </div>
        )}

        {/* Even before approval the applicant can ask the host a question */}
        {myApplication.propertyId && (
          <div className="flex justify-center">
            <MessageLandlordButton
              propertyId={myApplication.propertyId}
              padName={myApplication.propertyName}
              label="Message landlord"
              variant="outline"
              size="md"
              onOpenChat={onOpenChat}
              onOpenAuth={onOpenAuth}
            />
          </div>
        )}
      </div>
    );
  }

  // 4. Student without active tenancy contract
  if (!tenancy) {
    return (
      <div className="p-8 text-center max-w-md mx-auto my-12 space-y-4 bg-white rounded-3xl border border-dashed border-slate-200 shadow-xs">
        {leaveSuccess && (
          <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs flex items-center justify-between gap-2 shadow-xs text-left mb-2">
            <div className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">{leaveSuccess}</p>
                <p className="text-[11px] text-emerald-700 mt-0.5">
                  Your clearance slip has been submitted to the landlord for deposit processing.
                </p>
              </div>
            </div>
            <button onClick={() => setLeaveSuccess('')} className="text-emerald-700 hover:text-emerald-950 font-bold">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        <div className="w-16 h-16 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto text-2xl">
          🏠
        </div>
        <div>
          <h3 className="font-extrabold text-base text-slate-900">No Active Boarding Tenancy</h3>
          <p className="text-xs text-slate-500 mt-1 leading-relaxed">
            Hello, <span className="font-bold text-slate-800">{user.name}</span>! You don't have an active boarding house contract registered under this account right now.
          </p>
          <p className="text-xs text-slate-400 mt-1">
            Once your landlord registers your official room assignment, your live submeter tracking, digital gate pass, and curfew slips will appear here.
          </p>
        </div>

        {onExplore && (
          <div className="flex justify-center pt-2">
            <button
              onClick={onExplore}
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-[#0b1a30] text-white rounded-xl text-xs font-bold hover:bg-[#152a4d] transition-all cursor-pointer shadow-xs"
            >
              Explore Verified FSUU Pads
            </button>
          </div>
        )}
      </div>
    );
  }

  // 5. Active student tenancy pass
  return (
    <div className="p-4 max-w-2xl mx-auto space-y-4 pb-24">
      {/* Success banner if curfew slip just submitted */}
      {curfewSuccess && (
        <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-950 text-xs flex items-center justify-between gap-2 shadow-xs">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-amber-600 shrink-0" />
            <span>
              <strong>Exemption Notice Submitted!</strong> Awaiting landlord approval. Pass code: <code className="font-mono font-bold bg-white px-1.5 py-0.5 rounded border border-amber-300">{curfewSuccess.digitalPassCode}</code>
            </span>
          </div>
          <button
            onClick={() => setCurfewSuccess(null)}
            className="text-amber-800 hover:text-amber-950 font-bold cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Official Digital Tenancy Pass Card */}
      <div className="p-5 rounded-3xl bg-gradient-to-br from-[#0b1a30] via-[#12284c] to-[#1a3a6b] text-white shadow-lg space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-extrabold uppercase tracking-widest text-blue-300">
            Current Tenancy Pass • {tenancy.semester || '1st Sem 2026-2027'}
          </span>
          <div className="flex items-center gap-1.5">
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-black border border-emerald-400/30 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>Active Tenant</span>
            </span>
            <button
              type="button"
              onClick={() => setIsLeaveModalOpen(true)}
              className="px-2.5 py-0.5 rounded-full bg-white/10 hover:bg-rose-500/20 text-rose-300 hover:text-white text-[10px] font-bold border border-white/20 hover:border-rose-400 transition-colors cursor-pointer flex items-center gap-1"
              title="Submit notice to vacate and end tenancy"
            >
              <LogOut className="w-3 h-3" />
              <span>End Tenancy</span>
            </button>
          </div>
        </div>

        {/* Tenant's Pad Card: Image & Details - Click to View Pad Info */}
        <div
          onClick={() => {
            if (property) {
              onSelectProperty?.(property);
            }
          }}
          className={`flex flex-col sm:flex-row sm:items-center gap-3.5 p-3 rounded-2xl bg-white/10 border border-white/15 transition-all ${
            property ? 'cursor-pointer hover:bg-white/20 hover:border-white/30 group' : ''
          }`}
          title={property ? 'Click to view full pad info & rules' : ''}
        >
          {/* Pad Image */}
          <div className="relative w-full sm:w-28 h-28 sm:h-24 rounded-xl overflow-hidden shrink-0 bg-slate-800">
            <img
              src={property?.images?.[0] || 'https://images.unsplash.com/photo-1555854877-bab0e564b8d5?auto=format&fit=crop&w=600&q=80'}
              alt={tenancy.propertyName}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
            <div className="absolute inset-0 bg-black/20 group-hover:bg-transparent transition-colors" />
            <div className="absolute bottom-1.5 left-1.5 px-2 py-0.5 rounded-md bg-[#0b1a30]/85 backdrop-blur-xs text-[9px] font-black text-amber-300 flex items-center gap-1 shadow-xs">
              <Eye className="w-2.5 h-2.5" />
              <span>View Pad Info</span>
            </div>
          </div>

          {/* Pad Description */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 text-blue-300 text-[10px] font-bold uppercase tracking-wider">
              <span>Assigned Pad</span>
              <span>•</span>
              <span className="text-emerald-300 font-extrabold flex items-center gap-1">
                Verified Boarding Pass
              </span>
            </div>
            <h3 className="text-lg sm:text-xl font-black text-white group-hover:text-amber-300 transition-colors truncate">
              {tenancy.propertyName}
            </h3>
            <p className="text-xs text-blue-200 mt-0.5">
              {tenancy.roomNumber} • Submeter #{tenancy.submeterNumber}
            </p>
            <div className="mt-2 flex items-center gap-2">
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/15 text-white text-[11px] font-bold group-hover:bg-amber-400 group-hover:text-slate-950 transition-colors">
                <span>View Full Pad Details & House Rules</span>
                <ChevronRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
              </span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 text-xs pt-1">
          <div className="p-3 rounded-2xl bg-white/10 backdrop-blur-xs border border-white/10">
            <div className="flex items-center gap-1 text-[10px] text-blue-300 font-extrabold uppercase tracking-wide">
              <Zap className="w-3 h-3 text-amber-400" />
              <span>Submeter Electric</span>
            </div>
            <p className="font-extrabold text-white text-base mt-1">
              {tenancy.submeterKwh} kWh <span className="text-xs text-blue-200 font-semibold">(₱{tenancy.submeterCost.toLocaleString()})</span>
            </p>
          </div>
          <div className="p-3 rounded-2xl bg-white/10 backdrop-blur-xs border border-white/10">
            <div className="flex items-center gap-1 text-[10px] text-blue-300 font-extrabold uppercase tracking-wide">
              <Calendar className="w-3 h-3 text-amber-400" />
              <span>Next Rent Due</span>
            </div>
            <p className="font-extrabold text-amber-300 text-base mt-1">
              {tenancy.nextRentDue}
            </p>
          </div>
        </div>

        {/* Tenant Profile Mini Strip */}
        <div className="pt-2 border-t border-white/10 flex items-center justify-between text-xs text-blue-200">
          <div>
            <span className="text-[10px] text-blue-300 uppercase tracking-wider block font-bold">Registered Boarder</span>
            <span className="font-bold text-white">{user.name}</span>
          </div>
          <div className="text-right">
            <span className="text-[10px] text-blue-300 uppercase tracking-wider block font-bold">Course & Program</span>
            <span className="font-bold text-white">{user.course || 'BS Nursing'} ({user.yearLevel || '3rd Year'})</span>
          </div>
        </div>
      </div>

      {/* Direct line to the landlord: rent, repairs, renewal, gate keys */}
      {property && (
      <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-700 border border-blue-100 flex items-center justify-center shrink-0">
            <MessageSquare className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <h4 className="font-extrabold text-sm text-slate-900 leading-tight">Talk to your landlord</h4>
            <p className="text-xs text-slate-500 mt-0.5">
              Ask about rent, repairs, renewal or gate keys
              {property?.landlord?.name ? ` — ${property.landlord.name}` : ''} replies right here in the app.
            </p>
          </div>
        </div>
        <MessageLandlordButton
          property={property}
          label="Message landlord"
          variant="solid"
          size="md"
          className="w-full sm:w-auto"
          onOpenChat={onOpenChat}
          onOpenAuth={onOpenAuth}
        />
      </div>
      )}

      {/* Digital Curfew Pass Slip Section (hidden for pads with no curfew) */}
      {padHasCurfew(property) && (
      <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="font-extrabold text-sm text-slate-900 flex items-center gap-1.5">
            <Clock className="w-4 h-4 text-amber-600" />
            <span>Digital Curfew Exemption Passes</span>
          </h4>
          <span className="text-[10px] bg-amber-50 text-amber-800 font-bold px-2 py-0.5 rounded border border-amber-200">
            Late Duty Gate Pass
          </span>
        </div>
        <p className="text-xs text-slate-500 leading-relaxed">
          Hospital duties, late laboratory research, or thesis prep? Submit a digital exemption notice directly to the landlady and resident caretaker.
        </p>

        {isCurfewModalOpen ? (
          <form onSubmit={handleCurfewSubmit} className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
            <div className="flex items-center justify-between">
              <h5 className="font-extrabold text-xs text-slate-800">New Curfew Exemption Notice</h5>
              <button
                type="button"
                onClick={() => setIsCurfewModalOpen(false)}
                className="text-slate-400 hover:text-slate-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2 text-xs">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1">Reason for Late Exemption</label>
                <select
                  value={curfewForm.reason}
                  onChange={(e) => setCurfewForm(f => ({ ...f, reason: e.target.value }))}
                  className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 text-xs font-bold text-slate-800 focus:outline-none"
                >
                  <option value="Hospital Clinical Duty (ER / Ward)">Hospital Clinical Duty (ER / Ward)</option>
                  <option value="Thesis / Laboratory Research">Thesis / Laboratory Research</option>
                  <option value="FSUU Supreme Student Government Event">FSUU Supreme Student Government Event</option>
                  <option value="Library / Group Study Session">Library / Group Study Session</option>
                  <option value="Family / Emergency Trip">Family / Emergency Trip</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1">Duty Date</label>
                  <input
                    type="date"
                    value={curfewForm.date}
                    onChange={(e) => setCurfewForm(f => ({ ...f, date: e.target.value }))}
                    className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 text-xs font-medium text-slate-800 focus:outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1">Expected Return</label>
                  <input
                    type="text"
                    value={curfewForm.expectedReturn}
                    onChange={(e) => setCurfewForm(f => ({ ...f, expectedReturn: e.target.value }))}
                    placeholder="e.g. 06:00 AM"
                    className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 text-xs font-medium text-slate-800 focus:outline-none"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1">Duty Location / Hospital</label>
                <input
                  type="text"
                  value={curfewForm.dutyLocation}
                  onChange={(e) => setCurfewForm(f => ({ ...f, dutyLocation: e.target.value }))}
                  placeholder="e.g. Butuan Medical Center, MJ Santos Hospital"
                  className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 text-xs font-medium text-slate-800 focus:outline-none"
                />
              </div>

              {curfewError && (
                <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-xl p-2 font-medium">⚠️ {curfewError}</p>
              )}

              <div className="flex gap-2 pt-1">
                <button
                  type="submit"
                  disabled={submittingCurfew}
                  className="flex-1 py-2.5 rounded-xl bg-[#0b1a30] text-white font-bold text-xs hover:bg-[#152a4d] transition-colors disabled:opacity-50 cursor-pointer"
                >
                  {submittingCurfew ? 'Generating Pass...' : 'Submit & Generate Exemption Pass'}
                </button>
                <button
                  type="button"
                  onClick={() => setIsCurfewModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 text-xs font-bold hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </div>
          </form>
        ) : (
          <button
            onClick={() => setIsCurfewModalOpen(true)}
            className="w-full py-2.5 rounded-xl bg-[#0b1a30] hover:bg-[#152a4d] active:scale-95 text-white font-bold text-xs transition-all cursor-pointer shadow-xs flex items-center justify-center gap-1.5"
          >
            <Clock className="w-3.5 h-3.5 text-amber-400" />
            <span>Submit Curfew Exemption Notice</span>
          </button>
        )}

        {/* Existing Curfew Slips List */}
        {curfewSlips.length > 0 && (
          <div className="pt-2 border-t border-slate-100 space-y-2">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Your Active & Recent Curfew Passes</p>
            <div className="space-y-2">
              {curfewSlips.map((slip) => {
                const sStatus = slip.status || 'pending';
                const isApproved = sStatus === 'approved';
                const isPending = sStatus === 'pending';
                const isDeclined = sStatus === 'rejected' || sStatus === 'declined';

                return (
                  <div key={slip.id} className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 space-y-2 text-xs">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-bold text-slate-900">{slip.reason}</span>
                          <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-100 text-blue-900 border border-blue-200">
                            {slip.digitalPassCode}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          Date: <span className="font-medium text-slate-700">{slip.date}</span> · Return: <span className="font-medium text-slate-700">{slip.expectedReturn}</span>
                        </p>
                        {slip.dutyLocation && (
                          <p className="text-[11px] text-slate-400">Loc: {slip.dutyLocation}</p>
                        )}
                      </div>

                      <div className="shrink-0">
                        {isApproved && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            <span>Approved</span>
                          </span>
                        )}
                        {isPending && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300 flex items-center gap-1 animate-pulse">
                            <Clock className="w-3 h-3 text-amber-600" />
                            <span>Pending Landlord Approval</span>
                          </span>
                        )}
                        {isDeclined && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 border border-rose-200 flex items-center gap-1">
                            <XCircle className="w-3 h-3 text-rose-600" />
                            <span>Declined</span>
                          </span>
                        )}
                      </div>
                    </div>

                    {slip.landlordNote && (
                      <div className="p-2 rounded-lg bg-blue-50/70 border border-blue-200/60 text-[11px] text-blue-900 flex items-start gap-1.5">
                        <ShieldCheck className="w-3.5 h-3.5 text-blue-700 shrink-0 mt-0.5" />
                        <div>
                          <span className="font-bold">Host Instructions: </span>
                          <span>{slip.landlordNote}</span>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
      )}

      {/* Verified Official Rent Receipts & Escrow */}
      <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="font-extrabold text-sm text-slate-900 flex items-center gap-1.5">
            <FileText className="w-4 h-4 text-blue-600" />
            <span>Verified Official Rent Receipts</span>
          </h4>
          <span className="text-[10px] bg-emerald-50 text-emerald-800 font-bold px-2 py-0.5 rounded border border-emerald-200">
            GCash / Escrow
          </span>
        </div>

        {receipts.length === 0 ? (
          <p className="text-xs text-slate-400 italic py-2">No rent payment receipts recorded yet.</p>
        ) : (
          <div className="space-y-1.5 text-xs">
            {receipts.map((rec) => (
              <div key={rec.id} className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between gap-2">
                <div>
                  <p className="font-bold text-slate-800">{rec.title}</p>
                  <p className="text-[10px] text-slate-500 mt-0.5">
                    Paid {rec.paymentDate} · Ref: <span className="font-mono font-medium text-slate-700">{rec.refNumber}</span>
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <span className="font-black text-slate-900 text-sm">₱{rec.amount.toLocaleString()}</span>
                  <p className="text-[9px] text-emerald-600 font-bold flex items-center justify-end gap-0.5">
                    <ShieldCheck className="w-3 h-3 text-emerald-600" />
                    <span>Verified Escrow</span>
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* End Tenancy / Leave Tenancy Quick Card */}
      <div className="p-4 rounded-3xl bg-white border border-slate-200/80 shadow-xs flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0 border border-rose-100 shadow-2xs">
            <DoorOpen className="w-5 h-5" />
          </div>
          <div>
            <h4 className="font-extrabold text-sm text-slate-900 leading-tight">Leaving This Boarding House?</h4>
            <p className="text-xs text-slate-500 mt-0.5">
              Open the official departure & escrow clearance window to schedule move-out and claim your deposit refund.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setIsLeaveModalOpen(true)}
          className="px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 active:scale-95 text-white font-bold text-xs transition-all shrink-0 cursor-pointer shadow-xs flex items-center gap-1.5"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>Leave Tenancy</span>
        </button>
      </div>

      {/* Official Leave Tenancy Transaction Window Modal */}
      {isLeaveModalOpen && (
        <LeaveTenancyModal
          tenancy={tenancy}
          user={user}
          onSuccess={() => {
            setLeaveSuccess(`Notice of departure confirmed for ${tenancy.propertyName} (${tenancy.roomNumber}). Tenancy pass concluded.`);
            fetchTenancyData();
          }}
          onClose={() => setIsLeaveModalOpen(false)}
        />
      )}

    </div>
  );
}

function ProfileField({ label, value, formValue, onChange, placeholder, type = 'text', editing }) {
  return (
    <div>
      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-0.5">{label}</p>
      {editing ? (
        <input
          type={type}
          value={formValue ?? ''}
          onChange={onChange}
          placeholder={placeholder}
          className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-[#0b1a30]/20 focus:border-[#0b1a30] transition"
        />
      ) : (
        <p className={`text-sm font-semibold ${value ? 'text-slate-800' : 'text-slate-400 italic'}`}>
          {value || 'Not set'}
        </p>
      )}
    </div>
  );
}

export function ProfileView({ onOpenAuth, onOpenLandlordProfile }) {
  const { user, token, updateUser, logout } = useAuth();
  const [editing, setEditing] = React.useState(false);
  const [saving,  setSaving]  = React.useState(false);
  const [error,   setError]   = React.useState('');
  const [saved,   setSaved]   = React.useState(false);

  const [form, setForm] = React.useState({
    name: '', phone: '', course: '', yearLevel: '',
    studentId: '', parentName: '', parentRelation: '', parentPhone: '', parentCity: '',
    facebook: '', instagram: '', twitter: ''
  });

  // Sync form when user loads or changes
  React.useEffect(() => {
    if (user) {
      setForm({
        name:           user.name          || '',
        phone:          user.phone         || '',
        course:         user.course        || '',
        yearLevel:      user.yearLevel     || '',
        studentId:      user.studentId     || '',
        parentName:     user.parentName    || '',
        parentRelation: user.parentRelation || '',
        parentPhone:    user.parentPhone   || '',
        parentCity:     user.parentCity    || '',
        facebook:       user.facebook      || '',
        instagram:      user.instagram     || '',
        twitter:        user.twitter       || ''
      });
    }
  }, [user]);

  // Not logged in
  if (!user) {
    return (
      <div className="p-8 text-center max-w-sm mx-auto my-12 space-y-4">
        <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mx-auto text-3xl">👤</div>
        <h3 className="font-extrabold text-base text-slate-800">You're not signed in</h3>
        <p className="text-xs text-slate-500">Log in or create an account to see your profile, tenancy details, and saved pads.</p>
        <div className="flex gap-2 justify-center">
          <button
            onClick={() => onOpenAuth('login')}
            className="px-4 py-2 rounded-xl text-xs font-bold bg-[#0b1a30] text-white hover:bg-[#1a3a6b] transition-colors"
          >
            Log In
          </button>
          <button
            onClick={() => onOpenAuth('signup')}
            className="px-4 py-2 rounded-xl text-xs font-bold border border-[#0b1a30] text-[#0b1a30] hover:bg-slate-50 transition-colors"
          >
            Sign Up
          </button>
        </div>
      </div>
    );
  }

  const set = (field) => (e) => setForm(f => ({ ...f, [field]: e.target.value }));

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const updated = await api.updateProfile(token, form);
      const socials = await api.updateSocialLinks({
        facebook: form.facebook,
        instagram: form.instagram,
        twitter: form.twitter
      });
      updateUser({ ...updated, ...socials });
      setEditing(false);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      setError(err.message || 'Could not save. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const isLandlord = user.role === 'landlord';
  const initials   = user.avatarInitials || user.name.slice(0, 2).toUpperCase();

  return (
    <div className="p-4 max-w-2xl mx-auto space-y-4 pb-24">

      {/* ── Avatar + name card ─────────────────────────────────── */}
      <div className="p-5 rounded-3xl bg-white border border-slate-200 shadow-xs">
        <div className="flex items-start gap-4">
          {/* Avatar */}
          <div className={`w-16 h-16 rounded-2xl flex items-center justify-center font-black text-xl text-white shrink-0 ${
            isLandlord ? 'bg-amber-500' : 'bg-[#0b1a30]'
          }`}>
            {initials}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-extrabold text-base text-slate-900 leading-tight">{user.name}</h3>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold capitalize ${
                isLandlord
                  ? 'bg-amber-100 text-amber-800 border border-amber-200'
                  : 'bg-blue-100 text-blue-800 border border-blue-200'
              }`}>
                {user.role}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">{user.email}</p>
            {user.phone && <p className="text-xs text-slate-500">{user.phone}</p>}
            {!isLandlord && user.course && (
              <p className="text-xs text-slate-600 font-medium mt-0.5">
                {user.course}{user.yearLevel ? ` • ${user.yearLevel}` : ''}
              </p>
            )}
            {saved && (
              <p className="text-xs text-emerald-600 font-bold mt-1">✓ Profile saved!</p>
            )}
          </div>

          <button
            onClick={() => { setEditing(v => !v); setError(''); }}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors shrink-0 ${
              editing
                ? 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                : 'bg-[#0b1a30] text-white hover:bg-[#1a3a6b]'
            }`}
          >
            {editing ? 'Cancel' : 'Edit'}
          </button>
        </div>
      </div>

      {/* ── Landlord verification status ─────────────────────────── */}
      {isLandlord && (
        <div className={`p-4 rounded-3xl border flex items-start gap-3 ${
          user.isUriosVerified
            ? 'bg-emerald-50 border-emerald-200'
            : 'bg-amber-50 border-amber-200'
        }`}>
          <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${
            user.isUriosVerified ? 'bg-emerald-600 text-white' : 'bg-amber-500 text-white'
          }`}>
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h4 className={`font-extrabold text-sm ${user.isUriosVerified ? 'text-emerald-900' : 'text-amber-900'}`}>
                {user.isUriosVerified ? 'Urios Verified Landlord' : 'Verification Pending'}
              </h4>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                user.isUriosVerified
                  ? 'bg-emerald-200 text-emerald-900'
                  : 'bg-amber-200 text-amber-900'
              }`}>
                {user.isUriosVerified ? 'APPROVED' : 'AWAITING AUDIT'}
              </span>
            </div>
            <p className={`text-[11px] mt-1 leading-relaxed ${user.isUriosVerified ? 'text-emerald-800' : 'text-amber-800'}`}>
              {user.isUriosVerified
                ? `Your host account was approved by ${user.verifiedBy || 'the FSUU Student Housing Committee'}${user.verifiedAt ? ` on ${String(user.verifiedAt).slice(0, 10)}` : ''}. Verified hosts display the Urios Verified badge on their listings.`
                : 'An FSUU auditor reviews your valid ID first, then approves your host account. Submit a clear photo of your ID below to start the review.'}
            </p>
            {user.verificationNotes && (
              <p className={`text-[11px] mt-1.5 italic ${user.isUriosVerified ? 'text-emerald-700' : 'text-amber-700'}`}>
                Auditor notes: {user.verificationNotes}
              </p>
            )}
            {onOpenLandlordProfile && (
              <button
                type="button"
                onClick={() => onOpenLandlordProfile({
                  userId: user.id,
                  name: user.name,
                  initials,
                  avatar: user.avatar || null,
                  email: user.email,
                  phone: user.phone || null,
                  tag: 'Landlord Account',
                  isUriosVerified: Boolean(user.isUriosVerified),
                  verificationStatus: user.verificationStatus || (user.isUriosVerified ? 'verified' : 'pending'),
                  verifiedAt: user.verifiedAt || null,
                  verifiedBy: user.verifiedBy || null,
                  verificationNotes: user.verificationNotes || '',
                  facebook: user.facebook || form.facebook || null,
                  instagram: user.instagram || form.instagram || null,
                  twitter: user.twitter || form.twitter || null,
                  experience: 'Landlord'
                })}
                className="mt-3 inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white border border-amber-300 hover:border-amber-400 hover:bg-amber-100/50 text-amber-900 text-xs font-black transition-colors cursor-pointer"
              >
                <FileText className="w-3.5 h-3.5" />
                Submit / update valid ID
              </button>
            )}
          </div>
        </div>
      )}

      {/* ── Profile form / info ────────────────────────────────── */}
      <form onSubmit={handleSave} className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-4">
        <h4 className="font-bold text-sm text-slate-900">
          {isLandlord ? 'Landlord Info' : 'Student Info'}
        </h4>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <ProfileField label="Full Name"  value={user.name}  formValue={form.name}  onChange={set('name')}  placeholder="e.g. Juan dela Cruz" editing={editing} />
          <ProfileField label="Phone"      value={user.phone} formValue={form.phone} onChange={set('phone')} placeholder="+63 9XX XXX XXXX" type="tel" editing={editing} />

          {!isLandlord && (
            <>
              <ProfileField label="Course / Program" value={user.course}    formValue={form.course}    onChange={set('course')}    placeholder="e.g. BS Nursing" editing={editing} />
              <ProfileField label="Year Level"        value={user.yearLevel} formValue={form.yearLevel} onChange={set('yearLevel')} placeholder="e.g. 3rd Year" editing={editing} />
              <ProfileField label="Student ID"        value={user.studentId} formValue={form.studentId} onChange={set('studentId')} placeholder="e.g. 2021-0001" editing={editing} />
            </>
          )}
        </div>

        <hr className="border-slate-100" />
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <h4 className="font-bold text-sm text-slate-900 flex items-center gap-1.5">
            <Share2 className="w-4 h-4 text-blue-600" />
            Social Links
          </h4>
          <span className="text-[10px] font-bold text-slate-400">
            {isLandlord ? 'Shown on your public host profile' : 'Shown to your landlord on your tenant profile'}
          </span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <ProfileField label="Facebook"  value={user.facebook}  formValue={form.facebook}  onChange={set('facebook')}  placeholder="facebook.com/yourname" editing={editing} />
          <ProfileField label="Instagram" value={user.instagram} formValue={form.instagram} onChange={set('instagram')} placeholder="instagram.com/yourname" editing={editing} />
          <ProfileField label="X / Twitter" value={user.twitter} formValue={form.twitter}   onChange={set('twitter')}   placeholder="x.com/yourname" editing={editing} />
        </div>
        {!editing && (
          <SocialLinks
            facebook={form.facebook}
            instagram={form.instagram}
            twitter={form.twitter}
            variant="chips"
          />
        )}

        {!isLandlord && (
          <>
            <hr className="border-slate-100" />
            <h4 className="font-bold text-sm text-slate-900">Parent / Emergency Contact</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <ProfileField label="Parent / Guardian Name" value={user.parentName}     formValue={form.parentName}     onChange={set('parentName')}     placeholder="e.g. Maria dela Cruz" editing={editing} />
              <ProfileField label="Relation"               value={user.parentRelation} formValue={form.parentRelation} onChange={set('parentRelation')} placeholder="e.g. Mother" editing={editing} />
              <ProfileField label="Contact Number"         value={user.parentPhone}    formValue={form.parentPhone}    onChange={set('parentPhone')}    placeholder="+63 9XX XXX XXXX" type="tel" editing={editing} />
              <ProfileField label="City / Town"            value={user.parentCity}     formValue={form.parentCity}     onChange={set('parentCity')}     placeholder="e.g. Surigao City" editing={editing} />
            </div>
          </>
        )}

        {error && (
          <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-xl px-3 py-2">⚠️ {error}</p>
        )}

        {editing && (
          <button
            type="submit"
            disabled={saving}
            className={`w-full py-2.5 rounded-xl text-xs font-black text-white transition-all ${
              saving ? 'opacity-60 cursor-not-allowed' : 'hover:scale-[1.01] active:scale-[0.99]'
            } ${isLandlord ? 'bg-amber-500 hover:bg-amber-600' : 'bg-[#0b1a30] hover:bg-[#1a3a6b]'}`}
          >
            {saving ? 'Saving…' : 'Save Changes'}
          </button>
        )}
      </form>

      {/* ── FSUU Partner note ─────────────────────────────────── */}
      <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200 text-xs text-amber-900 space-y-1">
        <p className="font-bold flex items-center gap-1">
          <Award className="w-4 h-4 text-amber-700" />
          FSUU Student Council Housing Partner
        </p>
        <p className="text-[11px] leading-relaxed">
          Balay Urios works closely with FSUU Student Affairs & Supreme Student Government (SSG) to ensure all off-campus boarding facilities meet safety, sanitation, and flood security requirements.
        </p>
      </div>

      {/* ── Log out ───────────────────────────────────────────── */}
      <button
        onClick={logout}
        className="w-full py-2.5 rounded-xl border border-red-200 text-xs font-bold text-red-600 hover:bg-red-50 transition-colors"
      >
        Log Out
      </button>
    </div>
  );
}
