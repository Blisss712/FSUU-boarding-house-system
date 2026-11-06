import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Sparkles,
  X,
  Loader2,
  MapPin,
  Clock,
  Zap,
  Wifi,
  Signal,
  Droplets,
  ShieldCheck,
  Footprints,
  CloudSun,
  Users,
  Search,
  Building2,
  AlertTriangle,
  ArrowRight,
  ChevronRight,
  ListChecks,
  BedDouble,
  Wallet,
  RotateCcw,
  Info
} from 'lucide-react';
import { listStudentNeeds, getAiStatus, AiSearchError } from '../services/aiSearch';
import { rankMatches, buildNeedPatch, assessNeeds } from '../services/ai/aiNeeds';

const LOADING_MESSAGES = [
  'Reading your message…',
  'Listing what you need…',
  'Checking every pad in Butuan…',
  'Matching what each pad can actually prove…'
];

const EXAMPLE_PROMPTS = [
  {
    label: 'Bisaya + budget',
    text: 'Barato lang nga solo room duol sa San Francisco gate, naay aircon ug study table, kusog ang wifi.'
  },
  {
    label: 'Safety first',
    text: 'Female only, budget ₱3,500, walay baha, walking distance lang sa campus, with CCTV.'
  },
  {
    label: 'Nursing duties',
    text: 'Nursing student ko, need nako walay curfew ug generator backup kay sige brownout, below ₱4,000.'
  }
];

const KIND_ICONS = {
  budget: Wallet,
  gender: Users,
  zone: MapPin,
  room: BedDouble,
  walk: Footprints,
  amenity: Building2,
  flood: ShieldCheck,
  water: Droplets,
  power: Zap,
  wifi: Wifi,
  mobile: Signal,
  curfew: Clock,
  condition: CloudSun,
  quiet: Search,
  other: Sparkles
};

const FILTER_LABELS = {
  maxBudget: (value) => `≤ ₱${Number(value).toLocaleString()}/mo`,
  gender: (value) => value,
  zone: (value) => value,
  roomType: (value) => value,
  maxWalkMinutes: (value) => `≤ ${value} min walk`,
  amenity: (value) => value,
  minWifiSpeed: (value) => `≥ ${value} Mbps`,
  mobileProvider: (value) => `${value.toUpperCase()} signal`,
  floodFreeOnly: () => 'Flood-safe',
  boosterPumpOnly: () => 'Booster water',
  powerBackupOnly: () => 'Brownout backup',
  fastWifiOnly: () => 'Fast Wi-Fi',
  mobile5GOnly: () => '5G mobile data',
  rainOrShineOnly: () => 'Rain or shine',
  noCurfewOnly: () => 'No curfew'
};

function filterLabels(filter) {
  return Object.entries(filter || {})
    .map(([key, value]) => (FILTER_LABELS[key] ? FILTER_LABELS[key](value) : null))
    .filter(Boolean);
}

function errorCopy(code) {
  switch (code) {
    case 'not-configured':
      return {
        title: 'AI search needs a Gemini key',
        body: 'The search box is wired up, but no key was found on the local server.'
      };
    case 'invalid-key':
      return {
        title: 'Gemini rejected the API key',
        body: 'The key in .env is not accepted. Create a new one in Google AI Studio and restart the dev server.'
      };
    case 'rate-limited':
      return {
        title: 'The free Gemini quota is used up for the moment',
        body: 'Wait about a minute, then run the same search again. Your needs list is kept.'
      };
    case 'timeout':
      return {
        title: 'The AI took too long',
        body: 'The listings are still loading fine — only the AI answer timed out. Try again.'
      };
    case 'blocked':
    case 'invalid-json':
      return {
        title: 'The AI answer was not usable',
        body: 'Nothing was saved. Try rephrasing the same needs in a shorter sentence.'
      };
    case 'truncated':
      return {
        title: 'The AI answer was too long to finish',
        body: 'Drop a must-have or shorten the sentence, then run the search again.'
      };
    case 'no-needs':
      return {
        title: 'No housing need found in that message',
        body: 'Mention a budget, a zone near campus, or something the pad must have.'
      };
    case 'empty-catalog':
      return {
        title: 'No listings to match yet',
        body: 'Landlords have not posted any pad that the AI could read.'
      };
    case 'network':
      return {
        title: 'Could not reach the AI',
        body: 'Check your internet connection, then try again.'
      };
    default:
      return {
        title: 'The AI search hit a snag',
        body: 'The listings themselves are unaffected. Try the search again.'
      };
  }
}

