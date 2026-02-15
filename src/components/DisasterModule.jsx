/**
 * DisasterModule.jsx - Main Disaster Intelligence Dashboard
 * Comprehensive disaster monitoring with unified risk index
 */

import React, { useState, useEffect } from 'react';
import { useDisasterData } from '../lib/disaster/useDisasterData';
import { useLearningMode } from '../lib/teaching/useLearningMode';
import DisasterCard, { 
  DisasterIndicator, 
  DisasterAlert, 
  EarthquakeItem 
} from './DisasterCard';

/**
 * Central Disaster Risk Index Display
 */
const DisasterRiskIndex = ({ data, onIndicatorClick }) => {
  if (!data) return null;

  const { score, level, primaryConcern, breakdown, highRiskCount } = data;

  // Animated ring
  const size = 140;
  const strokeWidth = 12;
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const progress = (score / 100) * circumference;

  return (
    <div className="relative bg-gradient-to-br from-black/50 to-black/30 backdrop-blur-xl rounded-2xl border border-white/10 p-6">
      {/* Glow effect for high risk */}
      {score >= 60 && (
        <div 
          className="absolute inset-0 rounded-2xl animate-pulse"
          style={{ 
            boxShadow: `0 0 40px ${level?.color}30, inset 0 0 40px ${level?.color}10` 
          }}
        />
      )}

      <div className="relative flex items-center gap-6">
        {/* Main gauge */}
        <div className="relative" style={{ width: size, height: size }}>
          <svg width={size} height={size} className="transform -rotate-90">
            {/* Background */}
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke="rgba(255,255,255,0.05)"
              strokeWidth={strokeWidth}
            />
            {/* Progress */}
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke={level?.color || '#22c55e'}
              strokeWidth={strokeWidth}
              strokeDasharray={circumference}
              strokeDashoffset={circumference - progress}
              strokeLinecap="round"
              className="transition-all duration-1000"
              style={{ filter: `drop-shadow(0 0 8px ${level?.color}60)` }}
            />
          </svg>
          
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span 
              className="text-3xl font-bold"
              style={{ color: level?.color }}
            >
              {score}
            </span>
            <span className="text-[10px] text-white/40 uppercase tracking-wider">
              Risk Index
            </span>
          </div>
        </div>

        {/* Info */}
        <div className="flex-1 space-y-3">
          <div>
            <h3 className="text-lg font-bold text-white/90">Disaster Risk Index</h3>
            <div className="flex items-center gap-2 mt-1">
              <span 
                className="px-2 py-0.5 rounded text-xs font-bold uppercase"
                style={{ 
                  backgroundColor: level?.bgColor,
                  color: level?.color 
                }}
              >
                {level?.label}
              </span>
              {highRiskCount > 0 && (
                <span className="text-xs text-red-400">
                  {highRiskCount} elevated risk{highRiskCount > 1 ? 's' : ''}
                </span>
              )}
            </div>
          </div>

          <div className="text-xs text-white/60">
            Primary Concern: <span className="text-white/80 font-medium">{primaryConcern}</span>
          </div>

          {/* Mini indicators */}
          <div className="flex gap-2 mt-2">
            {Object.entries(breakdown).map(([type, typeScore]) => (
              <DisasterIndicator
                key={type}
                type={type}
                score={typeScore}
                level={{
                  color: typeScore >= 60 ? '#ef4444' : typeScore >= 35 ? '#f59e0b' : '#22c55e'
                }}
                onClick={() => onIndicatorClick?.(type)}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

/**
 * Earthquake Feed Panel
 */
const EarthquakeFeed = ({ earthquakes, loading, risk }) => {
  const [sortBy, setSortBy] = useState('time');
  
  if (loading) {
    return (
      <div className="bg-black/40 backdrop-blur-lg rounded-xl border border-white/10 p-4">
        <div className="flex items-center gap-3 mb-4">
          <span className="text-2xl">🌍</span>
          <h3 className="text-sm font-semibold text-white/90">Earthquake Feed</h3>
        </div>
        <div className="animate-pulse space-y-2">
          {[1,2,3].map(i => (
            <div key={i} className="h-12 bg-white/5 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  const sorted = [...(earthquakes || [])].sort((a, b) => {
    if (sortBy === 'magnitude') return b.magnitude - a.magnitude;
    if (sortBy === 'distance') return a.distance - b.distance;
    return b.time - a.time;
  }).slice(0, 8);

  return (
    <div className="bg-black/40 backdrop-blur-lg rounded-xl border border-white/10 p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <span className="text-2xl">🌍</span>
          <div>
            <h3 className="text-sm font-semibold text-white/90">Earthquake Feed</h3>
            <p className="text-[10px] text-white/40">
              {earthquakes?.length || 0} events within 500km
            </p>
          </div>
        </div>

        {/* Sort controls */}
        <div className="flex gap-1">
          {['time', 'magnitude', 'distance'].map(opt => (
            <button
              key={opt}
              onClick={() => setSortBy(opt)}
              className={`px-2 py-1 text-[10px] rounded ${
                sortBy === opt 
                  ? 'bg-white/20 text-white' 
                  : 'bg-white/5 text-white/40 hover:text-white/60'
              }`}
            >
              {opt.charAt(0).toUpperCase() + opt.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Risk summary */}
      {risk && (
        <div 
          className="mb-3 p-2 rounded-lg text-xs"
          style={{ backgroundColor: `${risk.level?.color}15` }}
        >
          <span style={{ color: risk.level?.color }}>{risk.reasoning}</span>
        </div>
      )}

      {/* Earthquake list */}
      <div className="space-y-1.5 max-h-64 overflow-y-auto custom-scrollbar">
        {sorted.length === 0 ? (
          <div className="text-center py-4 text-xs text-white/40">
            No significant earthquakes recently
          </div>
        ) : (
          sorted.map((eq, i) => <EarthquakeItem key={eq.id || i} earthquake={eq} />)
        )}
      </div>
    </div>
  );
};

/**
 * Storm/Cyclone Monitor Panel
 */
const CycloneMonitor = ({ storms, alerts, risk, currentWeather }) => {
  return (
    <DisasterCard
      title="Storm & Cyclone Monitor"
      icon="🌀"
      riskData={risk}
      learnMoreType="cyclone"
    >
      {/* Active storms */}
      {storms && storms.length > 0 && (
        <div className="mt-3">
          <h4 className="text-xs font-semibold text-white/70 mb-2">Active Storms</h4>
          <div className="space-y-2">
            {storms.map((storm, i) => (
              <div 
                key={i}
                className="p-2 bg-black/20 rounded-lg flex items-center gap-3"
              >
                <span className="text-xl">
                  {storm.category >= 3 ? '🌪️' : storm.category >= 1 ? '🌀' : '⛈️'}
                </span>
                <div>
                  <p className="text-xs text-white/80">{storm.type}</p>
                  <p className="text-[10px] text-white/50">
                    {storm.windSpeed} km/h • Gusts {storm.windGusts} km/h
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Current conditions */}
      {currentWeather && (
        <div className="mt-3 grid grid-cols-3 gap-2">
          <div className="bg-black/20 rounded p-2 text-center">
            <p className="text-[10px] text-white/40">Wind</p>
            <p className="text-xs text-white/80">
              {currentWeather.wind_speed_10m?.toFixed(0) || '--'} km/h
            </p>
          </div>
          <div className="bg-black/20 rounded p-2 text-center">
            <p className="text-[10px] text-white/40">Gusts</p>
            <p className="text-xs text-white/80">
              {currentWeather.wind_gusts_10m?.toFixed(0) || '--'} km/h
            </p>
          </div>
          <div className="bg-black/20 rounded p-2 text-center">
            <p className="text-[10px] text-white/40">Precip</p>
            <p className="text-xs text-white/80">
              {currentWeather.precipitation?.toFixed(1) || '0'} mm
            </p>
          </div>
        </div>
      )}
    </DisasterCard>
  );
};

/**
 * Flood Risk Panel with precipitation chart
 */
const FloodRiskPanel = ({ risk, precipHistory }) => {
  // Mini precipitation chart
  const maxPrecip = Math.max(...(precipHistory?.precipitation || [1]), 1);

  return (
    <DisasterCard
      title="Flood Risk"
      icon="🌊"
      riskData={risk}
      learnMoreType="flood"
    >
      {/* Precipitation chart */}
      {precipHistory?.precipitation && (
        <div className="mt-3">
          <h4 className="text-xs font-semibold text-white/70 mb-2">7-Day Precipitation</h4>
          <div className="flex items-end gap-1 h-16 bg-black/20 rounded-lg p-2">
            {precipHistory.precipitation.map((p, i) => (
              <div key={i} className="flex-1 flex flex-col items-center">
                <div 
                  className="w-full bg-blue-500/60 rounded-t"
                  style={{ 
                    height: `${Math.max(2, (p / maxPrecip) * 100)}%`,
                    minHeight: '2px'
                  }}
                />
                <span className="text-[8px] text-white/30 mt-1">
                  {new Date(precipHistory.dates[i]).toLocaleDateString('en', { weekday: 'narrow' })}
                </span>
              </div>
            ))}
          </div>
          <div className="flex justify-between mt-1 text-[10px] text-white/40">
            <span>Total: {precipHistory.total7Day?.toFixed(0) || 0}mm</span>
            <span>3-Day: {precipHistory.total3Day?.toFixed(0) || 0}mm</span>
          </div>
        </div>
      )}
    </DisasterCard>
  );
};

/**
 * Wildfire Risk Panel
 */
const WildfireRiskPanel = ({ risk, weather }) => {
  return (
    <DisasterCard
      title="Wildfire Risk"
      icon="🔥"
      riskData={risk}
      learnMoreType="wildfire"
    >
      {/* Fire weather conditions */}
      {weather && (
        <div className="mt-3 grid grid-cols-2 gap-2">
          <div className="bg-black/20 rounded p-2">
            <p className="text-[10px] text-white/40">Temperature</p>
            <p className="text-sm text-white/80">
              {weather.temperature?.toFixed(1) || weather.temperature_2m?.toFixed(1) || '--'}°C
            </p>
          </div>
          <div className="bg-black/20 rounded p-2">
            <p className="text-[10px] text-white/40">Humidity</p>
            <p className="text-sm text-white/80">
              {weather.humidity || weather.relative_humidity_2m || '--'}%
            </p>
          </div>
        </div>
      )}
    </DisasterCard>
  );
};

/**
 * Main Disaster Module Component
 */
const DisasterModule = ({ location, climateData, onClose }) => {
  const {
    loading,
    error,
    lastUpdated,
    earthquakes,
    storms,
    alerts,
    precipHistory,
    floodRisk,
    wildfireRisk,
    earthquakeRisk,
    cycloneRisk,
    disasterRiskIndex,
    activeAlerts,
    refresh
  } = useDisasterData(location, climateData);

  const { isLearningMode } = useLearningMode();
  const [activePanel, setActivePanel] = useState(null);
  const [dismissedAlerts, setDismissedAlerts] = useState(new Set());

  // Filter active alerts
  const visibleAlerts = activeAlerts.filter(a => !dismissedAlerts.has(`${a.type}-${a.severity}`));

  const handleDismissAlert = (alert) => {
    setDismissedAlerts(prev => new Set([...prev, `${alert.type}-${alert.severity}`]));
  };

  // Get current weather from climate data or storm data
  const currentWeather = climateData?.current || storms?.currentWeather;

  if (error) {
    return (
      <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl">
        <div className="flex items-center gap-2 text-red-400">
          <span>⚠️</span>
          <span className="text-sm">{error}</span>
        </div>
        <button
          onClick={refresh}
          className="mt-2 px-3 py-1 text-xs bg-red-500/20 hover:bg-red-500/30 rounded transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-2xl">🛡️</span>
          <div>
            <h2 className="text-lg font-bold text-white/90">Disaster Intelligence</h2>
            <p className="text-xs text-white/50">
              Real-time hazard monitoring • {location?.latitude?.toFixed(2)}°, {location?.longitude?.toFixed(2)}°
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {lastUpdated && (
            <span className="text-[10px] text-white/30">
              Updated {lastUpdated.toLocaleTimeString()}
            </span>
          )}
          <button
            onClick={refresh}
            disabled={loading}
            className={`p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors ${
              loading ? 'animate-spin' : ''
            }`}
          >
            <svg className="w-4 h-4 text-white/60" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
          {onClose && (
            <button
              onClick={onClose}
              className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
            >
              <svg className="w-4 h-4 text-white/60" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Active alerts banner */}
      {visibleAlerts.length > 0 && (
        <div className="space-y-2">
          {visibleAlerts.slice(0, 3).map((alert, i) => (
            <DisasterAlert 
              key={i} 
              {...alert} 
              onDismiss={() => handleDismissAlert(alert)}
            />
          ))}
        </div>
      )}

      {/* Main Risk Index */}
      <DisasterRiskIndex 
        data={disasterRiskIndex} 
        onIndicatorClick={(type) => setActivePanel(type)}
      />

      {/* Learning mode tip */}
      {isLearningMode && (
        <div className="p-3 bg-indigo-500/10 border border-indigo-500/30 rounded-xl">
          <p className="text-xs text-indigo-300">
            💡 <strong>Learning Mode:</strong> Click "Learn more" on any panel to understand 
            how each disaster risk is calculated and what factors contribute to the scores.
          </p>
        </div>
      )}

      {/* Detail panels - 2x2 grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <EarthquakeFeed 
          earthquakes={earthquakes} 
          loading={loading}
          risk={earthquakeRisk}
        />
        
        <CycloneMonitor 
          storms={storms}
          alerts={alerts}
          risk={cycloneRisk}
          currentWeather={currentWeather}
        />
        
        <FloodRiskPanel 
          risk={floodRisk}
          precipHistory={precipHistory}
        />
        
        <WildfireRiskPanel 
          risk={wildfireRisk}
          weather={currentWeather}
        />
      </div>

      {/* Data sources footer */}
      <div className="text-center pt-2 border-t border-white/5">
        <p className="text-[10px] text-white/30">
          Data sources: USGS Earthquake Hazards • Open-Meteo Weather • Real-time analysis
        </p>
      </div>
    </div>
  );
};

export default DisasterModule;
