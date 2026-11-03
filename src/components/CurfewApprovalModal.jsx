import React, { useState, useEffect, useCallback } from 'react';
import { 
  X, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  User, 
  Calendar, 
  MapPin, 
  Building2, 
  ShieldCheck, 
  RefreshCw
} from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';

export default function CurfewApprovalModal({ 
  isOpen, 
  property, 
  onClose, 
  onPassUpdated 
}) {
  const { user } = useAuth();
  const [slips, setSlips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState(null);
  const [filter, setFilter] = useState('all'); // 'all' | 'pending' | 'approved' | 'rejected'
  const [notes, setNotes] = useState({});
  const [toastMessage, setToastMessage] = useState(null);

  const fetchSlips = useCallback(async () => {
    if (!property?.id) return;
    setLoading(true);
    try {
      const res = await api.getCurfewSlipsByProperty(property.id);
      if (res && Array.isArray(res.data)) {
        setSlips(res.data);
      } else {
        setSlips([]);
      }
    } catch (err) {
      console.error('Failed to load curfew slips:', err);
      setSlips([]);
    } finally {
      setLoading(false);
    }
  }, [property?.id]);

  useEffect(() => {
    if (isOpen && property?.id) {
      fetchSlips();
    }
  }, [isOpen, property?.id, fetchSlips]);

  if (!isOpen || !property) return null;

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3500);
  };

  const handleStatusChange = async (slipId, newStatus) => {
    setActionLoadingId(slipId);
    try {
      const landlordNote = notes[slipId] || '';
      await api.updateCurfewSlipStatus(slipId, newStatus, {
        landlordNote,
        approvedBy: user?.name || property?.landlord?.name || 'Landlord Host'
      });

      // Update state locally
      setSlips(prev => prev.map(s => {
        if (s.id === slipId) {
          return {
            ...s,
            status: newStatus,
            landlordNote: landlordNote || s.landlordNote,
            approvedBy: newStatus === 'approved' ? (user?.name || property?.landlord?.name || 'Landlord Host') : s.approvedBy,
            approvedAt: newStatus === 'approved' ? new Date().toISOString() : s.approvedAt
          };
        }
        return s;
      }));

      showToast(`Pass marked as ${newStatus === 'approved' ? 'Approved' : 'Declined'} successfully!`);
      onPassUpdated?.();
    } catch (err) {
      console.error('Error updating curfew slip status:', err);
      showToast(`Failed to update pass: ${err.message || 'Network error'}`);
    } finally {
      setActionLoadingId(null);
    }
  };

  const pendingCount = slips.filter(s => (s.status || 'pending') === 'pending').length;
  const approvedCount = slips.filter(s => s.status === 'approved').length;
  const rejectedCount = slips.filter(s => s.status === 'rejected' || s.status === 'declined').length;

  const filteredSlips = slips.filter(s => {
    const sStatus = s.status || 'pending';
    if (filter === 'all') return true;
    if (filter === 'pending') return sStatus === 'pending';
    if (filter === 'approved') return sStatus === 'approved';
    if (filter === 'rejected') return sStatus === 'rejected' || sStatus === 'declined';
    return true;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden">
        
        {/* Header */}
        <div className="p-5 bg-gradient-to-r from-[#0b1a30] via-[#132c54] to-[#1c3f76] text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-amber-500/20 border border-amber-400/40 flex items-center justify-center text-amber-400 shrink-0">
              <Clock className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-black text-base sm:text-lg text-white">Curfew Exemption Passes</h3>
                <span className="px-2 py-0.5 rounded-full bg-amber-500 text-slate-950 text-[10px] font-black uppercase tracking-wider">
                  Landlord Approval
                </span>
              </div>
              <p className="text-xs text-blue-200 mt-0.5 flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span className="font-semibold text-white">{property.name}</span>
                <span>•</span>
                <span>Gate Hours Control</span>
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

        {/* Toast notification banner */}
        {toastMessage && (
          <div className="p-3 bg-emerald-500 text-white text-xs font-bold flex items-center justify-between px-5 transition-all">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{toastMessage}</span>
            </div>
            <button onClick={() => setToastMessage(null)} className="text-white/80 hover:text-white">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Stats Pill Strip */}
        <div className="px-5 py-3 bg-slate-50 border-b border-slate-200/80 flex items-center justify-between gap-2 overflow-x-auto shrink-0">
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setFilter('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                filter === 'all'
                  ? 'bg-[#0b1a30] text-white shadow-xs'
                  : 'bg-white text-slate-600 hover:bg-slate-200/70 border border-slate-200'
              }`}
            >
              All Passes ({slips.length})
            </button>

            <button
              onClick={() => setFilter('pending')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                filter === 'pending'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'bg-white text-amber-900 hover:bg-amber-50 border border-amber-200'
              }`}
            >
              <span>Pending Review</span>
              {pendingCount > 0 && (
                <span className="px-1.5 py-0.2 rounded-full bg-amber-500 text-white text-[10px] font-black">
                  {pendingCount}
                </span>
              )}
            </button>

            <button
              onClick={() => setFilter('approved')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                filter === 'approved'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-white text-emerald-900 hover:bg-emerald-50 border border-emerald-200'
              }`}
            >
              Approved ({approvedCount})
            </button>

            <button
              onClick={() => setFilter('rejected')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                filter === 'rejected'
                  ? 'bg-rose-600 text-white shadow-xs'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              Declined ({rejectedCount})
            </button>
          </div>

        </div>

        {/* Content Body */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1">
          {loading ? (
            <div className="py-12 text-center space-y-3">
              <RefreshCw className="w-6 h-6 text-blue-900 animate-spin mx-auto" />
              <p className="text-xs font-bold text-slate-500">Loading student curfew exemption passes...</p>
            </div>
          ) : filteredSlips.length === 0 ? (
            <div className="py-12 text-center max-w-sm mx-auto space-y-3">
              <div className="w-14 h-14 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto text-2xl">
                📋
              </div>
              <div>
                <h4 className="font-extrabold text-sm text-slate-800">No {filter !== 'all' ? filter : ''} curfew passes found</h4>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  {filter === 'pending' 
                    ? 'All student curfew exemption notices for this pad have been reviewed and approved!'
                    : 'When students submit late clinical duty notices, they will appear here for your approval.'}
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-3.5">
              {filteredSlips.map((slip) => {
                const sStatus = slip.status || 'pending';
                const isPending = sStatus === 'pending';
                const isApproved = sStatus === 'approved';
                const isRejected = sStatus === 'rejected' || sStatus === 'declined';
                const isActionBusy = actionLoadingId === slip.id;

                return (
                  <div 
                    key={slip.id} 
                    className={`rounded-2xl border p-4 transition-all shadow-xs space-y-3 ${
                      isPending 
                        ? 'bg-amber-50/40 border-amber-200/90' 
                        : isApproved 
                          ? 'bg-white border-slate-200' 
                          : 'bg-slate-50 border-slate-200/70 opacity-80'
                    }`}
                  >
                    {/* Header Row: Reason & Status */}
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="font-black text-sm text-slate-900 leading-snug">
                            {slip.reason}
                          </h4>
                          <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded bg-blue-100 text-blue-900 border border-blue-200">
                            {slip.digitalPassCode}
                          </span>
                        </div>

                        {/* Student Details */}
                        <div className="flex items-center gap-2 text-xs text-slate-600 flex-wrap">
                          <span className="font-extrabold text-slate-900 flex items-center gap-1">
                            <User className="w-3.5 h-3.5 text-blue-600" />
                            {slip.studentName}
                          </span>
                          <span>•</span>
                          <span className="text-slate-600 font-medium">
                            {slip.course || 'BS Nursing'}
                          </span>
                          {slip.studentId && (
                            <>
                              <span>•</span>
                              <span className="font-mono text-[11px] text-slate-500">ID: {slip.studentId}</span>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Status Badge */}
                      <div className="shrink-0">
                        {isPending && (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-100 text-amber-900 border border-amber-300 text-xs font-bold animate-pulse">
                            <Clock className="w-3.5 h-3.5 text-amber-700" />
                            <span>Pending Host Approval</span>
                          </span>
                        )}
                        {isApproved && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 text-xs font-bold">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            <span>Approved by Host</span>
                          </span>
                        )}
                        {isRejected && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-rose-100 text-rose-800 border border-rose-300 text-xs font-bold">
                            <XCircle className="w-3.5 h-3.5 text-rose-600" />
                            <span>Declined</span>
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Duty Parameters Strip */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs p-3 rounded-xl bg-white border border-slate-200/80">
                      <div className="space-y-0.5">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Duty Date & Return Time</span>
                        <p className="font-bold text-slate-800 flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-amber-600" />
                          <span>{slip.date}</span>
                          <span className="text-slate-400">•</span>
                          <span className="text-blue-900">Return: {slip.expectedReturn}</span>
                        </p>
                      </div>

                      <div className="space-y-0.5">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Hospital / Laboratory</span>
                        <p className="font-bold text-slate-800 flex items-center gap-1.5 truncate">
                          <MapPin className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                          <span className="truncate">{slip.dutyLocation || 'Butuan Medical Center'}</span>
                        </p>
                      </div>
                    </div>

                    {/* Existing Landlord Note if any */}
                    {slip.landlordNote && (
                      <div className="p-2.5 rounded-xl bg-blue-50/80 border border-blue-200 text-xs text-blue-950 flex items-start gap-2">
                        <ShieldCheck className="w-4 h-4 text-blue-700 shrink-0 mt-0.5" />
                        <div>
                          <span className="font-bold block">Host Instructions / Note:</span>
                          <p className="text-[11.5px] text-blue-900 mt-0.5">{slip.landlordNote}</p>
                          {slip.approvedBy && (
                            <span className="text-[10px] text-blue-700 block mt-1">Confirmed by: {slip.approvedBy}</span>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Action Bar & Landlord Note Input */}
                    <div className="pt-2 border-t border-slate-200/80 space-y-2">
                      {/* Optional Note Input for Landlord */}
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          placeholder="Add instructions or gate key notes for student (optional)..."
                          value={notes[slip.id] !== undefined ? notes[slip.id] : (slip.landlordNote || '')}
                          onChange={(e) => setNotes(prev => ({ ...prev, [slip.id]: e.target.value }))}
                          className="flex-1 px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-xs font-medium text-slate-800 focus:outline-none focus:border-blue-500 placeholder:text-slate-400"
                        />
                      </div>

                      {/* Buttons */}
                      <div className="flex items-center justify-end gap-2 flex-wrap">
                        {isPending ? (
                          <>
                            <button
                              type="button"
                              disabled={isActionBusy}
                              onClick={() => handleStatusChange(slip.id, 'rejected')}
                              className="px-3.5 py-2 rounded-xl text-xs font-bold bg-white hover:bg-rose-50 text-rose-700 border border-rose-200 transition-colors disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
                            >
                              <XCircle className="w-3.5 h-3.5 text-rose-600" />
                              <span>Decline Pass</span>
                            </button>

                            <button
                              type="button"
                              disabled={isActionBusy}
                              onClick={() => handleStatusChange(slip.id, 'approved')}
                              className="px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white transition-all shadow-xs disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
                            >
                              {isActionBusy ? (
                                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                              )}
                              <span>Approve Curfew Pass</span>
                            </button>
                          </>
                        ) : isApproved ? (
                          <div className="flex items-center gap-2">
                            {notes[slip.id] && notes[slip.id] !== slip.landlordNote && (
                              <button
                                type="button"
                                disabled={isActionBusy}
                                onClick={() => handleStatusChange(slip.id, 'approved')}
                                className="px-3 py-1.5 rounded-xl text-xs font-bold bg-blue-50 hover:bg-blue-100 text-blue-900 border border-blue-200 transition-colors cursor-pointer"
                              >
                                Save Note Update
                              </button>
                            )}

                            <button
                              type="button"
                              disabled={isActionBusy}
                              onClick={() => handleStatusChange(slip.id, 'rejected')}
                              className="px-3 py-1.5 rounded-xl text-xs font-bold text-slate-500 hover:text-rose-700 hover:bg-rose-50 transition-colors cursor-pointer"
                              title="Revoke pass and change to declined"
                            >
                              Revoke Approval
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            disabled={isActionBusy}
                            onClick={() => handleStatusChange(slip.id, 'approved')}
                            className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white transition-colors cursor-pointer flex items-center gap-1.5"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Re-Approve Pass</span>
                          </button>
                        )}
                      </div>
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
            <span className="font-semibold">Official FSUU Gate Clearance Integration</span>
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
  );
}
