/**
 * Guided Tour Engine - Automatic sky tour generation and navigation
 * Selects interesting visible objects and guides user through them
 */

import { generateAiText } from "../ai/aiClient";

/**
 * Object scoring criteria for tour selection
 */
const TOUR_CRITERIA = {
  MIN_ALTITUDE: 15, // Must be at least 15° above horizon
  MAX_MAGNITUDE: 4.5, // Visible to naked eye (lower = brighter)
  PREFERRED_TYPES: ["planet", "moon", "star", "sun"],
  TYPE_SCORES: {
    sun: 0, // Never include sun in tour (safety)
    moon: 100,
    planet: 90,
    star: 60,
    nebula: 50,
    galaxy: 40,
    satellite: 30,
    "deep-sky": 35
  }
};

/**
 * Score an object for tour inclusion
 */
const scoreObject = (obj) => {
  // Safety: never include Sun
  if (obj.type === "sun" || obj.name?.toLowerCase() === "sun") return -1;
  
  // Must be above minimum altitude
  if (obj.alt < TOUR_CRITERIA.MIN_ALTITUDE) return -1;
  
  // Must be visible (magnitude check)
  if (obj.mag !== null && obj.mag > TOUR_CRITERIA.MAX_MAGNITUDE) return -1;

  let score = TOUR_CRITERIA.TYPE_SCORES[obj.type] || 20;

  // Bonus for altitude (easier to observe)
  score += Math.min(obj.alt / 2, 30);

  // Bonus for brightness
  if (obj.mag !== null) {
    score += Math.max(0, (5 - obj.mag) * 10);
  }

  // Bonus for named objects
  if (obj.name && obj.name.length > 0) {
    score += 15;
  }

  return score;
};

/**
 * Generate a diversified tour (avoid too many of same type)
 */
const diversifyTour = (scoredObjects, targetCount = 5) => {
  const selected = [];
  const typeCounts = {};
  const maxPerType = 2;

  const sorted = [...scoredObjects].sort((a, b) => b.score - a.score);

  for (const item of sorted) {
    if (selected.length >= targetCount) break;

    const type = item.obj.type;
    const typeCount = typeCounts[type] || 0;

    if (typeCount < maxPerType) {
      selected.push(item);
      typeCounts[type] = typeCount + 1;
    }
  }

  // If we don't have enough, fill with remaining top scorers
  if (selected.length < targetCount) {
    for (const item of sorted) {
      if (selected.length >= targetCount) break;
      if (!selected.includes(item)) {
        selected.push(item);
      }
    }
  }

  return selected.map((item) => item.obj);
};

/**
 * Generate tonight's tour from available objects
 * @param {Object[]} objects - All sky objects with az, alt, mag, type, name
 * @param {number} count - Target number of tour stops (default: 5)
 * @returns {Object[]} - Ordered tour objects
 */
export const generateTour = (objects, count = 5) => {
  if (!objects || objects.length === 0) return [];

  // Score all objects
  const scored = objects
    .map((obj) => ({ obj, score: scoreObject(obj) }))
    .filter((item) => item.score > 0);

  if (scored.length === 0) return [];

  // Diversify and select
  const tour = diversifyTour(scored, count);

  // Sort tour by azimuth for logical sky progression (west to east viewing)
  return tour.sort((a, b) => a.az - b.az);
};

/**
 * Viewing tips based on object type and conditions
 */
const VIEWING_TIPS = {
  planet: [
    "Use binoculars or a small telescope to see details",
    "Planets don't twinkle like stars—look for steady light",
    "Early evening or pre-dawn often offers best viewing"
  ],
  moon: [
    "The terminator (shadow line) shows best surface detail",
    "Binoculars reveal craters and maria (dark areas)",
    "Note the phase—full moon is bright but shows less detail"
  ],
  star: [
    "Let your eyes adapt to darkness for 15-20 minutes",
    "Avoid looking at bright lights before observing",
    "Notice the star's color—it indicates surface temperature"
  ],
  satellite: [
    "Satellites appear as steady moving points of light",
    "Best seen in twilight when sky is dark but satellite is sunlit",
    "ISS passes can last several minutes across the sky"
  ],
  nebula: [
    "Requires very dark skies away from city lights",
    "Binoculars help, telescope reveals more structure",
    "Use averted vision—look slightly to the side"
  ],
  galaxy: [
    "Appears as fuzzy patch to naked eye in dark skies",
    "The Andromeda Galaxy is visible without aid from dark sites",
    "Patience and dark adaptation are essential"
  ]
};

