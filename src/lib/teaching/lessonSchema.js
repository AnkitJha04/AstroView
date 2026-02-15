/**
 * Lesson Schema - Structured lesson definitions for micro-learning
 * Designed for scalability and future multi-language support
 */

/**
 * @typedef {Object} LessonSection
 * @property {string} title - Section heading
 * @property {string} content - Section content (supports markdown)
 * @property {string} [diagramType] - Optional diagram identifier
 */

/**
 * @typedef {Object} QuizQuestion
 * @property {string} question - The question text
 * @property {string[]} options - Answer options
 * @property {number} correctIndex - Index of correct answer (0-based)
 * @property {string} explanation - Explanation for correct answer
 */

/**
 * @typedef {Object} Lesson
 * @property {string} id - Unique identifier
 * @property {string} category - Category slug
 * @property {string} title - Lesson title
 * @property {string} description - Brief description
 * @property {number} durationMinutes - Estimated duration
 * @property {LessonSection[]} sections - Lesson sections
 * @property {QuizQuestion[]} quiz - Quiz questions
 * @property {string[]} tags - Searchable tags
 */

export const LESSON_CATEGORIES = [
  {
    id: "astronomy-basics",
    name: "Basics of Astronomy",
    icon: "star",
    color: "#38bdf8"
  },
  {
    id: "satellite-tech",
    name: "Satellite Technology",
    icon: "satellite",
    color: "#a78bfa"
  },
  {
    id: "weather-satellites",
    name: "Weather Satellites",
    icon: "cloud",
    color: "#34d399"
  },
  {
    id: "space-weather",
    name: "Space Weather",
    icon: "sun",
    color: "#fbbf24"
  },
  {
    id: "climate-monitoring",
    name: "Climate Monitoring",
    icon: "globe",
    color: "#22c55e"
  }
];

/**
 * Lesson library
 * @type {Lesson[]}
 */
