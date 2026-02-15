/**
 * useAgricultureData.js
 * React hook for agricultural intelligence data management
 * Orchestrates API calls, risk calculations, and state management
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  fetchPrecipitationHistory,
  fetchCurrentConditions,
  fetchSeasonalNormals,
  calculateWaterBalance,
  calculateGrowingDegreeDays
} from './agricultureService';
import {
  calculateSoilMoistureProxy,
  calculateRainfallAnomaly,
  calculateDroughtRisk,
  calculateHeatStress,
  calculateAgriculturalStabilityIndex
} from './agricultureRiskEngine';

// Cache duration in milliseconds (10 minutes)
const CACHE_DURATION = 10 * 60 * 1000;

// Hook cache for preventing duplicate fetches
const hookCache = {
  data: null,
  timestamp: 0,
  coords: null
};

/**
 * Check if cached data is valid for coordinates
 */
function isCacheValid(lat, lon) {
  if (!hookCache.data || !hookCache.coords) return false;
  
  const timeDiff = Date.now() - hookCache.timestamp;
  const coordsMatch = 
    Math.abs(hookCache.coords.lat - lat) < 0.01 &&
    Math.abs(hookCache.coords.lon - lon) < 0.01;
  
  return timeDiff < CACHE_DURATION && coordsMatch;
}

/**
 * Get stability recommendation based on level
 */
function getStabilityRecommendation(level) {
  const recommendations = {
    'EXCELLENT': 'Optimal conditions for agriculture. Standard farming practices recommended.',
    'GOOD': 'Favorable conditions. Monitor weather forecasts for any changes.',
    'MODERATE': 'Conditions require attention. Consider irrigation planning and crop monitoring.',
    'POOR': 'Challenging conditions. Implement drought/heat mitigation measures.',
    'CRITICAL': 'Severe agricultural stress. Immediate intervention recommended.'
  };
  return recommendations[level] || 'Monitor conditions regularly.';
}

/**
 * Main hook for agriculture data
 * @param {Object} coords - { latitude, longitude }
 * @param {Object} options - { autoRefresh, refreshInterval }
 */
