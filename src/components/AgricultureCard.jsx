/**
 * AgricultureCard.jsx
 * Reusable glass panel component for agriculture indicators
 * Features: gradient gauge, factor breakdown, trend indicators
 */

import React from 'react';

/**
 * Gradient ring gauge for score visualization
 */
function GaugeRing({ score, maxScore = 100, color, size = 80, strokeWidth = 8 }) {
  const safeScore = score ?? 0;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = (safeScore / maxScore) * circumference;
  const rotation = -90; // Start from top
  
  return (
    <svg width={size} height={size} className="transform -rotate-90">
      {/* Background ring */}
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="rgba(255,255,255,0.1)"
        strokeWidth={strokeWidth}
      />
      {/* Progress ring */}
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeDasharray={circumference}
        strokeDashoffset={circumference - progress}
        strokeLinecap="round"
        className="transition-all duration-700 ease-out"
        style={{ filter: `drop-shadow(0 0 6px ${color})` }}
      />
    </svg>
  );
}

/**
 * Horizontal bar gauge for factor breakdown
 */
function FactorBar({ label, value, maxValue = 100, color }) {
  const safeValue = value ?? 0;
  const percentage = Math.min(100, (safeValue / maxValue) * 100);
  
  return (
    <div className="mb-2">
      <div className="flex justify-between text-xs mb-1">
        <span className="text-white/60">{label}</span>
        <span className="text-white/80 font-mono">{safeValue.toFixed(0)}</span>
      </div>
      <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{
            width: `${percentage}%`,
            backgroundColor: color,
            boxShadow: `0 0 8px ${color}`
          }}
        />
      </div>
    </div>
  );
}

/**
 * Trend indicator arrow
 */
function TrendIndicator({ trend }) {
  if (!trend || trend === 'stable') {
    return <span className="text-white/40">→</span>;
  }
  
  if (trend === 'improving' || trend === 'up') {
    return <span className="text-emerald-400">↑</span>;
  }
  
  if (trend === 'worsening' || trend === 'down') {
    return <span className="text-red-400">↓</span>;
  }
  
  return null;
}

/**
 * Main AgricultureCard component
 */
export default function AgricultureCard({
  title,
  icon,
  score,
  maxScore = 100,
  level,
  levelColor,
  unit = '',
  description,
  factors = [],
  trend,
  onClick,
  compact = false,
  glowColor,
  children
}) {
  // Determine color from level if not provided
  const cardColor = levelColor || glowColor || getColorFromScore(score, maxScore);
  
  return (
    <div
      className={`
        relative overflow-hidden rounded-xl
        bg-gradient-to-br from-white/10 to-white/5
        backdrop-blur-md border border-white/10
        transition-all duration-300 cursor-pointer
        hover:border-white/20 hover:shadow-lg
        ${compact ? 'p-3' : 'p-4'}
      `}
      onClick={onClick}
      style={{
        boxShadow: `0 0 20px ${cardColor}15, inset 0 1px 0 rgba(255,255,255,0.1)`
      }}
    >
      {/* Glow effect */}
      <div
        className="absolute -top-10 -right-10 w-32 h-32 rounded-full blur-3xl opacity-20 pointer-events-none"
        style={{ backgroundColor: cardColor }}
      />
      
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          {icon && <span className="text-lg">{icon}</span>}
          <h3 className="text-sm font-medium text-white/90">{title}</h3>
        </div>
        <TrendIndicator trend={trend} />
      </div>
      
      {/* Main content */}
      <div className={`flex ${compact ? 'flex-col items-center' : 'items-center gap-4'}`}>
        {/* Gauge */}
        <div className="relative flex-shrink-0">
          <GaugeRing
            score={score}
            maxScore={maxScore}
            color={cardColor}
            size={compact ? 64 : 80}
            strokeWidth={compact ? 6 : 8}
          />
          {/* Score in center */}
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span
              className="text-lg font-bold font-mono"
              style={{ color: cardColor }}
            >
              {(score ?? 0).toFixed(0)}
            </span>
            {unit && (
              <span className="text-[10px] text-white/40">{unit}</span>
            )}
          </div>
        </div>
        
        {/* Level and description */}
        {!compact && (
          <div className="flex-1 min-w-0">
            <div
              className="text-sm font-semibold mb-1"
              style={{ color: cardColor }}
            >
              {level}
            </div>
            {description && (
              <p className="text-xs text-white/50 line-clamp-2">{description}</p>
            )}
          </div>
        )}
      </div>
      
      {/* Compact level */}
      {compact && (
        <div
          className="text-center text-xs font-medium mt-2"
          style={{ color: cardColor }}
        >
          {level}
        </div>
      )}
      
      {/* Factor breakdown */}
      {factors.length > 0 && !compact && (
        <div className="mt-4 pt-3 border-t border-white/10">
          <div className="text-xs text-white/40 mb-2">Contributing Factors</div>
          {factors.map((factor, idx) => (
            <FactorBar
              key={idx}
              label={factor.label}
              value={factor.value}
              maxValue={factor.maxValue || 100}
              color={factor.color || cardColor}
            />
          ))}
        </div>
      )}
      
      {/* Custom children */}
      {children}
    </div>
  );
}

/**
 * Specialized card for Soil Moisture
 */
