/**
 * AgricultureModule.jsx
 * Main Agriculture Intelligence panel
 * Features: 5 indicator cards, AI explainer, learning mode integration
 */

import React, { useState, useEffect } from 'react';
import { useAgricultureData, useAgricultureExplainer } from '../lib/agriculture/useAgricultureData';
import {
  SoilMoistureCard,
  DroughtRiskCard,
  HeatStressCard,
  RainfallAnomalyCard,
  StabilityIndexCard,
  MetricStat
} from './AgricultureCard';

/**
 * Detail panel for expanded indicator view
 */
function DetailPanel({ title, children, onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="relative w-full max-w-lg mx-4 max-h-[80vh] overflow-auto rounded-2xl bg-gradient-to-br from-slate-900/95 to-slate-800/95 border border-white/10 shadow-2xl">
        {/* Header */}
        <div className="sticky top-0 flex items-center justify-between p-4 border-b border-white/10 bg-slate-900/80 backdrop-blur-sm">
          <h2 className="text-lg font-semibold text-white">{title}</h2>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-white/10 transition-colors text-white/60 hover:text-white"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        {/* Content */}
        <div className="p-4">
          {children}
        </div>
      </div>
    </div>
  );
}

/**
 * AI Explainer panel
 */
function AIExplainerPanel({ agricultureData, topic, onClose }) {
  const { explanation, loading, error, generateExplanation } = useAgricultureExplainer(agricultureData);
  
  useEffect(() => {
    generateExplanation(topic);
  }, [topic, generateExplanation]);
  
  const topicLabels = {
    overview: 'Agricultural Overview',
    moisture: 'Soil Moisture Analysis',
    drought: 'Drought Risk Assessment',
    heatStress: 'Heat Stress Analysis',
    stability: 'Stability Index Breakdown',
    rainfall: 'Rainfall Pattern Analysis'
  };
  
  return (
    <DetailPanel title={topicLabels[topic] || 'AI Analysis'} onClose={onClose}>
      <div className="space-y-4">
        {/* AI Badge */}
        <div className="flex items-center gap-2 text-xs text-white/40">
          <span className="px-2 py-1 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
            🤖 AI Analysis
          </span>
          {explanation?.isFallback && (
            <span className="text-amber-400">(Fallback - AI unavailable)</span>
          )}
        </div>
        
        {/* Loading state */}
        {loading && (
          <div className="flex items-center justify-center py-8">
            <div className="w-8 h-8 border-2 border-purple-400/30 border-t-purple-400 rounded-full animate-spin" />
          </div>
        )}
        
        {/* Explanation */}
        {!loading && explanation && (
          <div className="p-4 rounded-xl bg-white/5 border border-white/10">
            <p className="text-sm text-white/80 leading-relaxed">{explanation.text}</p>
          </div>
        )}
        
        {/* Error */}
        {error && !explanation && (
          <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-sm">
            {error}
          </div>
        )}
        
        {/* Related topics */}
        <div className="pt-4 border-t border-white/10">
          <div className="text-xs text-white/40 mb-2">Related Analysis</div>
          <div className="flex flex-wrap gap-2">
            {Object.keys(topicLabels).filter(t => t !== topic).slice(0, 3).map(t => (
              <button
                key={t}
                onClick={() => generateExplanation(t)}
                className="px-3 py-1.5 rounded-lg text-xs bg-white/5 hover:bg-white/10 text-white/60 hover:text-white transition-colors"
              >
                {topicLabels[t]}
              </button>
            ))}
          </div>
        </div>
      </div>
    </DetailPanel>
  );
}

/**
 * Learning mode tooltip wrapper
 */
function LearnableItem({ term, children, learningMode }) {
  const [showTooltip, setShowTooltip] = useState(false);
  
  const definitions = {
    'soil-moisture-proxy': 'An estimate of soil water content derived from precipitation, evapotranspiration, and atmospheric conditions. Not a direct measurement but a calculated proxy.',
    'drought-risk': 'A composite risk score indicating the likelihood and severity of agricultural drought based on rainfall deficit, soil moisture, consecutive dry days, and temperature stress.',
    'heat-stress': 'A measure of thermal pressure on crops based on air temperature, humidity, wind speed, and apparent (feels-like) temperature.',
    'rainfall-anomaly': 'The percentage deviation of current precipitation from historical seasonal averages. Positive values indicate above-normal rainfall.',
    'asi': 'Agricultural Stability Index - A weighted composite score (0-100) combining soil moisture, drought risk, heat stress, rainfall patterns, and water balance.',
    'evapotranspiration': 'The combined water loss from soil evaporation and plant transpiration. Critical for calculating water balance.',
    'water-balance': 'The difference between precipitation input and evapotranspiration output. Positive indicates water surplus, negative indicates deficit.',
    'gdd': 'Growing Degree Days - Accumulated heat units above a base temperature (typically 10°C) that drive crop development.'
  };
  
  if (!learningMode) return children;
  
  return (
    <span
      className="relative border-b border-dashed border-cyan-400/50 cursor-help"
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      {children}
      {showTooltip && definitions[term] && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 p-3 rounded-lg bg-slate-900/95 border border-cyan-400/30 text-xs text-white/80 z-50 shadow-xl">
          {definitions[term]}
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 rotate-45 w-2 h-2 bg-slate-900 border-r border-b border-cyan-400/30" />
        </div>
      )}
    </span>
  );
}

