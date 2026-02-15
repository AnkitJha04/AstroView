/**
 * ClimateTab - Main climate dashboard component
 * Professional Earth Observation dashboard matching AstroView's dark theme
 */

import { useCallback, useMemo, useState } from "react";
import {
  Cloud,
  Droplets,
  Flame,
  RefreshCw,
  Thermometer,
  Wind,
  AlertTriangle,
  Sparkles,
  TrendingUp,
  Eye
} from "lucide-react";
import ClimateCard, {
  ClimateStatItem,
  RiskBadge,
  ClimateProgress
} from "./ClimateCard";
import ClimateEducation from "./ClimateEducation";
import { useClimateData } from "../lib/climate/useClimateData";
import {
  getWeatherDescription,
  getWindDirection,
  getAqiLevel,
  calculateRainDeficit
} from "../lib/climate/climateService";

const OLLAMA_BASE_URL = "http://localhost:11434";
const OLLAMA_MODEL = import.meta.env.VITE_OLLAMA_MODEL || "llama3.1:latest";

/**
 * Simple inline SVG chart for 7-day temperature trend
 */
function TemperatureChart({ dates, tempMax, tempMin }) {
  if (!dates?.length || !tempMax?.length) {
    return (
      <div className="text-[11px] text-slate-400 py-4 text-center">
        No temperature data available
      </div>
    );
  }

  const width = 280;
  const height = 120;
  const padding = { top: 20, right: 10, bottom: 30, left: 35 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  const allTemps = [...tempMax, ...tempMin].filter((t) => t !== null);
  const minTemp = Math.min(...allTemps) - 2;
  const maxTemp = Math.max(...allTemps) + 2;

  const xScale = (i) => padding.left + (i / (dates.length - 1)) * chartWidth;
  const yScale = (temp) =>
    padding.top + ((maxTemp - temp) / (maxTemp - minTemp)) * chartHeight;

  const createPath = (values) => {
    return values
      .map((val, i) => {
        if (val === null) return "";
        const x = xScale(i);
        const y = yScale(val);
        return `${i === 0 ? "M" : "L"} ${x} ${y}`;
      })
      .join(" ");
  };

  const formatDay = (dateStr) => {
    try {
      return new Date(dateStr).toLocaleDateString("en", { weekday: "short" });
    } catch {
      return "";
    }
  };

  return (
    <svg width={width} height={height} className="overflow-visible">
      {/* Grid lines */}
      {[0, 0.25, 0.5, 0.75, 1].map((ratio, i) => {
        const y = padding.top + ratio * chartHeight;
        const temp = maxTemp - ratio * (maxTemp - minTemp);
        return (
          <g key={i}>
            <line
              x1={padding.left}
              y1={y}
              x2={width - padding.right}
              y2={y}
              stroke="rgba(148, 163, 184, 0.1)"
              strokeDasharray="2,2"
            />
            <text
              x={padding.left - 5}
              y={y + 3}
              textAnchor="end"
              className="fill-slate-500 text-[9px]"
            >
              {temp.toFixed(0)}°
            </text>
          </g>
        );
      })}

      {/* X-axis labels */}
      {dates.map((date, i) => (
        <text
          key={i}
          x={xScale(i)}
          y={height - 8}
          textAnchor="middle"
          className="fill-slate-500 text-[9px]"
        >
          {formatDay(date)}
        </text>
      ))}

      {/* Area fill for temperature range */}
      <path
        d={`
          ${createPath(tempMax)}
          ${tempMin
            .slice()
            .reverse()
            .map((val, i) => {
              const idx = tempMin.length - 1 - i;
              if (val === null) return "";
              return `L ${xScale(idx)} ${yScale(val)}`;
            })
            .join(" ")}
          Z
        `}
        fill="rgba(56, 189, 248, 0.1)"
      />

      {/* Max temperature line */}
      <path
        d={createPath(tempMax)}
        fill="none"
        stroke="#f59e0b"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Min temperature line */}
      <path
        d={createPath(tempMin)}
        fill="none"
        stroke="#38bdf8"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Data points */}
      {tempMax.map((temp, i) =>
        temp !== null ? (
          <circle
            key={`max-${i}`}
            cx={xScale(i)}
            cy={yScale(temp)}
            r={3}
            fill="#f59e0b"
          />
        ) : null
      )}
      {tempMin.map((temp, i) =>
        temp !== null ? (
          <circle
            key={`min-${i}`}
            cx={xScale(i)}
            cy={yScale(temp)}
            r={3}
            fill="#38bdf8"
          />
        ) : null
      )}

      {/* Legend */}
      <g transform={`translate(${padding.left}, 8)`}>
        <circle cx={0} cy={0} r={3} fill="#f59e0b" />
        <text x={8} y={3} className="fill-slate-400 text-[9px]">
          Max
        </text>
        <circle cx={40} cy={0} r={3} fill="#38bdf8" />
        <text x={48} y={3} className="fill-slate-400 text-[9px]">
          Min
        </text>
      </g>
    </svg>
  );
}

