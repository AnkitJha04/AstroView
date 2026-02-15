/**
 * Climate Service - API layer for fetching climate and weather data
 * Uses Open-Meteo (free, no API key) and OpenWeather for cloud tiles
 */

const OPEN_METEO_BASE = "https://api.open-meteo.com/v1";
const OPENWEATHER_TILES_BASE = "https://tile.openweathermap.org/map";
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

const cache = new Map();

const getCached = (key) => {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.timestamp > CACHE_TTL_MS) {
    cache.delete(key);
    return null;
  }
  return entry.data;
};

const setCache = (key, data) => {
  cache.set(key, { data, timestamp: Date.now() });
};

/**
 * Fetch current weather and 7-day forecast from Open-Meteo
 */
export const fetchWeatherData = async (lat, lon, signal) => {
  const cacheKey = `weather-${lat.toFixed(2)}-${lon.toFixed(2)}`;
  const cached = getCached(cacheKey);
  if (cached) return cached;

  const params = new URLSearchParams({
    latitude: lat.toFixed(4),
    longitude: lon.toFixed(4),
    current: [
      "temperature_2m",
      "relative_humidity_2m",
      "apparent_temperature",
      "precipitation",
      "cloud_cover",
      "wind_speed_10m",
      "wind_direction_10m",
      "weather_code"
    ].join(","),
    daily: [
      "temperature_2m_max",
      "temperature_2m_min",
      "precipitation_sum",
      "weather_code"
    ].join(","),
    timezone: "auto",
    forecast_days: "7"
  });

  const res = await fetch(`${OPEN_METEO_BASE}/forecast?${params}`, { signal });
  if (!res.ok) throw new Error("Weather data fetch failed");

  const data = await res.json();
  const result = {
    current: {
      temperature: data.current?.temperature_2m ?? null,
      humidity: data.current?.relative_humidity_2m ?? null,
      apparentTemp: data.current?.apparent_temperature ?? null,
      precipitation: data.current?.precipitation ?? 0,
      cloudCover: data.current?.cloud_cover ?? 0,
      windSpeed: data.current?.wind_speed_10m ?? 0,
      windDirection: data.current?.wind_direction_10m ?? 0,
      weatherCode: data.current?.weather_code ?? 0
    },
    daily: {
      dates: data.daily?.time || [],
      tempMax: data.daily?.temperature_2m_max || [],
      tempMin: data.daily?.temperature_2m_min || [],
      precipitation: data.daily?.precipitation_sum || []
    },
    units: {
      temperature: data.current_units?.temperature_2m || "°C",
      precipitation: data.daily_units?.precipitation_sum || "mm"
    }
  };

  setCache(cacheKey, result);
  return result;
};

/**
 * Fetch air quality data from Open-Meteo
 */
export const fetchAirQuality = async (lat, lon, signal) => {
  const cacheKey = `aqi-${lat.toFixed(2)}-${lon.toFixed(2)}`;
  const cached = getCached(cacheKey);
  if (cached) return cached;

  const params = new URLSearchParams({
    latitude: lat.toFixed(4),
    longitude: lon.toFixed(4),
    current: ["european_aqi", "us_aqi", "pm10", "pm2_5", "carbon_monoxide", "nitrogen_dioxide", "ozone"].join(",")
  });

  const res = await fetch(`${OPEN_METEO_BASE}/air-quality?${params}`, { signal });
  if (!res.ok) throw new Error("Air quality fetch failed");

  const data = await res.json();
  const result = {
    europeanAqi: data.current?.european_aqi ?? null,
    usAqi: data.current?.us_aqi ?? null,
    pm10: data.current?.pm10 ?? null,
    pm25: data.current?.pm2_5 ?? null,
    co: data.current?.carbon_monoxide ?? null,
    no2: data.current?.nitrogen_dioxide ?? null,
    ozone: data.current?.ozone ?? null
  };

  setCache(cacheKey, result);
  return result;
};

/**
 * Calculate heatwave risk based on temperature and humidity
 */
export const calculateHeatwaveRisk = (temperature, humidity) => {
  if (temperature === null || humidity === null) {
    return { level: "UNKNOWN", color: "#64748b", score: 0 };
  }

  // Heat index approximation
  const heatIndex = temperature + (0.5 * humidity);
  
  // Risk thresholds
  if (temperature >= 40 || (temperature >= 35 && humidity >= 60)) {
    return { level: "HIGH", color: "#ef4444", score: 3 };
  }
  if (temperature >= 32 || (temperature >= 28 && humidity >= 70)) {
    return { level: "MODERATE", color: "#f59e0b", score: 2 };
  }
  return { level: "LOW", color: "#22c55e", score: 1 };
};

/**
 * Calculate rain deficit based on 7-day precipitation
 */
export const calculateRainDeficit = (precipitationArray, expectedMm = 15) => {
  const totalPrecip = precipitationArray.reduce((sum, val) => sum + (val || 0), 0);
  const deficit = expectedMm - totalPrecip;
  
  if (deficit > 10) return { status: "SEVERE_DEFICIT", value: deficit };
  if (deficit > 5) return { status: "MODERATE_DEFICIT", value: deficit };
  if (deficit > 0) return { status: "SLIGHT_DEFICIT", value: deficit };
  return { status: "ADEQUATE", value: Math.abs(deficit) };
};

/**
 * Generate climate status summary
 */
