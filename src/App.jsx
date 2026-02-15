import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as Astronomy from "astronomy-engine";
import {
  Activity,
  Bell,
  Book,
  Compass,
  GraduationCap,
  Globe2,
  MapPin,
  Navigation,
  Pause,
  Play,
  Search,
  Star,
  X
} from "lucide-react";
import SkyCanvas from "./components/SkyCanvas";
import SkyDome from "./components/SkyDome";
import ClimateTab from "./components/ClimateTab";
import DisasterModule from "./components/DisasterModule";
import { LearningModeProvider, useLearningMode } from "./lib/teaching/useLearningMode";
import { ObjectLearningPanel, GuidedTour, LearningPromptBanner } from "./components/TeachingModule";
import { LearningModeToggle } from "./components/EducationCard";
import LessonsLibrary from "./components/LessonsLibrary";
import ClimateEducation from "./components/ClimateEducation";
import SatelliteEducation from "./components/SatelliteEducation";
import brightStars from "./data/bright-stars.json";
import constellations from "./data/constellations.json";
import deepSky from "./data/deep-sky.json";
import {
  getConstellationLines,
  getDeepSkyObjects,
  getSolarSystemObjects,
  getStarObjects
} from "./lib/astro/skyObjects";
import { clamp, wrap360 } from "./lib/astro/skyMath";
import {
  fetchTleByCatalog,
  fetchTleByName,
  fetchTleGroups,
  getFallbackTles,
  getSatelliteObjects
} from "./lib/astro/satellites";
import { useDeviceOrientation } from "./lib/sensors/useDeviceOrientation";
import { useGeolocation } from "./lib/sensors/useGeolocation";

const formatCoord = (value, suffixPositive, suffixNegative) => {
  const suffix = value >= 0 ? suffixPositive : suffixNegative;
  const abs = Math.abs(value).toFixed(4);
  return `${abs}${suffix}`;
};

const formatAngle = (value) => `${value.toFixed(1)}deg`;
const NASA_API_KEY = import.meta.env.VITE_NASA_API_KEY || "RVIyEa32Wc7hJum3LX77eohhSqjdtsfwtxXMAyYe";
const OLLAMA_MODEL = import.meta.env.VITE_OLLAMA_MODEL || "llama3.1:latest";
const OLLAMA_BASE_URL = "http://localhost:11434";
const OLLAMA_TIMEOUT_MS = Number(import.meta.env.VITE_OLLAMA_TIMEOUT_MS) || 45000;
const HUBBLE_LIVE_URL = import.meta.env.VITE_HUBBLE_LIVE_URL || "https://www.youtube.com/watch?v=aB1yRz0HhdY";
const JWST_LIVE_URL = import.meta.env.VITE_JWST_LIVE_URL || "https://www.youtube.com/watch?v=FV4Q9DryTG8";

const getEmbedOrigin = () => {
  if (typeof window === "undefined") return "";
  return window.location.origin;
};

const toEmbedUrl = (url) => {
  if (!url) return "";
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.replace("www.", "");
    const origin = getEmbedOrigin();
    const originParam = origin ? `&origin=${encodeURIComponent(origin)}` : "";
    if (host === "youtube.com" || host === "m.youtube.com") {
      const videoId = parsed.searchParams.get("v");
      if (videoId) {
        return `https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&mute=1&rel=0&modestbranding=1&playsinline=1${originParam}`;
      }
      if (parsed.pathname.startsWith("/embed/")) {
        return `${parsed.origin}${parsed.pathname}?autoplay=1&mute=1&rel=0&modestbranding=1&playsinline=1${originParam}`;
      }
    }
    if (host === "youtu.be") {
      const videoId = parsed.pathname.replace("/", "");
      if (videoId) {
        return `https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&mute=1&rel=0&modestbranding=1&playsinline=1${originParam}`;
      }
    }
    return url;
  } catch (err) {
    return url;
  }
};
const ASTRONOMY_API_BASE = "https://api.astronomyapi.com/api/v2";
const ASTRONOMY_APP_ID = import.meta.env.VITE_ASTRONOMY_APP_ID || "89fc06d3-ac66-4c2b-af29-f1e60528a429";
const ASTRONOMY_APP_SECRET = import.meta.env.VITE_ASTRONOMY_APP_SECRET || "95fc06d51756c1e3dcb219aca405139e44e65cfe76a41205511a84cde05a018ec4efc97f9c75721e41dc8184599861188ed72f256d4f406a2321e3da371853b211e233b41b548de80764c84839c35c990a0c35a167770673c231ae5250f124489f3c083b8d3807675f3466d487b69ab6";

const buildAstronomyApiAuth = () => {
  if (!ASTRONOMY_APP_ID || !ASTRONOMY_APP_SECRET) return "";
  return `Basic ${btoa(`${ASTRONOMY_APP_ID}:${ASTRONOMY_APP_SECRET}`)}`;
};

const getApiHorizontalPosition = (cell) => {
  const horizontal =
    cell?.position?.horizontal ||
    cell?.horizontal ||
    cell?.position?.topocentric?.horizontal;
  const azimuth =
    horizontal?.azimuth?.degrees ?? horizontal?.azimuth?.degree ?? horizontal?.azimuth;
  const altitude =
    horizontal?.altitude?.degrees ?? horizontal?.altitude?.degree ?? horizontal?.altitude;
  if (azimuth === undefined || altitude === undefined) return null;
  return { az: azimuth, alt: altitude };
};

const fetchOllamaModels = async (signal) => {
  const res = await fetch(`${OLLAMA_BASE_URL}/api/tags`, { signal });
  if (!res.ok) return [];
  const data = await res.json();
  if (!Array.isArray(data?.models)) return [];
  return data.models.map((model) => model.name).filter(Boolean);
};

