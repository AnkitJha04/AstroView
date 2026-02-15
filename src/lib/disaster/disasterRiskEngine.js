/**
 * disasterRiskEngine.js - Risk scoring and classification logic
 * Computes flood, wildfire, earthquake, cyclone, and combined disaster risk
 */

/**
 * Risk level thresholds and colors
 */
export const RISK_LEVELS = {
  LOW: { label: "LOW", color: "#22c55e", bgColor: "#22c55e20", score: 0 },
  MODERATE: { label: "MODERATE", color: "#f59e0b", bgColor: "#f59e0b20", score: 25 },
  HIGH: { label: "HIGH", color: "#ef4444", bgColor: "#ef444420", score: 60 },
  SEVERE: { label: "SEVERE", color: "#7c2d12", bgColor: "#7c2d1220", score: 85 },
  EXTREME: { label: "EXTREME", color: "#581c87", bgColor: "#581c8720", score: 95 }
};

/**
 * Get risk level from score
 */
export const getRiskLevel = (score) => {
  if (score >= 85) return RISK_LEVELS.EXTREME;
  if (score >= 60) return RISK_LEVELS.HIGH;
  if (score >= 35) return RISK_LEVELS.MODERATE;
  return RISK_LEVELS.LOW;
};

/**
 * Flood Risk Calculation
 * Based on precipitation patterns, rainfall intensity, and anomalies
 */
export const calculateFloodRisk = (precipData, currentWeather) => {
  if (!precipData) {
    return {
      score: 0,
      level: RISK_LEVELS.LOW,
      factors: [],
      reasoning: "Insufficient precipitation data available"
    };
  }

  let score = 0;
  const factors = [];

  // Factor 1: 7-day precipitation total
  const total7Day = precipData.total7Day || 0;
  if (total7Day > 150) {
    score += 40;
    factors.push({ name: "7-day accumulation", value: `${total7Day.toFixed(0)}mm`, impact: "HIGH" });
  } else if (total7Day > 100) {
    score += 25;
    factors.push({ name: "7-day accumulation", value: `${total7Day.toFixed(0)}mm`, impact: "MODERATE" });
  } else if (total7Day > 50) {
    score += 10;
    factors.push({ name: "7-day accumulation", value: `${total7Day.toFixed(0)}mm`, impact: "LOW" });
  }

  // Factor 2: 3-day precipitation (more immediate risk)
  const total3Day = precipData.total3Day || 0;
  if (total3Day > 100) {
    score += 35;
    factors.push({ name: "72-hour rainfall", value: `${total3Day.toFixed(0)}mm`, impact: "HIGH" });
  } else if (total3Day > 60) {
    score += 20;
    factors.push({ name: "72-hour rainfall", value: `${total3Day.toFixed(0)}mm`, impact: "MODERATE" });
  } else if (total3Day > 30) {
    score += 8;
    factors.push({ name: "72-hour rainfall", value: `${total3Day.toFixed(0)}mm`, impact: "LOW" });
  }

  // Factor 3: Current rainfall intensity
  if (currentWeather?.precipitation) {
    const currentPrecip = currentWeather.precipitation;
    if (currentPrecip > 10) {
      score += 25;
      factors.push({ name: "Current intensity", value: `${currentPrecip.toFixed(1)}mm/hr`, impact: "HIGH" });
    } else if (currentPrecip > 5) {
      score += 15;
      factors.push({ name: "Current intensity", value: `${currentPrecip.toFixed(1)}mm/hr`, impact: "MODERATE" });
    }
  }

  // Factor 4: Soil saturation proxy (consecutive rain days)
  const rainDays = (precipData.precipitation || []).filter(p => p > 1).length;
  if (rainDays >= 5) {
    score += 15;
    factors.push({ name: "Soil saturation", value: `${rainDays} rain days`, impact: "HIGH" });
  } else if (rainDays >= 3) {
    score += 8;
    factors.push({ name: "Soil saturation", value: `${rainDays} rain days`, impact: "MODERATE" });
  }

  score = Math.min(100, score);
  const level = getRiskLevel(score);

  // Generate reasoning
  let reasoning = "Normal precipitation levels";
  if (score >= 60) {
    reasoning = "Heavy rainfall accumulation creating significant flood risk";
  } else if (score >= 35) {
    reasoning = "Elevated precipitation may cause localized flooding";
  } else if (score >= 15) {
    reasoning = "Moderate rainfall detected, monitor conditions";
  }

  return {
    score,
    level,
    factors,
    reasoning,
    recommendations: getFloodRecommendations(level.label)
  };
};

