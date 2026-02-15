/**
 * agricultureRiskEngine.js - Scoring and classification logic for agriculture intelligence
 * Computes soil moisture, drought risk, heat stress, and agricultural stability index
 */

/**
 * Risk/Status level definitions
 */
export const MOISTURE_LEVELS = {
  LOW: { label: "LOW", color: "#ef4444", bgColor: "#ef444420" },
  MODERATE: { label: "MODERATE", color: "#f59e0b", bgColor: "#f59e0b20" },
  HIGH: { label: "HIGH", color: "#22c55e", bgColor: "#22c55e20" }
};

export const RISK_LEVELS = {
  LOW: { label: "LOW", color: "#22c55e", bgColor: "#22c55e20" },
  MODERATE: { label: "MODERATE", color: "#f59e0b", bgColor: "#f59e0b20" },
  HIGH: { label: "HIGH", color: "#ef4444", bgColor: "#ef444420" },
  SEVERE: { label: "SEVERE", color: "#7c2d12", bgColor: "#7c2d1220" }
};

export const STRESS_LEVELS = {
  SAFE: { label: "SAFE", color: "#22c55e", bgColor: "#22c55e20" },
  ELEVATED: { label: "ELEVATED", color: "#f59e0b", bgColor: "#f59e0b20" },
  HIGH: { label: "HIGH", color: "#ef4444", bgColor: "#ef444420" }
};

export const ANOMALY_LEVELS = {
  BELOW_NORMAL: { label: "Below Normal", color: "#ef4444" },
  NORMAL: { label: "Normal", color: "#22c55e" },
  ABOVE_NORMAL: { label: "Above Normal", color: "#3b82f6" }
};

/**
 * 1️⃣ SOIL MOISTURE PROXY ENGINE
 * Estimates soil moisture from precipitation, temperature, and wind
 */