/**
 * Get viewing tip for an object
 */
export const getViewingTip = (obj) => {
  const tips = VIEWING_TIPS[obj.type] || VIEWING_TIPS.star;
  return tips[Math.floor(Math.random() * tips.length)];
};

/**
 * Generate AI explanation for a tour object
 */
export const generateObjectExplanation = async (obj, signal) => {
  const prompt = `You are a knowledgeable astronomy guide. Provide a concise, educational explanation about ${obj.name} (a ${obj.type}) for someone viewing it tonight.

Provide four short lines in this order:
1) WHAT IT IS: Basic classification
2) KEY FACTS: Most interesting characteristics
3) OBSERVATION TIP: How to best observe it tonight
4) FUN FACT: One memorable detail

Object data:
- Type: ${obj.type}
- Current altitude: ${obj.alt?.toFixed(1)}° above horizon
- Current azimuth: ${obj.az?.toFixed(1)}° (compass direction)
${obj.mag !== null ? `- Magnitude: ${obj.mag.toFixed(2)} (brightness)` : ""}
${obj.constellation ? `- Constellation: ${obj.constellation}` : ""}

Keep the tone educational but accessible.`;

  try {
    const response = await generateAiText({
      prompt,
      maxTokens: 350,
      signal
    });
    return response || null;
  } catch (err) {
    console.error("Tour explanation error:", err);
    return null;
  }
};

/**
 * Generate simple fallback explanation (no AI needed)
 */
export const getFallbackExplanation = (obj) => {
  const explanations = {
    moon: "Earth's only natural satellite, about 384,400 km away. Its phases are caused by our changing view of its sunlit side as it orbits Earth every 27.3 days.",
    planet: `${obj.name} is one of the planets in our Solar System. It's currently visible at ${obj.alt?.toFixed(0)}° altitude—look toward ${getCompassDirection(obj.az)}.`,
    star: `${obj.name} is a star visible in the night sky${obj.constellation ? ` in the constellation ${obj.constellation}` : ""}. Its brightness (magnitude ${obj.mag?.toFixed(1) || "unknown"}) indicates how luminous it appears from Earth.`,
    satellite: `${obj.name} is an artificial satellite orbiting Earth. It's visible as a moving point of light reflecting sunlight.`,
    nebula: "A nebula is a cloud of gas and dust in space. Some nebulae are star-forming regions, while others are remnants of dying stars.",
    galaxy: "A galaxy is a vast collection of stars, gas, and dust held together by gravity. Our Milky Way contains 100-400 billion stars."
  };

  return explanations[obj.type] || `${obj.name} is currently visible at ${obj.alt?.toFixed(0)}° altitude, ${getCompassDirection(obj.az)}.`;
};

/**
 * Convert azimuth to compass direction
 */
export const getCompassDirection = (az) => {
  const directions = ["North", "North-Northeast", "Northeast", "East-Northeast",
    "East", "East-Southeast", "Southeast", "South-Southeast",
    "South", "South-Southwest", "Southwest", "West-Southwest",
    "West", "West-Northwest", "Northwest", "North-Northwest"];
  const index = Math.round(((az % 360) + 360) % 360 / 22.5) % 16;
  return directions[index];
};

/**
 * Calculate tour progress percentage
 */
export const calculateTourProgress = (currentIndex, totalSteps) => {
  if (totalSteps === 0) return 0;
  return Math.round(((currentIndex + 1) / totalSteps) * 100);
};

/**
 * Get tour summary statistics
 */
export const getTourSummary = (tour) => {
  if (!tour || tour.length === 0) {
    return { count: 0, types: [], brightest: null };
  }

  const types = [...new Set(tour.map((obj) => obj.type))];
  const withMag = tour.filter((obj) => obj.mag !== null);
  const brightest = withMag.length > 0
    ? withMag.reduce((a, b) => (a.mag < b.mag ? a : b))
    : null;

  return {
    count: tour.length,
    types,
    brightest: brightest?.name || null,
    avgAltitude: tour.reduce((sum, obj) => sum + (obj.alt || 0), 0) / tour.length
  };
};

export default {
  generateTour,
  getViewingTip,
  generateObjectExplanation,
  getFallbackExplanation,
  getCompassDirection,
  calculateTourProgress,
  getTourSummary
};