export function SoilMoistureCard({ data, onClick }) {
  if (!data) return null;
  
  const factors = data.factors ? [
    { label: 'Recent Rainfall', value: data.factors.recentRainfall, color: '#3b82f6' },
    { label: 'Evapotranspiration', value: data.factors.evapotranspiration, color: '#f59e0b' },
    { label: 'Temperature Effect', value: data.factors.temperatureEffect, color: '#ef4444' },
    { label: 'Humidity Factor', value: data.factors.humidityFactor, color: '#10b981' }
  ] : [];
  
  return (
    <AgricultureCard
      title="Soil Moisture Proxy"
      icon="💧"
      score={data.score}
      level={data.level}
      levelColor={data.color}
      description="Estimated soil water availability based on precipitation, evapotranspiration, and atmospheric conditions."
      factors={factors}
      onClick={onClick}
    />
  );
}

/**
 * Specialized card for Drought Risk
 */
export function DroughtRiskCard({ data, onClick }) {
  if (!data) return null;
  
  const factors = data.factors ? [
    { label: 'Rainfall Deficit', value: data.factors.rainfallFactor, color: '#3b82f6' },
    { label: 'Soil Moisture', value: data.factors.soilMoistureFactor, color: '#10b981' },
    { label: 'Dry Days', value: data.factors.dryDaysFactor, color: '#f59e0b' },
    { label: 'Temperature', value: data.factors.temperatureFactor, color: '#ef4444' }
  ] : [];
  
  return (
    <AgricultureCard
      title="Drought Risk"
      icon="🏜️"
      score={data.score}
      level={data.level}
      levelColor={data.color}
      description="Composite drought risk assessment based on precipitation deficit, soil conditions, and temperature stress."
      factors={factors}
      onClick={onClick}
    />
  );
}

/**
 * Specialized card for Heat Stress
 */
export function HeatStressCard({ data, onClick }) {
  if (!data) return null;
  
  const factors = data.factors ? [
    { label: 'Temperature', value: data.factors.temperatureFactor, color: '#ef4444' },
    { label: 'Humidity', value: data.factors.humidityFactor, color: '#3b82f6' },
    { label: 'Wind Cooling', value: 100 - data.factors.windFactor, color: '#10b981' },
    { label: 'Feels Like', value: data.factors.feelsLikeFactor, color: '#f59e0b' }
  ] : [];
  
  return (
    <AgricultureCard
      title="Heat Stress"
      icon="🌡️"
      score={data.score}
      level={data.level}
      levelColor={data.color}
      description="Plant heat stress index based on temperature, humidity, wind, and apparent temperature effects."
      factors={factors}
      onClick={onClick}
    />
  );
}

/**
 * Specialized card for Rainfall Anomaly
 */
export function RainfallAnomalyCard({ data, onClick }) {
  if (!data) return null;
  
  const deviation = data.percentDeviation ?? 0;
  const isPositive = deviation > 0;
  
  return (
    <AgricultureCard
      title="Rainfall Anomaly"
      icon="🌧️"
      score={Math.abs(deviation)}
      maxScore={100}
      level={data.level}
      levelColor={data.color}
      unit={isPositive ? '% above' : '% below'}
      description={`Current 30-day rainfall is ${Math.abs(deviation).toFixed(0)}% ${isPositive ? 'above' : 'below'} the seasonal average.`}
      onClick={onClick}
    />
  );
}

/**
 * Specialized card for Agricultural Stability Index (signature feature)
 */
export function StabilityIndexCard({ data, onClick }) {
  if (!data) return null;
  
  const factors = data.breakdown ? [
    { label: 'Soil Health', value: data.breakdown.soilMoisture ?? 50, color: '#10b981' },
    { label: 'Drought Resilience', value: data.breakdown.drought ?? 50, color: '#3b82f6' },
    { label: 'Thermal Comfort', value: data.breakdown.heatStress ?? 50, color: '#f59e0b' },
    { label: 'Rainfall Pattern', value: data.breakdown.rainfall ?? 50, color: '#8b5cf6' },
    { label: 'Water Balance', value: data.breakdown.flood ?? 50, color: '#06b6d4' }
  ] : [];
  
  return (
    <AgricultureCard
      title="Agricultural Stability Index"
      icon="📊"
      score={data.score}
      level={data.level}
      levelColor={data.color}
      description="Comprehensive index combining soil moisture, drought risk, heat stress, rainfall patterns, and water balance."
      factors={factors}
      onClick={onClick}
    >
      {/* ASI-specific recommendation */}
      {data.recommendation && (
        <div className="mt-3 p-2 rounded-lg bg-white/5 border border-white/10">
          <div className="text-xs text-white/40 mb-1">Recommendation</div>
          <p className="text-xs text-white/70">{data.recommendation}</p>
        </div>
      )}
    </AgricultureCard>
  );
}

/**
 * Compact stat display for metrics
 */
export function MetricStat({ label, value, unit, icon, color }) {
  const safeValue = value ?? 0;
  return (
    <div className="flex items-center gap-2 p-2 rounded-lg bg-white/5">
      {icon && <span className="text-sm">{icon}</span>}
      <div className="flex-1 min-w-0">
        <div className="text-[10px] text-white/40 uppercase tracking-wider">{label}</div>
        <div className="text-sm font-mono" style={{ color: color || '#fff' }}>
          {typeof safeValue === 'number' ? safeValue.toFixed(1) : safeValue}
          {unit && <span className="text-white/40 ml-1">{unit}</span>}
        </div>
      </div>
    </div>
  );
}

/**
 * Helper to get color from score
 */
function getColorFromScore(score, maxScore = 100) {
  const safeScore = score ?? 50;
  const normalized = safeScore / maxScore;
  
  if (normalized >= 0.8) return '#10b981'; // Excellent - emerald
  if (normalized >= 0.6) return '#22c55e'; // Good - green
  if (normalized >= 0.4) return '#f59e0b'; // Moderate - amber
  if (normalized >= 0.2) return '#f97316'; // Poor - orange
  return '#ef4444'; // Critical - red
}
