/**
 * SatelliteEducation - Educational panel for satellite tracking
 * Shows orbit classification, purpose, and educational content
 */

import { Orbit, Radio, Satellite } from "lucide-react";
import EducationCard, { EducationSection, KeyFact } from "./EducationCard";
import { useLearningMode } from "../lib/teaching/useLearningMode";

/**
 * Classify orbit type based on altitude (approximate)
 * Returns orbit classification and details
 */
const classifyOrbit = (altitudeKm) => {
  if (!altitudeKm || altitudeKm <= 0) {
    return {
      type: "UNKNOWN",
      name: "Unknown Orbit",
      color: "#64748b",
      description: "Orbit altitude data unavailable"
    };
  }

  if (altitudeKm < 2000) {
    return {
      type: "LEO",
      name: "Low Earth Orbit",
      color: "#38bdf8",
      altitudeRange: "160 - 2,000 km",
      period: "~90 minutes",
      description: "Close to Earth, ideal for observation and human spaceflight. Experiences atmospheric drag.",
      examples: "ISS (400 km), Hubble (540 km), Starlink"
    };
  }

  if (altitudeKm < 35786) {
    return {
      type: "MEO",
      name: "Medium Earth Orbit",
      color: "#a78bfa",
      altitudeRange: "2,000 - 35,786 km",
      period: "2-24 hours",
      description: "Balanced coverage and signal delay. Used by navigation satellites.",
      examples: "GPS (20,200 km), GLONASS, Galileo"
    };
  }

  if (altitudeKm >= 35786 && altitudeKm <= 35800) {
    return {
      type: "GEO",
      name: "Geostationary Orbit",
      color: "#fbbf24",
      altitudeRange: "35,786 km",
      period: "24 hours (stationary)",
      description: "Orbits match Earth's rotation—satellite appears fixed in sky. Ideal for communications and weather.",
      examples: "GOES, Meteosat, DirecTV"
    };
  }

  return {
    type: "HEO",
    name: "High Earth Orbit",
    color: "#f97316",
    altitudeRange: "> 35,786 km",
    period: "Variable",
    description: "Beyond geostationary altitude. Includes highly elliptical orbits for specific coverage needs.",
    examples: "Molniya orbits, deep space missions"
  };
};

/**
 * Satellite purpose database (simplified)
 */
const getSatellitePurpose = (name) => {
  const nameLower = name?.toLowerCase() || "";

  if (nameLower.includes("iss") || nameLower.includes("zarya")) {
    return {
      purpose: "Human Spaceflight & Research",
      detail: "International Space Station - largest human-made structure in orbit. Crew of 6-7 conducts microgravity research.",
      icon: "👨‍🚀"
    };
  }

  if (nameLower.includes("hubble")) {
    return {
      purpose: "Space Telescope",
      detail: "Hubble Space Telescope - observes in visible, UV, and near-infrared. Operating since 1990.",
      icon: "🔭"
    };
  }

  if (nameLower.includes("jwst") || nameLower.includes("james webb")) {
    return {
      purpose: "Infrared Space Observatory",
      detail: "James Webb Space Telescope - studies early universe, exoplanets, and star formation in infrared.",
      icon: "🌌"
    };
  }

  if (nameLower.includes("starlink")) {
    return {
      purpose: "Internet Communications",
      detail: "SpaceX Starlink constellation - provides global broadband internet via thousands of satellites.",
      icon: "📡"
    };
  }

  if (nameLower.includes("gps") || nameLower.includes("navstar")) {
    return {
      purpose: "Navigation",
      detail: "GPS satellite - part of 24+ constellation providing global positioning to within meters.",
      icon: "🧭"
    };
  }

  if (nameLower.includes("goes") || nameLower.includes("noaa")) {
    return {
      purpose: "Weather Monitoring",
      detail: "Weather satellite - monitors atmospheric conditions, storms, and climate patterns.",
      icon: "🌦️"
    };
  }

  if (nameLower.includes("terra") || nameLower.includes("aqua") || nameLower.includes("landsat")) {
    return {
      purpose: "Earth Observation",
      detail: "Earth science satellite - monitors land, ocean, and atmospheric conditions for climate research.",
      icon: "🌍"
    };
  }

  return {
    purpose: "Various Operations",
    detail: "Satellite purpose varies - may include communications, observation, research, or military applications.",
    icon: "🛰️"
  };
};

/**
 * Why orbits matter explanation
 */