function SetupInstructions({ status }) {
  const proxySeen = status?.proxySeen !== false;
  return (
    <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-4 text-left">
      <div className="flex items-start gap-2.5">
        <div className="w-8 h-8 rounded-xl bg-amber-100 border border-amber-200 flex items-center justify-center shrink-0">
          <Sparkles className="w-4 h-4 text-amber-700" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-extrabold text-amber-950">Turn on AI Needs Search</p>
          <p className="text-[12px] text-amber-900/80 mt-0.5">
            One key, one line of config. The key stays on the local server — it is never bundled into the app.
          </p>

          <ol className="mt-3 space-y-2 text-[12px] text-amber-950">
            <li className="flex gap-2">
              <span className="font-black">1.</span>
              <span>
                Create a free key in{' '}
                <span className="font-semibold">Google AI Studio</span> (aistudio.google.com → Get API key).
              </span>
            </li>
            <li className="flex gap-2">
              <span className="font-black">2.</span>
              <span>
                Add it to <code className="px-1 py-0.5 rounded bg-white/70 border border-amber-200 font-mono">.env</code>:
                <code className="mt-1 block px-2 py-1.5 rounded-lg bg-[#0b1a30] text-amber-200 font-mono text-[11px] break-all">
                  GEMINI_API_KEY=your-key-here
                </code>
              </span>
            </li>
            <li className="flex gap-2">
              <span className="font-black">3.</span>
              <span>
                Restart <code className="px-1 py-0.5 rounded bg-white/70 border border-amber-200 font-mono">npm run dev</code>{' '}
                and search again.
              </span>
            </li>
          </ol>

          <p className="text-[11px] text-amber-900/70 mt-3 leading-snug">
            {proxySeen
              ? 'The local proxy is running — it just has no key yet.'
              : 'No local proxy answered. For a static deploy, set VITE_GEMINI_API_KEY (exposed in the bundle, restrict it) or deploy a small serverless proxy that holds GEMINI_API_KEY.'}
          </p>
        </div>
      </div>
    </div>
  );
}

