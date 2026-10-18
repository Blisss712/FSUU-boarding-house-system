import React, { useState, useEffect } from 'react';
import { X, Play, Pause, RotateCcw, Video, Compass, ShieldCheck, Sun, CheckCircle } from 'lucide-react';

export default function WalkPovModal({ property, onClose }) {
  if (!property) return null;

  const [isPlaying, setIsPlaying] = useState(true);
  const [seconds, setSeconds] = useState(0);
  const [playbackSpeed, setPlaybackSpeed] = useState(2); // 2x default for sped-up walk

  useEffect(() => {
    let interval = null;
    if (isPlaying) {
      interval = setInterval(() => {
        setSeconds((prev) => {
          if (prev >= 60) {
            setIsPlaying(false);
            return 60;
          }
          return prev + 1;
        });
      }, 1000 / playbackSpeed);
    }
    return () => clearInterval(interval);
  }, [isPlaying, playbackSpeed]);

  const currentStep = property.povRoute.steps.slice().reverse().find(step => {
    const [min, sec] = step.time.split(':').map(Number);
    const targetSeconds = min * 60 + sec;
    return seconds >= targetSeconds;
  }) || property.povRoute.steps[0];

  const progressPercent = (seconds / 60) * 100;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-slate-900 text-white rounded-3xl max-w-sm w-full overflow-hidden shadow-2xl border border-slate-700 relative animate-in fade-in zoom-in-95 duration-200">
        {/* Top Control Bar */}
        <div className="absolute top-3 left-3 right-3 z-30 flex items-center justify-between">
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/60 backdrop-blur-md text-xs font-bold text-white border border-white/20">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-ping"></span>
            <span>60s Walk POV</span>
            <span className="text-slate-400 font-mono text-[11px]">0:{seconds < 10 ? `0${seconds}` : seconds} / 1:00</span>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-black/60 hover:bg-black/90 text-white flex items-center justify-center backdrop-blur-md transition-colors border border-white/20"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Video Simulation Canvas / Viewport */}
        <div className="relative aspect-[9/14] bg-slate-950 flex flex-col justify-between overflow-hidden">
          {/* Simulated Street Scene Background */}
          <div 
            className="absolute inset-0 bg-cover bg-center transition-all duration-700 filter brightness-90"
            style={{
              backgroundImage: `url(${property.images[0]})`,
              transform: `scale(${1 + (seconds / 120)}) translateY(-${(seconds / 60) * 12}px)`
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/20 to-black/60" />

          {/* Compass & Distance HUD */}
          <div className="relative z-20 pt-16 px-4">
            <div className="p-3 rounded-2xl bg-black/60 backdrop-blur-md border border-white/10 space-y-1">
              <div className="flex items-center justify-between text-xs font-bold text-amber-400">
                <span className="flex items-center gap-1">
                  <Compass className="w-3.5 h-3.5" />
                  Heading towards FSUU San Francisco Gate
                </span>
                <span>{Math.max(0, 260 - Math.round((seconds / 60) * 260))}m left</span>
              </div>
              <p className="text-[11px] text-slate-300">
                Route: Guingona Subd. Ave → JP Rizal → SF University Gate
              </p>
            </div>
          </div>

          {/* Center Checkpoint Waypoint Notification */}
          <div className="relative z-20 px-4 my-auto">
            <div className="p-4 rounded-2xl bg-black/80 backdrop-blur-lg border border-amber-500/40 shadow-xl space-y-1 transform transition-all">
              <div className="flex items-center gap-2 text-xs font-extrabold text-amber-300">
                <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>WAYPOINT: {currentStep.title}</span>
              </div>
              <p className="text-xs text-white leading-snug">
                {currentStep.note}
              </p>
            </div>
          </div>

          {/* Bottom HUD: Progress Bar & Safety Stats */}
          <div className="relative z-20 p-4 space-y-3 bg-gradient-to-t from-slate-950 to-transparent">
            {/* Timeline Bar */}
            <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden cursor-pointer" onClick={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              const clickX = e.clientX - rect.left;
              const ratio = clickX / rect.width;
              setSeconds(Math.round(ratio * 60));
            }}>
              <div 
                className="bg-amber-400 h-full transition-all duration-150"
                style={{ width: `${progressPercent}%` }}
              />
            </div>

            {/* Quick Safety Badges */}
            <div className="grid grid-cols-3 gap-1.5 text-center text-[10px] font-bold">
              <div className="p-1.5 rounded-lg bg-white/10 backdrop-blur-md">
                <p className="text-emerald-400">100% Paved</p>
                <p className="text-slate-400 font-normal">Dry Footpath</p>
              </div>
              <div className="p-1.5 rounded-lg bg-white/10 backdrop-blur-md">
                <p className="text-amber-400">Well-Lit</p>
                <p className="text-slate-400 font-normal">Subd. Lamps</p>
              </div>
              <div className="p-1.5 rounded-lg bg-white/10 backdrop-blur-md">
                <p className="text-blue-400">Safe Zone</p>
                <p className="text-slate-400 font-normal">CCTV Patrolled</p>
              </div>
            </div>

            {/* Playback Controls */}
            <div className="flex items-center justify-between pt-1">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsPlaying(!isPlaying)}
                  className="w-9 h-9 rounded-full bg-amber-500 hover:bg-amber-400 text-slate-950 flex items-center justify-center font-bold transition-all shadow-md"
                >
                  {isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current ml-0.5" />}
                </button>
                <button
                  onClick={() => { setSeconds(0); setIsPlaying(true); }}
                  className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors"
                  title="Replay from start"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Speed Buttons */}
              <div className="flex items-center gap-1 bg-white/10 p-1 rounded-xl">
                {[1, 2, 4].map((spd) => (
                  <button
                    key={spd}
                    onClick={() => setPlaybackSpeed(spd)}
                    className={`px-2 py-1 rounded-lg text-xs font-bold transition-all ${
                      playbackSpeed === spd ? 'bg-amber-500 text-slate-950' : 'text-slate-300 hover:text-white'
                    }`}
                  >
                    {spd}x
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