/**
 * Cloud cover overlay panel
 */
function CloudOverlayPanel({ cloudCover, onToggle, isVisible, opacity, onOpacityChange }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <ClimateStatItem
          label="Current Coverage"
          value={cloudCover ?? "--"}
          unit="%"
          size="large"
        />
        <button
          onClick={onToggle}
          className={`px-3 py-2 rounded-full text-[10px] uppercase tracking-wider border transition-colors ${
            isVisible
              ? "border-cyan-400/40 bg-cyan-500/25 text-cyan-100"
              : "border-white/10 bg-white/5 text-slate-300"
          }`}
        >
          {isVisible ? "Hide Overlay" : "Show Overlay"}
        </button>
      </div>

      {isVisible && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-[10px] text-slate-400">
            <span>Opacity</span>
            <span>{Math.round(opacity * 100)}%</span>
          </div>
          <input
            type="range"
            min="0"
            max="100"
            value={opacity * 100}
            onChange={(e) => onOpacityChange(Number(e.target.value) / 100)}
            className="w-full h-2 rounded-full appearance-none bg-slate-800/50 cursor-pointer
              [&::-webkit-slider-thumb]:appearance-none
              [&::-webkit-slider-thumb]:w-4
              [&::-webkit-slider-thumb]:h-4
              [&::-webkit-slider-thumb]:rounded-full
              [&::-webkit-slider-thumb]:bg-cyan-400
              [&::-webkit-slider-thumb]:cursor-pointer"
          />
        </div>
      )}

      <div className="grid grid-cols-3 gap-2 text-center pt-2">
        <div className="rounded-xl bg-white/5 px-2 py-2">
          <div className="text-[9px] uppercase text-slate-500">Clear</div>
          <div className="text-[11px] text-slate-300">0-25%</div>
        </div>
        <div className="rounded-xl bg-white/5 px-2 py-2">
          <div className="text-[9px] uppercase text-slate-500">Partial</div>
          <div className="text-[11px] text-slate-300">26-75%</div>
        </div>
        <div className="rounded-xl bg-white/5 px-2 py-2">
          <div className="text-[9px] uppercase text-slate-500">Overcast</div>
          <div className="text-[11px] text-slate-300">76-100%</div>
        </div>
      </div>
    </div>
  );
}

/**
 * Severe weather alert card
 */
function AlertCard({ alert }) {
  return (
    <div
      className="rounded-xl border px-3 py-3 space-y-2"
      style={{
        backgroundColor: `${alert.color}10`,
        borderColor: `${alert.color}30`
      }}
    >
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-slate-100">
          {alert.name}
        </span>
        <RiskBadge level={alert.riskLevel} color={alert.color} />
      </div>
      <div className="flex items-center gap-4 text-[11px] text-slate-300">
        <span className="flex items-center gap-1">
          <Wind className="w-3 h-3" />
          {alert.windSpeed} km/h
        </span>
        <span className="flex items-center gap-1">
          Direction: {getWindDirection(alert.windDirection)}
        </span>
      </div>
    </div>
  );
}

