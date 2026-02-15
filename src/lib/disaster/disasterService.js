/**
 * disasterService.js - API layer for disaster data
 * Fetches earthquakes, storms, and severe weather from public APIs
 */

const USGS_EARTHQUAKE_API = "https://earthquake.usgs.gov/fdsnws/event/1/query";
const OPEN_METEO_API = "https://api.open-meteo.com/v1/forecast";

// Cache configuration
const CACHE_DURATION_MS = 10 * 60 * 1000; // 10 minutes
const cache = new Map();

/**
 * Get cached data or null if expired/missing
 */
const getCached = (key) => {
  const cached = cache.get(key);
  if (!cached) return null;
  if (Date.now() - cached.timestamp > CACHE_DURATION_MS) {
    cache.delete(key);
    return null;
  }
  return cached.data;
};

/**
 * Set cache with timestamp
 */
const setCache = (key, data) => {
  cache.set(key, { data, timestamp: Date.now() });
};

/**
 * Calculate distance between two coordinates (Haversine formula)
 * Returns distance in kilometers
 */
export const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

/**
 * Format time ago string
 */
export const formatTimeAgo = (timestamp) => {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  
  if (seconds < 60) return "Just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
};

/**
 * Fetch earthquakes from USGS
 * @param {Object} coords - User coordinates {lat, lon}
 * @param {number} radiusKm - Search radius in kilometers (max 20001)
 * @param {number} minMagnitude - Minimum magnitude filter
 * @returns {Promise<Array>} Array of earthquake events
 */
export const fetchEarthquakes = async (coords, radiusKm = 1000, minMagnitude = 2.5) => {
  if (!coords?.lat || !coords?.lon) return [];

  const cacheKey = `earthquakes-${coords.lat.toFixed(2)}-${coords.lon.toFixed(2)}`;
  const cached = getCached(cacheKey);
  if (cached) return cached;

  try {
    const endTime = new Date().toISOString();
    const startTime = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(); // Last 7 days

    const params = new URLSearchParams({
      format: "geojson",
      starttime: startTime,
      endtime: endTime,
      latitude: coords.lat.toFixed(4),
      longitude: coords.lon.toFixed(4),
      maxradiuskm: Math.min(radiusKm, 20001).toString(),
      minmagnitude: minMagnitude.toString(),
      orderby: "time",
      limit: "50"
    });

    const response = await fetch(`${USGS_EARTHQUAKE_API}?${params}`);
    if (!response.ok) throw new Error("USGS API request failed");

    const data = await response.json();
    
    const earthquakes = (data.features || []).map((feature) => {
      const props = feature.properties;
      const [lon, lat, depth] = feature.geometry.coordinates;
      const distance = calculateDistance(coords.lat, coords.lon, lat, lon);

      return {
        id: feature.id,
        magnitude: props.mag,
        magnitudeType: props.magType,
        location: props.place,
        time: props.time,
        timeAgo: formatTimeAgo(props.time),
        depth: depth,
        lat,
        lon,
        distance: Math.round(distance),
        url: props.url,
        felt: props.felt,
        tsunami: props.tsunami === 1,
        alert: props.alert,
        significance: props.sig
      };
    });

    // Sort by distance and limit to 10
    const sorted = earthquakes
      .filter((eq) => eq.distance <= radiusKm)
      .sort((a, b) => a.distance - b.distance)
      .slice(0, 10);

    setCache(cacheKey, sorted);
    return sorted;
  } catch (error) {
    console.error("Earthquake fetch error:", error);
    return [];
  }
};

/**
 * Get magnitude classification
 */