/**
 * Get flood safety recommendations
 */
const getFloodRecommendations = (level) => {
  const base = ["Monitor local weather updates"];
  
  switch (level) {
    case "EXTREME":
    case "SEVERE":
      return [
        "Evacuate if authorities advise",
        "Move to higher ground immediately",
        "Avoid walking or driving through flood water",
        "Prepare emergency supplies"
      ];
    case "HIGH":
      return [
        "Prepare emergency supplies",
        "Identify evacuation routes",
        "Avoid low-lying areas",
        "Do not attempt to cross flooded roads"
      ];
    case "MODERATE":
      return [
        "Stay informed of weather conditions",
        "Avoid flood-prone areas",
        "Keep emergency kit accessible"
      ];
    default:
      return base;
  }
};

/**
 * Wildfire Risk Calculation
 * Based on temperature, humidity, wind, and rain deficit
 */
export const calculateWildfireRisk = (weather, precipData) => {
  if (!weather) {
    return {
      score: 0,
      level: RISK_LEVELS.LOW,
      factors: [],
      reasoning: "Insufficient weather data"
    };
  }

  let score = 0;
  const factors = [];

  const temp = weather.temperature || weather.temperature_2m || 0;
  const humidity = weather.humidity || weather.relative_humidity_2m || 50;
  const windSpeed = weather.windSpeed || weather.wind_speed_10m || 0;

  // Factor 1: Temperature
  if (temp > 40) {
    score += 30;
    factors.push({ name: "Temperature", value: `${temp.toFixed(1)}°C`, impact: "HIGH" });
  } else if (temp > 35) {
    score += 20;
    factors.push({ name: "Temperature", value: `${temp.toFixed(1)}°C`, impact: "MODERATE" });
  } else if (temp > 30) {
    score += 10;
    factors.push({ name: "Temperature", value: `${temp.toFixed(1)}°C`, impact: "LOW" });
  }

  // Factor 2: Low humidity
  if (humidity < 20) {
    score += 30;
    factors.push({ name: "Humidity", value: `${humidity}%`, impact: "HIGH" });
  } else if (humidity < 30) {
    score += 20;
    factors.push({ name: "Humidity", value: `${humidity}%`, impact: "MODERATE" });
  } else if (humidity < 40) {
    score += 10;
    factors.push({ name: "Humidity", value: `${humidity}%`, impact: "LOW" });
  }

  // Factor 3: Wind speed
  if (windSpeed > 40) {
    score += 25;
    factors.push({ name: "Wind speed", value: `${windSpeed.toFixed(0)} km/h`, impact: "HIGH" });
  } else if (windSpeed > 25) {
    score += 15;
    factors.push({ name: "Wind speed", value: `${windSpeed.toFixed(0)} km/h`, impact: "MODERATE" });
  } else if (windSpeed > 15) {
    score += 5;
    factors.push({ name: "Wind speed", value: `${windSpeed.toFixed(0)} km/h`, impact: "LOW" });
  }

  // Factor 4: Rain deficit (dry conditions)
  if (precipData) {
    const total7Day = precipData.total7Day || 0;
    if (total7Day < 2) {
      score += 20;
      factors.push({ name: "Rain deficit", value: "Dry conditions", impact: "HIGH" });
    } else if (total7Day < 10) {
      score += 10;
      factors.push({ name: "Rain deficit", value: "Low precipitation", impact: "MODERATE" });
    }
  }

  score = Math.min(100, score);
  const level = getRiskLevel(score);

  let reasoning = "Normal fire weather conditions";
  if (score >= 60) {
    reasoning = "Extreme fire weather: high temp, low humidity, strong winds";
  } else if (score >= 35) {
    reasoning = "Elevated fire risk due to dry and warm conditions";
  } else if (score >= 15) {
    reasoning = "Mild fire weather, maintain awareness";
  }

  return {
    score,
    level,
    factors,
    reasoning,
    recommendations: getWildfireRecommendations(level.label)
  };
};

