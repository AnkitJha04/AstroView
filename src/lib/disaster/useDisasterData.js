/**
 * useDisasterData.js - React hook for disaster data management
 * Handles data fetching, caching, and risk calculations
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  fetchEarthquakes,
  fetchSevereWeather,
  fetchPrecipitationHistory
} from './disasterService';
import {
  calculateFloodRisk,
  calculateWildfireRisk,
  calculateEarthquakeRisk,
  calculateCycloneRisk,
  calculateDisasterRiskIndex,
  calculateHeatwaveRiskScore
} from './disasterRiskEngine';

/**
 * Main hook for disaster intelligence data
 */
export const useDisasterData = (location, climateData = null) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);

  // Raw data states
  const [earthquakes, setEarthquakes] = useState([]);
  const [stormData, setStormData] = useState({ storms: [], alerts: [] });
  const [precipHistory, setPrecipHistory] = useState(null);

  // Risk calculation states
  const [floodRisk, setFloodRisk] = useState(null);
  const [wildfireRisk, setWildfireRisk] = useState(null);
  const [earthquakeRisk, setEarthquakeRisk] = useState(null);
  const [cycloneRisk, setCycloneRisk] = useState(null);

  /**
   * Fetch all disaster data
   */
  const fetchAllData = useCallback(async () => {
    if (!location?.latitude || !location?.longitude) {
      setError("Location required for disaster monitoring");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Fetch all data sources in parallel
      const [eqData, severeData, precipData] = await Promise.all([
        fetchEarthquakes(location.latitude, location.longitude, 500),
        fetchSevereWeather(location.latitude, location.longitude),
        fetchPrecipitationHistory(location.latitude, location.longitude, 7)
      ]);

      // Update raw data
      setEarthquakes(eqData);
      setStormData(severeData);
      setPrecipHistory(precipData);

      // Calculate risks
      const currentWeather = climateData?.current || severeData?.currentWeather;

      const floodResult = calculateFloodRisk(precipData, currentWeather);
      const wildfireResult = calculateWildfireRisk(currentWeather, precipData);
      const earthquakeResult = calculateEarthquakeRisk(eqData);
      const cycloneResult = calculateCycloneRisk(severeData.storms, severeData.alerts);

      setFloodRisk(floodResult);
      setWildfireRisk(wildfireResult);
      setEarthquakeRisk(earthquakeResult);
      setCycloneRisk(cycloneResult);

      setLastUpdated(new Date());
    } catch (err) {
      console.error("Disaster data fetch error:", err);
      setError("Failed to fetch disaster monitoring data");
    } finally {
      setLoading(false);
    }
  }, [location, climateData]);

  /**
   * Initial fetch and refresh interval
   */
  useEffect(() => {
    fetchAllData();

    // Refresh every 10 minutes
    const interval = setInterval(fetchAllData, 10 * 60 * 1000);
    return () => clearInterval(interval);
  }, [fetchAllData]);

  /**
   * Calculate heatwave risk from climate data if available
   */
  const heatwaveRisk = useMemo(() => {
    if (climateData?.heatwaveRisk) {
      return calculateHeatwaveRiskScore(climateData.heatwaveRisk);
    }
    return { score: 0, level: { label: "LOW" } };
  }, [climateData]);

  /**
   * Combined Disaster Risk Index
   */
  const disasterRiskIndex = useMemo(() => {
    return calculateDisasterRiskIndex({
      floodRisk,
      wildfireRisk,
      earthquakeRisk,
      cycloneRisk,
      heatwaveRisk
    });
  }, [floodRisk, wildfireRisk, earthquakeRisk, cycloneRisk, heatwaveRisk]);

  /**
   * Get sorted earthquakes by time or magnitude
   */
  const getEarthquakesSorted = useCallback((sortBy = 'time', limit = 10) => {
    const sorted = [...earthquakes].sort((a, b) => {
      if (sortBy === 'magnitude') return b.magnitude - a.magnitude;
      if (sortBy === 'distance') return a.distance - b.distance;
      return b.time - a.time; // Default: most recent first
    });
    return sorted.slice(0, limit);
  }, [earthquakes]);

  /**
   * Get active alerts
   */
  const activeAlerts = useMemo(() => {
    const alerts = [];

    // Add earthquake alerts
    if (earthquakeRisk?.score >= 35) {
      alerts.push({
        type: "EARTHQUAKE",
        severity: earthquakeRisk.level.label,
        message: earthquakeRisk.reasoning,
        color: earthquakeRisk.level.color
      });
    }

    // Add storm alerts
    if (cycloneRisk?.score >= 35) {
      alerts.push({
        type: "STORM",
        severity: cycloneRisk.level.label,
        message: cycloneRisk.reasoning,
        color: cycloneRisk.level.color
      });
    }

    // Add flood alerts
    if (floodRisk?.score >= 35) {
      alerts.push({
        type: "FLOOD",
        severity: floodRisk.level.label,
        message: floodRisk.reasoning,
        color: floodRisk.level.color
      });
    }

    // Add wildfire alerts
    if (wildfireRisk?.score >= 35) {
      alerts.push({
        type: "WILDFIRE",
        severity: wildfireRisk.level.label,
        message: wildfireRisk.reasoning,
        color: wildfireRisk.level.color
      });
    }

    return alerts.sort((a, b) => {
      const severityOrder = { EXTREME: 0, SEVERE: 1, HIGH: 2, MODERATE: 3, LOW: 4 };
      return (severityOrder[a.severity] || 4) - (severityOrder[b.severity] || 4);
    });
  }, [earthquakeRisk, cycloneRisk, floodRisk, wildfireRisk]);

  /**
   * Manual refresh function
   */
  const refresh = useCallback(() => {
    fetchAllData();
  }, [fetchAllData]);

  return {
    // Loading states
    loading,
    error,
    lastUpdated,

    // Raw data
    earthquakes,
    storms: stormData.storms,
    alerts: stormData.alerts,
    precipHistory,

    // Calculated risks
    floodRisk,
    wildfireRisk,
    earthquakeRisk,
    cycloneRisk,
    heatwaveRisk,

    // Combined index
    disasterRiskIndex,

    // Derived data
    activeAlerts,
    getEarthquakesSorted,

    // Actions
    refresh
  };
};

