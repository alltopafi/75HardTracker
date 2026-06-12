import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Flame, RefreshCw, LogOut, CheckCircle, ShieldAlert, Play, Sparkles, Terminal } from 'lucide-react';
import DayModal from './DayModal';

export default function Dashboard({ user, token, onLogout, onOpenLogs }) {
  const [challenge, setChallenge] = useState(null);
  const [currentExpectedDay, setCurrentExpectedDay] = useState(null);
  const [stats, setStats] = useState({ completions: 0, failed_attempts: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedDay, setSelectedDay] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);

  // Helper to format local date as YYYY-MM-DD
  const getLocalDateString = () => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const date = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${date}`;
  };

  const fetchCurrentState = async () => {
    setLoading(true);
    setError('');
    try {
      const clientDate = getLocalDateString();
      const response = await axios.get(`/api/challenges/current?client_date=${clientDate}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setChallenge(response.data.challenge);
      setCurrentExpectedDay(response.data.current_expected_day);
      setStats(response.data.user_stats);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to fetch dashboard data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCurrentState();
  }, []);

  const handleStartChallenge = async () => {
    setLoading(true);
    setError('');
    try {
      const clientDate = getLocalDateString();
      const response = await axios.post(`/api/challenges/start?client_date=${clientDate}`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchCurrentState();
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to start challenge.');
      setLoading(false);
    }
  };

  const handleToggleRule = async (ruleKey) => {
    if (!selectedDay) return;
    
    // Optimistic UI updates
    const updatedDay = {
      ...selectedDay,
      [ruleKey]: !selectedDay[ruleKey]
    };
    
    // Recalculate is_completed locally
    updatedDay.is_completed = (
      updatedDay.diet &&
      updatedDay.workout_1 &&
      updatedDay.workout_2_outdoor &&
      updatedDay.water &&
      updatedDay.reading &&
      updatedDay.picture
    );

    // Update in selectedDay state immediately
    setSelectedDay(updatedDay);

    // Also update in the days list in challenge state optimistically
    if (challenge && challenge.days) {
      setChallenge({
        ...challenge,
        days: challenge.days.map(d => d.id === selectedDay.id ? updatedDay : d)
      });
    }

    try {
      const clientDate = getLocalDateString();
      const response = await axios.put(
        `/api/challenges/days/${selectedDay.id}?client_date=${clientDate}`,
        {
          diet: updatedDay.diet,
          workout_1: updatedDay.workout_1,
          workout_2_outdoor: updatedDay.workout_2_outdoor,
          water: updatedDay.water,
          reading: updatedDay.reading,
          picture: updatedDay.picture
        },
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      
      // Update with server actual response
      setSelectedDay(response.data);
      if (challenge && challenge.days) {
        setChallenge({
          ...challenge,
          days: challenge.days.map(d => d.id === selectedDay.id ? response.data : d)
        });
      }
    } catch (err) {
      // Revert optimistic updates on error
      setError(err.response?.data?.detail || 'Failed to update checkbox.');
      fetchCurrentState();
    }
  };

  const handleDayClick = (day) => {
    // Users can only interact with the current active day
    if (day.day_number !== currentExpectedDay || challenge.status !== 'active') {
      return;
    }
    setSelectedDay(day);
    setModalOpen(true);
  };

  // Determine styling for each day circle
  const getDayCircleClasses = (day) => {
    const isCurrent = day.day_number === currentExpectedDay && challenge?.status === 'active';
    const isFuture = day.day_number > currentExpectedDay && challenge?.status === 'active';
    const isPast = day.day_number < currentExpectedDay;

    let base = "relative flex items-center justify-center w-12 h-12 rounded-full text-sm font-bold border transition-all duration-300 ";

    if (day.is_completed) {
      base += "bg-tokyo-green/20 text-tokyo-green border-tokyo-green glow-success hover:bg-tokyo-green/30 cursor-default";
    } else if (isCurrent) {
      base += "bg-tokyo-blue/20 text-tokyo-blue border-tokyo-blue border-2 animate-active-pulse glow-active cursor-pointer hover:scale-105";
    } else if (isFuture) {
      base += "bg-white/5 border-white/5 text-tokyo-muted opacity-40 cursor-not-allowed";
    } else if (isPast && challenge?.status === 'active') {
      // In theory, if a past day is incomplete, the dashboard load fails the challenge.
      // But if somehow it's active, display as failed/uncompleted
      base += "bg-tokyo-red/20 text-tokyo-red border-tokyo-red cursor-not-allowed";
    } else {
      // If the challenge failed or completed, render remaining day elements as gray/locked
      base += "bg-white/5 border-white/5 text-tokyo-muted/50 cursor-not-allowed";
    }

    return base;
  };

  // Status computation for Dashboard Header
  const getStreakCount = () => {
    if (!challenge || challenge.status !== 'active') return 0;
    
    // Count days completed up to current expected day
    // A streak continues as long as they are on the challenge
    // We can just show completed days, or the current expected day number (e.g. Day 5)
    return currentExpectedDay - 1 + (challenge.days[currentExpectedDay - 1]?.is_completed ? 1 : 0);
  };

  if (loading && !challenge) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[80vh] text-tokyo-muted gap-3">
        <RefreshCw className="w-10 h-10 text-tokyo-blue animate-spin" />
        <p className="font-semibold text-lg">Loading challenge stats...</p>
      </div>
    );
  }

  const isChallengeActive = challenge && challenge.status === 'active';
  const isChallengeFailed = challenge && challenge.status === 'failed';
  const isChallengeCompleted = challenge && challenge.status === 'completed';

  return (
    <div className="w-full max-w-5xl mx-auto px-4 py-8 relative">
      {/* Background gradients for aesthetic depth */}
      <div className="absolute top-10 left-10 w-96 h-96 bg-glow-purple -z-10 pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-96 h-96 bg-glow-blue -z-10 pointer-events-none" />

      {/* Navbar / Header */}
      <div className="flex items-center justify-between mb-10 pb-6 border-b border-white/5">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-gradient-to-tr from-tokyo-purple to-tokyo-blue text-tokyo-bg shadow-lg">
            <Flame className="w-8 h-8 fill-tokyo-bg" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-black tracking-tight text-white">75 HARD <span className="text-tokyo-blue font-light">TRACKER</span></h1>
            <p className="text-xs text-tokyo-muted">Welcome back, <span className="text-tokyo-purple font-medium">{user.name || user.username}</span></p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {user.username === 'admin' && (
            <button 
              onClick={onOpenLogs}
              className="flex items-center gap-1.5 px-3 py-1.5 md:px-4 md:py-2 rounded-xl bg-tokyo-purple/10 hover:bg-tokyo-purple/20 border border-tokyo-purple/20 text-tokyo-purple text-sm font-semibold transition-all"
            >
              <Terminal className="w-4 h-4" />
              <span className="hidden md:inline">Admin Logs</span>
            </button>
          )}
          <button 
            onClick={onLogout}
            className="flex items-center gap-1.5 px-3 py-1.5 md:px-4 md:py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 text-tokyo-red text-sm font-semibold transition-all"
          >
            <LogOut className="w-4 h-4" />
            <span className="hidden md:inline">Logout</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 mb-6 rounded-xl bg-tokyo-red/10 border border-tokyo-red/20 text-tokyo-red flex items-center justify-between">
          <p className="text-sm font-medium">{error}</p>
          <button onClick={() => setError('')} className="text-xs underline hover:text-white">Dismiss</button>
        </div>
      )}

      {/* Metrics Row */}
      <div className="grid grid-cols-3 gap-3 md:gap-6 mb-8">
        <div className="flex flex-col items-center justify-center p-4 md:p-6 rounded-2xl border border-white/5 bg-tokyo-card/45 backdrop-blur-md">
          <span className="text-2xl md:text-4xl font-extrabold text-tokyo-blue">
            {getStreakCount()}
          </span>
          <span className="text-xxs md:text-xs text-tokyo-muted uppercase tracking-wider mt-1.5 text-center font-medium">
            Completed Streak
          </span>
        </div>
        <div className="flex flex-col items-center justify-center p-4 md:p-6 rounded-2xl border border-white/5 bg-tokyo-card/45 backdrop-blur-md">
          <span className="text-2xl md:text-4xl font-extrabold text-tokyo-green">
            {stats.completions}
          </span>
          <span className="text-xxs md:text-xs text-tokyo-muted uppercase tracking-wider mt-1.5 text-center font-medium">
            Challenge Wins
          </span>
        </div>
        <div className="flex flex-col items-center justify-center p-4 md:p-6 rounded-2xl border border-white/5 bg-tokyo-card/45 backdrop-blur-md">
          <span className="text-2xl md:text-4xl font-extrabold text-tokyo-orange">
            {stats.failed_attempts}
          </span>
          <span className="text-xxs md:text-xs text-tokyo-muted uppercase tracking-wider mt-1.5 text-center font-medium">
            Failed Restarts
          </span>
        </div>
      </div>

      {/* Main Container */}
      <div className="space-y-8">
        {/* Banner/Status Message cards */}
        {!challenge && (
          <div className="p-8 rounded-2xl border border-tokyo-blue/20 bg-tokyo-blue/5 flex flex-col md:flex-row items-center justify-between gap-6">
            <div>
              <h2 className="text-xl md:text-2xl font-extrabold text-white flex items-center gap-2">
                <Sparkles className="w-6 h-6 text-tokyo-blue" />
                Start Your 75 Hard Journey
              </h2>
              <p className="text-sm text-tokyo-secondary mt-1.5 max-w-xl">
                Ready to develop unbreakable discipline? Starting a challenge anchors your timeline today. Failure to check off all rules daily triggers an automatic failure. No modifications, no cheats.
              </p>
            </div>
            <button 
              onClick={handleStartChallenge}
              className="flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-tokyo-blue text-tokyo-bg font-extrabold shadow-lg shadow-tokyo-blue/20 hover:scale-102 hover:shadow-tokyo-blue/35 transition-all text-base shrink-0 w-full md:w-auto"
            >
              <Play className="w-5 h-5 fill-tokyo-bg" />
              Start Day 1
            </button>
          </div>
        )}

        {isChallengeFailed && (
          <div className="p-8 rounded-2xl border border-tokyo-red/20 bg-tokyo-red/5 flex flex-col md:flex-row items-center justify-between gap-6">
            <div>
              <h2 className="text-xl md:text-2xl font-extrabold text-tokyo-red flex items-center gap-2">
                <ShieldAlert className="w-6 h-6 text-tokyo-red" />
                Challenge Failed
              </h2>
              <p className="text-sm text-tokyo-secondary mt-1.5 max-w-xl">
                A rule was missed or a previous day was not marked complete. The 75 Hard program permits zero errors. Do not be discouraged; start over from Day 1 to build ultimate consistency.
              </p>
            </div>
            <button 
              onClick={handleStartChallenge}
              className="flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-tokyo-red text-white border border-tokyo-red/35 hover:bg-tokyo-red/10 font-bold transition-all text-base shrink-0 w-full md:w-auto"
            >
              <RefreshCw className="w-5 h-5" />
              Restart Day 1
            </button>
          </div>
        )}

        {isChallengeCompleted && (
          <div className="p-8 rounded-2xl border border-tokyo-green/20 bg-tokyo-green/5 flex flex-col md:flex-row items-center justify-between gap-6">
            <div>
              <h2 className="text-xl md:text-2xl font-extrabold text-tokyo-green flex items-center gap-2">
                <CheckCircle className="w-6 h-6 text-tokyo-green" />
                Congratulations!
              </h2>
              <p className="text-sm text-tokyo-secondary mt-1.5 max-w-xl">
                You successfully completed Andy Frisella's 75 Hard! You have proven your commitment, mental toughness, and physical consistency. Ready to go again?
              </p>
            </div>
            <button 
              onClick={handleStartChallenge}
              className="flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-tokyo-green text-tokyo-bg font-extrabold shadow-lg shadow-tokyo-green/20 hover:scale-102 hover:shadow-tokyo-green/35 transition-all text-base shrink-0 w-full md:w-auto"
            >
              <Play className="w-5 h-5 fill-tokyo-bg" />
              Start New Challenge
            </button>
          </div>
        )}

        {isChallengeActive && (
          <div className="p-4 md:p-6 rounded-2xl border border-white/5 bg-tokyo-card/30 backdrop-blur-md flex flex-col md:flex-row items-center justify-between gap-4 text-center md:text-left">
            <div>
              <h3 className="font-bold text-white text-lg">
                Today is Day {currentExpectedDay} of 75
              </h3>
              <p className="text-xs text-tokyo-muted mt-0.5">
                Ensure all checklist items are ticked off before local midnight. Clicking the active day circle below opens today's rules checklist.
              </p>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-tokyo-blue/10 border border-tokyo-blue/20 text-tokyo-blue text-sm font-semibold">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-tokyo-blue opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-tokyo-blue"></span>
              </span>
              Active Challenge
            </div>
          </div>
        )}

        {/* 75-Day Grid Board */}
        {challenge && (
          <div className="p-6 md:p-8 rounded-3xl border border-white/5 bg-tokyo-card/25 backdrop-blur-md shadow-xl">
            <h3 className="text-lg font-bold text-tokyo-secondary mb-6 flex items-center gap-2">
              <span>Your 75-Day Progress Board</span>
            </h3>
            
            <div className="grid grid-cols-5 sm:grid-cols-8 md:grid-cols-10 gap-3 justify-items-center">
              {challenge.days.map((day) => {
                const isCurrent = day.day_number === currentExpectedDay && challenge.status === 'active';
                return (
                  <button
                    key={day.id}
                    disabled={!isCurrent}
                    onClick={() => handleDayClick(day)}
                    className={getDayCircleClasses(day)}
                    title={`Day ${day.day_number} - Click to check rules`}
                  >
                    <span>{day.day_number}</span>
                    {day.is_completed && (
                      <span className="absolute -bottom-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-tokyo-green border border-tokyo-bg text-tokyo-bg text-[10px] font-black">
                        ✓
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Floating Day Checklist Modal */}
      {modalOpen && (
        <DayModal
          isOpen={modalOpen}
          day={selectedDay}
          onClose={() => {
            setModalOpen(false);
            setSelectedDay(null);
          }}
          onToggleRule={handleToggleRule}
        />
      )}
    </div>
  );
}