export function useAgricultureData(coords, options = {}) {
  const { autoRefresh = false, refreshInterval = 600000 } = options;
  
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  
  const mountedRef = useRef(true);
  const refreshTimerRef = useRef(null);
  
  /**
   * Fetch all agriculture data and compute indicators
   */
  const fetchData = useCallback(async (forceRefresh = false) => {
    if (!coords?.latitude || !coords?.longitude) {
      setError('Location not available');
      setLoading(false);
      return;
    }
    
    const lat = coords.latitude;
    const lon = coords.longitude;
    
    // Check cache unless force refresh
    if (!forceRefresh && isCacheValid(lat, lon)) {
      setData(hookCache.data);
      setLastUpdated(new Date(hookCache.timestamp));
      setLoading(false);
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      // Get current month for seasonal normals
      const currentMonth = new Date().getMonth();
      
      // Fetch all data in parallel
      const [precipitation, conditions, normals] = await Promise.all([
        fetchPrecipitationHistory(lat, lon),
        fetchCurrentConditions(lat, lon),
        fetchSeasonalNormals(lat, lon, currentMonth)
      ]);
      
      if (!mountedRef.current) return;
      
      // Handle null conditions (API failure)
      const safeConditions = conditions || {};
      const temperature = safeConditions.temperature ?? precipitation.avgTemperature ?? 25;
      const humidity = safeConditions.humidity ?? 50;
      const windSpeed = safeConditions.windSpeed ?? 10;
      const feelsLike = safeConditions.apparentTemp ?? temperature;
      const evapotranspiration = precipitation.avgEvapotranspiration ?? 0;
      
      // Get temperature range from precipitation data
      const tempMaxArr = precipitation.tempMax || [];
      const tempMinArr = precipitation.tempMin || [];
      const temperatureMax = tempMaxArr.length > 0 ? tempMaxArr[tempMaxArr.length - 1] ?? 30 : 30;
      const temperatureMin = tempMinArr.length > 0 ? tempMinArr[tempMinArr.length - 1] ?? 15 : 15;
      
      // Build objects for risk engine functions
      const precipHistoryObj = {
        total7Day: precipitation.total7Day ?? 0,
        total30Day: precipitation.total30Day ?? 0,
        consecutiveDryDays: precipitation.consecutiveDryDays ?? 0,
        avgTemperature: precipitation.avgTemperature ?? 25,
        avgEvapotranspiration: precipitation.avgEvapotranspiration ?? 0,
        precipitation: precipitation.precipitation || []
      };
      
      const currentConditionsObj = {
        temperature,
        humidity,
        windSpeed,
        apparentTemp: feelsLike
      };
      
      const seasonalNormalsObj = {
        monthlyNormal: normals?.monthlyNormal ?? 50
      };
      
      // Build extended precipHistory for water balance
      const precipHistoryForBalance = {
        ...precipHistoryObj,
        totalEvapotranspiration: precipitation.totalEvapotranspiration ?? 0,
        evapotranspiration: precipitation.evapotranspiration || [],
        tempMax: precipitation.tempMax || [],
        tempMin: precipitation.tempMin || []
      };
      
      // Calculate water balance (returns object)
      const waterBalanceResult = calculateWaterBalance(precipHistoryForBalance);
      const waterBalance = waterBalanceResult.balance7Day ?? 0;
      
      // Calculate growing degree days (takes precipHistory object)
      const gdd = calculateGrowingDegreeDays(precipHistoryForBalance);
      
      // Calculate soil moisture proxy (expects objects)
      const soilMoisture = calculateSoilMoistureProxy(
        precipHistoryObj,
        currentConditionsObj
      );
      
      // Calculate rainfall anomaly (expects objects)
      const rainfallAnomaly = calculateRainfallAnomaly(
        precipHistoryObj,
        seasonalNormalsObj
      );
      
      // Calculate drought risk (expects result objects + data objects)
      const droughtRisk = calculateDroughtRisk(
        soilMoisture,
        rainfallAnomaly,
        precipHistoryObj,
        currentConditionsObj
      );
      
      // Calculate heat stress (expects objects)
      const heatStress = calculateHeatStress(
        currentConditionsObj,
        precipHistoryObj
      );
      
      // Calculate Agricultural Stability Index (expects indicators object)
      const stabilityIndex = calculateAgriculturalStabilityIndex({
        soilMoisture,
        rainfallAnomaly,
        droughtRisk,
        heatStress
      });
      
      // Normalize data for UI consumption (map property names)
      const normalizedSoilMoisture = {
        score: soilMoisture.score ?? 50,
        level: soilMoisture.level?.label ?? 'MODERATE',
        color: soilMoisture.level?.color ?? '#f59e0b',
        confidence: soilMoisture.confidence ?? 0,
        reasoning: soilMoisture.reasoning ?? '',
        factors: soilMoisture.factors?.map(f => ({
          label: f.name,
          value: f.impact === 'HIGH' ? 80 : f.impact === 'MODERATE' ? 50 : 30,
          color: f.direction === 'positive' ? '#22c55e' : '#ef4444'
        })) || []
      };
      
      const normalizedRainfallAnomaly = {
        percentDeviation: rainfallAnomaly.anomalyPercent ?? 0,
        level: rainfallAnomaly.anomalyLevel?.label ?? 'Normal',
        color: rainfallAnomaly.anomalyLevel?.color ?? '#22c55e',
        total7Day: rainfallAnomaly.total7Day ?? 0,
        total30Day: rainfallAnomaly.total30Day ?? 0,
        monthlyNormal: rainfallAnomaly.monthlyNormal ?? 50,
        score: rainfallAnomaly.score ?? 50
      };
      
      const normalizedDroughtRisk = {
        score: droughtRisk.score ?? 0,
        level: droughtRisk.level?.label ?? 'LOW',
        color: droughtRisk.level?.color ?? '#22c55e',
        explanation: droughtRisk.explanation ?? '',
        factors: droughtRisk.factors?.map(f => ({
          label: f.name,
          value: f.impact === 'HIGH' ? 80 : f.impact === 'MODERATE' ? 50 : 30,
          color: '#ef4444'
        })) || []
      };
      
      const normalizedHeatStress = {
        score: heatStress.score ?? 0,
        level: heatStress.level?.label ?? 'SAFE',
        color: heatStress.level?.color ?? '#22c55e',
        advisory: heatStress.advisory ?? '',
        currentTemp: heatStress.currentTemp ?? temperature,
        feelsLike: heatStress.feelsLike ?? feelsLike,
        factors: heatStress.factors?.map(f => ({
          label: f.name,
          value: f.impact === 'HIGH' ? 80 : f.impact === 'MODERATE' ? 50 : 30,
          color: '#ef4444'
        })) || []
      };
      
      const normalizedStabilityIndex = {
        score: stabilityIndex.score ?? 50,
        level: stabilityIndex.level ?? 'MODERATE',
        color: stabilityIndex.color ?? '#f59e0b',
        primaryConcern: stabilityIndex.primaryConcern ?? 'None',
        breakdown: stabilityIndex.breakdown ?? {},
        recommendation: getStabilityRecommendation(stabilityIndex.level)
      };
      
      // Compile complete data object
      const agricultureData = {
        // Location
        location: { latitude: lat, longitude: lon },
        
        // Raw data
        precipitation: {
          last7Days: precipitation.total7Day ?? 0,
          last30Days: precipitation.total30Day ?? 0,
          consecutiveDryDays: precipitation.consecutiveDryDays ?? 0,
          dailyHistory: precipitation.precipitation || []
        },
        
        conditions: {
          temperature,
          temperatureMax,
          temperatureMin,
          humidity,
          windSpeed,
          feelsLike,
          evapotranspiration,
          weatherCode: safeConditions.cloudCover
        },
        
        normals: {
          monthlyPrecipitation: normals?.monthlyNormal ?? 50,
          seasonalAvgTemp: normals?.seasonalNormal ?? 20
        },
        
        // Calculated metrics
        waterBalance: {
          value: waterBalance ?? 0,
          status: (waterBalance ?? 0) > 10 ? 'Surplus' : (waterBalance ?? 0) < -10 ? 'Deficit' : 'Balanced',
          unit: 'mm'
        },
        
        growingDegreeDays: {
          value: gdd ?? 0,
          unit: 'GDD',
          baseTemp: 10
        },
        
        // Risk indicators (normalized for UI)
        soilMoisture: normalizedSoilMoisture,
        rainfallAnomaly: normalizedRainfallAnomaly,
        droughtRisk: normalizedDroughtRisk,
        heatStress: normalizedHeatStress,
        stabilityIndex: normalizedStabilityIndex,
        
        // Metadata
        timestamp: Date.now()
      };
      
      // Update cache
      hookCache.data = agricultureData;
      hookCache.timestamp = Date.now();
      hookCache.coords = { lat, lon };
      
      setData(agricultureData);
      setLastUpdated(new Date());
      setError(null);
      
    } catch (err) {
      if (!mountedRef.current) return;
      console.error('Agriculture data fetch error:', err);
      setError(err.message || 'Failed to fetch agriculture data');
    } finally {
      if (mountedRef.current) {
        setLoading(false);
      }
    }
  }, [coords]);
  
  /**
   * Manual refresh function
   */
  const refresh = useCallback(() => {
    return fetchData(true);
  }, [fetchData]);
  
  // Initial fetch and auto-refresh setup
  useEffect(() => {
    mountedRef.current = true;
    
    fetchData();
    
    // Setup auto-refresh if enabled
    if (autoRefresh && refreshInterval > 0) {
      refreshTimerRef.current = setInterval(() => {
        fetchData(true);
      }, refreshInterval);
    }
    
    return () => {
      mountedRef.current = false;
      if (refreshTimerRef.current) {
        clearInterval(refreshTimerRef.current);
      }
    };
  }, [fetchData, autoRefresh, refreshInterval]);
  
  return {
    data,
    loading,
    error,
    lastUpdated,
    refresh
  };
}

