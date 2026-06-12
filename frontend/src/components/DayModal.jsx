import React from 'react';
import { X, Flame, Dumbbell, Droplets, BookOpen, Camera, CheckSquare, Square, Wine } from 'lucide-react';

export default function DayModal({ isOpen, onClose, day, onToggleRule }) {
  if (!isOpen || !day) return null;

  const rules = [
    {
      key: 'diet',
      title: 'Follow a strict diet',
      desc: 'Clean eating according to your goals. Absolutely NO cheat meals and NO alcohol.',
      icon: <Wine className="w-6 h-6 text-tokyo-orange" />
    },
    {
      key: 'workout_1',
      title: 'Workout #1 (45 Mins)',
      desc: 'First 45-minute physical workout. Must have a significant gap between workouts.',
      icon: <Dumbbell className="w-6 h-6 text-tokyo-blue" />
    },
    {
      key: 'workout_2_outdoor',
      title: 'Workout #2 (45 Mins Outdoor)',
      desc: 'Second 45-minute physical workout. MUST be completed outdoors, regardless of weather.',
      icon: <Flame className="w-6 h-6 text-tokyo-purple" />
    },
    {
      key: 'water',
      title: 'Drink 1 Gallon of Water',
      desc: 'Consume 1 full gallon (approx. 3.78 liters) of plain, unflavored water.',
      icon: <Droplets className="w-6 h-6 text-tokyo-cyan" />
    },
    {
      key: 'reading',
      title: 'Read 10 Pages',
      desc: 'Read 10 pages of a non-fiction self-improvement or educational book. Audiobooks do not count.',
      icon: <BookOpen className="w-6 h-6 text-tokyo-blue" />
    },
    {
      key: 'picture',
      title: 'Take a Progress Picture',
      desc: 'Take a daily full-body progress picture to track your visual transformation.',
      icon: <Camera className="w-6 h-6 text-tokyo-purple" />
    }
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div 
        className="w-full max-w-lg overflow-hidden transition-all duration-300 rounded-2xl glass-modal shadow-2xl animate-in fade-in zoom-in-95"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/5 bg-tokyo-card/30">
          <div>
            <h3 className="text-xl font-bold text-tokyo-text flex items-center gap-2">
              Day {day.day_number} Checklist
            </h3>
            <p className="text-sm text-tokyo-muted mt-0.5">
              {new Date(day.date).toLocaleDateString(undefined, { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}
            </p>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 rounded-lg bg-white/5 text-tokyo-muted hover:text-tokyo-text hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content - Rules List */}
        <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
          {rules.map((rule) => {
            const isChecked = day[rule.key];
            return (
              <div 
                key={rule.key}
                onClick={() => onToggleRule(rule.key)}
                className={`flex items-start gap-4 p-4 rounded-xl cursor-pointer border transition-all duration-200 ${
                  isChecked 
                    ? 'bg-tokyo-green/5 border-tokyo-green/20 hover:border-tokyo-green/45' 
                    : 'bg-white/5 border-white/5 hover:bg-white/10 hover:border-white/10'
                }`}
              >
                <div className="mt-1 p-2 rounded-lg bg-tokyo-bg/50 border border-white/5">
                  {rule.icon}
                </div>
                
                <div className="flex-1 min-w-0">
                  <h4 className={`font-semibold text-sm md:text-base leading-tight transition-colors ${isChecked ? 'text-tokyo-green' : 'text-tokyo-text'}`}>
                    {rule.title}
                  </h4>
                  <p className="text-xs text-tokyo-muted mt-1 leading-relaxed">
                    {rule.desc}
                  </p>
                </div>

                <div className="mt-0.5 flex-shrink-0">
                  {isChecked ? (
                    <CheckSquare className="w-6 h-6 text-tokyo-green fill-tokyo-green/10" />
                  ) : (
                    <Square className="w-6 h-6 text-tokyo-muted hover:text-tokyo-text transition-colors" />
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Modal Footer */}
        <div className="p-6 border-t border-white/5 bg-tokyo-card/30 flex items-center justify-between text-xs text-tokyo-muted">
          <div className="flex items-center gap-1.5">
            <div className={`w-2.5 h-2.5 rounded-full ${day.is_completed ? 'bg-tokyo-green animate-pulse' : 'bg-tokyo-orange'}`} />
            <span>
              {day.is_completed ? 'All rules completed!' : 'Complete all rules to finish the day.'}
            </span>
          </div>
          <button 
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-tokyo-blue hover:bg-tokyo-blue/90 text-tokyo-bg font-semibold transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
