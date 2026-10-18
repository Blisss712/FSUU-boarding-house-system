import React, { useState } from 'react';
import { X, Calculator, Plus, Check, Zap, Info, ArrowRight, DollarSign } from 'lucide-react';
import { APPLIANCE_CATALOG } from '../data/boardingHouses';

export default function TrueCostCalculatorModal({ property, onClose }) {
  if (!property) return null;

  const [selectedAppliances, setSelectedAppliances] = useState([
    'electric-fan',
    'laptop',
    'rice-cooker'
  ]);
  const [acHoursPerDay, setAcHoursPerDay] = useState(0);

  const toggleAppliance = (id) => {
    if (selectedAppliances.includes(id)) {
      setSelectedAppliances(selectedAppliances.filter(item => item !== id));
    } else {
      setSelectedAppliances([...selectedAppliances, id]);
    }
  };

  // Base rent
  const baseRent = property.price;

  // Appliances total
  const appliancesTotal = selectedAppliances.reduce((sum, id) => {
    const item = APPLIANCE_CATALOG.find(a => a.id === id);
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
              <p className="text-xs text-slate-500">
                Calculate total rent + appliance charges with zero hidden surprises
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Property Context */}
        <div className="mt-4 p-3 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-900">{property.name}</p>
            <p className="text-[11px] text-slate-500">{property.roomType}</p>
          </div>
          <div className="text-right">
            <span className="text-xs text-slate-400 font-semibold">Base Rent:</span>
            <p className="text-sm font-black text-slate-900">₱{baseRent.toLocaleString()}/mo</p>
          </div>
        </div>

        {/* Appliance Checklist */}
        <div className="mt-4 space-y-2">
          <p className="text-xs font-bold text-slate-800 uppercase tracking-wider">
            Select Appliances You Plan to Bring:
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-56 overflow-y-auto p-0.5">
            {APPLIANCE_CATALOG.map((item) => {
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
                  <span className="font-bold text-slate-900 shrink-0">
                    +₱{item.monthlyCost}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Air Conditioner Submeter Slider */}
        <div className="mt-4 p-3.5 rounded-2xl bg-amber-50/60 border border-amber-200/80 space-y-2">
          <div className="flex items-center justify-between text-xs font-bold text-amber-950">
            <span className="flex items-center gap-1.5">
              <Zap className="w-4 h-4 text-amber-600" />
              Aircon Usage (Submetered @ ₱14/kWh)
            </span>
            <span>{acHoursPerDay} hrs/night</span>
          </div>

          <input
            type="range"
            min="0"
            max="12"
            step="1"
            value={acHoursPerDay}
            onChange={(e) => setAcHoursPerDay(parseInt(e.target.value))}
            className="w-full accent-amber-600 cursor-pointer"
          />

          <div className="flex justify-between text-[11px] text-amber-800 font-medium">
            <span>None (0 hrs)</span>
            <span>Estimated: +₱{estimatedAcCost.toLocaleString()}/mo</span>
            <span>Heavy (12 hrs)</span>
          </div>
        </div>

        {/* Total Cost Breakdown Box */}
        <div className="mt-5 p-4 rounded-2xl bg-[#0f244a] text-white shadow-lg space-y-2">
          <div className="flex justify-between text-xs text-blue-200 font-medium">
            <span>Base Room Rent:</span>
            <span>₱{baseRent.toLocaleString()}</span>
          </div>
          <div className="flex justify-between text-xs text-blue-200 font-medium">
            <span>Appliance Add-Ons ({selectedAppliances.length} items):</span>
            <span>+₱{appliancesTotal.toLocaleString()}</span>
          </div>
          {estimatedAcCost > 0 && (
            <div className="flex justify-between text-xs text-blue-200 font-medium">
              <span>Estimated Aircon Electricity:</span>
              <span>+₱{estimatedAcCost.toLocaleString()}</span>
            </div>
          )}

          <div className="pt-2 border-t border-blue-800/80 flex items-baseline justify-between">
            <div>
              <p className="text-xs text-blue-300 font-bold uppercase tracking-wider">
                True Estimated Total:
              </p>
              <p className="text-[10px] text-blue-300/80">Everything included per month</p>
            </div>
            <div className="text-right">
              <span className="text-2xl font-black text-amber-400">
                ₱{grandTotal.toLocaleString()}
              </span>
              <span className="text-xs text-blue-200 ml-1">/ month</span>
            </div>
          </div>
        </div>

        {/* Dismiss CTA */}
        <button
          onClick={onClose}
          className="mt-4 w-full py-3 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs transition-colors shadow-sm"
        >
          Got it, Close Calculator
        </button>
      </div>
    </div>
  );
}
