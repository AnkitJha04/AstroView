/**
 * ClimateEducation - Climate education extension for Learning Mode
 * Explains climate data, heatwaves, and satellite monitoring principles
 */

import { useCallback, useState } from "react";
import { Cloud, Droplets, Flame, Satellite, Sparkles, Thermometer } from "lucide-react";
import EducationCard, { EducationSection, KeyFact } from "./EducationCard";
import { useLearningMode } from "../lib/teaching/useLearningMode";

const OLLAMA_BASE_URL = "http://localhost:11434";
const OLLAMA_MODEL = import.meta.env.VITE_OLLAMA_MODEL || "llama3.1:latest";

/**
 * Heatwave explanation based on risk level
 */
const HeatwaveEducation = ({ temperature, humidity, riskLevel }) => {
  const explanations = {
    HIGH: {
      title: "Extreme Heat Conditions",
      content: "When temperatures exceed 35°C (95°F) with high humidity, the body's ability to cool through sweating is severely impaired. The heat index—what it 'feels like'—can be much higher than the actual temperature.",
      safety: "Avoid outdoor exertion during peak hours (11am-4pm). Stay hydrated—drink water before feeling thirsty. Check on vulnerable individuals. Never leave children or pets in vehicles."
    },
    MODERATE: {
      title: "Elevated Heat Risk",
      content: "Temperatures above 32°C (90°F) can cause heat-related illness, especially for those working outdoors, elderly individuals, and those with chronic conditions.",
      safety: "Take regular breaks in cool areas. Wear light, loose clothing. Limit strenuous activities to cooler parts of the day."
    },
    LOW: {
      title: "Normal Heat Levels",
      content: "Current temperatures are within comfortable ranges for most activities. The body can regulate temperature effectively under these conditions.",
      safety: "Standard precautions apply—stay hydrated during physical activity and be aware of personal heat tolerance."
    }
  };

  const info = explanations[riskLevel] || explanations.LOW;

  return (
    <EducationCard
      title={info.title}
      subtitle="Heat Risk Education"
      icon={Flame}
      expandable
      defaultExpanded={false}
      accentColor={riskLevel === "HIGH" ? "#ef4444" : riskLevel === "MODERATE" ? "#f59e0b" : "#22c55e"}
    >
      <EducationSection title="Understanding Heat Stress">
        {info.content}
      </EducationSection>

      <div className="grid grid-cols-2 gap-3 my-3">
        <div className="rounded-xl bg-white/5 px-3 py-2">
          <div className="text-[10px] text-slate-500">Temperature</div>
          <div className="text-[12px] text-slate-200">{temperature?.toFixed(1)}°C</div>
        </div>
        <div className="rounded-xl bg-white/5 px-3 py-2">
          <div className="text-[10px] text-slate-500">Humidity</div>
          <div className="text-[12px] text-slate-200">{humidity}%</div>
        </div>
      </div>

      <KeyFact>
        <strong>Safety:</strong> {info.safety}
      </KeyFact>

      <EducationSection title="How Satellites Detect Heat">
        Thermal infrared sensors on satellites like Landsat and MODIS measure Land Surface Temperature (LST). 
        This shows how hot the ground gets—often 10-20°C higher than air temperature over dark surfaces like asphalt. 
        Urban heat islands, where cities are significantly hotter than surroundings, are clearly visible from space.
      </EducationSection>
    </EducationCard>
  );
};

/**
 * Rainfall education based on precipitation data
 */