/**
 * Wildfire safety recommendations
 */
const getWildfireRecommendations = (level) => {
  switch (level) {
    case "EXTREME":
      return [
        "Be prepared to evacuate immediately",
        "Create defensible space around property",
        "Have emergency bag ready",
        "Monitor emergency channels"
      ];
    case "HIGH":
      return [
        "Avoid outdoor burning",
        "Clear dry vegetation from property",
        "Have evacuation plan ready",
        "Keep emergency supplies accessible"
      ];
    case "MODERATE":
      return [
        "Exercise caution with outdoor activities",
        "Ensure fire extinguishers are available",
        "Report any smoke or fire immediately"
      ];
    default:
      return ["Follow local fire advisories"];
  }
};

/**
 * Earthquake Proximity Risk
 * Based on recent earthquake activity near user location
 */
export const calculateEarthquakeRisk = (earthquakes) => {
  if (!earthquakes || earthquakes.length === 0) {
    return {
      score: 0,
      level: RISK_LEVELS.LOW,
      factors: [],
      reasoning: "No significant seismic activity detected nearby",
      recentCount: 0,
      strongestMag: 0
    };
  }

  let score = 0;
  const factors = [];

  // Recent significant quakes (last 24 hours within 500km)
  const now = Date.now();
  const recent24h = earthquakes.filter(eq => 
    (now - eq.time) < 24 * 60 * 60 * 1000 && eq.distance < 500
  );

  // Strongest magnitude in dataset
  const strongest = earthquakes.reduce((max, eq) => eq.magnitude > max.magnitude ? eq : max, earthquakes[0]);

  // Factor 1: Strongest recent earthquake
  if (strongest.magnitude >= 6) {
    score += 40;
    factors.push({ name: "Nearby major quake", value: `M${strongest.magnitude.toFixed(1)}`, impact: "HIGH" });
  } else if (strongest.magnitude >= 5) {
    score += 25;
    factors.push({ name: "Moderate quake nearby", value: `M${strongest.magnitude.toFixed(1)}`, impact: "MODERATE" });
  } else if (strongest.magnitude >= 4) {
    score += 10;
    factors.push({ name: "Light quake detected", value: `M${strongest.magnitude.toFixed(1)}`, impact: "LOW" });
  }

  // Factor 2: Proximity of strongest
  if (strongest.distance < 100) {
    score += 25;
    factors.push({ name: "Proximity", value: `${strongest.distance}km away`, impact: "HIGH" });
  } else if (strongest.distance < 300) {
    score += 15;
    factors.push({ name: "Proximity", value: `${strongest.distance}km away`, impact: "MODERATE" });
  } else if (strongest.distance < 500) {
    score += 5;
    factors.push({ name: "Proximity", value: `${strongest.distance}km away`, impact: "LOW" });
  }

  // Factor 3: Frequency (aftershock indicator)
  if (recent24h.length >= 5) {
    score += 20;
    factors.push({ name: "Seismic swarm", value: `${recent24h.length} events/24h`, impact: "HIGH" });
  } else if (recent24h.length >= 3) {
    score += 10;
    factors.push({ name: "Elevated activity", value: `${recent24h.length} events/24h`, impact: "MODERATE" });
  }

  // Factor 4: Tsunami risk
  const tsunamiRisk = earthquakes.some(eq => eq.tsunami && eq.magnitude >= 7);
  if (tsunamiRisk) {
    score += 15;
    factors.push({ name: "Tsunami potential", value: "Detected", impact: "HIGH" });
  }

  score = Math.min(100, score);
  const level = getRiskLevel(score);

  let reasoning = "No significant seismic events in your area";
  if (score >= 60) {
    reasoning = "Significant seismic activity detected - aftershocks possible";
  } else if (score >= 35) {
    reasoning = "Moderate earthquake activity in region";
  } else if (score >= 15) {
    reasoning = "Minor seismic activity detected";
  }

  return {
    score,
    level,
    factors,
    reasoning,
    recentCount: earthquakes.length,
    strongestMag: strongest?.magnitude || 0,
    recommendations: getEarthquakeRecommendations(level.label)
  };
};

