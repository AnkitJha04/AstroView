import * as satellite from "satellite.js";
import { radToDeg, wrap360 } from "./skyMath";

const CACHE_KEY = "astroview.tle.cache";
const CACHE_TTL_MS = 1000 * 60 * 60 * 12;

const FALLBACK_TLES = [
  {
    name: "ISS (ZARYA)",
    line1: "1 25544U 98067A   24040.54668981  .00012877  00000+0  23033-3 0  9992",
    line2: "2 25544  51.6423  53.4510 0003631  82.6266  36.0923 15.50908876440996"
  },
  {
    name: "HUBBLE SPACE TELESCOPE",
    line1: "1 20580U 90037B   24040.20415972  .00001389  00000+0  72408-4 0  9997",
    line2: "2 20580  28.4697  54.1141 0002866  71.5876 288.5357 15.09289063305363"
  },
  {
    name: "JAMES WEBB SPACE TELESCOPE",
    line1: "1 50463U 21130A   24040.01315501  .00000004  00000+0  00000+0 0  9994",
    line2: "2 50463   0.0622  85.6965 0017282  24.8623  31.4586  1.00270029  8708"
  }
];

const parseTle = (text) => {
  const lines = text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  const tleList = [];
  for (let i = 0; i < lines.length - 2; i += 3) {
    const name = lines[i];
    const line1 = lines[i + 1];
    const line2 = lines[i + 2];
    if (!line1?.startsWith("1 ") || !line2?.startsWith("2 ")) continue;
    tleList.push({ name, line1, line2 });
  }
  return tleList;
};

const loadCache = (allowExpired = false) => {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!allowExpired && Date.now() - parsed.timestamp > CACHE_TTL_MS) return null;
    return parsed.data || null;
  } catch (err) {
    return null;
  }
};

const saveCache = (data) => {
  try {
    localStorage.setItem(
      CACHE_KEY,
      JSON.stringify({ timestamp: Date.now(), data })
    );
  } catch (err) {
    // ignore cache errors
  }
};

export const fetchTleGroups = async (groups) => {
  const cached = loadCache();
  if (cached) return cached;

  try {
    const requests = groups.map(async (group) => {
      const response = await fetch(
        `https://celestrak.org/NORAD/elements/gp.php?GROUP=${group}&FORMAT=tle`
      );
      if (!response.ok) throw new Error("TLE fetch failed");
      const text = await response.text();
      return parseTle(text);
    });

    const results = await Promise.allSettled(requests);
    const merged = results
      .flatMap((result) => (result.status === "fulfilled" ? result.value : []))
      .reduce((acc, entry) => {
        if (!acc.some((item) => item.name === entry.name)) {
          acc.push(entry);
        }
        return acc;
      }, []);

    if (merged.length) saveCache(merged);
    return merged.length ? merged : FALLBACK_TLES.slice();
  } catch (err) {
    const stale = loadCache(true);
    return stale?.length ? stale : FALLBACK_TLES.slice();
  }
};

export const fetchTleByCatalog = async (catalogNumbers) => {
  if (!catalogNumbers?.length) return [];
  try {
    const requests = catalogNumbers.map(async (catalog) => {
      const response = await fetch(
        `https://celestrak.org/NORAD/elements/gp.php?CATNR=${catalog}&FORMAT=tle`
      );
      if (!response.ok) throw new Error("TLE fetch failed");
      const text = await response.text();
      return parseTle(text);
    });

    const results = await Promise.allSettled(requests);
    const merged = results.flatMap((result) =>
      result.status === "fulfilled" ? result.value : []
    );
    return merged.length ? merged : FALLBACK_TLES.slice();
  } catch (err) {
    return FALLBACK_TLES.slice();
  }
};

export const fetchTleByName = async (names) => {
  if (!names?.length) return [];
  try {
    const requests = names.map(async (name) => {
      const encoded = encodeURIComponent(name);
      const response = await fetch(
        `https://celestrak.org/NORAD/elements/gp.php?NAME=${encoded}&FORMAT=tle`
      );
      if (!response.ok) throw new Error("TLE fetch failed");
      const text = await response.text();
      return parseTle(text);
    });

    const results = await Promise.allSettled(requests);
    const merged = results.flatMap((result) =>
      result.status === "fulfilled" ? result.value : []
    );
    return merged.length ? merged : FALLBACK_TLES.slice();
  } catch (err) {
    return FALLBACK_TLES.slice();
  }
};

export const getFallbackTles = () => FALLBACK_TLES.slice();

export const getSatelliteObjects = (time, location, tleList, limit = 20) => {
  if (!tleList?.length) return [];

  const observerGd = {
    latitude: (location.lat * Math.PI) / 180,
    longitude: (location.lon * Math.PI) / 180,
    height: (location.altitude || 0) / 1000
  };

  return tleList.slice(0, limit).flatMap((tle) => {
    const satrec = satellite.twoline2satrec(tle.line1, tle.line2);
    const position = satellite.propagate(satrec, time)?.position;
    if (!position) return [];

    const gmst = satellite.gstime(time);
    const positionEcf = satellite.eciToEcf(position, gmst);
    const lookAngles = satellite.ecfToLookAngles(observerGd, positionEcf);

    return {
      id: `sat-${tle.name.toLowerCase().replace(/\s+/g, "-")}`,
      name: tle.name,
      type: "satellite",
      az: wrap360(radToDeg(lookAngles.azimuth)),
      alt: radToDeg(lookAngles.elevation),
      mag: null,
      color: "#7000ff"
    };
  });
};