export default function ClimateTab({ coords, isActive, onExplainRequest, showEducation = false }) {
  const {
    weather,
    airQuality,
    alerts,
    heatwaveRisk,
    climateStatus,
    totalPrecipitation7Days,
    loading,
    error,
    lastUpdated,
    refresh
  } = useClimateData(coords, isActive);

  // Aggregate climate data for education module
  const climateData = {
    weather,
    airQuality,
    alerts,
    heatwaveRisk,
    climateStatus,
    totalPrecipitation7Days,
    rainDeficit: null // Will be calculated below
  };

  const [cloudOverlayVisible, setCloudOverlayVisible] = useState(false);
  const [cloudOpacity, setCloudOpacity] = useState(0.6);
  const [aiExplanation, setAiExplanation] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState("");

  const aqiInfo = useMemo(
    () => getAqiLevel(airQuality?.usAqi),
    [airQuality?.usAqi]
  );

  const rainDeficit = useMemo(
    () => calculateRainDeficit(weather?.daily?.precipitation || []),
    [weather?.daily?.precipitation]
  );

  // Update climateData with calculated rainDeficit for education module
  climateData.rainDeficit = rainDeficit;

  const handleExplainClimate = useCallback(async () => {
    if (!weather) return;

    setAiLoading(true);
    setAiError("");
    setAiExplanation("");

    const summary = `
Current Weather: ${getWeatherDescription(weather.current?.weatherCode)}
Temperature: ${weather.current?.temperature}°C (feels like ${weather.current?.apparentTemp}°C)
Humidity: ${weather.current?.humidity}%
Cloud Cover: ${weather.current?.cloudCover}%
Wind: ${weather.current?.windSpeed} km/h from ${getWindDirection(weather.current?.windDirection)}
7-day Precipitation: ${totalPrecipitation7Days.toFixed(1)}mm
Air Quality Index: ${airQuality?.usAqi ?? "N/A"} (${aqiInfo.level})
Heatwave Risk: ${heatwaveRisk?.level ?? "N/A"}
Climate Status: ${climateStatus.status} - ${climateStatus.detail}
Active Alerts: ${alerts.length > 0 ? alerts.map((a) => a.name).join(", ") : "None"}
    `.trim();

    const prompt = `As a climate scientist, explain this current weather and climate status in simple terms for the general public. Include any health or safety recommendations. Be concise (3-5 sentences):\n\n${summary}`;

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);

      const res = await fetch(`${OLLAMA_BASE_URL}/api/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: OLLAMA_MODEL,
          prompt,
          stream: false
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!res.ok) throw new Error("Ollama request failed");

      const data = await res.json();
      setAiExplanation(data.response || "No explanation generated.");
    } catch (err) {
      if (err.name === "AbortError") {
        setAiError("Request timed out. Try again.");
      } else {
        setAiError("AI assistant unavailable. Make sure Ollama is running.");
      }
    } finally {
      setAiLoading(false);
    }
  }, [weather, airQuality, heatwaveRisk, climateStatus, alerts, totalPrecipitation7Days, aqiInfo]);

  if (!isActive) return null;

  return (
    <div className="space-y-4 animate-in fade-in duration-300">
      {/* Header Status */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div
            className="w-3 h-3 rounded-full animate-pulse"
            style={{ backgroundColor: climateStatus.color }}
          />
          <div>
            <h2 className="text-sm font-semibold text-slate-100">
              Climate Status: {climateStatus.status}
            </h2>
            <p className="text-[11px] text-slate-400">{climateStatus.detail}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {lastUpdated && (
            <span className="text-[10px] text-slate-500">
              Updated {lastUpdated.toLocaleTimeString()}
            </span>
          )}
          <button
            onClick={refresh}
            disabled={loading}
            className="p-2 rounded-full border border-white/10 bg-white/5 hover:bg-white/10 disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 text-slate-300 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-xl bg-rose-500/10 border border-rose-400/20 px-4 py-3 text-[11px] text-rose-300">
          {error}
        </div>
      )}

      {/* Main Climate Dashboard */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Climate Overview */}
        <ClimateCard
          title="Climate Overview"
          subtitle="Current conditions"
          icon={Thermometer}
          loading={loading && !weather}
        >
          {weather && (
            <div className="grid grid-cols-2 gap-4">
              <ClimateStatItem
                label="Temperature"
                value={weather.current?.temperature?.toFixed(1) ?? "--"}
                unit={weather.units?.temperature}
                size="large"
              />
              <ClimateStatItem
                label="Feels Like"
                value={weather.current?.apparentTemp?.toFixed(1) ?? "--"}
                unit={weather.units?.temperature}
              />
              <ClimateStatItem
                label="Humidity"
                value={weather.current?.humidity ?? "--"}
                unit="%"
              />
              <ClimateStatItem
                label="7-Day Rain"
                value={totalPrecipitation7Days.toFixed(1)}
                unit={weather.units?.precipitation}
              />
              <div className="col-span-2">
                <ClimateProgress
                  label="Air Quality Index"
                  value={airQuality?.usAqi ?? 0}
                  max={300}
                  color={aqiInfo.color}
                />
                <div className="text-[10px] mt-1" style={{ color: aqiInfo.color }}>
                  {aqiInfo.level}
                </div>
              </div>
            </div>
          )}
        </ClimateCard>

        {/* Heatwave Risk */}
        <ClimateCard
          title="Heatwave Risk"
          subtitle="Heat index analysis"
          icon={Flame}
          loading={loading && !heatwaveRisk}
        >
          {heatwaveRisk && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <ClimateStatItem
                  label="Risk Level"
                  value={heatwaveRisk.level}
                  color={heatwaveRisk.color}
                  size="large"
                />
                <RiskBadge level={heatwaveRisk.level} color={heatwaveRisk.color} />
              </div>
              <div className="grid grid-cols-2 gap-3 text-[11px]">
                <div className="rounded-xl bg-white/5 px-3 py-2">
                  <div className="text-slate-500">Temperature</div>
                  <div className="text-slate-200">
                    {weather?.current?.temperature?.toFixed(1)}°C
                  </div>
                </div>
                <div className="rounded-xl bg-white/5 px-3 py-2">
                  <div className="text-slate-500">Humidity</div>
                  <div className="text-slate-200">{weather?.current?.humidity}%</div>
                </div>
              </div>
              {heatwaveRisk.level !== "LOW" && (
                <div className="rounded-xl bg-amber-500/10 border border-amber-400/20 px-3 py-2 text-[11px] text-amber-200">
                  Stay hydrated and avoid prolonged sun exposure.
                </div>
              )}
            </div>
          )}
        </ClimateCard>

        {/* Cloud Cover Overlay */}
        <ClimateCard
          title="Cloud Cover"
          subtitle="Satellite overlay"
          icon={Cloud}
          loading={loading && !weather}
        >
          <CloudOverlayPanel
            cloudCover={weather?.current?.cloudCover}
            isVisible={cloudOverlayVisible}
            onToggle={() => setCloudOverlayVisible((v) => !v)}
            opacity={cloudOpacity}
            onOpacityChange={setCloudOpacity}
          />
        </ClimateCard>

        {/* Severe Weather */}
        <ClimateCard
          title="Severe Weather"
          subtitle="Active alerts"
          icon={AlertTriangle}
          loading={loading}
        >
          {alerts.length > 0 ? (
            <div className="space-y-3">
              {alerts.map((alert) => (
                <AlertCard key={alert.id} alert={alert} />
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-6 text-center">
              <div className="w-12 h-12 rounded-full bg-green-500/10 border border-green-400/20 flex items-center justify-center mb-3">
                <Eye className="w-5 h-5 text-green-400" />
              </div>
              <div className="text-[11px] text-slate-400">
                No severe weather alerts
              </div>
              <div className="text-[10px] text-slate-500">
                Conditions are currently safe
              </div>
            </div>
          )}
        </ClimateCard>

        {/* Temperature Trend */}
        <ClimateCard
          title="7-Day Trend"
          subtitle="Temperature forecast"
          icon={TrendingUp}
          loading={loading && !weather}
          className="md:col-span-2"
        >
          {weather?.daily && (
            <div className="flex justify-center py-2">
              <TemperatureChart
                dates={weather.daily.dates}
                tempMax={weather.daily.tempMax}
                tempMin={weather.daily.tempMin}
              />
            </div>
          )}
        </ClimateCard>

        {/* AI Climate Explainer */}
        <ClimateCard
          title="AI Climate Explainer"
          subtitle="Powered by Ollama"
          icon={Sparkles}
          className="md:col-span-2"
          headerAction={
            <button
              onClick={handleExplainClimate}
              disabled={aiLoading || !weather}
              className="px-3 py-1.5 rounded-full text-[10px] uppercase tracking-wider border border-cyan-400/30 bg-cyan-500/20 text-cyan-100 hover:bg-cyan-500/30 disabled:opacity-50 transition-colors"
            >
              {aiLoading ? "Analyzing..." : "Explain Climate Status"}
            </button>
          }
        >
          {aiLoading && (
            <div className="flex items-center justify-center py-8">
              <div className="flex items-center gap-3 text-xs text-cyan-200">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-cyan-200/30 border-t-cyan-200" />
                Analyzing climate data...
              </div>
            </div>
          )}

          {aiError && (
            <div className="rounded-xl bg-rose-500/10 border border-rose-400/20 px-3 py-2 text-[11px] text-rose-300">
              {aiError}
            </div>
          )}

          {aiExplanation && !aiLoading && (
            <div className="rounded-xl border border-white/10 bg-slate-950/60 px-4 py-3 text-[12px] text-slate-200 leading-relaxed whitespace-pre-wrap">
              {aiExplanation}
            </div>
          )}

          {!aiExplanation && !aiLoading && !aiError && (
            <div className="text-center py-6">
              <div className="text-[11px] text-slate-400">
                Click "Explain Climate Status" to get an AI-powered summary
              </div>
              <div className="text-[10px] text-slate-500 mt-1">
                Requires Ollama running on localhost:11434
              </div>
            </div>
          )}
        </ClimateCard>
      </div>

      {/* Rain Deficit Warning */}
      {rainDeficit.status !== "ADEQUATE" && (
        <div className="rounded-xl bg-amber-500/10 border border-amber-400/20 px-4 py-3 flex items-center gap-3">
          <Droplets className="w-5 h-5 text-amber-400" />
          <div>
            <div className="text-[11px] font-semibold text-amber-200">
              Precipitation {rainDeficit.status.replace("_", " ")}
            </div>
            <div className="text-[10px] text-amber-300/70">
              {rainDeficit.value.toFixed(1)}mm below expected for the past 7 days
            </div>
          </div>
        </div>
      )}

      {/* Climate Education Panel (Learning Mode) */}
      {showEducation && (
        <div className="mt-6 space-y-4">
          <div className="text-xs uppercase tracking-[0.3em] text-slate-400 mb-3">
            Learning Mode
          </div>
          <ClimateEducation
            climateData={climateData}
            visible={showEducation}
          />
        </div>
      )}
    </div>
  );
}