const RainfallEducation = ({ precipitation7Day, deficitStatus }) => {
  const isDeficit = deficitStatus !== "ADEQUATE";

  return (
    <EducationCard
      title="Precipitation Patterns"
      subtitle={isDeficit ? "Rainfall Anomaly Detected" : "Precipitation Analysis"}
      icon={Droplets}
      expandable
      defaultExpanded={false}
      accentColor={isDeficit ? "#f59e0b" : "#38bdf8"}
    >
      <EducationSection title="Why Precipitation Tracking Matters">
        Consistent precipitation monitoring helps identify drought conditions before they become severe. 
        A 7-day rolling total provides insight into short-term water availability, 
        while longer periods reveal seasonal patterns and climate trends.
      </EducationSection>

      <div className="rounded-xl bg-white/5 px-3 py-2 my-3">
        <div className="text-[10px] text-slate-500">7-Day Total</div>
        <div className="text-[12px] text-slate-200">{precipitation7Day?.toFixed(1)} mm</div>
        <div className="text-[10px] text-slate-400">
          {isDeficit 
            ? "Below typical seasonal average" 
            : "Within normal range"}
        </div>
      </div>

      <EducationSection title="Satellite Precipitation Measurement">
        The Global Precipitation Measurement (GPM) mission uses microwave and radar sensors to measure rainfall globally. 
        Microwave sensors detect rain within clouds, while radar provides vertical profiles of precipitation. 
        Combined, they enable precipitation estimates every 30 minutes worldwide.
      </EducationSection>

      {isDeficit && (
        <KeyFact>
          <strong>Impact:</strong> Precipitation deficits affect agriculture, water supplies, and wildfire risk. 
          Extended deficits can lead to drought declarations and water restrictions.
        </KeyFact>
      )}
    </EducationCard>
  );
};

/**
 * Cloud formation education
 */
const CloudEducation = ({ cloudCover }) => {
  const getCoverageDescription = (cover) => {
    if (cover < 20) return { label: "Clear", description: "Few clouds obstruct the sky. Excellent visibility for astronomical observation." };
    if (cover < 50) return { label: "Partly Cloudy", description: "Scattered clouds with significant clear patches. Moderate viewing conditions." };
    if (cover < 80) return { label: "Mostly Cloudy", description: "Clouds dominate but breaks occur. Limited astronomical visibility." };
    return { label: "Overcast", description: "Complete or near-complete cloud cover. Poor conditions for sky observation." };
  };

  const coverage = getCoverageDescription(cloudCover || 0);

  return (
    <EducationCard
      title="Cloud Formation"
      subtitle={coverage.label}
      icon={Cloud}
      expandable
      defaultExpanded={false}
      accentColor="#94a3b8"
    >
      <EducationSection title="Current Coverage">
        {coverage.description}
      </EducationSection>

      <div className="rounded-xl bg-white/5 px-3 py-2 my-3">
        <div className="text-[10px] text-slate-500">Cloud Cover</div>
        <div className="text-[12px] text-slate-200">{cloudCover}%</div>
      </div>

      <EducationSection title="How Clouds Form">
        Clouds form when air rises and cools, causing water vapor to condense around tiny particles (cloud condensation nuclei). 
        The altitude and temperature at which this occurs determines cloud type—cumulus (puffy), stratus (layered), or cirrus (wispy).
      </EducationSection>

      <EducationSection title="Satellite Cloud Observation">
        Weather satellites observe clouds in multiple wavelengths:
        <ul className="list-disc list-inside mt-2 space-y-1 text-[11px]">
          <li><strong>Visible:</strong> Shows cloud reflectivity (daytime only)</li>
          <li><strong>Infrared:</strong> Measures cloud-top temperature (24/7)</li>
          <li><strong>Water vapor:</strong> Tracks moisture in upper atmosphere</li>
        </ul>
      </EducationSection>
    </EducationCard>
  );
};

/**
 * Main Climate Education Panel - aggregates all climate education
 */