export const calculateSoilMoistureProxy = (precipHistory, currentConditions) => {
  if (!precipHistory) {
    return {
      score: 50,
      level: MOISTURE_LEVELS.MODERATE,
      confidence: 0,
      reasoning: "Insufficient data for moisture estimation",
      factors: []
    };
  }

  let score = 50; // Base score
  const factors = [];

  const {
    total7Day = 0,
    total30Day = 0,
    consecutiveDryDays = 0,
    avgTemperature = 25,
    avgEvapotranspiration = 0
  } = precipHistory;

  const windSpeed = currentConditions?.windSpeed || 10;

  // Factor 1: 7-day precipitation (major contributor)
  if (total7Day > 50) {
    score += 25;
    factors.push({ name: "Recent rainfall", value: `${total7Day.toFixed(0)}mm/7d`, impact: "HIGH", direction: "positive" });
  } else if (total7Day > 20) {
    score += 15;
    factors.push({ name: "Recent rainfall", value: `${total7Day.toFixed(0)}mm/7d`, impact: "MODERATE", direction: "positive" });
  } else if (total7Day > 5) {
    score += 5;
    factors.push({ name: "Recent rainfall", value: `${total7Day.toFixed(0)}mm/7d`, impact: "LOW", direction: "positive" });
  } else {
    score -= 15;
    factors.push({ name: "Recent rainfall", value: `${total7Day.toFixed(0)}mm/7d`, impact: "HIGH", direction: "negative" });
  }

  // Factor 2: 30-day precipitation (background moisture)
  if (total30Day > 150) {
    score += 15;
    factors.push({ name: "Monthly accumulation", value: `${total30Day.toFixed(0)}mm`, impact: "HIGH", direction: "positive" });
  } else if (total30Day > 80) {
    score += 8;
    factors.push({ name: "Monthly accumulation", value: `${total30Day.toFixed(0)}mm`, impact: "MODERATE", direction: "positive" });
  } else if (total30Day < 30) {
    score -= 15;
    factors.push({ name: "Monthly accumulation", value: `${total30Day.toFixed(0)}mm`, impact: "HIGH", direction: "negative" });
  }

  // Factor 3: Consecutive dry days (drying effect)
  if (consecutiveDryDays > 14) {
    score -= 25;
    factors.push({ name: "Dry spell", value: `${consecutiveDryDays} days`, impact: "HIGH", direction: "negative" });
  } else if (consecutiveDryDays > 7) {
    score -= 15;
    factors.push({ name: "Dry spell", value: `${consecutiveDryDays} days`, impact: "MODERATE", direction: "negative" });
  } else if (consecutiveDryDays > 3) {
    score -= 5;
    factors.push({ name: "Dry spell", value: `${consecutiveDryDays} days`, impact: "LOW", direction: "negative" });
  }

  // Factor 4: Temperature (evaporation proxy)
  if (avgTemperature > 35) {
    score -= 15;
    factors.push({ name: "High evaporation", value: `${avgTemperature.toFixed(1)}°C avg`, impact: "HIGH", direction: "negative" });
  } else if (avgTemperature > 30) {
    score -= 8;
    factors.push({ name: "Evaporation", value: `${avgTemperature.toFixed(1)}°C avg`, impact: "MODERATE", direction: "negative" });
  } else if (avgTemperature < 15) {
    score += 5;
    factors.push({ name: "Low evaporation", value: `${avgTemperature.toFixed(1)}°C avg`, impact: "LOW", direction: "positive" });
  }

  // Factor 5: Wind speed (additional evaporation)
  if (windSpeed > 25) {
    score -= 10;
    factors.push({ name: "Wind drying", value: `${windSpeed.toFixed(0)} km/h`, impact: "MODERATE", direction: "negative" });
  } else if (windSpeed > 15) {
    score -= 5;
    factors.push({ name: "Wind effect", value: `${windSpeed.toFixed(0)} km/h`, impact: "LOW", direction: "negative" });
  }

  // Clamp score
  score = Math.max(0, Math.min(100, score));

  // Determine level
  let level;
  if (score >= 60) level = MOISTURE_LEVELS.HIGH;
  else if (score >= 35) level = MOISTURE_LEVELS.MODERATE;
  else level = MOISTURE_LEVELS.LOW;

  // Calculate confidence based on data availability
  const confidence = Math.min(100, 
    (precipHistory.precipitation?.length || 0) * 3 +
    (currentConditions ? 25 : 0)
  );

  // Generate reasoning
  let reasoning = "Normal soil moisture conditions";
  if (score < 35) {
    reasoning = "Low rainfall + high evapotranspiration indicating moisture deficit";
  } else if (score >= 70) {
    reasoning = "Adequate precipitation maintaining good soil moisture";
  } else if (consecutiveDryDays > 5) {
    reasoning = "Recent dry spell reducing soil moisture levels";
  }

  return {
    score: Math.round(score),
    level,
    confidence: Math.round(confidence),
    reasoning,
    factors
  };
};

/**
 * 2️⃣ RAINFALL ACCUMULATION & SEASONAL COMPARISON
 */
export const calculateRainfallAnomaly = (precipHistory, seasonalNormals) => {
  if (!precipHistory || !seasonalNormals) {
    return {
      total7Day: 0,
      total30Day: 0,
      anomalyPercent: 0,
      anomalyLevel: ANOMALY_LEVELS.NORMAL,
      score: 50
    };
  }

  const { total7Day = 0, total30Day = 0 } = precipHistory;
  const { monthlyNormal = 60 } = seasonalNormals;

  // Calculate anomaly (% deviation from normal)
  const anomalyPercent = monthlyNormal > 0 
    ? ((total30Day - monthlyNormal) / monthlyNormal) * 100
    : 0;

  // Determine anomaly level
  let anomalyLevel;
  if (anomalyPercent < -25) {
    anomalyLevel = ANOMALY_LEVELS.BELOW_NORMAL;
  } else if (anomalyPercent > 25) {
    anomalyLevel = ANOMALY_LEVELS.ABOVE_NORMAL;
  } else {
    anomalyLevel = ANOMALY_LEVELS.NORMAL;
  }

  // Score for agricultural index (50 = normal, higher = better for crops up to a point)
  let score = 50;
  if (anomalyPercent >= -10 && anomalyPercent <= 30) {
    score = 70 + (10 - Math.abs(anomalyPercent - 10)); // Optimal range
  } else if (anomalyPercent < -25) {
    score = 30 - Math.min(20, Math.abs(anomalyPercent + 25) / 2);
  } else if (anomalyPercent > 50) {
    score = 40; // Too much rain can also be problematic
  }

  return {
    total7Day,
    total30Day,
    monthlyNormal,
    anomalyPercent: Math.round(anomalyPercent),
    anomalyLevel,
    score: Math.max(0, Math.min(100, Math.round(score)))
  };
};