/**
 * Main Agriculture Module component
 */
export default function AgricultureModule({ coords, learningMode = false }) {
  const { data, loading, error, lastUpdated, refresh } = useAgricultureData(coords);
  const [aiTopic, setAiTopic] = useState(null);
  const [selectedIndicator, setSelectedIndicator] = useState(null);
  
  // Handle indicator click for AI explanation
  const handleIndicatorClick = (topic) => {
    setAiTopic(topic);
  };
  
  // Loading state
  if (loading && !data) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-white/60">
        <div className="w-12 h-12 border-2 border-emerald-400/30 border-t-emerald-400 rounded-full animate-spin mb-4" />
        <p className="text-sm">Loading agricultural data...</p>
      </div>
    );
  }
  
  // Error state
  if (error && !data) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-white/60 p-4">
        <div className="text-4xl mb-4">🌾</div>
        <p className="text-sm text-center mb-4">{error}</p>
        <button
          onClick={refresh}
          className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-sm transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }
  
  if (!data) return null;
  
  return (
    <div className="h-full overflow-y-auto custom-scrollbar">
      <div className="p-4 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
              🌾 <LearnableItem term="agriculture" learningMode={learningMode}>Agriculture Intelligence</LearnableItem>
            </h2>
            <p className="text-xs text-white/40">
              {data.location.latitude.toFixed(2)}°, {data.location.longitude.toFixed(2)}°
            </p>
          </div>
          
          <div className="flex items-center gap-2">
            {/* Refresh button */}
            <button
              onClick={refresh}
              disabled={loading}
              className="p-2 rounded-lg hover:bg-white/10 text-white/60 hover:text-white transition-colors disabled:opacity-50"
              title="Refresh data"
            >
              <svg className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
            
            {/* AI Overview button */}
            <button
              onClick={() => handleIndicatorClick('overview')}
              className="px-3 py-1.5 rounded-lg bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 text-xs font-medium transition-colors border border-purple-500/30"
            >
              🤖 AI Overview
            </button>
          </div>
        </div>
        
        {/* Last updated */}
        {lastUpdated && (
          <div className="text-[10px] text-white/30">
            Updated: {lastUpdated.toLocaleTimeString()}
          </div>
        )}
        
        {/* Agricultural Stability Index - Signature Feature */}
        <div className="relative">
          <div className="absolute -top-1 -right-1 px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-medium border border-emerald-500/30">
            PRIMARY
          </div>
          <LearnableItem term="asi" learningMode={learningMode}>
            <StabilityIndexCard
              data={data.stabilityIndex}
              onClick={() => handleIndicatorClick('stability')}
            />
          </LearnableItem>
        </div>
        
        {/* Quick metrics grid */}
        <div className="grid grid-cols-2 gap-2">
          <MetricStat
            label="7-Day Rain"
            value={data.precipitation.last7Days}
            unit="mm"
            icon="🌧️"
            color="#3b82f6"
          />
          <MetricStat
            label="Dry Days"
            value={data.precipitation.consecutiveDryDays}
            unit="days"
            icon="☀️"
            color="#f59e0b"
          />
          <LearnableItem term="water-balance" learningMode={learningMode}>
            <MetricStat
              label="Water Balance"
              value={data.waterBalance.value}
              unit="mm"
              icon={data.waterBalance.value > 0 ? '💧' : '🏜️'}
              color={data.waterBalance.value > 0 ? '#10b981' : '#ef4444'}
            />
          </LearnableItem>
          <LearnableItem term="gdd" learningMode={learningMode}>
            <MetricStat
              label="GDD Today"
              value={data.growingDegreeDays.value}
              unit="°C·d"
              icon="🌱"
              color="#22c55e"
            />
          </LearnableItem>
        </div>
        
        {/* Primary indicators grid */}
        <div className="grid grid-cols-1 gap-3">
          <LearnableItem term="soil-moisture-proxy" learningMode={learningMode}>
            <SoilMoistureCard
              data={data.soilMoisture}
              onClick={() => handleIndicatorClick('moisture')}
            />
          </LearnableItem>
          
          <LearnableItem term="drought-risk" learningMode={learningMode}>
            <DroughtRiskCard
              data={data.droughtRisk}
              onClick={() => handleIndicatorClick('drought')}
            />
          </LearnableItem>
          
          <LearnableItem term="heat-stress" learningMode={learningMode}>
            <HeatStressCard
              data={data.heatStress}
              onClick={() => handleIndicatorClick('heatStress')}
            />
          </LearnableItem>
          
          <LearnableItem term="rainfall-anomaly" learningMode={learningMode}>
            <RainfallAnomalyCard
              data={data.rainfallAnomaly}
              onClick={() => handleIndicatorClick('rainfall')}
            />
          </LearnableItem>
        </div>
        
        {/* Current conditions summary */}
        <div className="p-3 rounded-xl bg-white/5 border border-white/10">
          <div className="text-xs text-white/40 mb-2">Current Conditions</div>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div>
              <div className="text-lg font-bold text-white">{(data.conditions.temperature ?? 0).toFixed(1)}°C</div>
              <div className="text-[10px] text-white/40">Temperature</div>
            </div>
            <div>
              <div className="text-lg font-bold text-white">{data.conditions.humidity ?? 0}%</div>
              <div className="text-[10px] text-white/40">Humidity</div>
            </div>
            <div>
              <div className="text-lg font-bold text-white">{(data.conditions.windSpeed ?? 0).toFixed(1)}</div>
              <div className="text-[10px] text-white/40">Wind (km/h)</div>
            </div>
          </div>
          
          {/* Evapotranspiration */}
          {data.conditions.evapotranspiration != null && (
            <div className="mt-3 pt-3 border-t border-white/10">
              <LearnableItem term="evapotranspiration" learningMode={learningMode}>
                <div className="flex justify-between text-xs">
                  <span className="text-white/40">Evapotranspiration</span>
                  <span className="text-white/80 font-mono">{(data.conditions.evapotranspiration ?? 0).toFixed(2)} mm/day</span>
                </div>
              </LearnableItem>
            </div>
          )}
        </div>
        
        {/* 30-day rainfall summary */}
        <div className="p-3 rounded-xl bg-white/5 border border-white/10">
          <div className="text-xs text-white/40 mb-2">30-Day Precipitation</div>
          <div className="flex items-end justify-between">
            <div>
              <div className="text-2xl font-bold text-blue-400">{(data.precipitation.last30Days ?? 0).toFixed(1)}</div>
              <div className="text-[10px] text-white/40">mm total</div>
            </div>
            <div className="text-right">
              <div className={`text-lg font-bold ${(data.rainfallAnomaly?.percentDeviation ?? 0) > 0 ? 'text-emerald-400' : 'text-amber-400'}`}>
                {(data.rainfallAnomaly?.percentDeviation ?? 0) > 0 ? '+' : ''}{(data.rainfallAnomaly?.percentDeviation ?? 0).toFixed(0)}%
              </div>
              <div className="text-[10px] text-white/40">vs normal ({(data.normals.monthlyPrecipitation ?? 0).toFixed(0)}mm)</div>
            </div>
          </div>
        </div>
        
        {/* Learning mode indicator */}
        {learningMode && (
          <div className="p-3 rounded-xl bg-cyan-500/10 border border-cyan-500/30">
            <div className="flex items-center gap-2 text-xs text-cyan-300">
              <span>📚</span>
              <span>Learning Mode Active - Hover over terms for definitions</span>
            </div>
          </div>
        )}
        
        {/* Footer with data attribution */}
        <div className="pt-4 border-t border-white/10 text-center">
          <p className="text-[10px] text-white/30">
            Data: Open-Meteo API • Calculations: Local Processing
          </p>
        </div>
      </div>
      
      {/* AI Explainer panel */}
      {aiTopic && (
        <AIExplainerPanel
          agricultureData={data}
          topic={aiTopic}
          onClose={() => setAiTopic(null)}
        />
      )}
      
      {/* Custom scrollbar styles */}
      <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(255,255,255,0.05);
          border-radius: 3px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255,255,255,0.2);
          border-radius: 3px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(255,255,255,0.3);
        }
      `}</style>
    </div>
  );
}