export const LESSONS = [
  // =========================================
  // BASICS OF ASTRONOMY
  // =========================================
  {
    id: "celestial-sphere",
    category: "astronomy-basics",
    title: "Understanding the Celestial Sphere",
    description: "Learn how astronomers map the sky using coordinates",
    durationMinutes: 5,
    sections: [
      {
        title: "The Imaginary Sky Dome",
        content: "Imagine standing under a giant dome with stars painted on it. This is the celestial sphere—an imaginary sphere surrounding Earth where all celestial objects appear to be located. Though stars are at vastly different distances, they all seem projected onto this sphere from our viewpoint.",
        diagramType: "celestial-sphere"
      },
      {
        title: "Altitude and Azimuth",
        content: "We locate objects using two angles: **Altitude** (0° at horizon, 90° at zenith overhead) and **Azimuth** (compass direction: 0° North, 90° East, 180° South, 270° West). Together, these tell you exactly where to look in the sky.",
        diagramType: "alt-az"
      },
      {
        title: "Why Objects Move",
        content: "As Earth rotates, celestial objects appear to move across the sky from east to west. Stars near the celestial poles (aligned with Earth's axis) circle around a fixed point, while objects near the celestial equator rise and set like the Sun."
      }
    ],
    quiz: [
      {
        question: "What does an altitude of 90° represent?",
        options: [
          "The horizon",
          "The point directly overhead (zenith)",
          "Due east",
          "The north celestial pole"
        ],
        correctIndex: 1,
        explanation: "90° altitude is the zenith—the point directly above the observer. The horizon is at 0° altitude."
      },
      {
        question: "Which direction does an azimuth of 180° indicate?",
        options: ["North", "East", "South", "West"],
        correctIndex: 2,
        explanation: "Azimuth is measured clockwise from north: 0° = North, 90° = East, 180° = South, 270° = West."
      }
    ],
    tags: ["coordinates", "altitude", "azimuth", "celestial sphere", "beginner"]
  },

  {
    id: "stellar-magnitude",
    category: "astronomy-basics",
    title: "Star Brightness: Understanding Magnitude",
    description: "Learn how astronomers measure and compare star brightness",
    durationMinutes: 4,
    sections: [
      {
        title: "The Magnitude Scale",
        content: "The magnitude scale measures how bright objects appear from Earth. Confusingly, **lower numbers mean brighter objects**. The brightest stars are magnitude 0 or negative, while the faintest visible to the naked eye are about magnitude 6."
      },
      {
        title: "Reference Points",
        content: "The Sun is magnitude -26.7 (extremely bright). The full Moon is -12.7. Venus can reach -4.6. Sirius, the brightest star, is -1.46. The faintest stars visible without a telescope are around +6. Each magnitude step is about 2.5× brighter or dimmer.",
        diagramType: "magnitude-scale"
      },
      {
        title: "Apparent vs Absolute",
        content: "Apparent magnitude is how bright an object looks from Earth. Absolute magnitude measures intrinsic brightness—how bright a star would appear at a standard distance of 10 parsecs (32.6 light-years). This lets us compare stars' true luminosities."
      }
    ],
    quiz: [
      {
        question: "A star with magnitude 1 compared to magnitude 6:",
        options: [
          "Is 5× brighter",
          "Is about 100× brighter",
          "Is 5× dimmer",
          "Has the same brightness"
        ],
        correctIndex: 1,
        explanation: "Each magnitude step is ~2.5× brighter. Five steps: 2.5^5 ≈ 100× brighter."
      }
    ],
    tags: ["magnitude", "brightness", "stars", "beginner"]
  },

  // =========================================
  // SATELLITE TECHNOLOGY
  // =========================================
  {
    id: "gps-system",
    category: "satellite-tech",
    title: "How GPS Works",
    description: "Understand the technology that enables global positioning",
    durationMinutes: 6,
    sections: [
      {
        title: "The GPS Constellation",
        content: "GPS uses a constellation of at least 24 satellites orbiting at about 20,200 km altitude. They complete one orbit every 12 hours. At any moment, at least 4 satellites are visible from any point on Earth, which is the minimum needed for positioning.",
        diagramType: "gps-constellation"
      },
      {
        title: "Trilateration Principle",
        content: "Each satellite continuously broadcasts its position and precise time. Your GPS receiver measures how long signals take to arrive. Since radio waves travel at light speed, this gives the distance to each satellite. With distances to 4+ satellites, your position can be calculated.",
        diagramType: "trilateration"
      },
      {
        title: "Atomic Clock Precision",
        content: "GPS satellites carry atomic clocks accurate to nanoseconds. A 1-microsecond timing error would cause ~300m position error. Your receiver's clock is synced using the fourth satellite signal, enabling meter-level accuracy without an atomic clock in your phone."
      }
    ],
    quiz: [
      {
        question: "What is the minimum number of GPS satellites needed for a 3D position fix?",
        options: ["2", "3", "4", "6"],
        correctIndex: 2,
        explanation: "Four satellites are needed: three to determine position in 3D space, plus one to synchronize the receiver's clock."
      },
      {
        question: "At what altitude do GPS satellites orbit?",
        options: ["400 km (ISS altitude)", "2,000 km", "20,200 km", "36,000 km"],
        correctIndex: 2,
        explanation: "GPS satellites orbit at approximately 20,200 km in Medium Earth Orbit (MEO), completing one orbit every 12 hours."
      }
    ],
    tags: ["GPS", "navigation", "satellites", "trilateration", "intermediate"]
  },

  {
    id: "orbit-types",
    category: "satellite-tech",
    title: "Types of Satellite Orbits",
    description: "Learn about LEO, MEO, GEO and their applications",
    durationMinutes: 5,
    sections: [
      {
        title: "Low Earth Orbit (LEO)",
        content: "LEO spans 160–2,000 km altitude. Satellites here orbit in ~90 minutes. The ISS (400 km), Hubble (540 km), and Starlink operate in LEO. Advantages: low latency, detailed observation. Disadvantages: limited coverage, atmospheric drag, shorter lifespan.",
        diagramType: "orbit-leo"
      },
      {
        title: "Geostationary Orbit (GEO)",
        content: "At exactly 35,786 km above the equator, satellites orbit once per day—matching Earth's rotation. They appear stationary from the ground. Weather satellites like GOES and communication satellites use GEO for continuous coverage of one region.",
        diagramType: "orbit-geo"
      },
      {
        title: "Medium Earth Orbit (MEO)",
        content: "MEO (2,000–35,786 km) is used by GPS (20,200 km) and some communication constellations. It balances coverage area with signal delay. Polar orbits (passing over both poles) allow satellites to eventually scan the entire Earth surface."
      }
    ],
    quiz: [
      {
        question: "Which orbit type is used by weather satellites that provide continuous images of one region?",
        options: ["Low Earth Orbit", "Medium Earth Orbit", "Geostationary Orbit", "Polar Orbit"],
        correctIndex: 2,
        explanation: "Geostationary satellites at 35,786 km remain fixed relative to Earth, providing continuous monitoring of one region."
      }
    ],
    tags: ["LEO", "GEO", "MEO", "orbits", "satellites", "intermediate"]
  },

  // =========================================
  // WEATHER SATELLITES
  // =========================================
  {
    id: "weather-sat-basics",
    category: "weather-satellites",
    title: "How Weather Satellites Work",
    description: "Understanding satellite meteorology fundamentals",
    durationMinutes: 5,
    sections: [
      {
        title: "Two Types of Weather Satellites",
        content: "**Geostationary satellites** (GOES, Meteosat) stay fixed over one spot, capturing images every 5–15 minutes. **Polar-orbiting satellites** (NOAA, MetOp) circle pole-to-pole in ~100 minutes, scanning different strips of Earth each orbit for global coverage.",
        diagramType: "weather-sat-types"
      },
      {
        title: "Multispectral Imaging",
        content: "Weather satellites see beyond visible light. Infrared channels measure cloud-top temperatures (higher clouds = colder). Water vapor channels track atmospheric moisture. Visible channels show cloud reflectivity. Combining these reveals storm structure and intensity."
      },
      {
        title: "Data to Forecast",
        content: "Satellite data feeds numerical weather models. Cloud motion vectors show wind patterns. Temperature profiles reveal atmospheric stability. This data, combined with surface observations and radar, enables the weather forecasts we rely on daily."
      }
    ],
    quiz: [
      {
        question: "Why do meteorologists use infrared satellite imagery at night?",
        options: [
          "It's more accurate at night",
          "Infrared detects heat, not sunlight, so it works 24/7",
          "Clouds are more visible at night",
          "It saves satellite power"
        ],
        correctIndex: 1,
        explanation: "Infrared sensors detect thermal radiation (heat) emitted by clouds and Earth's surface, providing imagery regardless of sunlight."
      }
    ],
    tags: ["weather", "meteorology", "GOES", "infrared", "forecasting", "intermediate"]
  },

  // =========================================
  // SPACE WEATHER
  // =========================================
  {
    id: "solar-flares",
    category: "space-weather",
    title: "Solar Flares & Space Weather",
    description: "Understanding solar activity and its effects on Earth",
    durationMinutes: 6,
    sections: [
      {
        title: "What Are Solar Flares?",
        content: "Solar flares are sudden, intense bursts of radiation from the Sun's surface. They occur when magnetic energy built up in the solar atmosphere is suddenly released. Flares are classified by X-ray brightness: A, B, C, M (moderate), and X (extreme).",
        diagramType: "solar-flare"
      },
      {
        title: "Coronal Mass Ejections",
        content: "Often accompanying flares, Coronal Mass Ejections (CMEs) are massive bubbles of magnetized plasma hurled into space. If Earth-directed, CMEs can reach us in 1–3 days, compressing Earth's magnetic field and triggering geomagnetic storms.",
        diagramType: "cme"
      },
      {
        title: "Effects on Earth",
        content: "Space weather impacts technology: GPS accuracy degrades, HF radio communications fail, power grids can experience surges, and satellite electronics may be damaged. Astronauts face radiation risks. Aurora displays are the beautiful side effect of geomagnetic storms."
      }
    ],
    quiz: [
      {
        question: "What classification indicates the most powerful solar flares?",
        options: ["A-class", "C-class", "M-class", "X-class"],
        correctIndex: 3,
        explanation: "X-class flares are the most powerful, capable of causing planet-wide radio blackouts and long-lasting radiation storms."
      },
      {
        question: "How long does it typically take a CME to reach Earth?",
        options: ["8 minutes", "1-3 days", "1 week", "1 month"],
        correctIndex: 1,
        explanation: "CMEs travel at 250-3000 km/s, typically taking 1-3 days to reach Earth. Light from the flare itself arrives in 8 minutes."
      }
    ],
    tags: ["solar flares", "CME", "space weather", "aurora", "geomagnetic", "intermediate"]
  },

  // =========================================
  // CLIMATE MONITORING
  // =========================================
  {
    id: "climate-satellites",
    category: "climate-monitoring",
    title: "Climate Monitoring from Space",
    description: "How satellites track long-term climate change",
    durationMinutes: 6,
    sections: [
      {
        title: "Climate vs Weather",
        content: "Weather is short-term atmospheric conditions; climate is the long-term average. Climate satellites provide consistent, global measurements over decades—essential for detecting gradual changes that ground stations might miss or misinterpret due to local effects.",
        diagramType: "climate-vs-weather"
      },
      {
        title: "What Satellites Measure",
        content: "Climate satellites track: sea surface temperature, ice sheet extent, sea level rise (via radar altimetry), atmospheric CO₂ and methane, vegetation health (NDVI), and Earth's energy balance. These multi-decade datasets reveal climate trends.",
        diagramType: "climate-measurements"
      },
      {
        title: "Key Climate Missions",
        content: "NASA's Earth Observing System includes Terra, Aqua, and the upcoming PACE. ESA's Copernicus program operates Sentinel satellites. NOAA's DSCOVR monitors solar wind. Together, these missions provide comprehensive climate monitoring that would be impossible from the ground alone."
      }
    ],
    quiz: [
      {
        question: "Why are satellites essential for climate monitoring?",
        options: [
          "They're cheaper than ground stations",
          "They provide consistent global coverage over decades",
          "They're more accurate than thermometers",
          "They can predict future climate"
        ],
        correctIndex: 1,
        explanation: "Satellites provide uniform, global measurements using consistent instruments over decades—essential for detecting gradual climate changes."
      }
    ],
    tags: ["climate", "monitoring", "satellites", "global warming", "earth observation", "intermediate"]
  },

  {
    id: "heat-detection",
    category: "climate-monitoring",
    title: "How Satellites Detect Heatwaves",
    description: "Understanding thermal remote sensing for heat monitoring",
    durationMinutes: 4,
    sections: [
      {
        title: "Thermal Infrared Imaging",
        content: "Satellites measure land surface temperature (LST) using thermal infrared sensors. Unlike air temperature from weather stations, LST shows how hot the ground actually gets—critical for understanding urban heat islands and heat stress on ecosystems."
      },
      {
        title: "Urban Heat Islands",
        content: "Cities absorb and retain heat more than surrounding areas. Satellite thermal maps reveal that urban centers can be 5-10°C hotter than nearby rural areas. This data helps city planners identify heat-vulnerable neighborhoods and plan cooling interventions.",
        diagramType: "urban-heat"
      },
      {
        title: "Early Warning Systems",
        content: "Combining satellite LST data with weather forecasts and population data enables heat early warning systems. Authorities can issue alerts, open cooling centers, and check on vulnerable populations before dangerous heat arrives."
      }
    ],
    quiz: [
      {
        question: "What do satellites measure to detect heatwaves?",
        options: [
          "Air temperature at 2 meters",
          "Land surface temperature",
          "Humidity only",
          "Wind speed"
        ],
        correctIndex: 1,
        explanation: "Satellites measure Land Surface Temperature (LST) using thermal infrared sensors, showing how hot the ground gets rather than air temperature."
      }
    ],
    tags: ["heatwave", "thermal", "urban heat island", "LST", "climate", "intermediate"]
  }
];

/**
 * Get lessons by category
 */
export const getLessonsByCategory = (categoryId) =>
  LESSONS.filter((lesson) => lesson.category === categoryId);

/**
 * Get all lessons
 */
export const getAllLessons = () => LESSONS;

/**
 * Get lesson by ID
 */
export const getLessonById = (lessonId) =>
  LESSONS.find((lesson) => lesson.id === lessonId);

/**
 * Get category info
 */
export const getCategoryById = (categoryId) =>
  LESSON_CATEGORIES.find((cat) => cat.id === categoryId);

/**
 * Get category icon name
 */
export const getCategoryIcon = (categoryId) => {
  const category = getCategoryById(categoryId);
  return category?.icon || "book";
};

/**
 * Search lessons by tags or title
 */
export const searchLessons = (query) => {
  const q = query.toLowerCase();
  return LESSONS.filter(
    (lesson) =>
      lesson.title.toLowerCase().includes(q) ||
      lesson.description.toLowerCase().includes(q) ||
      lesson.tags.some((tag) => tag.includes(q))
  );
};

// Alias for backward compatibility
export const CATEGORIES = Object.fromEntries(
  LESSON_CATEGORIES.map((cat) => [cat.id, cat])
);

export default LESSONS;
