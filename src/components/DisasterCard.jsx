/**
 * DisasterCard.jsx - Reusable disaster information card component
 * Glass panel design with risk indicators and expandable details
 */

import React, { useState } from 'react';
import { useLearningMode } from '../lib/teaching/useLearningMode';

/**
 * Risk gauge visualization
 */
const RiskGauge = ({ score, size = 80 }) => {
  const strokeWidth = 8;
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const progress = (score / 100) * circumference;

  // Color based on score
  const getColor = (s) => {
    if (s >= 85) return "#7c2d12";
    if (s >= 60) return "#ef4444";
    if (s >= 35) return "#f59e0b";
    return "#22c55e";
  };

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="transform -rotate-90">
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="rgba(255,255,255,0.1)"
          strokeWidth={strokeWidth}
        />
        {/* Progress circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={getColor(score)}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={circumference - progress}
          strokeLinecap="round"
          className="transition-all duration-500"
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-lg font-bold" style={{ color: getColor(score) }}>
          {score}
        </span>
      </div>
    </div>
  );
};

/**
 * Risk factor item
 */
const RiskFactor = ({ name, value, impact }) => {
  const impactColors = {
    HIGH: "text-red-400",
    MODERATE: "text-yellow-400",
    LOW: "text-green-400"
  };

  return (
    <div className="flex items-center justify-between py-1 border-b border-white/5 last:border-0">
      <span className="text-xs text-white/60">{name}</span>
      <div className="flex items-center gap-2">
        <span className="text-xs font-medium text-white/80">{value}</span>
        <span className={`text-[10px] ${impactColors[impact] || "text-white/40"}`}>
          {impact}
        </span>
      </div>
    </div>
  );
};

/**
 * Main DisasterCard component
 */
const DisasterCard = ({
  title,
  icon,
  riskData,
  children,
  expandable = true,
  learnMoreType
}) => {
  const [expanded, setExpanded] = useState(false);
  const { isLearningMode, setPanel } = useLearningMode();

  if (!riskData) {
    return (
      <div className="bg-black/40 backdrop-blur-lg rounded-xl border border-white/10 p-4">
        <div className="flex items-center gap-3 mb-2">
          <span className="text-2xl">{icon}</span>
          <h3 className="text-sm font-semibold text-white/90">{title}</h3>
        </div>
        <div className="text-xs text-white/40">Loading data...</div>
      </div>
    );
  }

  const { score, level, factors, reasoning, recommendations } = riskData;

  return (
    <div 
      className="relative bg-black/40 backdrop-blur-lg rounded-xl border transition-all duration-300"
      style={{ 
        borderColor: level?.color ? `${level.color}40` : 'rgba(255,255,255,0.1)',
        boxShadow: score >= 60 ? `0 0 20px ${level?.color}20` : 'none'
      }}
    >
      {/* Header */}
      <div 
        className={`p-4 ${expandable ? 'cursor-pointer' : ''}`}
        onClick={() => expandable && setExpanded(!expanded)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">{icon}</span>
            <div>
              <h3 className="text-sm font-semibold text-white/90">{title}</h3>
              <p className="text-xs text-white/50">{reasoning}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <RiskGauge score={score} size={56} />
            
            <div 
              className="px-2 py-1 rounded text-xs font-bold"
              style={{ 
                backgroundColor: level?.bgColor || '#22c55e20',
                color: level?.color || '#22c55e'
              }}
            >
              {level?.label || 'LOW'}
            </div>
            
            {expandable && (
              <svg 
                className={`w-4 h-4 text-white/40 transition-transform ${expanded ? 'rotate-180' : ''}`}
                fill="none" viewBox="0 0 24 24" stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            )}
          </div>
        </div>
      </div>

      {/* Expanded content */}
      {expanded && (
        <div className="px-4 pb-4 space-y-3 border-t border-white/10">
          {/* Risk factors */}
          {factors && factors.length > 0 && (
            <div className="pt-3">
              <h4 className="text-xs font-semibold text-white/70 mb-2">Risk Factors</h4>
              <div className="bg-black/20 rounded-lg p-2">
                {factors.map((factor, i) => (
                  <RiskFactor key={i} {...factor} />
                ))}
              </div>
            </div>
          )}

          {/* Recommendations */}
          {recommendations && recommendations.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-white/70 mb-2">Safety Recommendations</h4>
              <ul className="space-y-1">
                {recommendations.map((rec, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs text-white/60">
                    <span className="text-yellow-500 mt-0.5">•</span>
                    {rec}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Additional content */}
          {children}

          {/* Learning mode button */}
          {isLearningMode && learnMoreType && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setPanel(learnMoreType);
              }}
              className="w-full mt-2 py-2 px-3 bg-indigo-500/20 hover:bg-indigo-500/30 
                         rounded-lg text-xs text-indigo-300 transition-colors flex items-center justify-center gap-2"
            >
              <span>📚</span>
              Learn about {title}
            </button>
          )}
        </div>
      )}
    </div>
  );
};

/**
 * Compact disaster indicator for dashboard view
 */
export const DisasterIndicator = ({ type, score, level, onClick }) => {
  const icons = {
    flood: "🌊",
    wildfire: "🔥",
    earthquake: "🌍",
    cyclone: "🌀",
    heatwave: "☀️"
  };

  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center gap-1 p-2 rounded-lg bg-black/20 
                 hover:bg-black/30 transition-all group"
      style={{ borderLeft: `3px solid ${level?.color || '#22c55e'}` }}
    >
      <span className="text-lg group-hover:scale-110 transition-transform">
        {icons[type] || "⚠️"}
      </span>
      <span className="text-[10px] text-white/60 capitalize">{type}</span>
      <span 
        className="text-xs font-bold"
        style={{ color: level?.color || '#22c55e' }}
      >
        {score}
      </span>
    </button>
  );
};

/**
 * Alert banner component
 */
export const DisasterAlert = ({ type, severity, message, color, onDismiss }) => {
  const icons = {
    EARTHQUAKE: "🌍",
    STORM: "🌀",
    FLOOD: "🌊",
    WILDFIRE: "🔥",
    HEATWAVE: "☀️"
  };

  return (
    <div 
      className="flex items-center gap-3 p-3 rounded-lg border animate-pulse"
      style={{ 
        backgroundColor: `${color}15`,
        borderColor: `${color}40`
      }}
    >
      <span className="text-xl">{icons[type] || "⚠️"}</span>
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold" style={{ color }}>
            {severity} {type} ALERT
          </span>
        </div>
        <p className="text-xs text-white/70">{message}</p>
      </div>
      {onDismiss && (
        <button
          onClick={onDismiss}
          className="p-1 hover:bg-white/10 rounded"
        >
          <svg className="w-4 h-4 text-white/40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}
    </div>
  );
};

/**
 * Earthquake list item
 */
export const EarthquakeItem = ({ earthquake }) => {
  const { magnitude, place, time, distance, depth, magnitudeClass } = earthquake;

  const magColors = {
    MAJOR: "#7c2d12",
    STRONG: "#ef4444",
    MODERATE: "#f59e0b",
    LIGHT: "#22c55e",
    MINOR: "#6b7280"
  };

  const timeAgo = (timestamp) => {
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    if (seconds < 60) return `${seconds}s ago`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
  };

  return (
    <div className="flex items-center gap-3 p-2 bg-black/20 rounded-lg hover:bg-black/30 transition-colors">
      <div 
        className="w-10 h-10 rounded-lg flex items-center justify-center font-bold text-sm"
        style={{ 
          backgroundColor: `${magColors[magnitudeClass] || magColors.MINOR}20`,
          color: magColors[magnitudeClass] || magColors.MINOR
        }}
      >
        M{magnitude.toFixed(1)}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-white/80 truncate">{place}</p>
        <div className="flex items-center gap-2 text-[10px] text-white/50">
          <span>{timeAgo(time)}</span>
          <span>•</span>
          <span>{distance}km away</span>
          <span>•</span>
          <span>{depth}km deep</span>
        </div>
      </div>
    </div>
  );
};

export default DisasterCard;