export default function ClimateEducation({ 
  climateData, 
  visible = true 
}) {
  const { learningMode, cacheExplanation, getCachedExplanation } = useLearningMode();
  const [aiExplanation, setAiExplanation] = useState(null);
  const [loading, setLoading] = useState(false);

  const generateClimateExplanation = useCallback(async () => {
    if (!climateData) return;

    const cacheKey = `climate-${climateData.climateStatus?.status}-${climateData.heatwaveRisk?.level}`;
    const cached = getCachedExplanation(cacheKey);
    if (cached) {
      setAiExplanation(cached);
      return;
    }

    setLoading(true);
    
    const prompt = `As a climate scientist, explain the current climate conditions in educational terms for a general audience:

Current Conditions:
- Temperature: ${climateData.weather?.current?.temperature}°C
- Humidity: ${climateData.weather?.current?.humidity}%
- Cloud Cover: ${climateData.weather?.current?.cloudCover}%
- 7-Day Precipitation: ${climateData.totalPrecipitation7Days?.toFixed(1)}mm
- Heatwave Risk: ${climateData.heatwaveRisk?.level}
- Overall Status: ${climateData.climateStatus?.status} - ${climateData.climateStatus?.detail}

Explain:
1. What these conditions mean for daily life
2. How satellites help monitor these conditions
3. One interesting fact about climate monitoring

Keep it concise and educational. No emojis.`;

    try {
      const res = await fetch(`${OLLAMA_BASE_URL}/api/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: OLLAMA_MODEL,
          prompt,
          stream: false
        })
      });

      if (!res.ok) throw new Error("Request failed");
      const data = await res.json();
      const explanation = data.response || null;
      
      if (explanation) {
        setAiExplanation(explanation);
        cacheExplanation(cacheKey, explanation);
      }
    } catch (err) {
      console.error("Climate explanation error:", err);
    } finally {
      setLoading(false);
    }
  }, [climateData, getCachedExplanation, cacheExplanation]);

  if (!learningMode || !visible) return null;

  return (
    <div className="space-y-4">
      {/* Overall Climate Understanding */}
      <EducationCard
        title="Understand Today's Climate"
        subtitle="AI-powered explanation"
        icon={Sparkles}
        accentColor="#22c55e"
        loading={loading}
        headerAction={
          !aiExplanation && !loading && (
            <button
              onClick={generateClimateExplanation}
              className="px-2 py-1 rounded-full text-[10px] border border-emerald-400/30 bg-emerald-500/20 text-emerald-200 hover:bg-emerald-500/30"
            >
              Generate
            </button>
          )
        }
      >
        {aiExplanation ? (
          <div className="text-[12px] text-slate-300 leading-relaxed whitespace-pre-wrap">
            {aiExplanation}
          </div>
        ) : (
          <div className="text-[11px] text-slate-400 py-4 text-center">
            Click "Generate" for an AI explanation of current climate conditions
          </div>
        )}
      </EducationCard>

      {/* Heatwave Education */}
      {climateData?.weather?.current && (
        <HeatwaveEducation
          temperature={climateData.weather.current.temperature}
          humidity={climateData.weather.current.humidity}
          riskLevel={climateData.heatwaveRisk?.level || "LOW"}
        />
      )}

      {/* Rainfall Education */}
      <RainfallEducation
        precipitation7Day={climateData?.totalPrecipitation7Days || 0}
        deficitStatus={climateData?.rainDeficit?.status || "ADEQUATE"}
      />

      {/* Cloud Education */}
      {climateData?.weather?.current && (
        <CloudEducation cloudCover={climateData.weather.current.cloudCover} />
      )}

      {/* Satellite Monitoring Principles */}
      <EducationCard
        title="Satellite Measurement Principles"
        subtitle="How we monitor Earth from space"
        icon={Satellite}
        expandable
        defaultExpanded={false}
        accentColor="#a78bfa"
      >
        <EducationSection title="Remote Sensing Basics">
          Satellites measure electromagnetic radiation—visible light, infrared, and microwaves—reflected or emitted by Earth. 
          Different wavelengths reveal different information: visible shows what we see, infrared reveals temperature, 
          and microwaves can penetrate clouds to measure soil moisture and ice.
        </EducationSection>

        <EducationSection title="Why Space Observation Matters">
          Ground stations provide accurate local data but can't cover oceans, remote regions, or provide uniform global coverage. 
          Satellites observe the entire planet consistently using identical instruments, 
          making them essential for tracking global climate change.
        </EducationSection>

        <KeyFact>
          Over 160 Earth observation satellites currently monitor our planet, 
          collecting petabytes of climate data annually.
        </KeyFact>
      </EducationCard>
    </div>
  );
}