const OrbitExplanation = ({ orbitType }) => {
  const explanations = {
    LEO: "Low orbits allow detailed observation and low-latency communication. However, satellites move fast across the sky and need large constellations for global coverage. Atmospheric drag requires periodic orbit adjustments.",
    MEO: "Medium orbits balance coverage area with signal travel time. GPS uses MEO because each satellite covers a large area while maintaining acceptable positioning accuracy. Fewer satellites needed than LEO for global coverage.",
    GEO: "Geostationary satellites stay fixed relative to Earth's surface, making them ideal for broadcast and continuous weather monitoring. One satellite can see ~1/3 of Earth. Trade-off: higher latency and less detail than LEO.",
    HEO: "High elliptical orbits can provide extended coverage of polar regions or specific areas. Molniya orbits, for example, give Russia coverage that geostationary satellites cannot provide at high latitudes."
  };

  return (
    <EducationSection title="Why This Orbit Matters">
      {explanations[orbitType] || "Different orbits serve different purposes based on altitude, coverage, and mission requirements."}
    </EducationSection>
  );
};

/**
 * Main Satellite Education Panel
 */
export default function SatelliteEducation({ satellite, visible = true }) {
  const { learningMode } = useLearningMode();

  if (!learningMode || !satellite || !visible) return null;

  // Extract altitude from name or use estimate based on typical orbits
  // In a real app, this would come from TLE data calculations
  const estimatedAltitude = satellite.name?.toLowerCase().includes("iss")
    ? 408
    : satellite.name?.toLowerCase().includes("hubble")
      ? 540
      : satellite.name?.toLowerCase().includes("jwst")
        ? 1500000 // L2 point, simplified
        : satellite.name?.toLowerCase().includes("starlink")
          ? 550
          : satellite.name?.toLowerCase().includes("gps")
            ? 20200
            : 500; // Default LEO assumption

  const orbit = classifyOrbit(estimatedAltitude);
  const purpose = getSatellitePurpose(satellite.name);

  return (
    <EducationCard
      title="Satellite Education"
      subtitle={satellite.name}
      icon={Satellite}
      expandable
      defaultExpanded={false}
      accentColor={orbit.color}
      className="mt-4"
    >
      {/* Orbit Classification */}
      <div className="flex items-center gap-3 mb-4 p-3 rounded-xl bg-white/5">
        <div
          className="w-10 h-10 rounded-full flex items-center justify-center text-lg"
          style={{ backgroundColor: `${orbit.color}20` }}
        >
          <Orbit className="w-5 h-5" style={{ color: orbit.color }} />
        </div>
        <div>
          <div className="text-sm font-medium text-slate-100">{orbit.name}</div>
          <div className="text-[11px] text-slate-400">{orbit.type}</div>
        </div>
        <div
          className="ml-auto px-3 py-1 rounded-full text-[10px] font-medium"
          style={{
            backgroundColor: `${orbit.color}20`,
            color: orbit.color
          }}
        >
          ~{estimatedAltitude.toLocaleString()} km
        </div>
      </div>

      {/* Orbit Details */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="rounded-xl bg-white/5 px-3 py-2">
          <div className="text-[10px] text-slate-500">Altitude Range</div>
          <div className="text-[12px] text-slate-200">{orbit.altitudeRange}</div>
        </div>
        <div className="rounded-xl bg-white/5 px-3 py-2">
          <div className="text-[10px] text-slate-500">Orbital Period</div>
          <div className="text-[12px] text-slate-200">{orbit.period}</div>
        </div>
      </div>

      {/* Purpose */}
      <EducationSection title="Purpose" icon={Radio}>
        <div className="flex items-start gap-2">
          <span className="text-lg">{purpose.icon}</span>
          <div>
            <div className="font-medium text-slate-200">{purpose.purpose}</div>
            <div className="text-slate-400 mt-1">{purpose.detail}</div>
          </div>
        </div>
      </EducationSection>

      {/* Why Orbit Matters */}
      <OrbitExplanation orbitType={orbit.type} />

      {/* Key Fact */}
      <KeyFact>
        <strong>Examples at this altitude:</strong> {orbit.examples}
      </KeyFact>

      {/* Current Position */}
      {satellite.alt !== undefined && (
        <div className="mt-4 pt-3 border-t border-white/10">
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-slate-500">Current Position</span>
            <span className="text-slate-300">
              {satellite.alt?.toFixed(1)}° altitude,{" "}
              {satellite.az?.toFixed(1)}° azimuth
            </span>
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            {satellite.alt > 0 ? "Above your horizon - potentially visible" : "Below horizon - not currently visible"}
          </div>
        </div>
      )}
    </EducationCard>
  );
}
