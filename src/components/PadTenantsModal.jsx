import React, { useState, useEffect } from 'react';
import { 
  X, 
  Users, 
  Search, 
  Building2, 
  DoorOpen, 
  Zap, 
  Calendar, 
  Phone, 
  Mail, 
  ChevronRight, 
  GraduationCap, 
  MessageCircle, 
  User, 
  RefreshCw,
  MessageSquare,
  ShieldCheck,
  Megaphone
} from 'lucide-react';
import StudentProfileModal from './StudentProfileModal';
import { api } from '../services/api';

export default function PadTenantsModal({ 
  isOpen, 
  property, 
  onClose, 
  onOpenChat,
  onOpenGroupChat 
}) {
  const [tenants, setTenants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedTenantForProfile, setSelectedTenantForProfile] = useState(null);

  useEffect(() => {
    if (isOpen && property?.id) {
      setLoading(true);
      api.getTenantsByProperty(property.id)
        .then(res => {
          if (res && Array.isArray(res.data)) {
            setTenants(res.data);
          } else {
            setTenants([]);
          }
        })
        .catch(err => {
          console.warn('[PadTenantsModal] Error fetching tenants:', err);
          setTenants([]);
        })
        .finally(() => setLoading(false));
    }
  }, [isOpen, property?.id]);

  if (!isOpen || !property) return null;

  const filtered = tenants.filter(t => {
    const student = t.student || t;
    const name = (student.name || t.studentName || '').toLowerCase();
    const room = (t.roomNumber || '').toLowerCase();
    const course = (student.course || t.course || '').toLowerCase();
    const q = search.toLowerCase().trim();
    return !q || name.includes(q) || room.includes(q) || course.includes(q);
  });

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
        <div className="bg-white rounded-3xl max-w-3xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden">
          
          {/* Header */}
          <div className="p-5 bg-gradient-to-r from-[#0b1a30] via-[#12284c] to-[#1c3f76] text-white flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-amber-500/20 border border-amber-400/40 flex items-center justify-center text-amber-400 shrink-0">
                <Users className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-black text-base sm:text-lg text-white">Pad Residents & Tenant Registry</h3>
                  <span className="px-2.5 py-0.5 rounded-full bg-amber-500 text-slate-950 text-[10px] font-black uppercase tracking-wider">
                    {tenants.length} Active {tenants.length === 1 ? 'Boarder' : 'Boarders'}
                  </span>
                </div>
                <p className="text-xs text-blue-200 mt-0.5 flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span className="font-semibold text-white">{property.name}</span>
                  <span>•</span>
                  <span>Direct Student Profiles & Room Details</span>
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer"
              title="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Quick Action & Announcement Banner */}
          <div className="px-5 py-3 bg-gradient-to-r from-amber-50 to-orange-50 border-b border-amber-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 shrink-0">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-amber-100 border border-amber-300 flex items-center justify-center text-amber-800 shrink-0">
                <Megaphone className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs font-black text-amber-950">Pad Community Chat & Announcements</p>
                <p className="text-[11px] text-amber-800">
                  Update all {tenants.length} residents at once regarding power, water, or curfew rules.
                </p>
              </div>
            </div>

            {onOpenGroupChat && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenGroupChat(property);
                }}
                className="px-3.5 py-1.5 rounded-xl bg-[#0b1a30] hover:bg-[#1a3a6b] text-white font-extrabold text-xs transition-colors flex items-center justify-center gap-1.5 shadow-2xs cursor-pointer shrink-0"
              >
                <MessageSquare className="w-3.5 h-3.5 text-amber-400" />
                <span>Open Pad Chat Group</span>
              </button>
            )}
          </div>

          {/* Search bar */}
          <div className="px-5 py-3 bg-slate-50 border-b border-slate-200 flex items-center gap-3 shrink-0">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search boarders by student name, room number, or program..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 rounded-xl bg-white border border-slate-200 text-xs font-medium text-slate-800 focus:outline-none focus:border-blue-500 placeholder:text-slate-400"
              />
            </div>
            <span className="text-xs font-bold text-slate-500 shrink-0">
              Showing {filtered.length} of {tenants.length}
            </span>
          </div>

          {/* Tenants List Grid */}
          <div className="p-5 overflow-y-auto space-y-3 flex-1">
            {loading ? (
              <div className="py-12 text-center space-y-3">
                <RefreshCw className="w-6 h-6 text-blue-900 animate-spin mx-auto" />
                <p className="text-xs font-bold text-slate-500">Loading student residents registry...</p>
              </div>
            ) : filtered.length === 0 ? (
              <div className="py-12 text-center max-w-sm mx-auto space-y-3">
                <div className="w-14 h-14 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto text-2xl">
                  👥
                </div>
                <div>
                  <h4 className="font-extrabold text-sm text-slate-800">No boarders match your search</h4>
                  <p className="text-xs text-slate-500 mt-1">
                    Try checking student name or assigned room number.
                  </p>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {filtered.map((t) => {
                  const student = t.student || t;
                  const name = student.name || t.studentName || 'Active Boarder';
                  const course = student.course || t.course || 'BS Nursing';
                  const yearLevel = student.yearLevel || t.yearLevel || 'Student';
                  const roomNumber = t.roomNumber || 'Room 204';
                  const submeterKwh = t.submeterKwh ?? 42;
                  const submeterCost = t.submeterCost ?? 588;
                  const initials = student.avatarInitials || (name ? name.substring(0, 2).toUpperCase() : 'ST');

                  return (
                    <div 
                      key={t.id} 
                      className="p-4 rounded-2xl bg-white border border-slate-200/90 hover:border-blue-300 shadow-2xs hover:shadow-md transition-all space-y-3 group"
                    >
                      {/* Top Row: Avatar + Name + Room */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-3">
                          <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-[#0b1a30] to-[#1e3a6c] text-amber-400 font-black text-sm flex items-center justify-center shadow-xs shrink-0">
                            {initials}
                          </div>
                          <div>
                            <h4 className="font-black text-sm text-slate-900 leading-snug group-hover:text-blue-900 transition-colors">
                              {name}
                            </h4>
                            <p className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                              <GraduationCap className="w-3 h-3 text-blue-600" />
                              <span className="truncate">{course} ({yearLevel})</span>
                            </p>
                          </div>
                        </div>

                        <span className="px-2.5 py-1 rounded-xl bg-blue-50 text-blue-950 font-black text-[11px] border border-blue-200 flex items-center gap-1 shrink-0">
                          <DoorOpen className="w-3 h-3 text-blue-600" />
                          <span>{roomNumber}</span>
                        </span>
                      </div>

                      {/* Utility Submeter Strip */}
                      <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between text-xs">
                        <div className="flex items-center gap-1.5 text-slate-600">
                          <Zap className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                          <span className="text-[11px] font-semibold">{t.submeterNumber || '#1892'} • {submeterKwh} kWh</span>
                        </div>
                        <span className="font-extrabold text-[#0b1a30] text-xs">
                          ₱{Number(submeterCost).toLocaleString()}
                        </span>
                      </div>

                      {/* Parent / Guardian Quick Pill */}
                      {student.parentName && (
                        <p className="text-[10.5px] text-slate-500 truncate">
                          Guardian: <strong className="text-slate-700">{student.parentName}</strong> ({student.parentRelation || 'Parent'}) • {student.parentCity || 'Butuan'}
                        </p>
                      )}

                      {/* Action Buttons */}
                      <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                        <button
                          type="button"
                          onClick={() => setSelectedTenantForProfile(t)}
                          className="flex-1 py-1.5 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-extrabold text-[11px] transition-colors flex items-center justify-center gap-1 cursor-pointer"
                        >
                          <User className="w-3 h-3 text-slate-600" />
                          <span>View Profile</span>
                          <ChevronRight className="w-3 h-3 text-slate-400" />
                        </button>

                        {onOpenChat && (
                          <button
                            type="button"
                            onClick={() => {
                              onClose();
                              onOpenChat({
                                ...property,
                                targetStudent: {
                                  id: student.id || t.userId,
                                  name,
                                  roomNumber
                                }
                              });
                            }}
                            className="py-1.5 px-3 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-900 border border-blue-200 font-extrabold text-[11px] transition-colors flex items-center gap-1 cursor-pointer"
                            title={`Send direct message to ${name}`}
                          >
                            <MessageCircle className="w-3 h-3 text-blue-600" />
                            <span>Message</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500 shrink-0">
            <div className="flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span className="font-semibold">Official Balay Urios Tenancy Contract Registry</span>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold transition-colors cursor-pointer"
            >
              Done
            </button>
          </div>

        </div>
      </div>

      {/* Nested Full Student Profile Modal */}
      {selectedTenantForProfile && (
        <StudentProfileModal
          isOpen={Boolean(selectedTenantForProfile)}
          tenant={selectedTenantForProfile}
          property={property}
          onClose={() => setSelectedTenantForProfile(null)}
          onOpenChat={onOpenChat}
        />
      )}
    </>
  );
}