/**
 * Earthquake safety recommendations
 */
const getEarthquakeRecommendations = (level) => {
  switch (level) {
    case "EXTREME":
    case "SEVERE":
      return [
        "Expect aftershocks - stay alert",
        "Avoid damaged buildings",
        "Check for gas leaks and hazards",
        "Listen to emergency broadcasts"
      ];
    case "HIGH":
      return [
        "Review earthquake safety procedures",
        "Secure heavy furniture and objects",
        "Know your evacuation routes",
        "Keep emergency supplies ready"
      ];
    case "MODERATE":
      return [
        "Be aware of seismic activity",
        "Ensure emergency kit is stocked",
        "Know Drop, Cover, Hold On procedure"
      ];
    default:
      return ["Standard earthquake preparedness advised"];
  }
};

/**
 * Cyclone/Storm Risk from storm data
 */
export const calculateCycloneRisk = (storms, alerts) => {
  if ((!storms || storms.length === 0) && (!alerts || alerts.length === 0)) {
    return {
      score: 0,
      level: RISK_LEVELS.LOW,
      factors: [],
      reasoning: "No active storm systems detected",
      activeStorms: 0
    };
  }

  let score = 0;
  const factors = [];

  // Analyze active storms
  if (storms && storms.length > 0) {
    const strongest = storms.reduce((max, s) => 
      (s.windSpeed || 0) > (max.windSpeed || 0) ? s : max, storms[0]
    );

    if (strongest.category >= 3) {
      score += 50;
      factors.push({ name: "Major storm", value: `Cat ${strongest.category}`, impact: "HIGH" });
    } else if (strongest.category >= 1) {
      score += 35;
      factors.push({ name: "Hurricane", value: `Cat ${strongest.category}`, impact: "MODERATE" });
    } else if (strongest.type === "Tropical Storm") {
      score += 20;
      factors.push({ name: "Tropical storm", value: `${strongest.windSpeed} km/h`, impact: "MODERATE" });
    }

    // Wind factor
    if (strongest.windGusts > 120) {
      score += 25;
      factors.push({ name: "Wind gusts", value: `${strongest.windGusts} km/h`, impact: "HIGH" });
    } else if (strongest.windGusts > 80) {
      score += 15;
      factors.push({ name: "Wind gusts", value: `${strongest.windGusts} km/h`, impact: "MODERATE" });
    }
  }

  // Analyze alerts
  if (alerts && alerts.length > 0) {
    const severeAlerts = alerts.filter(a => a.severity === "HIGH");
    if (severeAlerts.length > 0) {
      score += 20;
      factors.push({ name: "Severe alerts", value: `${severeAlerts.length} active`, impact: "HIGH" });
    } else {
      score += 10;
      factors.push({ name: "Weather alerts", value: `${alerts.length} active`, impact: "MODERATE" });
    }
  }

  score = Math.min(100, score);
  const level = getRiskLevel(score);

  let reasoning = "No significant storm activity";
  if (score >= 60) {
    reasoning = "Active severe storm system in area";
  } else if (score >= 35) {
    reasoning = "Storm conditions present - monitor closely";
  } else if (score >= 15) {
    reasoning = "Weather disturbance detected";
  }

  return {
    score,
    level,
    factors,
    reasoning,
    activeStorms: storms?.length || 0,
    recommendations: getCycloneRecommendations(level.label)
  };
};