const postOllamaGenerate = async (payload, signal) => {
  const res = await fetch(`${OLLAMA_BASE_URL}/api/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    signal
  });
  const text = await res.text();
  if (!res.ok) {
    return { ok: false, error: text || "Ollama request failed" };
  }
  try {
    const data = JSON.parse(text);
    return { ok: true, data };
  } catch (err) {
    return { ok: false, error: "Invalid Ollama response" };
  }
};

const formatEventTime = (timeValue) => {
  if (!timeValue) return "--";
  try {
    return new Date(timeValue.date || timeValue).toLocaleString();
  } catch (err) {
    return "--";
  }
};

const moonQuarterName = (quarter) => {
  switch (quarter) {
    case 0:
      return "New Moon";
    case 1:
      return "First Quarter";
    case 2:
      return "Full Moon";
    case 3:
      return "Third Quarter";
    default:
      return "Moon Phase";
  }
};

const visibilityLabel = (sunAlt) => {
  if (sunAlt > 0) return { label: "Poor", detail: "Sun above horizon" };
  if (sunAlt > -6) return { label: "Fair", detail: "Civil twilight" };
  if (sunAlt > -12) return { label: "Good", detail: "Nautical twilight" };
  if (sunAlt > -18) return { label: "Very Good", detail: "Astronomical twilight" };
  return { label: "Excellent", detail: "Dark sky" };
};

const SPACE_KEYWORDS = [
  "sky",
  "space",
  "star",
  "planet",
  "moon",
  "sun",
  "solar",
  "galaxy",
  "nebula",
  "constellation",
  "orbit",
  "asteroid",
  "comet",
  "cosmos",
  "universe",
  "satellite",
  "eclipse",
  "meteor",
  "astronomy",
  "telescope",
  "rocket",
  "iss"
];

const isSpaceQuery = (text) => {
  const query = text.toLowerCase();
  return SPACE_KEYWORDS.some((keyword) => query.includes(keyword));
};

function AppContent() {
  const [view, setView] = useState({ az: 0, alt: 25, fov: 90 });
  const [selectedId, setSelectedId] = useState(null);
  const [isLive, setIsLive] = useState(true);
  const [time, setTime] = useState(new Date());
  const [search, setSearch] = useState("");
  const [useSensors, setUseSensors] = useState(true);
  const [llmPrompt, setLlmPrompt] = useState("");
  const [llmResponse, setLlmResponse] = useState("");
  const [llmLoading, setLlmLoading] = useState(false);
  const [llmError, setLlmError] = useState("");
  const [ollamaStatus, setOllamaStatus] = useState("Idle");
  const [sensorBannerDismissed, setSensorBannerDismissed] = useState(() => {
    try {
      return localStorage.getItem("astroview.sensorBannerDismissed") === "true";
    } catch (err) {
      return false;
    }
  });
  const [city, setCity] = useState("");
  const [locationStatus, setLocationStatus] = useState("");
  const lastAutoId = useRef(null);
  const [showNotifications, setShowNotifications] = useState(false);
  const [tleData, setTleData] = useState([]);
  const [tleStatus, setTleStatus] = useState("Idle");
  const [nasaApod, setNasaApod] = useState(null);
  const [nasaEvents, setNasaEvents] = useState([]);
  const [notifyTips, setNotifyTips] = useState("");
  const [nasaStatus, setNasaStatus] = useState("Idle");
  const [nasaError, setNasaError] = useState("");
  const [telescopeFeeds, setTelescopeFeeds] = useState({ hubble: null, jwst: null });
  const [telescopeFeedStatus, setTelescopeFeedStatus] = useState("Idle");
  const [telescopeFeedUpdatedAt, setTelescopeFeedUpdatedAt] = useState(null);
  const [telescopeFeedError, setTelescopeFeedError] = useState("");
  const [telescopeFeedMode, setTelescopeFeedMode] = useState("live");
  const [liveEmbedLoaded, setLiveEmbedLoaded] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [apodSummary, setApodSummary] = useState("");
  const [apodSummaryStatus, setApodSummaryStatus] = useState("idle");
  const [tipsStatus, setTipsStatus] = useState("idle");
  const [showSatelliteView, setShowSatelliteView] = useState(false);
  const [satelliteTarget, setSatelliteTarget] = useState("hubble");
  const [viewMode, setViewMode] = useState("360");
  const [skyApiObjects, setSkyApiObjects] = useState([]);
  const [skyApiStatus, setSkyApiStatus] = useState("Idle");
  const lastSkyApiFetch = useRef(0);
  const [activeTab, setActiveTab] = useState("sky"); // "sky", "climate", or "disaster"
  const [showLessonsLibrary, setShowLessonsLibrary] = useState(false);
  const [showGuidedTour, setShowGuidedTour] = useState(false);

  const { status: orientationStatus, orientation, start: startOrientation } =
    useDeviceOrientation();
  const {
    status: geoStatus,
    coords,
    error: geoError,
    start: startGeolocation
  } = useGeolocation();

  // Teaching Module context
  const { learningMode, toggleLearningMode, presentationMode } = useLearningMode();

  useEffect(() => {
    if (!isLive) return;
    const id = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(id);
  }, [isLive]);

  useEffect(() => {
    startGeolocation();
  }, [startGeolocation]);

  useEffect(() => {
    if (!useSensors) return;
    startOrientation();
    startGeolocation();
  }, [useSensors, startOrientation, startGeolocation]);

  useEffect(() => {
    if (!useSensors || !orientation) return;
    setView((current) => ({
      ...current,
      az: wrap360(orientation.heading ?? current.az),
      alt: clamp(orientation.pitch ?? current.alt, -85, 85)
    }));
  }, [orientation, useSensors]);

  const activeLocation = useMemo(
    () =>
      coords || {
        lat: 0,
        lon: 0,
        altitude: 0
      },
    [coords]
  );

  const observer = useMemo(
    () =>
      new Astronomy.Observer(
        activeLocation.lat,
        activeLocation.lon,
        activeLocation.altitude || 0
      ),
    [activeLocation]
  );

  const solarObjects = useMemo(
    () => getSolarSystemObjects(time, observer),
    [time, observer]
  );
  const starObjects = useMemo(
    () => getStarObjects(time, observer, brightStars),
    [time, observer]
  );
  const deepSkyObjects = useMemo(
    () => getDeepSkyObjects(time, observer, deepSky),
    [time, observer]
  );

  const solarObjectMap = useMemo(
    () => new Map(solarObjects.map((obj) => [obj.name.toLowerCase(), obj])),
    [solarObjects]
  );

  const satelliteObjects = useMemo(
    () => getSatelliteObjects(time, activeLocation, tleData, 120),
    [time, activeLocation, tleData]
  );

  useEffect(() => {
    if (viewMode !== "360") return;
    if (!ASTRONOMY_APP_ID || !ASTRONOMY_APP_SECRET) {
      setSkyApiStatus("Missing AstronomyAPI credentials");
      setSkyApiObjects([]);
      return;
    }

    const now = Date.now();
    if (now - lastSkyApiFetch.current < 60000) return;
    lastSkyApiFetch.current = now;

    const controller = new AbortController();
    const loadSkyApi = async () => {
      try {
        setSkyApiStatus("Syncing AstronomyAPI...");
        const iso = time.toISOString();
        const dateStr = iso.slice(0, 10);
        const timeStr = iso.slice(11, 19);
        const bodyList = [
          "Sun",
          "Moon",
          "Mercury",
          "Venus",
          "Mars",
          "Jupiter",
          "Saturn",
          "Uranus",
          "Neptune"
        ].join(",");
        const url = new URL(`${ASTRONOMY_API_BASE}/bodies/positions`);
        url.searchParams.set("latitude", activeLocation.lat.toFixed(4));
        url.searchParams.set("longitude", activeLocation.lon.toFixed(4));
        url.searchParams.set("elevation", Math.round(activeLocation.altitude || 0));
        url.searchParams.set("from_date", dateStr);
        url.searchParams.set("to_date", dateStr);
        url.searchParams.set("time", timeStr);
        url.searchParams.set("bodies", bodyList);

        const authHeader = buildAstronomyApiAuth();
        const headers = authHeader ? { Authorization: authHeader } : undefined;
        const res = await fetch(url.toString(), {
          headers,
          signal: controller.signal
        });
        if (!res.ok) throw new Error("AstronomyAPI request failed");
        const payload = await res.json();
        const rows = payload?.data?.table?.rows || payload?.data?.rows || [];
        const apiObjects = rows
          .map((row) => {
            const name = row?.entry?.name || row?.entry?.id || row?.body?.name;
            if (!name) return null;
            const cell = row?.cells?.[0] || row?.positions?.[0] || row?.position;
            const coords = getApiHorizontalPosition(cell);
            if (!coords) return null;
            const local = solarObjectMap.get(name.toLowerCase());
            return {
              id: name.toLowerCase().replace(/\s+/g, "-"),
              name,
              type: local?.type || "planet",
              az: coords.az,
              alt: coords.alt,
              mag: local?.mag ?? 0,
              color: local?.color || "#f8fafc"
            };
          })
          .filter(Boolean);

        setSkyApiObjects(apiObjects);
        setSkyApiStatus(
          apiObjects.length ? "AstronomyAPI synced" : "AstronomyAPI empty"
        );
      } catch (err) {
        if (controller.signal.aborted) return;
        setSkyApiObjects([]);
        setSkyApiStatus("AstronomyAPI unavailable");
      }
    };

    loadSkyApi();
    return () => controller.abort();
  }, [viewMode, time, activeLocation, solarObjectMap]);

  const activeSolarObjects = useMemo(
    () => (viewMode === "360" && skyApiObjects.length ? skyApiObjects : solarObjects),
    [viewMode, skyApiObjects, solarObjects]
  );

  const skyDomeLoading = viewMode === "360" && skyApiStatus === "Syncing AstronomyAPI...";
  const skyDomeStatus =
    viewMode === "360"
      ? skyApiStatus
      : "Inactive";
  const skyViewStatus =
    viewMode === "360"
      ? skyDomeLoading
        ? "3D sky loading"
        : "3D sky ready"
      : "2D sky ready";

  const objects = useMemo(
    () => [...activeSolarObjects, ...deepSkyObjects, ...starObjects, ...satelliteObjects],
    [activeSolarObjects, deepSkyObjects, starObjects, satelliteObjects]
  );

  const apodImage = useMemo(() => {
    if (!nasaApod || nasaApod.media_type !== "image") return null;
    return nasaApod.hdurl || nasaApod.url;
  }, [nasaApod]);

  const constellationLines = useMemo(
    () => getConstellationLines(time, observer, constellations),
    [time, observer]
  );

  const selectedObject = useMemo(
    () => objects.find((obj) => obj.id === selectedId) || null,
    [objects, selectedId]
  );

  const selectedConstellation = useMemo(() => {
    if (!selectedObject?.ra || !selectedObject?.dec) return null;
    const info = Astronomy.Constellation(selectedObject.ra, selectedObject.dec);
    return info?.name || null;
  }, [selectedObject]);

  const skyConditions = useMemo(() => {
    const sunEqu = Astronomy.Equator(Astronomy.Body.Sun, time, observer, true, true);
    const sunHor = Astronomy.Horizon(time, observer, sunEqu.ra, sunEqu.dec, "normal");
    const moonIllum = Astronomy.Illumination(Astronomy.Body.Moon, time);
    const vis = visibilityLabel(sunHor.altitude);
    const moonPercent = Math.round(moonIllum.phase_fraction * 100);
    const transparency = moonPercent > 80 ? "Lower" : moonPercent > 40 ? "Moderate" : "Higher";

    return {
      sunAlt: sunHor.altitude,
      moonPercent,
      vis,
      transparency
    };
  }, [time, observer]);

  const getTrackedSatellite = (keywords) => {
    if (!tleData.length) return null;
    const match = tleData.find((tle) =>
      keywords.some((keyword) => tle.name.toLowerCase().includes(keyword))
    );
    if (!match) return null;
    const results = getSatelliteObjects(time, activeLocation, [match], 1);
    return results[0] || null;
  };

  const hubbleSat = useMemo(
    () => getTrackedSatellite(["hubble"]),
    [tleData, time, activeLocation]
  );
  const jwstSat = useMemo(
    () => getTrackedSatellite(["jwst", "james webb"]),
    [tleData, time, activeLocation]
  );

  const activeSatellite = satelliteTarget === "jwst" ? jwstSat : hubbleSat;
  const activeTelescopeFeed =
    satelliteTarget === "jwst" ? telescopeFeeds.jwst : telescopeFeeds.hubble;
  const activeLiveUrl = useMemo(
    () =>
      toEmbedUrl(satelliteTarget === "jwst" ? JWST_LIVE_URL : HUBBLE_LIVE_URL),
    [satelliteTarget]
  );

  useEffect(() => {
    if (!coords) return;
    const controller = new AbortController();
    const lookup = async () => {
      try {
        setLocationStatus("Locating city...");
        const res = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${coords.lat}&lon=${coords.lon}`,
          { signal: controller.signal, headers: { "Accept-Language": "en" } }
        );
        if (!res.ok) throw new Error("Lookup failed");
        const data = await res.json();
        const address = data.address || {};
        const place =
          address.city ||
          address.town ||
          address.village ||
          address.municipality ||
          address.county ||
          "";
        setCity(place);
        setLocationStatus(place ? "" : "City unavailable");
      } catch (err) {
        if (controller.signal.aborted) return;
        setLocationStatus("City unavailable");
      }
    };
    lookup();
    return () => controller.abort();
  }, [coords]);

  useEffect(() => {
    let active = true;
    const loadTle = async () => {
      try {
        setTleStatus("Loading satellite data...");
        const result = await fetchTleGroups([
          "stations",
          "visual",
          "active",
          "gps-ops",
          "weather",
          "science"
        ]);
        const namedByCatalog = await fetchTleByCatalog([20580, 50463]);
        const namedByName = await fetchTleByName([
          "HUBBLE SPACE TELESCOPE",
          "JAMES WEBB SPACE TELESCOPE"
        ]);
        if (!active) return;
        const merged = [...result, ...namedByCatalog, ...namedByName].reduce((acc, entry) => {
          if (!acc.some((item) => item.name === entry.name)) {
            acc.push(entry);
          }
          return acc;
        }, []);
        if (!merged.length) {
          const fallback = getFallbackTles();
          setTleData(fallback);
          setTleStatus(fallback.length ? "Using fallback TLEs" : "No satellites loaded");
          return;
        }
        setTleData(merged);
        setTleStatus("Satellites online");
      } catch (err) {
        if (!active) return;
        const fallback = getFallbackTles();
        setTleData(fallback);
        setTleStatus(fallback.length ? "Using fallback TLEs" : "Satellite data unavailable");
      }
    };
    loadTle();
    return () => {
      active = false;
    };
  }, []);

  const loadNasa = async () => {
    setNasaStatus("Loading NASA updates...");
    setNasaError("");
    let ok = true;
    try {
      const apodRes = await fetch(
        `https://api.nasa.gov/planetary/apod?api_key=${NASA_API_KEY}`
      );
      if (!apodRes.ok) throw new Error("APOD request failed");
      const apodData = await apodRes.json();
      setNasaApod(apodData || null);
    } catch (err) {
      ok = false;
      setNasaApod(null);
      setNasaError("NASA APOD unavailable. Set VITE_NASA_API_KEY if needed.");
    }

    try {
      const end = new Date();
      const start = new Date();
      start.setDate(end.getDate() - 7);
      const endStr = end.toISOString().slice(0, 10);
      const startStr = start.toISOString().slice(0, 10);
      const flaresRes = await fetch(
        `https://api.nasa.gov/DONKI/FLR?startDate=${startStr}&endDate=${endStr}&api_key=${NASA_API_KEY}`
      );
      if (!flaresRes.ok) throw new Error("DONKI request failed");
      const flareData = await flaresRes.json();
      setNasaEvents(Array.isArray(flareData) ? flareData.slice(0, 3) : []);
    } catch (err) {
      ok = false;
      setNasaEvents([]);
      setNasaError((prev) => prev || "NASA DONKI unavailable.");
    }

    setNasaStatus(ok ? "NASA updates ready" : "NASA updates partial");
    setApodSummary("");
    setApodSummaryStatus("idle");
  };

  useEffect(() => {
    loadNasa();
  }, []);

  const pickLatestImage = (items) => {
    const sorted = items
      .map((item) => ({
        item,
        date: new Date(item?.data?.[0]?.date_created || 0).getTime()
      }))
      .filter((entry) => Number.isFinite(entry.date))
      .sort((a, b) => b.date - a.date);
    return sorted[0]?.item || null;
  };

  const normalizeImageUrl = (baseUrl, url) => {
    if (!url) return "";
    if (url.startsWith("http")) return url;
    if (url.startsWith("//")) return `https:${url}`;
    if (url.startsWith("/")) return `${baseUrl}${url}`;
    return url;
  };

  const fetchLatestFromTelescopeSite = async (baseUrl, proxyBase, fallbackLabel) => {
    const listUrl = proxyBase ? `${proxyBase}/api/v3/images?page=1` : `${baseUrl}/api/v3/images?page=1`;
    const listRes = await fetch(listUrl);
    if (!listRes.ok) throw new Error("Telescope feed request failed");
    const list = await listRes.json();
    const candidates = Array.isArray(list) ? list : [];
    const latest = candidates
      .filter((item) => item?.publication_date)
      .sort(
        (a, b) =>
          new Date(b.publication_date).getTime() -
          new Date(a.publication_date).getTime()
      )[0] || candidates[0];
    if (!latest?.id) return null;
    const detailUrl = proxyBase
      ? `${proxyBase}/api/v3/image/${latest.id}`
      : `${baseUrl}/api/v3/image/${latest.id}`;
    const detailRes = await fetch(detailUrl);
    if (!detailRes.ok) throw new Error("Telescope detail request failed");
    const detail = await detailRes.json();
    const files = Array.isArray(detail?.image_files) ? detail.image_files : [];
    const bestFile = files
      .slice()
      .sort((a, b) => (b.width || 0) - (a.width || 0))[0];
    const imageUrl = normalizeImageUrl(baseUrl, bestFile?.file_url);
    if (!imageUrl) return null;
    return {
      title: detail?.name || fallbackLabel,
      date: detail?.publication_date || detail?.release_date || "",
      description: detail?.description || detail?.abstract || "",
      image: imageUrl
    };
  };

  const fetchLatestImage = async (query) => {
    const url = `https://images-api.nasa.gov/search?q=${encodeURIComponent(query)}&media_type=image`;
    const res = await fetch(url);
    if (!res.ok) throw new Error("Image feed request failed");
    const data = await res.json();
    const items = data?.collection?.items || [];
    const item = pickLatestImage(items);
    if (!item) return null;
    const link = item.links?.find((entry) => entry.render === "image")?.href;
    const meta = item.data?.[0];
    if (!link || !meta) return null;
    return {
      title: meta.title || query,
      date: meta.date_created || "",
      description: meta.description || "",
      image: link
    };
  };

  const loadTelescopeFeeds = useCallback(async () => {
    const isLive = telescopeFeedMode === "live";
    setTelescopeFeedStatus(isLive ? "Loading live feed..." : "Loading imagery...");
    setTelescopeFeedError("");

    if (isLive) {
      const missing = [];
      if (!HUBBLE_LIVE_URL) missing.push("Hubble live URL");
      if (!JWST_LIVE_URL) missing.push("JWST live URL");
      setTelescopeFeedUpdatedAt(new Date());
      if (missing.length) {
        setTelescopeFeedStatus("Live stream not configured");
        setTelescopeFeedError(
          `Missing ${missing.join(" and ")}. Set VITE_HUBBLE_LIVE_URL and VITE_JWST_LIVE_URL.`
        );
      } else {
        setTelescopeFeedStatus("Live streams ready");
      }
      return;
    }

    let hubble = null;
    let jwst = null;
    const errors = [];

    if (isLive) {
      try {
        hubble = await fetchLatestFromTelescopeSite(
          "https://hubblesite.org",
          "/proxy/hubble",
          "Hubble"
        );
      } catch (err) {
        errors.push("Hubble live feed blocked.");
      }

      try {
        jwst = await fetchLatestFromTelescopeSite(
          "https://webbtelescope.org",
          "/proxy/jwst",
          "JWST"
        );
      } catch (err) {
        errors.push("JWST live feed blocked.");
      }
    }

    if (!hubble) {
      try {
        hubble = await fetchLatestImage("Hubble Space Telescope");
      } catch (err) {
        errors.push("Hubble fallback failed.");
      }
    }

    if (!jwst) {
      try {
        jwst = await fetchLatestImage("James Webb Space Telescope");
      } catch (err) {
        errors.push("JWST fallback failed.");
      }
    }

    setTelescopeFeeds({ hubble, jwst });
    setTelescopeFeedUpdatedAt(new Date());

    if (!hubble && !jwst) {
      setTelescopeFeedStatus("Imagery feed unavailable");
      setTelescopeFeedError(errors.join(" ") || "All feeds unavailable.");
      return;
    }

    if (!hubble || !jwst) {
      setTelescopeFeedStatus(isLive ? "Partial live feed" : "Partial imagery");
      setTelescopeFeedError(errors.join(" "));
      return;
    }

    setTelescopeFeedStatus(isLive ? "Live feed updated" : "Imagery updated");
  }, [telescopeFeedMode]);

  useEffect(() => {
    let active = true;
    const loadFeeds = async () => {
      if (!active) return;
      await loadTelescopeFeeds();
    };
    loadFeeds();
    const intervalId = setInterval(loadFeeds, 1000 * 60 * 10);
    return () => {
      active = false;
      clearInterval(intervalId);
    };
  }, [loadTelescopeFeeds, telescopeFeedMode]);

  useEffect(() => {
    if (telescopeFeedMode !== "live") return;
    setLiveEmbedLoaded(false);
    const timeoutId = setTimeout(() => {
      if (!liveEmbedLoaded) {
        setTelescopeFeedMode("image");
        setFeedback({
          tone: "error",
          message: "Live stream blocked. Switched to image feed."
        });
      }
    }, 4000);
    return () => clearTimeout(timeoutId);
  }, [telescopeFeedMode, satelliteTarget, liveEmbedLoaded]);

  const matches = useMemo(() => {
    if (!search.trim()) return [];
    const query = search.trim().toLowerCase();
    return objects
      .filter((obj) => obj.name.toLowerCase().includes(query))
      .slice(0, 8);
  }, [objects, search]);

  const handleSelect = (payload) => {
    if (payload?.type === "view") {
      if (useSensors) setUseSensors(false);
      setView((current) => ({
        ...current,
        az: payload.az ?? current.az,
        alt: payload.alt ?? current.alt,
        fov: payload.fov ?? current.fov
      }));
      return;
    }
    if (payload?.az !== undefined && payload?.alt !== undefined) {
      setView((current) => ({
        ...current,
        az: payload.az,
        alt: payload.alt
      }));
    }
    setSelectedId(payload?.id ?? null);
  };

  const handleSearchSubmit = () => {
    const query = search.trim();
    if (!query) return;
    const match = matches[0];
    if (match) {
      handleSelect(match);
      setSearch("");
      return;
    }
    if (!isSpaceQuery(query)) {
      setFeedback({ tone: "error", message: "Search is limited to sky objects." });
      return;
    }
    setFeedback({ tone: "info", message: "No matching sky object found." });
  };

  const handleToggleSensors = async () => {
    setUseSensors((current) => !current);
  };

  const runOllama = async (mode, overridePrompt) => {
    const trimmed = (overridePrompt ?? llmPrompt).trim();
    if (!trimmed) return;

    if (mode === "ask" && !isSpaceQuery(trimmed)) {
      setLlmResponse(
        "AstroView Assistant only answers astronomy and space questions."
      );
      setLlmError("");
      return;
    }

    const prompt =
      mode === "summary"
        ? `Summarize the following text in concise bullet points.\n\n${trimmed}`
        : `You are AstroView Assistant. Only answer astronomy and space topics. Provide safe viewing guidance. Never suggest looking at the Sun without proper eclipse glasses or solar filters.\n\n${trimmed}`;

    setLlmLoading(true);
    setOllamaStatus("Working");
    setLlmError("");
    setFeedback({
      tone: "info",
      message:
        mode === "tips"
          ? "Generating viewing tips..."
          : "Generating reply..."
    });
    if (mode === "tips") {
      setNotifyTips("");
    } else {
      setLlmResponse("");
    }

    let controller;
    let timeoutId;
    try {
      controller = new AbortController();
      timeoutId = setTimeout(() => controller.abort(), OLLAMA_TIMEOUT_MS);
      const requestBody = {
        model: OLLAMA_MODEL,
        prompt,
        stream: false
      };
      let result = await postOllamaGenerate(requestBody, controller.signal);
      if (!result.ok) {
        const errorText = result.error?.toLowerCase() || "";
        let fallbackModel = "";
        if (OLLAMA_MODEL.includes(":latest")) {
          fallbackModel = OLLAMA_MODEL.replace(":latest", "");
        }
        if (!fallbackModel || errorText.includes("model")) {
          const available = await fetchOllamaModels(controller.signal);
          fallbackModel =
            available.find((name) => name === fallbackModel) ||
            available[0] ||
            fallbackModel;
        }
        if (fallbackModel && fallbackModel !== requestBody.model) {
          requestBody.model = fallbackModel;
          result = await postOllamaGenerate(requestBody, controller.signal);
        }
      }
      if (!result.ok) {
        throw new Error(result.error || "Ollama request failed");
      }

      const responseText =
        result.data?.response || result.data?.message?.content || "No response returned.";
      if (mode === "tips") {
        setNotifyTips(responseText);
      } else if (mode === "apod") {
        setApodSummary(responseText);
      } else {
        setLlmResponse(responseText);
      }
      setFeedback({
        tone: "success",
        message: mode === "tips" ? "Tips ready." : "Reply ready."
      });
      setOllamaStatus("Ready");
    } catch (err) {
      setFeedback({
        tone: "error",
        message: "Ollama request failed."
      });
      if (mode === "tips") {
        setNotifyTips("Tips unavailable. Make sure Ollama is running and try again.");
        setTipsStatus("error");
      }
      setLlmError(
        err?.name === "AbortError"
          ? "Ollama request timed out. Try again or use a smaller prompt."
          : err?.message?.includes("model")
            ? `Model ${OLLAMA_MODEL} not found. Run: ollama pull ${OLLAMA_MODEL}.`
            : "Ollama is not reachable. Make sure it is running on localhost:11434."
      );
      setOllamaStatus("Unavailable");
    } finally {
      if (timeoutId) clearTimeout(timeoutId);
      setLlmLoading(false);
    }
  };

  useEffect(() => {
    if (!selectedObject) {
      lastAutoId.current = null;
      return;
    }
    if (selectedObject.id === lastAutoId.current) return;
    lastAutoId.current = selectedObject.id;
    const autoPrompt = `Give a concise astronomy overview of ${selectedObject.name}, including what it is, how to observe it, and one interesting fact. Include safe viewing guidance.`;
    setLlmPrompt(autoPrompt);
    runOllama("auto", autoPrompt);
  }, [selectedObject]);

  const localEvents = useMemo(() => {
    const events = [];
    try {
      const moonQuarter = Astronomy.SearchMoonQuarter(time);
      events.push({
        title: moonQuarterName(moonQuarter.quarter),
        time: moonQuarter.time
      });
    } catch (err) {
      // ignore
    }

    try {
      const sunrise = Astronomy.SearchRiseSet(
        Astronomy.Body.Sun,
        observer,
        1,
        time,
        1
      );
      const sunset = Astronomy.SearchRiseSet(
        Astronomy.Body.Sun,
        observer,
        -1,
        time,
        1
      );
      events.push({ title: "Sunrise", time: sunrise });
      events.push({ title: "Sunset", time: sunset });
    } catch (err) {
      // ignore
    }

    try {
      const moonrise = Astronomy.SearchRiseSet(
        Astronomy.Body.Moon,
        observer,
        1,
        time,
        1
      );
      const moonset = Astronomy.SearchRiseSet(
        Astronomy.Body.Moon,
        observer,
        -1,
        time,
        1
      );
      events.push({ title: "Moonrise", time: moonrise });
      events.push({ title: "Moonset", time: moonset });
    } catch (err) {
      // ignore
    }

    return events;
  }, [time, observer]);

  const handleGenerateTips = () => {
    const summary = localEvents
      .map((event) => `${event.title}: ${formatEventTime(event.time)}`)
      .join("\n");
    const tipPrompt = `Provide short, practical viewing tips for these upcoming sky events:\n${summary}`;
    setFeedback({ tone: "info", message: "Generating tips for local events..." });
    setTipsStatus("loading");
    runOllama("tips", tipPrompt);
  };

  const handleTipForUpdate = (title, details) => {
    const tipPrompt = `Provide short, practical viewing tips for this astronomy update: ${title}. Details: ${details}`;
    setFeedback({ tone: "info", message: `Generating tips for ${title}...` });
    setTipsStatus("loading");
    runOllama("tips", tipPrompt);
  };

  const handleApodSummary = () => {
    if (!nasaApod?.explanation) return;
    const prompt = `Explain this NASA APOD update in simple terms for the general public in 2-4 sentences:\n\nTitle: ${nasaApod.title}\n\n${nasaApod.explanation}`;
    setApodSummaryStatus("loading");
    setFeedback({ tone: "info", message: "Explaining APOD..." });
    runOllama("apod", prompt);
  };

  const handleResetView = () => {
    setView({ az: 0, alt: 25, fov: 90 });
  };

  const handleCenterSatellite = () => {
    if (!activeSatellite) return;
    setView((current) => ({
      ...current,
      az: activeSatellite.az,
      alt: activeSatellite.alt
    }));
  };

  const handleViewChange = (partial) => {
    if (useSensors) setUseSensors(false);
    setView((current) => ({
      ...current,
      az: partial.az ?? current.az,
      alt: partial.alt ?? current.alt,
      fov: partial.fov ?? current.fov
    }));
  };

  useEffect(() => {
    if (!feedback) return undefined;
    const id = setTimeout(() => setFeedback(null), 3000);
    return () => clearTimeout(id);
  }, [feedback]);

  useEffect(() => {
    if (tipsStatus === "error") return;
    if (notifyTips) {
      setTipsStatus("done");
      return;
    }
    if (tipsStatus === "loading") return;
    setTipsStatus("idle");
  }, [notifyTips, tipsStatus]);

  useEffect(() => {
    if (apodSummary) {
      setApodSummaryStatus("done");
      return;
    }
    if (apodSummaryStatus === "loading") return;
    setApodSummaryStatus("idle");
  }, [apodSummary, apodSummaryStatus]);

  const sensorError =
    orientationStatus === "denied" ||
    orientationStatus === "unsupported" ||
    geoStatus === "denied";
  const sensorReady =
    orientationStatus === "active" && geoStatus === "active";
  const showSensorBanner =
    !sensorBannerDismissed && (sensorError || useSensors || !sensorReady);
  const bannerCompact = sensorReady && !sensorError;

  return (
    <div className="fixed inset-0 overflow-hidden bg-slate-950 text-slate-100 font-sans">
      {feedback && (
        <div className="fixed top-4 left-1/2 z-50 -translate-x-1/2 rounded-full border border-white/10 bg-slate-950/90 px-4 py-2 text-xs text-slate-100 shadow-[0_20px_40px_rgba(15,23,42,0.5)]">
          {feedback.message}
        </div>
      )}
      {showSensorBanner && (
        <div
          className={`fixed top-16 left-1/2 z-50 -translate-x-1/2 rounded-2xl panel-accent px-4 py-3 text-xs text-slate-100 shadow-[0_20px_40px_rgba(15,23,42,0.45)] ${
            bannerCompact ? "opacity-75" : ""
          }`}
        >
          <div className="flex items-center gap-3">
            <span className="text-[10px] uppercase tracking-[0.2em] text-cyan-100">
              Sensor Access
            </span>
            <span className="text-[11px] text-slate-200">
              {orientationStatus === "denied"
                ? "Gyro access blocked. Tap the sensor button and allow motion access."
                : orientationStatus === "unsupported"
                  ? "Gyro not supported on this device."
                  : geoStatus === "denied"
                    ? "Location access blocked. Tap the sensor button and allow location."
                    : useSensors
                      ? "Sensors active. Tap the sensor button to switch to manual."
                      : "Tap the sensor button to enable gyro and GPS."}
            </span>
            {!bannerCompact && (
              <button
                onClick={handleToggleSensors}
                className="ml-auto rounded-full border border-cyan-300/30 bg-cyan-500/20 px-3 py-1 text-[10px] text-cyan-100 hover:bg-cyan-500/30"
              >
                Tap to enable
              </button>
            )}
            <button
              onClick={() => {
                setSensorBannerDismissed(true);
                try {
                  localStorage.setItem("astroview.sensorBannerDismissed", "true");
                } catch (err) {
                  // ignore
                }
              }}
              className="ml-2 rounded-full border border-white/10 bg-white/5 px-2 py-1 text-[10px] text-slate-200 hover:bg-white/10"
            >
              Dismiss
            </button>
          </div>
          {!bannerCompact && geoError && (
            <div className="mt-2 text-[10px] text-amber-100">
              {geoError}
            </div>
          )}
        </div>
      )}
      {apodImage && (
        <div
          className="absolute inset-0 pointer-events-none opacity-25 bg-cover bg-center"
          style={{ backgroundImage: `url(${apodImage})` }}
        />
      )}
      <div className="absolute inset-0 pointer-events-none bg-aurora" />
      <div className="absolute inset-0 pointer-events-none bg-stars opacity-40" />
      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_top,_rgba(34,211,238,0.12),_transparent_45%),radial-gradient(circle_at_bottom,_rgba(148,163,184,0.08),_transparent_55%)]" />
      <div className="absolute inset-0 pointer-events-none z-10">
        <span className="meteor meteor-1" />
        <span className="meteor meteor-2" />
        <span className="meteor meteor-3" />
      </div>
      {activeTab === "sky" && (
        viewMode === "360" ? (
          <SkyDome
            objects={objects}
            view={view}
            onViewChange={handleViewChange}
            isLoading={skyDomeLoading}
            status={skyDomeStatus}
          />
        ) : (
          <SkyCanvas
            objects={objects}
            view={view}
            selectedId={selectedId}
            onSelect={handleSelect}
            constellations={constellationLines}
          />
        )
      )}

      <header className="absolute left-6 right-6 top-6 flex items-start justify-between gap-8 z-40">
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-cyan-500/20 border border-cyan-400/30 flex items-center justify-center">
              <Compass className="w-5 h-5 text-cyan-200" />
            </div>
            <div>
              <h1 className="text-lg font-semibold tracking-[0.2em] uppercase">
                AstroView
              </h1>
              <p className="text-[10px] uppercase tracking-[0.3em] text-slate-400">
                Real-Time Sky Navigator
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-3 text-[11px] text-slate-300">
            <span className="flex items-center gap-1">
              <MapPin className="w-3 h-3" />
              {formatCoord(activeLocation.lat, "N", "S")}
            </span>
            <span className="flex items-center gap-1">
              <Navigation className="w-3 h-3" />
              {formatCoord(activeLocation.lon, "E", "W")}
            </span>
            <span className="flex items-center gap-1">
              <Activity className="w-3 h-3" />
              {time.toUTCString()}
            </span>
            <span className="flex items-center gap-1">
              <span className="text-slate-500">LOCAL</span>
              {time.toLocaleString()}
            </span>
            <span className="flex items-center gap-1">
              <span className="text-slate-500">CITY</span>
              {city || locationStatus || "--"}
            </span>
          </div>
        </div>

        <div className="flex flex-col items-end gap-4 w-80">
          <div className="relative w-full">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  handleSearchSubmit();
                }
              }}
              placeholder="Search objects"
              className="w-full rounded-full bg-slate-900/80 border border-white/10 pl-9 pr-3 py-2 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-400/40"
            />
            {matches.length > 0 && (
              <div className="absolute mt-2 w-full rounded-2xl border border-white/10 bg-slate-900/95 backdrop-blur shadow-[0_18px_45px_rgba(15,23,42,0.6)] z-50">
                {matches.map((obj) => (
                  <button
                    key={obj.id}
                    onClick={() => {
                      handleSelect(obj);
                      setSearch("");
                    }}
                    className="w-full px-4 py-2 text-left text-xs text-slate-200 hover:bg-white/10"
                  >
                    {obj.name} · {obj.type.toUpperCase()}
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="flex items-center gap-2 text-[11px] text-slate-400">
            <span>AZ {formatAngle(view.az)}</span>
            <span>ALT {formatAngle(view.alt)}</span>
            <span>FOV {formatAngle(view.fov)}</span>
          </div>
          <div className="flex w-full gap-2">
            <button
              onClick={handleResetView}
              className="flex-1 rounded-full border border-white/10 bg-white/5 px-3 py-2 text-[11px] text-slate-200 hover:bg-white/10"
            >
              Reset View
            </button>
            <button
              onClick={() => setShowSatelliteView(true)}
              className="flex-1 rounded-full border border-amber-300/20 bg-amber-300/10 px-3 py-2 text-[11px] text-amber-100 hover:bg-amber-300/20"
            >
              Satellite View
            </button>
          </div>
          <div className="flex w-full gap-2">
            <button
              onClick={() => setViewMode((mode) => (mode === "360" ? "2d" : "360"))}
              className="flex-1 rounded-full border border-cyan-400/30 bg-cyan-500/20 px-3 py-2 text-[11px] text-cyan-100 hover:bg-cyan-500/30"
              disabled={activeTab !== "sky"}
            >
              {viewMode === "360" ? "Switch to 2D" : "Switch to 360"}
            </button>
          </div>
          {/* Tab Switcher */}
          <div className="flex w-full rounded-full border border-white/10 bg-slate-900/80 p-1">
            <button
              onClick={() => setActiveTab("sky")}
              className={`flex-1 flex items-center justify-center gap-2 rounded-full px-3 py-2 text-[11px] transition-colors ${
                activeTab === "sky"
                  ? "bg-cyan-500/25 text-cyan-100 border border-cyan-400/30"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <Star className="w-3 h-3" />
              Sky
            </button>
            <button
              onClick={() => setActiveTab("climate")}
              className={`flex-1 flex items-center justify-center gap-2 rounded-full px-3 py-2 text-[11px] transition-colors ${
                activeTab === "climate"
                  ? "bg-emerald-500/25 text-emerald-100 border border-emerald-400/30"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <Globe2 className="w-3 h-3" />
              Climate
            </button>
            <button
              onClick={() => setActiveTab("disaster")}
              className={`flex-1 flex items-center justify-center gap-2 rounded-full px-3 py-2 text-[11px] transition-colors ${
                activeTab === "disaster"
                  ? "bg-red-500/25 text-red-100 border border-red-400/30"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <Activity className="w-3 h-3" />
              Disaster
            </button>
          </div>
          <div className="text-[10px] text-slate-500">
            {skyViewStatus} · AstronomyAPI: {skyApiStatus}
          </div>
          <button
            onClick={() => setShowNotifications(true)}
            className="w-full rounded-full border border-cyan-400/30 bg-cyan-500/20 px-4 py-2 text-[11px] text-cyan-100 hover:bg-cyan-500/30"
          >
            Live Notifications & Updates
          </button>
          <button
            onClick={handleToggleSensors}
            className={`w-full rounded-full border px-4 py-2 text-[11px] text-slate-100 transition-colors ${
              useSensors
                ? "border-cyan-400/40 bg-cyan-500/25 hover:bg-cyan-500/35"
                : "border-white/15 bg-white/5 hover:bg-white/10"
            }`}
          >
            {useSensors ? "Sensors Active" : "Manual Mode"}
          </button>
          {/* Teaching Module Controls */}
          <div className="w-full space-y-2 pt-2 border-t border-white/10">
            <div className="flex items-center gap-2">
              <button
                onClick={toggleLearningMode}
                className={`flex-1 flex items-center justify-center gap-2 rounded-full border px-3 py-2 text-[11px] transition-colors ${
                  learningMode
                    ? "border-purple-400/40 bg-purple-500/25 text-purple-100 hover:bg-purple-500/35"
                    : "border-white/15 bg-white/5 text-slate-300 hover:bg-white/10"
                }`}
              >
                <GraduationCap className="w-3 h-3" />
                {learningMode ? "Learn ON" : "Learn"}
              </button>
              <button
                onClick={() => setShowLessonsLibrary(true)}
                className="flex items-center justify-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-2 text-[11px] text-slate-300 hover:bg-white/10"
              >
                <Book className="w-3 h-3" />
                Lessons
              </button>
            </div>
            {learningMode && activeTab === "sky" && (
              <button
                onClick={() => setShowGuidedTour(true)}
                className="w-full rounded-full border border-amber-400/30 bg-amber-500/20 px-4 py-2 text-[11px] text-amber-100 hover:bg-amber-500/30"
              >
                Start Guided Tour
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Learning Prompt Banner */}
      {learningMode && !selectedObject && activeTab === "sky" && (
        <LearningPromptBanner message="Tap any object in the sky to learn about it" />
      )}

      {/* Climate Tab */}
      {activeTab === "climate" && (
        <div className="absolute left-6 right-[360px] top-36 bottom-36 z-20 overflow-y-auto pb-6">
          <ClimateTab
            coords={coords}
            isActive={activeTab === "climate"}
            showEducation={learningMode}
          />
        </div>
      )}

      {/* Disaster Tab */}
      {activeTab === "disaster" && (
        <div className="absolute left-6 right-[360px] top-36 bottom-36 z-20 overflow-y-auto pb-6">
          {coords && coords.lat !== undefined ? (
            <DisasterModule
              location={{ latitude: coords.lat, longitude: coords.lon }}
              climateData={null}
              onClose={() => setActiveTab("climate")}
            />
          ) : (
            <div className="flex flex-col items-center justify-center h-full">
              <div className="p-8 bg-black/40 backdrop-blur-lg rounded-2xl border border-white/10 text-center max-w-md">
                <span className="text-4xl mb-4 block">📍</span>
                <h3 className="text-lg font-semibold text-white/90 mb-2">Location Required</h3>
                <p className="text-sm text-white/50 mb-4">
                  Disaster monitoring requires your location to fetch regional hazard data.
                </p>
                <p className="text-xs text-white/40">
                  Please enable location services or wait for GPS to lock.
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Sky Tab Panels */}
      <div className={`absolute left-6 bottom-36 w-80 space-y-5 z-20 max-h-[calc(100vh-260px)] overflow-y-auto pb-6 ${activeTab !== "sky" ? "hidden" : ""}`}>
        <aside className="rounded-3xl panel-glass px-5 py-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xs uppercase tracking-[0.3em] text-slate-400">
              Sky Conditions
            </h2>
            <span className="text-[10px] text-slate-500">Estimated</span>
          </div>
          <div className="space-y-3 text-xs text-slate-200">
            <div className="flex items-center justify-between">
              <span>Visibility</span>
              <span className="text-slate-300">
                {skyConditions.vis.label}
              </span>
            </div>
            <div className="text-[11px] text-slate-400">
              {skyConditions.vis.detail}
            </div>
            <div className="flex items-center justify-between">
              <span>Moon Illumination</span>
              <span className="text-slate-300">{skyConditions.moonPercent}%</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Transparency</span>
              <span className="text-slate-300">{skyConditions.transparency}</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Sun Altitude</span>
              <span className="text-slate-300">{formatAngle(skyConditions.sunAlt)}</span>
            </div>
          </div>
        </aside>
        <aside className="rounded-3xl panel-glass px-5 py-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xs uppercase tracking-[0.3em] text-slate-400">
              Object Inspector
            </h2>
            <span className="text-[10px] text-slate-500">Live</span>
          </div>
          {selectedObject ? (
            <div className="space-y-3">
              <div>
                <div className="text-lg font-semibold text-slate-100">
                  {selectedObject.name}
                </div>
                <div className="text-[11px] uppercase tracking-[0.2em] text-slate-400">
                  {selectedObject.type}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 text-xs text-slate-300">
                <div>
                  <div className="text-[10px] uppercase text-slate-500">Azimuth</div>
                  <div>{formatAngle(selectedObject.az)}</div>
                </div>
                <div>
                  <div className="text-[10px] uppercase text-slate-500">Altitude</div>
                  <div>{formatAngle(selectedObject.alt)}</div>
                </div>
                <div>
                  <div className="text-[10px] uppercase text-slate-500">Magnitude</div>
                  <div>
                    {selectedObject.mag !== null && selectedObject.mag !== undefined
                      ? selectedObject.mag.toFixed(2)
                      : "--"}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] uppercase text-slate-500">Constellation</div>
                  <div>{selectedConstellation || "--"}</div>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-xs text-slate-400">
              Tap any object to see its real-time coordinates.
            </div>
          )}
        </aside>

        {/* Object Learning Panel (Learning Mode) */}
        {learningMode && selectedObject && (
          <ObjectLearningPanel
            object={selectedObject}
            location={activeLocation}
            time={time}
          />
        )}

        {/* Satellite Education Panel (Learning Mode) */}
        {learningMode && selectedObject?.type === "satellite" && (
          <SatelliteEducation
            satellite={selectedObject}
            visible={learningMode}
          />
        )}

        <aside className="rounded-3xl panel-glass px-5 py-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xs uppercase tracking-[0.3em] text-slate-400">
              AstroView Assistant
            </h2>
            <span className="text-[10px] text-slate-500">
              {selectedObject ? "Auto" : "Manual"}
            </span>
          </div>
          <div className="text-[10px] text-slate-500 mb-2">
            Ollama: {ollamaStatus}
          </div>
          <textarea
            value={llmPrompt}
            onChange={(event) => setLlmPrompt(event.target.value)}
            placeholder="Ask anything or paste text to summarize"
            className="w-full h-24 rounded-2xl bg-slate-950/70 border border-white/10 px-3 py-2 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-400/30"
          />
          <div className="mt-3 flex items-center gap-2">
            <button
              onClick={() => runOllama("ask")}
              disabled={llmLoading}
              className="flex-1 rounded-full border border-white/10 bg-cyan-400/20 px-3 py-2 text-xs text-cyan-100 hover:bg-cyan-400/30 disabled:opacity-50"
            >
              {llmLoading ? "Thinking..." : "Ask"}
            </button>
            <button
              onClick={() => runOllama("summary")}
              disabled={llmLoading}
              className="flex-1 rounded-full border border-white/10 bg-white/10 px-3 py-2 text-xs text-slate-200 hover:bg-white/20 disabled:opacity-50"
            >
              Summarize
            </button>
          </div>
          {llmLoading && (
            <div className="mt-2 text-[11px] text-cyan-200">Generating reply...</div>
          )}
          {llmError && (
            <div className="mt-2 text-[11px] text-rose-300">{llmError}</div>
          )}
          {llmResponse && (
            <div className="mt-3 max-h-36 overflow-auto rounded-2xl border border-white/10 bg-slate-950/60 px-3 py-2 text-[11px] text-slate-200 whitespace-pre-wrap">
              {llmResponse}
            </div>
          )}
        </aside>
      </div>

      <footer className="absolute bottom-6 left-6 right-6 flex items-center justify-between z-20">
        <div className="flex items-center gap-4">
          <button
            onClick={() => setIsLive((value) => !value)}
            className="flex items-center gap-2 rounded-full border border-amber-200/20 bg-amber-200/10 px-4 py-2 text-xs text-amber-50 hover:bg-amber-200/20"
          >
            {isLive ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            {isLive ? "Pause" : "Resume"}
          </button>
          <div className="text-[11px] text-slate-400">
            {geoStatus === "active" ? "GPS locked" : "GPS idle"}
            {geoError ? ` · ${geoError}` : ""}
          </div>
          <div className="text-[11px] text-slate-400">
            {orientationStatus === "active" ? "Gyro active" : "Gyro idle"}
          </div>
        </div>
      </footer>

      {apodImage && nasaApod && (
        <div className="absolute bottom-6 right-6 w-[320px] rounded-2xl panel-glass overflow-hidden z-20">
          <div className="h-36 w-full bg-slate-950">
            <img
              src={apodImage}
              alt={nasaApod.title}
              className="h-full w-full object-cover"
              loading="lazy"
            />
          </div>
          <div className="px-4 py-3">
            <div className="text-[10px] uppercase tracking-[0.3em] text-slate-400">
              APOD Spotlight
            </div>
            <div className="text-sm font-semibold text-slate-100">
              {nasaApod.title}
            </div>
            <div className="text-[11px] text-slate-400">{nasaApod.date}</div>
          </div>
        </div>
      )}

      {showNotifications && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm">
          <div className="absolute inset-x-6 top-10 bottom-10 rounded-3xl border border-white/10 bg-slate-950/90 p-6 overflow-auto">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-lg font-semibold tracking-[0.2em] uppercase">
                  AstroView Alerts
                </h2>
                <p className="text-xs text-slate-400">
                  Local sky events and global space updates
                </p>
              </div>
              <button
                onClick={() => setShowNotifications(false)}
                className="w-10 h-10 rounded-full border border-white/10 bg-white/5 flex items-center justify-center hover:bg-white/10"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
              <div className="rounded-2xl panel-glass p-4">
                <h3 className="text-xs uppercase tracking-[0.3em] text-slate-400 mb-4">
                  Local Events
                </h3>
                <div className="space-y-3 text-xs text-slate-200">
                  {localEvents.length ? (
                    localEvents.map((event) => (
                      <button
                        key={event.title}
                        onClick={() =>
                          handleTipForUpdate(
                            event.title,
                            formatEventTime(event.time)
                          )
                        }
                        className="w-full flex justify-between rounded-xl px-2 py-2 text-left hover:bg-white/10"
                      >
                        <span>{event.title}</span>
                        <span className="text-slate-400">
                          {formatEventTime(event.time)}
                        </span>
                      </button>
                    ))
                  ) : (
                    <div className="text-slate-400">No local events available.</div>
                  )}
                </div>
                <div className="mt-4 text-[11px] text-slate-400">
                  {tleStatus}
                </div>
                <div className="mt-4 flex items-center justify-between">
                  <button
                    onClick={handleGenerateTips}
                    className="rounded-full border border-cyan-400/30 bg-cyan-500/20 px-3 py-2 text-xs text-cyan-100 hover:bg-cyan-500/30"
                  >
                    Generate viewing tips
                  </button>
                  <span className="text-[11px] text-slate-400">
                    {tipsStatus === "loading"
                      ? "Generating..."
                      : tipsStatus === "done"
                        ? "Ready"
                        : tipsStatus === "error"
                          ? "Error"
                          : ""}
                  </span>
                </div>
                {notifyTips && (
                  <div className="mt-3 rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2 text-[11px] text-slate-200 whitespace-pre-wrap">
                    {notifyTips}
                  </div>
                )}
              </div>

              <div className="rounded-2xl panel-glass p-4">
                <h3 className="text-xs uppercase tracking-[0.3em] text-slate-400 mb-4">
                  Global Updates
                </h3>
                <div className="mb-3 text-[11px] text-slate-400 flex items-center justify-between">
                  <span>{nasaStatus}</span>
                  <button
                    onClick={loadNasa}
                    className="rounded-full border border-white/10 bg-white/5 px-2 py-1 text-[10px] text-slate-200 hover:bg-white/10"
                  >
                    Refresh
                  </button>
                </div>
                {nasaError && (
                  <div className="mb-3 text-[11px] text-rose-300">{nasaError}</div>
                )}
                <div className="space-y-4 text-xs text-slate-200">
                  {nasaApod ? (
                    <div className="w-full rounded-xl px-2 py-2 text-left bg-white/5">
                      <div className="text-[11px] uppercase text-slate-500">
                        NASA APOD
                      </div>
                      <div className="font-semibold">{nasaApod.title}</div>
                      <div className="text-slate-400">{nasaApod.date}</div>
                      <div className="mt-2 flex items-center justify-between">
                        <button
                          onClick={handleApodSummary}
                          className="rounded-full border border-white/10 bg-white/10 px-3 py-1 text-[10px] text-slate-200 hover:bg-white/20"
                        >
                          Explain for public
                        </button>
                        <span className="text-[11px] text-slate-400">
                          {apodSummaryStatus === "loading"
                            ? "Generating..."
                            : apodSummaryStatus === "done"
                              ? "Ready"
                              : ""}
                        </span>
                      </div>
                      {apodSummary && (
                        <div className="mt-2 rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2 text-[11px] text-slate-200 whitespace-pre-wrap">
                          {apodSummary}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-slate-400">APOD unavailable.</div>
                  )}

                  <div>
                    <div className="text-[11px] uppercase text-slate-500">
                      Recent Solar Flares
                    </div>
                    {nasaEvents.length ? (
                      <div className="space-y-2">
                        {nasaEvents.map((event) => (
                          <button
                            key={event.flrID}
                            onClick={() =>
                              handleTipForUpdate(
                                event.classType || "Solar flare",
                                event.beginTime
                              )
                            }
                            className="w-full rounded-xl px-2 py-2 text-left text-slate-300 hover:bg-white/10"
                          >
                            {event.classType || "Flare"} · {event.beginTime}
                          </button>
                        ))}
                      </div>
                    ) : (
                      <div className="text-slate-400">No flare updates found.</div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {showSatelliteView && (
        <div className="fixed inset-0 z-50 bg-slate-950">
          <div className="absolute inset-x-6 top-10 bottom-10 rounded-3xl border border-white/10 bg-slate-950/95 p-6 overflow-auto">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-lg font-semibold tracking-[0.2em] uppercase">
                  Satellite View
                </h2>
                <p className="text-xs text-slate-400">
                  Live tracking for key observatories
                </p>
              </div>
              <button
                onClick={() => setShowSatelliteView(false)}
                className="w-10 h-10 rounded-full border border-white/10 bg-white/5 flex items-center justify-center hover:bg-white/10"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
              <div className="space-y-3">
                <button
                  onClick={() => setSatelliteTarget("hubble")}
                  className={`w-full rounded-2xl border px-4 py-3 text-left text-sm transition-colors ${
                    satelliteTarget === "hubble"
                      ? "border-cyan-400/40 bg-cyan-500/20 text-cyan-100"
                      : "border-white/10 bg-white/5 text-slate-200 hover:bg-white/10"
                  }`}
                >
                  Hubble Space Telescope
                </button>
                <button
                  onClick={() => setSatelliteTarget("jwst")}
                  className={`w-full rounded-2xl border px-4 py-3 text-left text-sm transition-colors ${
                    satelliteTarget === "jwst"
                      ? "border-cyan-400/40 bg-cyan-500/20 text-cyan-100"
                      : "border-white/10 bg-white/5 text-slate-200 hover:bg-white/10"
                  }`}
                >
                  James Webb Space Telescope
                </button>
                <button
                  onClick={handleCenterSatellite}
                  disabled={!activeSatellite}
                  className="w-full rounded-2xl border border-amber-300/20 bg-amber-300/10 px-4 py-3 text-left text-sm text-amber-100 hover:bg-amber-300/20 disabled:opacity-50"
                >
                  Center on Selected
                </button>
              </div>

              <div className="rounded-3xl panel-glass p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm uppercase tracking-[0.3em] text-slate-400">
                    {satelliteTarget === "jwst" ? "JWST" : "Hubble"}
                  </h3>
                  <span className="text-[11px] text-slate-500">
                    {activeSatellite ? "Live" : "Unavailable"}
                  </span>
                </div>
                {activeSatellite ? (
                  <div className="grid gap-4 text-sm text-slate-200 md:grid-cols-2">
                    <div>
                      <div className="text-[11px] uppercase text-slate-500">Azimuth</div>
                      <div>{formatAngle(activeSatellite.az)}</div>
                    </div>
                    <div>
                      <div className="text-[11px] uppercase text-slate-500">Altitude</div>
                      <div>{formatAngle(activeSatellite.alt)}</div>
                    </div>
                    <div>
                      <div className="text-[11px] uppercase text-slate-500">Visibility</div>
                      <div>{activeSatellite.alt > 0 ? "Above horizon" : "Below horizon"}</div>
                    </div>
                    <div>
                      <div className="text-[11px] uppercase text-slate-500">Next Step</div>
                      <div>Use Center to align the sky view</div>
                    </div>
                  </div>
                ) : (
                  <div className="text-sm text-slate-400">
                    Satellite data unavailable. Check network or retry shortly.
                  </div>
                )}
                <div className="mt-6">
                  <div className="text-[11px] uppercase tracking-[0.3em] text-slate-400 mb-3">
                    Latest Telescope Feed
                  </div>
                  <div className="mb-3 flex items-center gap-2 text-[11px]">
                    <button
                      onClick={() => setTelescopeFeedMode("live")}
                      className={`rounded-full border px-3 py-1 text-[10px] uppercase tracking-[0.2em] ${
                        telescopeFeedMode === "live"
                          ? "border-cyan-400/40 bg-cyan-500/25 text-cyan-100"
                          : "border-white/10 bg-white/5 text-slate-300"
                      }`}
                    >
                      Live Feed
                    </button>
                    <button
                      onClick={() => setTelescopeFeedMode("image")}
                      className={`rounded-full border px-3 py-1 text-[10px] uppercase tracking-[0.2em] ${
                        telescopeFeedMode === "image"
                          ? "border-amber-300/40 bg-amber-300/20 text-amber-100"
                          : "border-white/10 bg-white/5 text-slate-300"
                      }`}
                    >
                      Image Feed
                    </button>
                  </div>
                  <div className="mb-3 text-[11px] text-slate-400 flex items-center justify-between">
                    <span>{telescopeFeedStatus}</span>
                    <div className="flex items-center gap-3">
                      <span>
                        {telescopeFeedUpdatedAt
                          ? `Updated ${telescopeFeedUpdatedAt.toLocaleTimeString()}`
                          : ""}
                      </span>
                      <button
                        onClick={loadTelescopeFeeds}
                        className="rounded-full border border-white/10 bg-white/5 px-2 py-1 text-[10px] text-slate-200 hover:bg-white/10"
                      >
                        Refresh
                      </button>
                    </div>
                  </div>
                  {telescopeFeedError && (
                    <div className="mb-3 text-[11px] text-amber-100">
                      {telescopeFeedError}
                    </div>
                  )}
                  {telescopeFeedMode === "live" ? (
                    <div className="rounded-2xl overflow-hidden border border-white/10 bg-slate-950/70">
                      {activeSatellite ? (
                        activeLiveUrl ? (
                          <div className="relative">
                            {!liveEmbedLoaded && (
                              <div className="absolute inset-0 z-10 flex items-center justify-center bg-slate-950/80 text-xs text-slate-200">
                                Loading live stream...
                              </div>
                            )}
                            <iframe
                              title={`${satelliteTarget} live feed`}
                              src={activeLiveUrl}
                              className="h-56 w-full"
                              allow="autoplay; fullscreen"
                              referrerPolicy="no-referrer"
                              allowFullScreen
                              onLoad={() => setLiveEmbedLoaded(true)}
                            />
                          </div>
                        ) : (
                          <div className="p-4 text-sm text-slate-300">
                            Live stream URL missing. Switch to Image Feed.
                          </div>
                        )
                      ) : (
                        <div className="p-4 text-sm text-slate-300">
                          Select a telescope to view its live stream.
                        </div>
                      )}
                      <div className="px-4 py-2 text-[11px] text-slate-300 flex items-center justify-between border-t border-white/10 bg-slate-950/80">
                        <span>If the player fails, open the stream directly.</span>
                        <a
                          href={
                            satelliteTarget === "jwst"
                              ? JWST_LIVE_URL
                              : HUBBLE_LIVE_URL
                          }
                          target="_blank"
                          rel="noreferrer"
                          className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[10px] text-slate-200 hover:bg-white/10"
                        >
                          Open in YouTube
                        </a>
                      </div>
                    </div>
                  ) : activeTelescopeFeed?.image ? (
                    <div className="rounded-2xl overflow-hidden border border-white/10">
                      <img
                        src={activeTelescopeFeed.image}
                        alt={activeTelescopeFeed.title}
                        className="h-48 w-full object-cover"
                        loading="lazy"
                      />
                      <div className="px-4 py-3 bg-slate-950/70">
                        <div className="text-sm font-semibold text-slate-100">
                          {activeTelescopeFeed.title}
                        </div>
                        {activeTelescopeFeed.date && (
                          <div className="text-[11px] text-slate-400">
                            {new Date(activeTelescopeFeed.date).toLocaleString()}
                          </div>
                        )}
                        {activeTelescopeFeed.description && (
                          <div className="mt-2 text-[11px] text-slate-300 max-h-16 overflow-hidden">
                            {activeTelescopeFeed.description}
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="text-sm text-slate-400">
                      {telescopeFeedStatus}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Lessons Library Modal */}
      {showLessonsLibrary && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm"
          onClick={(e) => {
            // Close when clicking the backdrop (not the modal content)
            if (e.target === e.currentTarget) {
              setShowLessonsLibrary(false);
            }
          }}
        >
          <div className="w-full max-w-md h-[80vh] rounded-3xl overflow-hidden border border-white/10 shadow-2xl">
            <LessonsLibrary
              visible={showLessonsLibrary}
              onClose={() => setShowLessonsLibrary(false)}
            />
          </div>
        </div>
      )}

      {/* Guided Tour Panel */}
      {showGuidedTour && learningMode && (
        <div className="fixed inset-x-4 bottom-40 z-50 max-h-[50vh] overflow-hidden rounded-2xl border border-white/10 bg-slate-900/95 backdrop-blur-sm shadow-2xl">
          <GuidedTour
            objects={objects}
            location={activeLocation}
            time={time}
            onSelectObject={(obj) => {
              setSelectedId(obj.id);
              setView((v) => ({ ...v, az: obj.az, alt: obj.alt }));
            }}
            onClose={() => setShowGuidedTour(false)}
          />
        </div>
      )}

    </div>
  );
}

// Wrap the app with LearningModeProvider for Teaching Module context
export default function App() {
  return (
    <ErrorBoundary>
      <LearningModeProvider>
        <AppContent />
      </LearningModeProvider>
    </ErrorBoundary>
  );
}

// Simple error boundary for debugging
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, errorInfo) {
    console.error("AstroView Error:", error, errorInfo);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: 40, color: "white", background: "#0f172a", minHeight: "100vh" }}>
          <h1 style={{ color: "#ef4444" }}>Something went wrong</h1>
          <pre style={{ color: "#94a3b8", whiteSpace: "pre-wrap" }}>
            {this.state.error?.message || "Unknown error"}
          </pre>
          <button 
            onClick={() => window.location.reload()}
            style={{ marginTop: 20, padding: "10px 20px", background: "#38bdf8", border: "none", borderRadius: 8, cursor: "pointer" }}
          >
            Reload Page
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