export default function AiNeedsSearchModal({
  isOpen,
  onClose,
  properties = [],
  initialQuery = '',
  initialResult = null,
  initialNeeds = null,
  onApply,
  onOpenProperty
}) {
  const [query, setQuery] = useState(initialQuery || '');
  const [step, setStep] = useState(initialResult ? 'result' : 'form');
  const [result, setResult] = useState(initialResult || null);
  const [needs, setNeeds] = useState(initialNeeds || initialResult?.needs || []);
  const [error, setError] = useState(null);
  const [status, setStatus] = useState(null);
  const [elapsed, setElapsed] = useState(0);
  const [showAllMatches, setShowAllMatches] = useState(false);

  const textareaRef = useRef(null);
  // Monotonic id for the in-flight analysis: cancelling, closing or submitting
  // again invalidates the old answer so a late response can never hijack the UI.
  const requestRef = useRef(0);

  const propertyById = useMemo(() => {
    const map = new Map();
    (properties || []).forEach((property) => {
      if (property?.id) map.set(property.id, property);
    });
    return map;
  }, [properties]);

  // Reset the panel whenever it is opened (or the seed changes).
  useEffect(() => {
    if (!isOpen) return;
    requestRef.current += 1;
    setQuery(initialQuery || '');
    setResult(initialResult || null);
    setNeeds(initialNeeds || initialResult?.needs || []);
    setStep(initialResult ? 'result' : 'form');
    setError(null);
    setElapsed(0);
    setShowAllMatches(false);
  }, [isOpen, initialQuery, initialResult, initialNeeds]);

  // Closing the sheet abandons any answer that is still on its way.
  useEffect(() => {
    if (isOpen) return undefined;
    requestRef.current += 1;
    return undefined;
  }, [isOpen]);

  // Ask the proxy whether a key is configured, so the panel can explain setup
  // before the student types a sentence that cannot be answered.
  useEffect(() => {
    if (!isOpen) return undefined;
    let cancelled = false;
    getAiStatus()
      .then((next) => {
        if (!cancelled) setStatus(next);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [isOpen]);

  // Lock background scrolling while the sheet is open.
  useEffect(() => {
    if (!isOpen) return undefined;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return undefined;
    const onKeyDown = (event) => {
      if (event.key === 'Escape') onClose?.();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!isOpen || step !== 'loading') return undefined;
    setElapsed(0);
    const timer = setInterval(() => setElapsed((value) => value + 1), 1000);
    return () => clearInterval(timer);
  }, [isOpen, step]);

  useEffect(() => {
    if (isOpen && step === 'form') {
      const timer = setTimeout(() => textareaRef.current?.focus(), 60);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [isOpen, step]);

  const analyze = useCallback(async () => {
    const text = query.trim();
    if (text.length < 3) return;

    const requestId = requestRef.current + 1;
    requestRef.current = requestId;

    setStep('loading');
    setError(null);
    setShowAllMatches(false);
    try {
      const next = await listStudentNeeds({ query: text, properties });
      if (requestRef.current !== requestId) return;
      setResult(next);
      setNeeds(next.needs);
      setStep('result');
    } catch (caught) {
      if (requestRef.current !== requestId) return;
      const failure = caught instanceof AiSearchError
        ? caught
        : new AiSearchError('unknown', caught?.message || 'Unknown AI error.');
      setError(failure);
      setStep('error');
    }
  }, [query, properties]);

  const cancelAnalysis = useCallback(() => {
    requestRef.current += 1;
    setStep('form');
    setError(null);
  }, []);

  const togglePriority = useCallback((needId) => {
    setNeeds((current) => current.map((need) => (
      need.id === needId
        ? { ...need, priority: need.priority === 'must' ? 'nice' : 'must' }
        : need
    )));
  }, []);

  const removeNeed = useCallback((needId) => {
    setNeeds((current) => current.filter((need) => need.id !== needId));
  }, []);

  const restoreNeeds = useCallback(() => {
    if (result?.needs) setNeeds(result.needs);
  }, [result]);

  const ranked = useMemo(
    () => (result ? rankMatches(result, needs.map((need) => need.id)) : []),
    [result, needs]
  );

  const meetingCounts = useMemo(() => {
    const counts = new Map();
    for (const match of result?.matches || []) {
      for (const needId of match.meets) counts.set(needId, (counts.get(needId) || 0) + 1);
    }
    return counts;
  }, [result]);

  const assessment = useMemo(
    () => assessNeeds(needs, result?.matches || []),
    [needs, result]
  );

  const mustNeeds = useMemo(() => needs.filter((need) => need.priority === 'must'), [needs]);
  const satisfiableMusts = useMemo(
    () => mustNeeds.filter((need) => (meetingCounts.get(need.id) || 0) > 0),
    [mustNeeds, meetingCounts]
  );
  const unmetMusts = useMemo(
    () => mustNeeds.filter((need) => (meetingCounts.get(need.id) || 0) === 0),
    [mustNeeds, meetingCounts]
  );
  const appliedMusts = useMemo(
    () => satisfiableMusts.filter((need) => Object.keys(need.filter || {}).length > 0),
    [satisfiableMusts]
  );
  const patch = useMemo(() => buildNeedPatch(satisfiableMusts), [satisfiableMusts]);

  const visibleMatches = showAllMatches ? ranked.slice(0, 12) : ranked.slice(0, 5);
  const anyFullMatch = ranked.some((match) => match.mustTotal > 0 && match.mustMet === match.mustTotal);
  const needsEdited = Boolean(result?.needs)
    && JSON.stringify(needs) !== JSON.stringify(result.needs);

  const handleApply = () => {
    if (!result) return;
    onApply?.({
      result,
      needs,
      patch,
      appliedIds: appliedMusts.map((need) => need.id),
      unmetIds: unmetMusts.map((need) => need.id)
    });
  };

  const handleOpenProperty = (propertyId) => {
    const property = propertyById.get(propertyId);
    if (!property) return;
    onClose?.();
    onOpenProperty?.(property);
  };

  if (!isOpen) return null;

  const configured = status ? status.configured : null;
  const loadingMessage = LOADING_MESSAGES[Math.min(LOADING_MESSAGES.length - 1, Math.floor(elapsed / 2.2))];

  return (
    <div
      className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center bg-slate-950/60 backdrop-blur-sm sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="ai-needs-title"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose?.();
      }}
    >
      <div className="w-full sm:max-w-2xl max-h-[94vh] sm:max-h-[90vh] bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden">

        {/* Header */}
        <div className="flex items-start justify-between gap-3 px-4 sm:px-5 py-3.5 bg-gradient-to-r from-[#0b1a30] via-[#172c4d] to-[#3b2a63] text-white shrink-0">
          <div className="flex items-start gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-2xl bg-white/10 border border-white/15 flex items-center justify-center shrink-0">
              <Sparkles className="w-4.5 h-4.5 text-amber-300" />
            </div>
            <div className="min-w-0">
              <h2 id="ai-needs-title" className="font-extrabold text-[15px] leading-tight">
                AI Needs Search
              </h2>
              <p className="text-[11px] text-white/70 leading-snug mt-0.5">
                Describe what you need — English, Tagalog, or Bisaya. The AI lists your needs, then matches pads.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer shrink-0"
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-4 sm:px-5 py-4 space-y-4">

          {step === 'form' && configured === false && <SetupInstructions status={status} />}

          {step === 'form' && configured !== false && (
            <form
              onSubmit={(event) => {
                event.preventDefault();
                analyze();
              }}
              className="space-y-3"
            >
              <div>
                <label htmlFor="ai-needs-input" className="text-[11px] font-black uppercase tracking-wider text-slate-500">
                  What do you need for your pad?
                </label>
                <textarea
                  id="ai-needs-input"
                  ref={textareaRef}
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  onKeyDown={(event) => {
                    if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
                      event.preventDefault();
                      analyze();
                    }
                  }}
                  rows={3}
                  maxLength={1200}
                  placeholder="e.g. Barato lang nga solo room duol sa gate, walay baha, naay study table ug kusog nga wifi. Budget ₱3,500."
                  className="mt-1.5 w-full rounded-2xl border border-slate-200 bg-slate-50/70 px-3.5 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:border-[#0b1a30] focus:ring-2 focus:ring-[#0b1a30]/15 resize-none"
                />
                <div className="flex items-center justify-between mt-1 px-0.5">
                  <p className="text-[11px] text-slate-400">
                    {query.length}/1200 · no keywords needed
                  </p>
                  {configured && (
                    <p className="text-[11px] text-emerald-700 font-semibold flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      Gemini ready
                    </p>
                  )}
                </div>
              </div>

              <div>
                <p className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1.5">
                  Try one of these
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {EXAMPLE_PROMPTS.map((example) => (
                    <button
                      key={example.label}
                      type="button"
                      onClick={() => {
                        setQuery(example.text);
                        textareaRef.current?.focus();
                      }}
                      className="px-2.5 py-1 rounded-xl text-[11px] font-semibold bg-slate-100 hover:bg-violet-50 text-slate-700 hover:text-violet-900 border border-slate-200 hover:border-violet-200 transition-colors cursor-pointer"
                    >
                      {example.label}
                    </button>
                  ))}
                </div>
              </div>

              <button
                type="submit"
                disabled={query.trim().length < 3 || configured === null}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-2xl bg-gradient-to-r from-violet-600 to-blue-700 hover:from-violet-700 hover:to-blue-800 disabled:from-slate-300 disabled:to-slate-400 disabled:cursor-not-allowed text-white text-sm font-extrabold shadow-sm transition-all cursor-pointer"
              >
                {configured === null ? <Loader2 className="w-4 h-4 animate-spin" /> : <ListChecks className="w-4 h-4" />}
                List my needs
              </button>

              <p className="text-[11px] text-slate-400 text-center leading-snug">
                Your sentence and the listing facts are sent to Google Gemini. No account details are included.
              </p>
            </form>
          )}

          {step === 'loading' && (
            <div className="py-10 text-center space-y-4">
              <div className="relative w-14 h-14 mx-auto">
                <div className="absolute inset-0 rounded-full bg-violet-100 animate-pulse" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <Loader2 className="w-6 h-6 text-violet-700 animate-spin" />
                </div>
              </div>
              <div>
                <p className="text-sm font-extrabold text-slate-800">{loadingMessage}</p>
                <p className="text-[11px] text-slate-400 mt-1">
                  {elapsed}s · usually 5–10 seconds
                </p>
              </div>
              <div className="max-w-sm mx-auto space-y-2 pt-2">
                {[0, 1, 2].map((row) => (
                  <div key={row} className="h-3 rounded-full bg-slate-100 animate-pulse" style={{ width: `${100 - row * 18}%` }} />
                ))}
              </div>
              <button
                type="button"
                onClick={cancelAnalysis}
                className="text-[11px] font-bold text-slate-500 hover:text-slate-800 underline underline-offset-2 cursor-pointer"
              >
                Cancel this search
              </button>
            </div>
          )}

          {step === 'error' && error && (
            <div className="space-y-3">
              <div className="rounded-2xl border border-rose-200 bg-rose-50/70 p-4">
                <div className="flex items-start gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-rose-100 border border-rose-200 flex items-center justify-center shrink-0">
                    <AlertTriangle className="w-4 h-4 text-rose-700" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-extrabold text-rose-950">{errorCopy(error.code).title}</p>
                    <p className="text-[12px] text-rose-900/80 mt-0.5">{errorCopy(error.code).body}</p>
                    {error.message && error.message !== errorCopy(error.code).body && (
                      <p className="text-[11px] text-rose-900/60 mt-1.5 font-mono break-words">{error.message}</p>
                    )}
                  </div>
                </div>
              </div>

              {error.code === 'not-configured' && <SetupInstructions status={status} />}

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={cancelAnalysis}
                  className="flex-1 px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition-colors cursor-pointer"
                >
                  Edit my message
                </button>
                <button
                  type="button"
                  onClick={analyze}
                  className="flex-1 px-4 py-2.5 rounded-xl bg-[#0b1a30] hover:bg-[#172c4d] text-white text-xs font-bold transition-colors cursor-pointer"
                >
                  Try again
                </button>
              </div>
            </div>
          )}

          {step === 'result' && result && (
            <>
              {/* Summary */}
              <div className="rounded-2xl border border-violet-200 bg-gradient-to-br from-violet-50 via-white to-blue-50 p-3.5">
                <div className="flex items-start gap-2">
                  <Sparkles className="w-4 h-4 text-violet-700 shrink-0 mt-0.5" />
                  <div className="min-w-0">
                    <p className="text-[12px] text-slate-800 leading-snug font-medium">{result.summary}</p>
                    {result.followUp && (
                      <p className="text-[11px] text-violet-900/80 mt-1.5 flex items-start gap-1">
                        <Info className="w-3 h-3 shrink-0 mt-0.5" />
                        <span>{result.followUp}</span>
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2 pt-2 border-t border-violet-100 text-[10px] text-slate-500">
                  <span className="font-bold uppercase tracking-wider text-violet-800">
                    {needs.length} {needs.length === 1 ? 'need' : 'needs'} listed
                  </span>
                  <span>
                    AI read {result.evaluated} of {result.totalListings ?? result.catalogSize} listings
                  </span>
                  {result.model && <span className="font-mono">{result.model}</span>}
                  {result.cached && <span className="text-slate-400">cached answer</span>}
                </div>
              </div>

              {/* The needs list */}
              <section>
                <div className="flex items-center justify-between mb-1.5">
                  <p className="text-[10px] font-black uppercase tracking-wider text-slate-500 flex items-center gap-1">
                    <ListChecks className="w-3 h-3" />
                    Your needs
                  </p>
                  {needsEdited && (
                    <button
                      type="button"
                      onClick={restoreNeeds}
                      className="text-[10px] font-bold text-slate-500 hover:text-slate-800 flex items-center gap-1 cursor-pointer"
                    >
                      <RotateCcw className="w-2.5 h-2.5" />
                      Reset list
                    </button>
                  )}
                </div>

                <ul className="rounded-2xl border border-slate-200 divide-y divide-slate-100 overflow-hidden">
                  {needs.map((need, index) => {
                    const Icon = KIND_ICONS[need.kind] || Sparkles;
                    const matching = meetingCounts.get(need.id) || 0;
                    const unknownOnly = matching === 0 && assessment.unproven.has(need.id);
                    const labels = filterLabels(need.filter);

                    return (
                      <li key={need.id} className="flex items-start gap-2.5 px-3 py-2.5 bg-white hover:bg-slate-50/60">
                        <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-600 text-[10px] font-black flex items-center justify-center shrink-0 mt-0.5">
                          {index + 1}
                        </span>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-start gap-1.5">
                            <Icon className="w-3.5 h-3.5 text-slate-500 shrink-0 mt-0.5" />
                            <p className="text-xs font-bold text-slate-900 leading-snug">{need.label}</p>
                          </div>

                          {need.detail && (
                            <p className="text-[11px] text-slate-500 italic mt-0.5 leading-snug">“{need.detail}”</p>
                          )}

                          <div className="flex flex-wrap items-center gap-1 mt-1.5">
                            <button
                              type="button"
                              onClick={() => togglePriority(need.id)}
                              title={need.priority === 'must' ? 'Click to treat as nice-to-have' : 'Click to make this a must-have'}
                              className={`px-1.5 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wide border transition-colors cursor-pointer ${
                                need.priority === 'must'
                                  ? 'bg-[#0b1a30] text-white border-[#0b1a30]'
                                  : 'bg-white text-slate-600 border-slate-300 hover:border-slate-400'
                              }`}
                            >
                              {need.priority === 'must' ? 'Must' : 'Nice'}
                            </button>

                            {labels.map((label) => (
                              <span
                                key={label}
                                className="px-1.5 py-0.5 rounded-md text-[10px] font-semibold bg-slate-100 text-slate-600 border border-slate-200"
                              >
                                {label}
                              </span>
                            ))}

                            {matching > 0 ? (
                              <span className="px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                                {matching} {matching === 1 ? 'pad proves it' : 'pads prove it'}
                              </span>
                            ) : unknownOnly ? (
                              <span className="px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                                not audited yet
                              </span>
                            ) : (
                              <span className="px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-rose-50 text-rose-800 border border-rose-200">
                                no pad in Butuan yet
                              </span>
                            )}
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => removeNeed(need.id)}
                          title="Remove this need"
                          className="w-6 h-6 rounded-lg text-slate-300 hover:text-rose-600 hover:bg-rose-50 flex items-center justify-center transition-colors cursor-pointer shrink-0"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </li>
                    );
                  })}
                  {needs.length === 0 && (
                    <li className="px-3 py-6 text-center text-xs text-slate-500">
                      Every need was removed. Reset the list or search again.
                    </li>
                  )}
                </ul>

                <p className="text-[11px] text-slate-400 mt-1.5 leading-snug">
                  Only <span className="font-bold text-slate-600">must</span> needs filter the Explore feed;
                  nice-to-haves still improve the ranking. Tap the badge to switch.
                </p>
              </section>

              {unmetMusts.length > 0 && (
                <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-2.5 flex items-start gap-2">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-700 shrink-0 mt-0.5" />
                  <p className="text-[11px] text-amber-950 leading-snug">
                    <span className="font-bold">No pad proves:</span>{' '}
                    {unmetMusts.map((need) => need.label).join(', ')}.{' '}
                    We keep it on your list but will not filter the feed on it, so the results are not empty.
                  </p>
                </div>
              )}

              {/* Matches */}
              <section>
                <div className="flex items-center justify-between mb-1.5">
                  <p className="text-[10px] font-black uppercase tracking-wider text-slate-500 flex items-center gap-1">
                    <Search className="w-3 h-3" />
                    {anyFullMatch ? 'Pads that fit your needs' : 'Closest pads so far'}
                  </p>
                  <span className="text-[10px] text-slate-400 font-bold">
                    {ranked.length} evaluated
                  </span>
                </div>

                {ranked.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-slate-200 py-8 text-center">
                    <Building2 className="w-6 h-6 text-slate-300 mx-auto mb-1.5" />
                    <p className="text-xs font-bold text-slate-600">No listing could be evaluated</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">Try a shorter message or a different budget.</p>
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    {visibleMatches.map((match) => {
                      const property = propertyById.get(match.id);
                      if (!property) return null;
                      const fullMatch = match.mustTotal > 0 && match.mustMet === match.mustTotal;
                      const missingMustLabels = match.missing
                        .map((needId) => needs.find((need) => need.id === needId))
                        .filter((need) => need?.priority === 'must')
                        .map((need) => need.label);
                      const unknownMustLabels = match.unsure
                        .map((needId) => needs.find((need) => need.id === needId))
                        .filter((need) => need?.priority === 'must')
                        .map((need) => need.label);

                      return (
                        <button
                          key={match.id}
                          type="button"
                          onClick={() => handleOpenProperty(match.id)}
                          className="w-full flex items-start gap-2.5 p-2.5 rounded-2xl border border-slate-200 hover:border-blue-300 hover:bg-blue-50/30 transition-colors text-left cursor-pointer"
                        >
                          {property.coverImage ? (
                            <img
                              src={property.coverImage}
                              alt=""
                              className="w-12 h-12 rounded-xl object-cover shrink-0 border border-slate-200"
                            />
                          ) : (
                            <div className="w-12 h-12 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center shrink-0">
                              <Building2 className="w-5 h-5 text-slate-400" />
                            </div>
                          )}

                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                              <p className="text-xs font-extrabold text-[#0b1a30] truncate">{property.name}</p>
                              <span className="text-[11px] font-black text-[#0b1a30] shrink-0">
                                ₱{Number(property.price || 0).toLocaleString()}/mo
                              </span>
                            </div>

                            <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[10px] text-slate-500 mt-0.5">
                              <span className="flex items-center gap-0.5">
                                <MapPin className="w-2.5 h-2.5" />
                                {property.zone || property.area || 'Butuan'}
                              </span>
                              {property.roomType && <span>{property.roomType}</span>}
                              {property.gateProximities?.mainSFGate?.walkingMinutes ? (
                                <span>{property.gateProximities.mainSFGate.walkingMinutes} min walk</span>
                              ) : null}
                            </div>

                            {match.reason && (
                              <p className="text-[11px] text-slate-600 mt-1 leading-snug">{match.reason}</p>
                            )}

                            <div className="flex flex-wrap items-center gap-1 mt-1.5">
                              <span
                                className={`px-1.5 py-0.5 rounded-md text-[10px] font-bold border ${
                                  fullMatch
                                    ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                    : 'bg-slate-50 text-slate-600 border-slate-200'
                                }`}
                              >
                                {match.mustTotal > 0
                                  ? `${match.mustMet}/${match.mustTotal} must-haves`
                                  : 'ranked'}
                              </span>

                              {unknownMustLabels.length > 0 && (
                                <span
                                  title={unknownMustLabels.join(', ')}
                                  className="px-1.5 py-0.5 rounded-md text-[10px] font-semibold bg-amber-50 text-amber-800 border border-amber-200"
                                >
                                  {unknownMustLabels.length} not audited
                                </span>
                              )}

                              {missingMustLabels.length > 0 && (
                                <span
                                  title={missingMustLabels.join(', ')}
                                  className="px-1.5 py-0.5 rounded-md text-[10px] font-semibold bg-rose-50 text-rose-800 border border-rose-200"
                                >
                                  missing {missingMustLabels.length}
                                </span>
                              )}
                            </div>
                          </div>

                          <ChevronRight className="w-4 h-4 text-slate-300 shrink-0 mt-1" />
                        </button>
                      );
                    })}

                    {!showAllMatches && ranked.length > visibleMatches.length && (
                      <button
                        type="button"
                        onClick={() => setShowAllMatches(true)}
                        className="w-full py-2 rounded-xl border border-slate-200 text-[11px] font-bold text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer"
                      >
                        Show {Math.min(ranked.length, 12) - visibleMatches.length} more pads
                      </button>
                    )}
                  </div>
                )}
              </section>
            </>
          )}
        </div>

        {/* Footer */}
        {step === 'result' && result && (
          <div className="shrink-0 border-t border-slate-200 bg-slate-50/80 px-4 sm:px-5 py-3 space-y-2">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setStep('form')}
                className="px-3.5 py-2.5 rounded-xl bg-white border border-slate-200 hover:border-slate-300 text-slate-700 text-xs font-bold transition-colors cursor-pointer shrink-0"
              >
                Edit message
              </button>
              <button
                type="button"
                onClick={handleApply}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-blue-700 hover:from-violet-700 hover:to-blue-800 text-white text-xs font-extrabold shadow-sm transition-all cursor-pointer"
              >
                {appliedMusts.length > 0
                  ? `Apply ${appliedMusts.length} ${appliedMusts.length === 1 ? 'need' : 'needs'} to Explore`
                  : 'Open Explore'}
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
            <p className="text-[10px] text-slate-400 text-center leading-snug">
              AI can misread a listing. Green checklist facts come from the FSUU on-site audit — confirm anything
              marked “not audited” with the landlord before paying.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