/**
 * Hook for earthquake feed with pagination
 */
export const useEarthquakeFeed = (location, options = {}) => {
  const { radius = 500, minMagnitude = 2.5, limit = 20 } = options;
  const [earthquakes, setEarthquakes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchData = useCallback(async () => {
    if (!location?.latitude || !location?.longitude) return;

    setLoading(true);
    try {
      const data = await fetchEarthquakes(
        location.latitude,
        location.longitude,
        radius,
        minMagnitude
      );
      setEarthquakes(data.slice(0, limit));
      setError(null);
    } catch (err) {
      setError("Failed to fetch earthquake data");
    } finally {
      setLoading(false);
    }
  }, [location, radius, minMagnitude, limit]);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 5 * 60 * 1000); // 5 min refresh
    return () => clearInterval(interval);
  }, [fetchData]);

  return { earthquakes, loading, error, refresh: fetchData };
};

/**
 * Hook for storm/cyclone monitoring
 */
export const useStormMonitoring = (location) => {
  const [data, setData] = useState({ storms: [], alerts: [], currentWeather: null });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchData = useCallback(async () => {
    if (!location?.latitude || !location?.longitude) return;

    setLoading(true);
    try {
      const result = await fetchSevereWeather(location.latitude, location.longitude);
      setData(result);
      setError(null);
    } catch (err) {
      setError("Failed to fetch storm data");
    } finally {
      setLoading(false);
    }
  }, [location]);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 10 * 60 * 1000);
    return () => clearInterval(interval);
  }, [fetchData]);

  return { ...data, loading, error, refresh: fetchData };
};

export default useDisasterData;