/**
 * Helper hook for AI explanation generation
 * @param {Object} agricultureData - Data from useAgricultureData
 */
export function useAgricultureExplainer(agricultureData) {
  const [explanation, setExplanation] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  const generateExplanation = useCallback(async (topic = 'overview') => {
    if (!agricultureData) {
      setError('No agriculture data available');
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      // Build context for AI
      const context = buildExplanationContext(agricultureData, topic);
      
      // Call Ollama API
      const response = await fetch('http://localhost:11434/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'llama3.1:latest',
          prompt: context.prompt,
          stream: false,
          options: {
            temperature: 0.7,
            num_predict: 300
          }
        })
      });
      
      if (!response.ok) {
        throw new Error('AI service unavailable');
      }
      
      const result = await response.json();
      setExplanation({
        topic,
        text: result.response,
        timestamp: Date.now()
      });
      
    } catch (err) {
      console.error('AI explanation error:', err);
      setError(err.message || 'Failed to generate explanation');
      
      // Fallback explanation
      setExplanation({
        topic,
        text: getFallbackExplanation(agricultureData, topic),
        timestamp: Date.now(),
        isFallback: true
      });
    } finally {
      setLoading(false);
    }
  }, [agricultureData]);
  
  return {
    explanation,
    loading,
    error,
    generateExplanation
  };
}