/**
 * Cyclone safety recommendations
 */
const getCycloneRecommendations = (level) => {
  switch (level) {
    case "EXTREME":
    case "SEVERE":
      return [
        "Evacuate if instructed by authorities",
        "Seek shelter in a sturdy building",
        "Stay away from windows",
        "Have emergency supplies ready"
      ];
    case "HIGH":
      return [
        "Prepare for possible evacuation",
        "Secure outdoor objects",
        "Stock emergency supplies",
        "Charge all devices"
      ];
    case "MODERATE":
      return [
        "Monitor weather updates",
        "Review emergency plans",
        "Ensure supplies are accessible"
      ];
    default:
      return ["Stay informed of weather conditions"];
  }
};

/**
 * Calculate Combined Disaster Risk Index (0-100)
 * Weighted combination of all risk factors
 */
export const calculateDisasterRiskIndex = (risks) => {
  const {
    floodRisk,
    wildfireRisk,
    earthquakeRisk,
    cycloneRisk,
    heatwaveRisk
  } = risks;

  // Weights for each factor (total = 1.0)
  const weights = {
    flood: 0.25,
    wildfire: 0.20,
    earthquake: 0.20,
    cyclone: 0.25,
    heatwave: 0.10
  };

  // Get scores (default to 0 if not available)
  const scores = {
    flood: floodRisk?.score || 0,
    wildfire: wildfireRisk?.score || 0,
    earthquake: earthquakeRisk?.score || 0,
    cyclone: cycloneRisk?.score || 0,
    heatwave: heatwaveRisk?.score || 0
  };

  // Calculate weighted score
  const weightedScore = 
    scores.flood * weights.flood +
    scores.wildfire * weights.wildfire +
    scores.earthquake * weights.earthquake +
    scores.cyclone * weights.cyclone +
    scores.heatwave * weights.heatwave;

  // Apply amplification for multiple high risks
  const highRiskCount = Object.values(scores).filter(s => s >= 60).length;
  const amplification = highRiskCount > 1 ? 1 + (highRiskCount * 0.1) : 1;
  
  const finalScore = Math.min(100, Math.round(weightedScore * amplification));
  const level = getRiskLevel(finalScore);

  // Find primary concern
  const maxRisk = Object.entries(scores).reduce((max, [key, score]) => 
    score > max.score ? { key, score } : max, { key: null, score: 0 }
  );

  const primaryConcern = {
    flood: "Flooding",
    wildfire: "Wildfire",
    earthquake: "Earthquake",
    cyclone: "Storm/Cyclone",
    heatwave: "Extreme Heat"
  }[maxRisk.key] || "None";

  return {
    score: finalScore,
    level,
    primaryConcern,
    breakdown: scores,
    weights,
    highRiskCount
  };
};

/**
 * Heatwave risk calculation (from existing Climate tab data)
 */
export const calculateHeatwaveRiskScore = (heatwaveRisk) => {
  if (!heatwaveRisk) return { score: 0, level: RISK_LEVELS.LOW };

  const levelMap = {
    HIGH: 75,
    MODERATE: 40,
    LOW: 10
  };

  const score = levelMap[heatwaveRisk.level] || 0;
  return {
    score,
    level: getRiskLevel(score)
  };
};

export default {
  calculateFloodRisk,
  calculateWildfireRisk,
  calculateEarthquakeRisk,
  calculateCycloneRisk,
  calculateDisasterRiskIndex,
  calculateHeatwaveRiskScore,
  getRiskLevel,
  RISK_LEVELS
};
