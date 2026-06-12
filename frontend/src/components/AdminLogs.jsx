import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { ArrowLeft, RefreshCw, Terminal, AlertTriangle, ShieldCheck } from 'lucide-react';

export default function AdminLogs({ token, onBack }) {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchLogs = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await axios.get('/api/logs', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setLogs(response.data);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to fetch logs.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const formatTime = (isoString) => {
    const d = new Date(isoString);
    return d.toLocaleString();
  };

  const getLevelStyle = (level) => {
    switch (level.toUpperCase()) {
      case 'ERROR':
        return 'text-tokyo-red bg-tokyo-red/10 border-tokyo-red/20';
      case 'WARNING':
        return 'text-tokyo-orange bg-tokyo-orange/10 border-tokyo-orange/20';
      default:
        return 'text-tokyo-green bg-tokyo-green/10 border-tokyo-green/20';
    }
  };

  return (
    <div className="w-full max-w-6xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div className="flex items-center gap-3">
          <button 
            onClick={onBack}
            className="p-2 rounded-xl bg-white/5 border border-white/5 text-tokyo-text hover:bg-white/10 transition-colors"
            title="Back to Dashboard"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-tokyo-text flex items-center gap-2">
              <Terminal className="w-6 h-6 text-tokyo-purple" />
              Admin System Logs
            </h1>
            <p className="text-sm text-tokyo-muted mt-0.5">
              Review live audit logs, authentications, failures, and completions.
            </p>
          </div>
        </div>

        <button 
          onClick={fetchLogs}
          disabled={loading}
          className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-tokyo-purple/20 hover:bg-tokyo-purple/30 border border-tokyo-purple/30 text-tokyo-purple font-semibold transition-all disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh Logs
        </button>
      </div>

      {error && (
        <div className="p-4 mb-6 rounded-xl bg-tokyo-red/10 border border-tokyo-red/20 text-tokyo-red flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Logs Table Card */}
      <div className="rounded-2xl border border-white/5 bg-tokyo-card/50 backdrop-blur-md overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          {loading && logs.length === 0 ? (
            <div className="py-20 text-center text-tokyo-muted flex flex-col items-center justify-center gap-3">
              <RefreshCw className="w-8 h-8 text-tokyo-purple animate-spin" />
              <p>Loading system logs...</p>
            </div>
          ) : logs.length === 0 ? (
            <div className="py-20 text-center text-tokyo-muted">
              No logs found in database.
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-white/5 bg-white/5 text-tokyo-secondary text-xs uppercase font-semibold tracking-wider">
                  <th className="py-4 px-6">Timestamp</th>
                  <th className="py-4 px-6 w-28">Level</th>
                  <th className="py-4 px-6">Message</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-sm">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-white/5 transition-colors">
                    <td className="py-4 px-6 text-tokyo-muted whitespace-nowrap font-mono">
                      {formatTime(log.timestamp)}
                    </td>
                    <td className="py-4 px-6">
                      <span className={`inline-block px-2 py-0.5 rounded text-xs font-bold font-mono border ${getLevelStyle(log.level)}`}>
                        {log.level}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-tokyo-text font-mono break-all md:break-normal">
                      {log.message}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
