import React, { useState, useEffect } from 'react';
import { X, Calculator, Check, Zap } from 'lucide-react';
import { api } from '../services/api';

export default function TrueCostCalculatorModal({ property, onClose, appliances: propAppliances }) {
  const [appliancesList, setAppliancesList] = useState(propAppliances || []);
  const [selectedAppliances, setSelectedAppliances] = useState([
    'electric-fan',
    'laptop',
    'rice-cooker'
  ]);
  const [acHoursPerDay, setAcHoursPerDay] = useState(0);

  useEffect(() => {
    if (!propAppliances || propAppliances.length === 0) {
      api.getAppliances().then(data => {
        if (Array.isArray(data) && data.length > 0) {
          setAppliancesList(data);
        }
      });
    }
  }, [propAppliances]);

  if (!property) return null;

  const toggleAppliance = (id) => {
    if (selectedAppliances.includes(id)) {
      setSelectedAppliances(selectedAppliances.filter(item => item !== id));
    } else {
      setSelectedAppliances([...selectedAppliances, id]);
    }
  };

  // Base rent
  const baseRent = property.price || 0;

  // Appliances total
  const appliancesTotal = selectedAppliances.reduce((sum, id) => {
    const item = appliancesList.find(a => a.id === id);
    return sum + (item ? item.monthlyCost : 0);
  }, 0);

  // Aircon estimated cost (assuming ~0.75 kWh per hour @ ₱14/kWh)
  const estimatedAcKwh = acHoursPerDay * 0.75 * 30;
  const estimatedAcCost = Math.round(estimatedAcKwh * 14);

  const grandTotal = baseRent + appliancesTotal + estimatedAcCost;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-lg w-full p-5 sm:p-6 shadow-2xl border border-slate-100 my-auto animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold">
              <Calculator className="w-5 h-5 text-emerald-700" />
            </div>
            <div>
              <h3 className="font-extrabold text-base text-slate-900">
                "True Monthly Cost" Calculator
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                {property.name} · Base Rent: ₱{baseRent.toLocaleString()}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Appliance Checklist */}
        <div className="mt-4 space-y-2">
          <p className="text-xs font-bold text-slate-800 uppercase tracking-wider">
            Select Appliances You Plan to Bring:
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-56 overflow-y-auto p-0.5">
            {appliancesList.map((item) => {
              const isChecked = selectedAppliances.includes(item.id);
              return (
                <div
                  key={item.id}
                  onClick={() => toggleAppliance(item.id)}
                  className={`p-2.5 rounded-xl border text-xs cursor-pointer transition-all flex items-center justify-between select-none ${
                    isChecked
                      ? 'bg-emerald-50/70 border-emerald-300 text-emerald-950 font-semibold shadow-xs'
                      : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-2 truncate pr-2">
                    <div className={`w-4 h-4 rounded-md flex items-center justify-center border shrink-0 ${
                      isChecked ? 'bg-emerald-600 border-emerald-600 text-white' : 'border-slate-300'
                    }`}>
                      {isChecked && <Check className="w-3 h-3" />}
                    </div>
                    <span className="truncate">{item.name}</span>
                  </div>
                  <span className="font-black text-emerald-800 shrink-0">
                    +₱{item.monthlyCost}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Aircon Slider */}
        <div className="mt-4 p-3.5 rounded-2xl bg-slate-50 border border-slate-100 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
              <Zap className="w-3.5 h-3.5 text-amber-500" />
              <span>Aircon Usage Estimate (₱14/kWh)</span>
            </div>
            <span className="text-xs font-extrabold text-blue-900">
              {acHoursPerDay} hrs/day (~₱{estimatedAcCost.toLocaleString()}/mo)
            </span>
          </div>
          <input
            type="range"
            min="0"
            max="16"
            step="1"
            value={acHoursPerDay}
            onChange={(e) => setAcHoursPerDay(Number(e.target.value))}
            className="w-full accent-[#0b1a30] cursor-pointer"
          />
          <div className="flex justify-between text-[10px] text-slate-400 font-bold px-1">
            <span>Fan only (0 hrs)</span>
            <span>8 hrs (Night only)</span>
            <span>16 hrs (Heavy)</span>
          </div>
        </div>

        {/* Total Cost Breakdown */}
        <div className="mt-5 p-4 rounded-2xl bg-[#0b1a30] text-white space-y-2.5 shadow-md">
          <div className="flex justify-between text-xs text-slate-300">
            <span>Base Room Rent</span>
            <span className="font-bold">₱{baseRent.toLocaleString()}</span>
          </div>
          <div className="flex justify-between text-xs text-slate-300">
            <span>Landlord Appliance Surcharges ({selectedAppliances.length} items)</span>
            <span className="font-bold">+₱{appliancesTotal.toLocaleString()}</span>
          </div>
          {acHoursPerDay > 0 && (
            <div className="flex justify-between text-xs text-slate-300">
              <span>Estimated Submetered Aircon ({acHoursPerDay} hrs/day)</span>
              <span className="font-bold">+₱{estimatedAcCost.toLocaleString()}</span>
            </div>
          )}
          <div className="pt-2 border-t border-white/10 flex justify-between items-baseline">
            <div>
              <p className="text-[11px] uppercase tracking-wider text-amber-400 font-extrabold">
                Estimated True Monthly Total
              </p>
              <p className="text-[10px] text-slate-400">Zero surprise utility shocks</p>
            </div>
            <div className="text-right">
              <span className="text-2xl font-black text-amber-400">
                ₱{grandTotal.toLocaleString()}
              </span>
              <span className="text-xs text-slate-300">/month</span>
            </div>
          </div>
        </div>

        {/* Footer Button */}
        <button
          onClick={onClose}
          className="w-full mt-4 py-3 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs shadow-md transition-all active:scale-[0.99] cursor-pointer"
        >
          Got It, Thanks!
        </button>
      </div>
    </div>
  );
}