/**
 * 3️⃣ DROUGHT RISK INDICATOR
 */
export const calculateDroughtRisk = (soilMoisture, rainfallAnomaly, precipHistory, currentConditions) => {
  let score = 0;
  const factors = [];

  // Factor 1: Rainfall anomaly (35% weight)
  const anomalyScore = rainfallAnomaly?.anomalyPercent || 0;
  if (anomalyScore < -40) {
    score += 35;
    factors.push({ name: "Severe rainfall deficit", value: `${anomalyScore}%`, impact: "HIGH" });
  } else if (anomalyScore < -25) {
    score += 25;
    factors.push({ name: "Rainfall deficit", value: `${anomalyScore}%`, impact: "MODERATE" });
  } else if (anomalyScore < -10) {
    score += 12;
    factors.push({ name: "Below normal rainfall", value: `${anomalyScore}%`, impact: "LOW" });
  }

  // Factor 2: Soil moisture (30% weight)
  const moistureScore = soilMoisture?.score || 50;
  if (moistureScore < 25) {
    score += 30;
    factors.push({ name: "Very low soil moisture", value: `${moistureScore}/100`, impact: "HIGH" });
  } else if (moistureScore < 40) {
    score += 20;
    factors.push({ name: "Low soil moisture", value: `${moistureScore}/100`, impact: "MODERATE" });
  } else if (moistureScore < 50) {
    score += 10;
    factors.push({ name: "Declining soil moisture", value: `${moistureScore}/100`, impact: "LOW" });
  }

  // Factor 3: Consecutive dry days (20% weight)
  const dryDays = precipHistory?.consecutiveDryDays || 0;
  if (dryDays > 21) {
    score += 20;
    factors.push({ name: "Extended dry period", value: `${dryDays} days`, impact: "HIGH" });
  } else if (dryDays > 14) {
    score += 15;
    factors.push({ name: "Prolonged dry spell", value: `${dryDays} days`, impact: "MODERATE" });
  } else if (dryDays > 7) {
    score += 8;
    factors.push({ name: "Dry spell", value: `${dryDays} days`, impact: "LOW" });
  }

  // Factor 4: Temperature anomaly (15% weight)
  const temp = currentConditions?.temperature || precipHistory?.avgTemperature || 25;
  if (temp > 38) {
    score += 15;
    factors.push({ name: "Extreme heat", value: `${temp.toFixed(1)}°C`, impact: "HIGH" });
  } else if (temp > 33) {
    score += 10;
    factors.push({ name: "High temperature", value: `${temp.toFixed(1)}°C`, impact: "MODERATE" });
  } else if (temp > 28) {
    score += 5;
    factors.push({ name: "Warm conditions", value: `${temp.toFixed(1)}°C`, impact: "LOW" });
  }

  score = Math.min(100, score);

  // Determine level
  let level;
  if (score >= 70) level = RISK_LEVELS.SEVERE;
  else if (score >= 50) level = RISK_LEVELS.HIGH;
  else if (score >= 30) level = RISK_LEVELS.MODERATE;
  else level = RISK_LEVELS.LOW;

  // Generate explanation
  let explanation = "Normal conditions with adequate moisture";
  if (score >= 70) {
    explanation = "Severe drought conditions - agricultural stress likely";
  } else if (score >= 50) {
    explanation = "High drought risk - monitor crop water needs closely";
  } else if (score >= 30) {
    explanation = "Moderate drought indicators - consider supplemental irrigation";
  }

  return {
    score,
    level,
    factors,
    explanation
  };
};