export const getClimateStatus = (weather, airQuality, heatRisk) => {
  if (!weather) return { status: "UNKNOWN", detail: "No data available" };

  const issues = [];
  
  if (heatRisk?.level === "HIGH") {
    issues.push("Extreme Heat");
  } else if (heatRisk?.level === "MODERATE") {
    issues.push("Heat Advisory");
  }

  const rainStatus = calculateRainDeficit(weather.daily?.precipitation || []);
  if (rainStatus.status === "SEVERE_DEFICIT") {
    issues.push("Rain Deficit");
  }

  if (airQuality?.usAqi && airQuality.usAqi > 150) {
    issues.push("Poor Air Quality");
  } else if (airQuality?.usAqi && airQuality.usAqi > 100) {
    issues.push("Moderate Air Quality");
  }

  if (weather.current?.weatherCode >= 95) {
    issues.push("Severe Weather");
  }

  if (issues.length === 0) {
    return { status: "STABLE", detail: "Conditions are favorable", color: "#22c55e" };
  }
  if (issues.length === 1) {
    return { status: "ALERT", detail: issues[0], color: "#f59e0b" };
  }
  return { status: "WARNING", detail: issues.join(" • "), color: "#ef4444" };
};

/**
 * Get cloud tile URL for OpenWeather overlay
 */
export const getCloudTileUrl = (z, x, y) => {
  const apiKey = import.meta.env.VITE_OPENWEATHER_API_KEY;
  if (!apiKey) return null;
  return `${OPENWEATHER_TILES_BASE}/clouds_new/${z}/${x}/${y}.png?appid=${apiKey}`;
};

/**
 * Fetch severe weather alerts (using Open-Meteo weather codes as proxy)
 */
export const fetchSevereWeatherAlerts = async (lat, lon, signal) => {
  const cacheKey = `alerts-${lat.toFixed(2)}-${lon.toFixed(2)}`;
  const cached = getCached(cacheKey);
  if (cached) return cached;

  // Open-Meteo doesn't have a dedicated alerts API, so we derive from weather codes
  const weather = await fetchWeatherData(lat, lon, signal);
  const alerts = [];

  const weatherCode = weather.current?.weatherCode || 0;
  const windSpeed = weather.current?.windSpeed || 0;

  // Weather code interpretation (WMO codes)
  if (weatherCode >= 95 && weatherCode <= 99) {
    alerts.push({
      id: `storm-${Date.now()}`,
      name: weatherCode === 96 || weatherCode === 99 ? "Thunderstorm with Hail" : "Thunderstorm",
      type: "THUNDERSTORM",
      windSpeed: windSpeed,
      windDirection: weather.current?.windDirection || 0,
      riskLevel: weatherCode >= 96 ? "HIGH" : "MODERATE",
      color: weatherCode >= 96 ? "#ef4444" : "#f59e0b"
    });
  }

  if (windSpeed >= 80) {
    alerts.push({
      id: `wind-${Date.now()}`,
      name: "High Wind Warning",
      type: "WIND",
      windSpeed: windSpeed,
      windDirection: weather.current?.windDirection || 0,
      riskLevel: windSpeed >= 100 ? "HIGH" : "MODERATE",
      color: windSpeed >= 100 ? "#ef4444" : "#f59e0b"
    });
  }

  if (weatherCode >= 71 && weatherCode <= 77) {
    alerts.push({
      id: `snow-${Date.now()}`,
      name: "Snow Advisory",
      type: "SNOW",
      windSpeed: windSpeed,
      windDirection: weather.current?.windDirection || 0,
      riskLevel: weatherCode >= 75 ? "HIGH" : "MODERATE",
      color: weatherCode >= 75 ? "#ef4444" : "#f59e0b"
    });
  }

  setCache(cacheKey, alerts);
  return alerts;
};

/**
 * Get weather code description
 */
export const getWeatherDescription = (code) => {
  const descriptions = {
    0: "Clear sky",
    1: "Mainly clear",
    2: "Partly cloudy",
    3: "Overcast",
    45: "Foggy",
    48: "Depositing rime fog",
    51: "Light drizzle",
    53: "Moderate drizzle",
    55: "Dense drizzle",
    61: "Slight rain",
    63: "Moderate rain",
    65: "Heavy rain",
    71: "Slight snow",
    73: "Moderate snow",
    75: "Heavy snow",
    77: "Snow grains",
    80: "Slight rain showers",
    81: "Moderate rain showers",
    82: "Violent rain showers",
    85: "Slight snow showers",
    86: "Heavy snow showers",
    95: "Thunderstorm",
    96: "Thunderstorm with slight hail",
    99: "Thunderstorm with heavy hail"
  };
  return descriptions[code] || "Unknown";
};

/**
 * Get wind direction as compass
 */
export const getWindDirection = (degrees) => {
  const directions = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"];
  const index = Math.round(degrees / 22.5) % 16;
  return directions[index];
};

/**
 * Format AQI level
 */
export const getAqiLevel = (aqi) => {
  if (aqi === null || aqi === undefined) return { level: "Unknown", color: "#64748b" };
  if (aqi <= 50) return { level: "Good", color: "#22c55e" };
  if (aqi <= 100) return { level: "Moderate", color: "#f59e0b" };
  if (aqi <= 150) return { level: "Unhealthy (Sensitive)", color: "#f97316" };
  if (aqi <= 200) return { level: "Unhealthy", color: "#ef4444" };
  if (aqi <= 300) return { level: "Very Unhealthy", color: "#dc2626" };
  return { level: "Hazardous", color: "#7c2d12" };
};