export const getMagnitudeClass = (mag) => {
  if (mag >= 8) return { level: "GREAT", color: "#7c2d12", description: "Can cause serious damage over large areas" };
  if (mag >= 7) return { level: "MAJOR", color: "#dc2626", description: "Can cause serious damage" };
  if (mag >= 6) return { level: "STRONG", color: "#ea580c", description: "Can cause damage to buildings" };
  if (mag >= 5) return { level: "MODERATE", color: "#f59e0b", description: "Can cause minor damage" };
  if (mag >= 4) return { level: "LIGHT", color: "#eab308", description: "Often felt, rarely causes damage" };
  if (mag >= 3) return { level: "MINOR", color: "#84cc16", description: "Often felt by people" };
  return { level: "MICRO", color: "#22c55e", description: "Usually not felt" };
};

/**
 * Fetch severe weather alerts
 * Uses Open-Meteo alerts endpoint
 */
export const fetchSevereWeather = async (coords) => {
  if (!coords?.lat || !coords?.lon) return { alerts: [], storms: [] };

  const cacheKey = `severe-weather-${coords.lat.toFixed(2)}-${coords.lon.toFixed(2)}`;
  const cached = getCached(cacheKey);
  if (cached) return cached;

  try {
    // Fetch detailed weather data for storm detection
    const params = new URLSearchParams({
      latitude: coords.lat.toFixed(4),
      longitude: coords.lon.toFixed(4),
      current: [
        "temperature_2m",
        "wind_speed_10m",
        "wind_direction_10m",
        "wind_gusts_10m",
        "weather_code",
        "pressure_msl",
        "cloud_cover"
      ].join(","),
      hourly: [
        "wind_speed_10m",
        "wind_gusts_10m",
        "precipitation",
        "weather_code"
      ].join(","),
      forecast_days: "3",
      timezone: "auto"
    });

    const response = await fetch(`${OPEN_METEO_API}?${params}`);
    if (!response.ok) throw new Error("Weather API request failed");

    const data = await response.json();
    
    // Analyze for storm conditions
    const storms = detectStormConditions(data);
    const alerts = generateWeatherAlerts(data);

    const result = { alerts, storms, raw: data };
    setCache(cacheKey, result);
    return result;
  } catch (error) {
    console.error("Severe weather fetch error:", error);
    return { alerts: [], storms: [] };
  }
};

/**
 * Detect storm conditions from weather data
 */
const detectStormConditions = (data) => {
  const storms = [];
  const current = data.current;
  
  if (!current) return storms;

  const windSpeed = current.wind_speed_10m;
  const windGusts = current.wind_gusts_10m;
  const weatherCode = current.weather_code;

  // Tropical storm detection (simplified)
  // Weather codes 95-99 indicate thunderstorm activity
  if (weatherCode >= 95 || windGusts > 90 || windSpeed > 60) {
    const category = getStormCategory(windSpeed, windGusts);
    storms.push({
      id: `storm-${Date.now()}`,
      type: category.type,
      name: category.name,
      category: category.category,
      windSpeed: windSpeed,
      windGusts: windGusts,
      direction: getWindDirection(current.wind_direction_10m),
      directionDeg: current.wind_direction_10m,
      pressure: current.pressure_msl,
      risk: category.risk,
      timestamp: Date.now()
    });
  }

  return storms;
};

/**
 * Classify storm category based on wind speed
 */
const getStormCategory = (windSpeed, windGusts) => {
  const maxWind = Math.max(windSpeed, windGusts * 0.8);

  if (maxWind >= 252) return { type: "Hurricane", name: "Severe Hurricane", category: 5, risk: "SEVERE" };
  if (maxWind >= 209) return { type: "Hurricane", name: "Major Hurricane", category: 4, risk: "SEVERE" };
  if (maxWind >= 178) return { type: "Hurricane", name: "Hurricane", category: 3, risk: "HIGH" };
  if (maxWind >= 154) return { type: "Hurricane", name: "Hurricane", category: 2, risk: "HIGH" };
  if (maxWind >= 119) return { type: "Hurricane", name: "Hurricane", category: 1, risk: "MODERATE" };
  if (maxWind >= 63) return { type: "Tropical Storm", name: "Tropical Storm", category: "TS", risk: "MODERATE" };
  if (maxWind >= 40) return { type: "Tropical Depression", name: "Tropical Depression", category: "TD", risk: "LOW" };
  return { type: "Storm", name: "Severe Weather", category: null, risk: "LOW" };
};