/**
 * 4️⃣ CROP HEAT STRESS INDICATOR
 */
export const calculateHeatStress = (currentConditions, precipHistory) => {
  if (!currentConditions) {
    return {
      score: 0,
      level: STRESS_LEVELS.SAFE,
      advisory: "Weather data unavailable",
      factors: []
    };
  }

  let score = 0;
  const factors = [];

  const {
    temperature = 25,
    humidity = 50,
    windSpeed = 10,
    apparentTemp = temperature
  } = currentConditions;

  // Factor 1: Temperature
  if (temperature > 40) {
    score += 40;
    factors.push({ name: "Extreme temperature", value: `${temperature.toFixed(1)}°C`, impact: "HIGH" });
  } else if (temperature > 35) {
    score += 30;
    factors.push({ name: "High temperature", value: `${temperature.toFixed(1)}°C`, impact: "MODERATE" });
  } else if (temperature > 30) {
    score += 15;
    factors.push({ name: "Warm temperature", value: `${temperature.toFixed(1)}°C`, impact: "LOW" });
  }

  // Factor 2: Humidity (high humidity + high temp = more stress)
  if (temperature > 30) {
    if (humidity > 80) {
      score += 25;
      factors.push({ name: "High humidity stress", value: `${humidity}%`, impact: "HIGH" });
    } else if (humidity > 60) {
      score += 15;
      factors.push({ name: "Humidity factor", value: `${humidity}%`, impact: "MODERATE" });
    } else if (humidity < 30) {
      score += 10;
      factors.push({ name: "Low humidity stress", value: `${humidity}%`, impact: "LOW" });
    }
  }

  // Factor 3: Wind (can help or hurt)
  if (windSpeed < 5 && temperature > 32) {
    score += 15;
    factors.push({ name: "No wind relief", value: `${windSpeed.toFixed(0)} km/h`, impact: "MODERATE" });
  } else if (windSpeed > 40) {
    score += 10;
    factors.push({ name: "Wind stress", value: `${windSpeed.toFixed(0)} km/h`, impact: "LOW" });
  }

  // Factor 4: Feels-like temperature
  if (apparentTemp > 42) {
    score += 20;
    factors.push({ name: "Heat index", value: `${apparentTemp.toFixed(1)}°C`, impact: "HIGH" });
  } else if (apparentTemp > 38) {
    score += 10;
    factors.push({ name: "Heat index", value: `${apparentTemp.toFixed(1)}°C`, impact: "MODERATE" });
  }

  score = Math.min(100, score);

  // Determine level
  let level;
  if (score >= 60) level = STRESS_LEVELS.HIGH;
  else if (score >= 35) level = STRESS_LEVELS.ELEVATED;
  else level = STRESS_LEVELS.SAFE;

  // Generate advisory
  let advisory = "Conditions favorable for crop growth";
  if (score >= 60) {
    advisory = "High heat stress - provide shade, increase irrigation frequency";
  } else if (score >= 35) {
    advisory = "Elevated stress - monitor for wilting, ensure adequate water";
  }

  return {
    score,
    level,
    advisory,
    factors,
    currentTemp: temperature,
    feelsLike: apparentTemp
  };
};

/**
 * 5️⃣ AGRICULTURAL STABILITY INDEX (SIGNATURE FEATURE)
 * Unified 0-100 score combining all agricultural factors
 */