/**
 * Build prompt context for AI explanation
 */
function buildExplanationContext(data, topic) {
  const baseContext = `
Agricultural conditions:
- Soil Moisture Proxy: ${data.soilMoisture?.score ?? 50}/100 (${data.soilMoisture?.level ?? 'MODERATE'})
- Drought Risk: ${data.droughtRisk?.score ?? 0}/100 (${data.droughtRisk?.level ?? 'LOW'})
- Heat Stress: ${data.heatStress?.score ?? 0}/100 (${data.heatStress?.level ?? 'SAFE'})
- Agricultural Stability Index: ${data.stabilityIndex?.score ?? 50}/100 (${data.stabilityIndex?.level ?? 'MODERATE'})
- Recent Rainfall: ${(data.precipitation?.last7Days ?? 0).toFixed(1)}mm (7-day), ${(data.precipitation?.last30Days ?? 0).toFixed(1)}mm (30-day)
- Rainfall Anomaly: ${(data.rainfallAnomaly?.percentDeviation ?? 0) > 0 ? '+' : ''}${(data.rainfallAnomaly?.percentDeviation ?? 0).toFixed(0)}%
- Consecutive Dry Days: ${data.precipitation?.consecutiveDryDays ?? 0}
- Temperature: ${(data.conditions?.temperature ?? 25).toFixed(1)}°C
- Water Balance: ${(data.waterBalance?.value ?? 0).toFixed(1)}mm (${data.waterBalance?.status ?? 'Balanced'})
`;

  const topicPrompts = {
    overview: `You are an agricultural scientist. Given these conditions:\n${baseContext}\n\nProvide a brief (2-3 sentences), professional assessment of current agricultural conditions. Focus on the most critical factors for crop health. Be specific and data-driven.`,
    
    moisture: `You are a soil scientist. Given these conditions:\n${baseContext}\n\nExplain the current soil moisture situation in 2-3 sentences. Discuss what the soil moisture proxy score means for plant water availability and root zone conditions.`,
    
    drought: `You are an agricultural meteorologist. Given these conditions:\n${baseContext}\n\nAssess the current drought risk in 2-3 sentences. Explain the key contributing factors and potential timeline for improvement or worsening.`,
    
    heatStress: `You are a crop physiologist. Given these conditions:\n${baseContext}\n\nExplain the heat stress situation in 2-3 sentences. Discuss how current conditions affect plant metabolism, transpiration, and potential crop damage.`,
    
    stability: `You are an agricultural risk analyst. Given these conditions:\n${baseContext}\n\nInterpret the Agricultural Stability Index score in 2-3 sentences. Explain what this composite indicator means for overall farming conditions and risk management.`,
    
    rainfall: `You are a hydrologist. Given these conditions:\n${baseContext}\n\nAnalyze the rainfall patterns in 2-3 sentences. Discuss how current precipitation compares to seasonal norms and implications for water resources.`
  };
  
  return {
    prompt: topicPrompts[topic] || topicPrompts.overview
  };
}