/**
 * Get wind direction string
 */
const getWindDirection = (degrees) => {
  const directions = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"];
  const index = Math.round(degrees / 22.5) % 16;
  return directions[index];
};

/**
 * Generate weather alerts from data
 */
const generateWeatherAlerts = (data) => {
  const alerts = [];
  const current = data.current;
  const hourly = data.hourly;

  if (!current || !hourly) return alerts;

  // High wind alert
  if (current.wind_gusts_10m > 80) {
    alerts.push({
      id: "wind-alert",
      type: "WIND",
      severity: current.wind_gusts_10m > 100 ? "HIGH" : "MODERATE",
      title: "High Wind Warning",
      description: `Wind gusts up to ${Math.round(current.wind_gusts_10m)} km/h`,
      recommendation: "Secure loose objects. Avoid unnecessary travel."
    });
  }

  // Heavy precipitation alert
  const next24hPrecip = hourly.precipitation?.slice(0, 24).reduce((sum, p) => sum + (p || 0), 0) || 0;
  if (next24hPrecip > 50) {
    alerts.push({
      id: "precip-alert",
      type: "RAIN",
      severity: next24hPrecip > 100 ? "HIGH" : "MODERATE",
      title: "Heavy Rainfall Warning",
      description: `Expected ${Math.round(next24hPrecip)}mm in next 24 hours`,
      recommendation: "Monitor local flood warnings. Avoid low-lying areas."
    });
  }

  // Thunderstorm alert
  const hasThunderstorm = current.weather_code >= 95;
  if (hasThunderstorm) {
    alerts.push({
      id: "thunderstorm-alert",
      type: "STORM",
      severity: current.weather_code >= 96 ? "HIGH" : "MODERATE",
      title: "Thunderstorm Warning",
      description: "Active thunderstorm conditions in your area",
      recommendation: "Seek shelter indoors. Avoid open areas."
    });
  }

  return alerts;
};

/**
 * Fetch extended precipitation data for flood analysis
 */
export const fetchPrecipitationHistory = async (coords) => {
  if (!coords?.lat || !coords?.lon) return null;

  const cacheKey = `precip-history-${coords.lat.toFixed(2)}-${coords.lon.toFixed(2)}`;
  const cached = getCached(cacheKey);
  if (cached) return cached;

  try {
    const endDate = new Date().toISOString().split("T")[0];
    const startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

    const params = new URLSearchParams({
      latitude: coords.lat.toFixed(4),
      longitude: coords.lon.toFixed(4),
      daily: "precipitation_sum,rain_sum",
      start_date: startDate,
      end_date: endDate,
      timezone: "auto"
    });

    const response = await fetch(`${OPEN_METEO_API}?${params}`);
    if (!response.ok) throw new Error("Precipitation API failed");

    const data = await response.json();
    
    const result = {
      dates: data.daily?.time || [],
      precipitation: data.daily?.precipitation_sum || [],
      rain: data.daily?.rain_sum || [],
      total7Day: (data.daily?.precipitation_sum || []).reduce((sum, p) => sum + (p || 0), 0),
      total3Day: (data.daily?.precipitation_sum || []).slice(-3).reduce((sum, p) => sum + (p || 0), 0)
    };

    setCache(cacheKey, result);
    return result;
  } catch (error) {
    console.error("Precipitation history error:", error);
    return null;
  }
};

/**
 * Clear all cached data
 */
export const clearDisasterCache = () => {
  cache.clear();
};

export default {
  fetchEarthquakes,
  fetchSevereWeather,
  fetchPrecipitationHistory,
  calculateDistance,
  getMagnitudeClass,
  formatTimeAgo,
  clearDisasterCache
};