export const calculateAgriculturalStabilityIndex = (indicators, floodRisk = null) => {
  const {
    soilMoisture,
    rainfallAnomaly,
    droughtRisk,
    heatStress
  } = indicators;

  // Weights (total = 1.0)
  const weights = {
    soilMoisture: 0.30,
    rainfall: 0.20,
    drought: 0.25,
    heatStress: 0.15,
    flood: 0.10
  };

  // Convert risk scores to stability scores (invert where needed)
  const scores = {
    soilMoisture: soilMoisture?.score || 50,
    rainfall: rainfallAnomaly?.score || 50,
    drought: 100 - (droughtRisk?.score || 0), // Invert - lower risk = higher stability
    heatStress: 100 - (heatStress?.score || 0), // Invert
    flood: 100 - (floodRisk?.score || 0) // Invert
  };

  // Calculate weighted score
  let weightedScore = 
    scores.soilMoisture * weights.soilMoisture +
    scores.rainfall * weights.rainfall +
    scores.drought * weights.drought +
    scores.heatStress * weights.heatStress +
    scores.flood * weights.flood;

  // Apply penalty for multiple concerning factors
  const concerningFactors = [
    droughtRisk?.score >= 50,
    heatStress?.score >= 50,
    soilMoisture?.score < 35,
    rainfallAnomaly?.anomalyPercent < -30
  ].filter(Boolean).length;

  if (concerningFactors >= 2) {
    weightedScore *= (1 - concerningFactors * 0.05);
  }

  const finalScore = Math.max(0, Math.min(100, Math.round(weightedScore)));

  // Determine primary concern
  let primaryConcern = "None";
  const concerns = [];
  
  if ((droughtRisk?.score || 0) >= 40) concerns.push({ name: "Drought Risk", score: droughtRisk.score });
  if ((heatStress?.score || 0) >= 40) concerns.push({ name: "Heat Stress", score: heatStress.score });
  if ((soilMoisture?.score || 50) < 35) concerns.push({ name: "Moisture Deficit", score: 100 - soilMoisture.score });
  if ((rainfallAnomaly?.anomalyPercent || 0) < -25) concerns.push({ name: "Rainfall Deficit", score: Math.abs(rainfallAnomaly.anomalyPercent) });
  if ((floodRisk?.score || 0) >= 40) concerns.push({ name: "Flood Risk", score: floodRisk.score });

  if (concerns.length > 0) {
    concerns.sort((a, b) => b.score - a.score);
    primaryConcern = concerns[0].name;
  }

  // Determine stability level
  let level, color;
  if (finalScore >= 75) {
    level = "EXCELLENT";
    color = "#22c55e";
  } else if (finalScore >= 60) {
    level = "GOOD";
    color = "#84cc16";
  } else if (finalScore >= 45) {
    level = "MODERATE";
    color = "#f59e0b";
  } else if (finalScore >= 30) {
    level = "POOR";
    color = "#ef4444";
  } else {
    level = "CRITICAL";
    color = "#7c2d12";
  }

  return {
    score: finalScore,
    level,
    color,
    primaryConcern,
    breakdown: scores,
    weights,
    concerningFactors
  };
};

/**
 * Get stability level details
 */
export const getStabilityLevel = (score) => {
  if (score >= 75) return { label: "EXCELLENT", color: "#22c55e", bgColor: "#22c55e20" };
  if (score >= 60) return { label: "GOOD", color: "#84cc16", bgColor: "#84cc1620" };
  if (score >= 45) return { label: "MODERATE", color: "#f59e0b", bgColor: "#f59e0b20" };
  if (score >= 30) return { label: "POOR", color: "#ef4444", bgColor: "#ef444420" };
  return { label: "CRITICAL", color: "#7c2d12", bgColor: "#7c2d1220" };
};

export default {
  calculateSoilMoistureProxy,
  calculateRainfallAnomaly,
  calculateDroughtRisk,
  calculateHeatStress,
  calculateAgriculturalStabilityIndex,
  getStabilityLevel,
  MOISTURE_LEVELS,
  RISK_LEVELS,
  STRESS_LEVELS,
  ANOMALY_LEVELS
};