/**
 * Get fallback explanation when AI is unavailable
 */
function getFallbackExplanation(data, topic) {
  const fallbacks = {
    overview: `Agricultural Stability Index is ${data.stabilityIndex?.score ?? 50}/100 (${data.stabilityIndex?.level ?? 'MODERATE'}). Soil moisture proxy at ${data.soilMoisture?.score ?? 50}/100 with ${(data.droughtRisk?.level ?? 'low').toLowerCase()} drought risk. ${data.precipitation?.consecutiveDryDays ?? 0} consecutive dry days recorded.`,
    
    moisture: `Soil moisture proxy: ${data.soilMoisture?.score ?? 50}/100 (${data.soilMoisture?.level ?? 'MODERATE'}). Based on ${(data.precipitation?.last7Days ?? 0).toFixed(1)}mm rainfall over 7 days and ${(data.conditions?.evapotranspiration ?? 0).toFixed(1)}mm evapotranspiration.`,
    
    drought: `Drought risk: ${data.droughtRisk?.score ?? 0}/100 (${data.droughtRisk?.level ?? 'LOW'}). ${data.precipitation?.consecutiveDryDays ?? 0} consecutive dry days. Rainfall at ${(data.rainfallAnomaly?.percentDeviation ?? 0) > 0 ? '+' : ''}${(data.rainfallAnomaly?.percentDeviation ?? 0).toFixed(0)}% of normal.`,
    
    heatStress: `Heat stress: ${data.heatStress?.score ?? 0}/100 (${data.heatStress?.level ?? 'SAFE'}). Current temperature ${(data.conditions?.temperature ?? 25).toFixed(1)}°C, feels like ${(data.conditions?.feelsLike ?? 25).toFixed(1)}°C with ${data.conditions?.humidity ?? 50}% humidity.`,
    
    stability: `Agricultural Stability Index: ${data.stabilityIndex?.score ?? 50}/100 (${data.stabilityIndex?.level ?? 'MODERATE'}). Composite of soil moisture (${data.soilMoisture?.level ?? 'MODERATE'}), drought risk (${data.droughtRisk?.level ?? 'LOW'}), heat stress (${data.heatStress?.level ?? 'SAFE'}), and rainfall anomaly.`,
    
    rainfall: `30-day rainfall: ${(data.precipitation?.last30Days ?? 0).toFixed(1)}mm (${data.rainfallAnomaly?.level ?? 'Normal'}). ${(data.rainfallAnomaly?.percentDeviation ?? 0) > 0 ? '+' : ''}${(data.rainfallAnomaly?.percentDeviation ?? 0).toFixed(0)}% compared to seasonal normal of ${(data.normals?.monthlyPrecipitation ?? 50).toFixed(1)}mm.`
  };
  
  return fallbacks[topic] || fallbacks.overview;
}

export default useAgricultureData;
