/**
 * useClimateData - Custom hook for managing climate data state
 * Handles lazy loading, caching, and error states
 */

import { useCallback, useEffect, useRef, useState } from "react";
import {
  fetchWeatherData,
  fetchAirQuality,
  fetchSevereWeatherAlerts,
  calculateHeatwaveRisk,
  getClimateStatus
} from "./climateService";

const REFRESH_INTERVAL_MS = 10 * 60 * 1000; // 10 minutes

export const useClimateData = (coords, isActive = false) => {
  const [weather, setWeather] = useState(null);
  const [airQuality, setAirQuality] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);

  const controllerRef = useRef(null);
  const intervalRef = useRef(null);

  const fetchAll = useCallback(async () => {
    if (!coords?.lat || !coords?.lon) {
      setError("Location required for climate data");
      return;
    }

    // Abort previous request if any
    if (controllerRef.current) {
      controllerRef.current.abort();
    }
    controllerRef.current = new AbortController();
    const { signal } = controllerRef.current;

    setLoading(true);
    setError(null);

    try {
      // Fetch all data in parallel
      const [weatherData, aqiData, alertsData] = await Promise.allSettled([
        fetchWeatherData(coords.lat, coords.lon, signal),
        fetchAirQuality(coords.lat, coords.lon, signal),
        fetchSevereWeatherAlerts(coords.lat, coords.lon, signal)
      ]);

      if (signal.aborted) return;

      if (weatherData.status === "fulfilled") {
        setWeather(weatherData.value);
      } else {
        console.error("Weather fetch failed:", weatherData.reason);
      }

      if (aqiData.status === "fulfilled") {
        setAirQuality(aqiData.value);
      } else {
        console.error("AQI fetch failed:", aqiData.reason);
      }

      if (alertsData.status === "fulfilled") {
        setAlerts(alertsData.value);
      } else {
        console.error("Alerts fetch failed:", alertsData.reason);
      }

      // Check if any succeeded
      const anySuccess =
        weatherData.status === "fulfilled" ||
        aqiData.status === "fulfilled" ||
        alertsData.status === "fulfilled";

      if (!anySuccess) {
        setError("Failed to fetch climate data. Please try again.");
      } else {
        setLastUpdated(new Date());
      }
    } catch (err) {
      if (err.name === "AbortError") return;
      setError(err.message || "Failed to fetch climate data");
    } finally {
      if (!signal?.aborted) {
        setLoading(false);
      }
    }
  }, [coords?.lat, coords?.lon]);

  // Lazy load - only fetch when tab is active
  useEffect(() => {
    if (!isActive) return;

    fetchAll();

    // Set up refresh interval
    intervalRef.current = setInterval(fetchAll, REFRESH_INTERVAL_MS);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      if (controllerRef.current) {
        controllerRef.current.abort();
      }
    };
  }, [isActive, fetchAll]);

  // Derived values
  const heatwaveRisk = weather?.current
    ? calculateHeatwaveRisk(weather.current.temperature, weather.current.humidity)
    : null;

  const climateStatus = getClimateStatus(weather, airQuality, heatwaveRisk);

  const totalPrecipitation7Days = weather?.daily?.precipitation?.reduce(
    (sum, val) => sum + (val || 0),
    0
  ) || 0;

  return {
    // Raw data
    weather,
    airQuality,
    alerts,

    // Derived
    heatwaveRisk,
    climateStatus,
    totalPrecipitation7Days,

    // State
    loading,
    error,
    lastUpdated,

    // Actions
    refresh: fetchAll
  };
};

export default useClimateData;
