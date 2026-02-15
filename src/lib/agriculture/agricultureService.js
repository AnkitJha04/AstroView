/**
 * agricultureService.js - API layer for agriculture intelligence data
 * Fetches precipitation history, temperature data, and calculates derived metrics
 */

const OPEN_METEO_BASE = "https://api.open-meteo.com/v1";
const OPEN_METEO_HISTORICAL = "https://archive-api.open-meteo.com/v1";

// Cache for API responses
const cache = new Map();
const CACHE_DURATION = 10 * 60 * 1000; // 10 minutes

/**
 * Get cached data or fetch fresh
 */
const getCachedOrFetch = async (key, fetchFn) => {
  const cached = cache.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.data;
  }
  const data = await fetchFn();
  cache.set(key, { data, timestamp: Date.now() });
  return data;
};

/**
 * Fetch extended precipitation history (7 and 30 days)
 */
export const fetchPrecipitationHistory = async (lat, lon, days = 30) => {
  const cacheKey = `precip_${lat}_${lon}_${days}`;
  
  return getCachedOrFetch(cacheKey, async () => {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const formatDate = (d) => d.toISOString().split('T')[0];

    const url = `${OPEN_METEO_BASE}/forecast?latitude=${lat}&longitude=${lon}&daily=precipitation_sum,temperature_2m_max,temperature_2m_min,et0_fao_evapotranspiration&past_days=${days}&timezone=auto`;

    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error("Precipitation fetch failed");
      const data = await res.json();

      const precipitation = data.daily?.precipitation_sum || [];
      const dates = data.daily?.time || [];
      const tempMax = data.daily?.temperature_2m_max || [];
      const tempMin = data.daily?.temperature_2m_min || [];
      const evapotranspiration = data.daily?.et0_fao_evapotranspiration || [];

      // Calculate totals
      const total7Day = precipitation.slice(-7).reduce((a, b) => a + (b || 0), 0);
      const total30Day = precipitation.reduce((a, b) => a + (b || 0), 0);

      // Consecutive dry days (< 1mm)
      let consecutiveDryDays = 0;
      for (let i = precipitation.length - 1; i >= 0; i--) {
        if ((precipitation[i] || 0) < 1) {
          consecutiveDryDays++;
        } else {
          break;
        }
      }

      // Average temperature
      const avgTemp = tempMax.length > 0
        ? tempMax.reduce((a, b) => a + (b || 0), 0) / tempMax.length
        : 25;

      // Total evapotranspiration
      const totalET = evapotranspiration.reduce((a, b) => a + (b || 0), 0);
      const avgET = evapotranspiration.length > 0 
        ? totalET / evapotranspiration.length 
        : 0;

      return {
        precipitation,
        dates,
        tempMax,
        tempMin,
        evapotranspiration,
        total7Day,
        total30Day,
        consecutiveDryDays,
        avgTemperature: avgTemp,
        totalEvapotranspiration: totalET,
        avgEvapotranspiration: avgET
      };
    } catch (err) {
      console.error("Precipitation history fetch error:", err);
      return {
        precipitation: [],
        dates: [],
        total7Day: 0,
        total30Day: 0,
        consecutiveDryDays: 0,
        avgTemperature: 25,
        totalEvapotranspiration: 0
      };
    }
  });
};

/**
 * Fetch current weather conditions for agriculture
 */
export const fetchCurrentConditions = async (lat, lon) => {
  const cacheKey = `agri_current_${lat}_${lon}`;

  return getCachedOrFetch(cacheKey, async () => {
    const url = `${OPEN_METEO_BASE}/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,wind_speed_10m,precipitation,cloud_cover&timezone=auto`;

    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error("Current conditions fetch failed");
      const data = await res.json();

      return {
        temperature: data.current?.temperature_2m,
        humidity: data.current?.relative_humidity_2m,
        apparentTemp: data.current?.apparent_temperature,
        windSpeed: data.current?.wind_speed_10m,
        precipitation: data.current?.precipitation,
        cloudCover: data.current?.cloud_cover
      };
    } catch (err) {
      console.error("Current conditions fetch error:", err);
      return null;
    }
  });
};

/**
 * Fetch historical average rainfall for seasonal comparison
 * Uses climate normals approximation
 */
export const fetchSeasonalNormals = async (lat, lon, month) => {
  const cacheKey = `seasonal_${lat}_${lon}_${month}`;

  return getCachedOrFetch(cacheKey, async () => {
    // Climate normal approximations by latitude band
    // These are simplified proxies - real implementation would use historical API
    const latAbs = Math.abs(lat);
    
    // Seasonal patterns (Northern Hemisphere baseline, flip for Southern)
    const isNorthern = lat >= 0;
    const adjustedMonth = isNorthern ? month : ((month + 6) % 12);
    
    // Approximate monthly rainfall patterns (mm)
    const tropicalPattern = [250, 200, 180, 120, 80, 50, 40, 50, 80, 150, 200, 250];
    const temperatePattern = [80, 70, 75, 60, 55, 50, 45, 50, 60, 75, 85, 90];
    const dryPattern = [15, 12, 10, 8, 5, 2, 1, 2, 5, 10, 12, 15];

    let monthlyNormal;
    if (latAbs < 23.5) {
      monthlyNormal = tropicalPattern[adjustedMonth];
    } else if (latAbs < 45) {
      monthlyNormal = temperatePattern[adjustedMonth];
    } else {
      monthlyNormal = dryPattern[adjustedMonth];
    }

    return {
      monthlyNormal,
      seasonalNormal: monthlyNormal * 3, // Quarterly
      annualNormal: monthlyNormal * 12
    };
  });
};

/**
 * Fetch soil data proxy from terrain/elevation
 */
export const fetchTerrainData = async (lat, lon) => {
  const cacheKey = `terrain_${lat}_${lon}`;

  return getCachedOrFetch(cacheKey, async () => {
    const url = `${OPEN_METEO_BASE}/elevation?latitude=${lat}&longitude=${lon}`;

    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error("Elevation fetch failed");
      const data = await res.json();

      const elevation = data.elevation?.[0] || 0;

      // Derive soil drainage proxy from elevation
      // Lower elevation = potentially more water accumulation
      let drainageClass = "MODERATE";
      if (elevation < 50) drainageClass = "POOR";
      else if (elevation > 500) drainageClass = "GOOD";

      return {
        elevation,
        drainageClass
      };
    } catch (err) {
      console.error("Terrain fetch error:", err);
      return { elevation: 0, drainageClass: "MODERATE" };
    }
  });
};

/**
 * Calculate water balance
 * Precipitation - Evapotranspiration
 */
export const calculateWaterBalance = (precipHistory) => {
  if (!precipHistory) return { balance7Day: 0, balance30Day: 0 };

  const precip7 = precipHistory.total7Day || 0;
  const precip30 = precipHistory.total30Day || 0;
  const et = precipHistory.totalEvapotranspiration || 0;

  // Approximate 7-day ET
  const et7Day = precipHistory.evapotranspiration?.slice(-7).reduce((a, b) => a + (b || 0), 0) || 0;

  return {
    balance7Day: precip7 - et7Day,
    balance30Day: precip30 - et,
    deficit: Math.max(0, et - precip30),
    surplus: Math.max(0, precip30 - et)
  };
};

/**
 * Get growing degree days (GDD)
 * Accumulated heat units above base temperature
 */
export const calculateGrowingDegreeDays = (precipHistory, baseTemp = 10) => {
  if (!precipHistory?.tempMax || !precipHistory?.tempMin) return 0;

  let gdd = 0;
  for (let i = 0; i < precipHistory.tempMax.length; i++) {
    const avgTemp = ((precipHistory.tempMax[i] || 0) + (precipHistory.tempMin[i] || 0)) / 2;
    if (avgTemp > baseTemp) {
      gdd += avgTemp - baseTemp;
    }
  }

  return Math.round(gdd);
};

export default {
  fetchPrecipitationHistory,
  fetchCurrentConditions,
  fetchSeasonalNormals,
  fetchTerrainData,
  calculateWaterBalance,
  calculateGrowingDegreeDays
};
