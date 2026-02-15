import * as satellite from "satellite.js";
import { radToDeg, wrap360 } from "./skyMath";

const CACHE_KEY = "astroview.tle.cache";
const CACHE_TTL_MS = 1000 * 60 * 60 * 12;
const buildTleBaseUrls = () => {
  const raw =
    import.meta.env.VITE_TLE_BASE_URLS ||
    import.meta.env.VITE_TLE_BASE_URL ||
    "";
  const custom = raw
    .split(",")
    .map((value) => value.trim())
    .filter((value) => value && value.startsWith("http"))
    .map((value) => value.replace(/\/+$/, ""));
  const defaults = ["https://celestrak.org", "https://celestrak.com"];
  return [...custom, ...defaults].reduce((acc, url) => {
    if (!acc.includes(url)) acc.push(url);
    return acc;
  }, []);
};

const TLE_BASE_URLS = buildTleBaseUrls();

const buildJsonTleBaseUrls = () => {
  const raw =
    import.meta.env.VITE_TLE_JSON_BASE_URLS ||
    import.meta.env.VITE_TLE_JSON_BASE_URL ||
    "";
  const custom = raw
    .split(",")
    .map((value) => value.trim())
    .filter((value) => value && value.startsWith("http"))
    .map((value) => value.replace(/\/+$/, ""));
  const defaults = ["https://api.tle.ivanstanojevic.me/tle"];
  return [...custom, ...defaults].reduce((acc, url) => {
    if (!acc.includes(url)) acc.push(url);
    return acc;
  }, []);
};

const TLE_JSON_BASE_URLS = buildJsonTleBaseUrls();
const JWST_TLE_URL = import.meta.env.VITE_JWST_TLE_URL || "";
const JWST_TLE_TEXT = import.meta.env.VITE_JWST_TLE_TEXT || "";


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

const mergeTleLists = (base, extra) => {
  const merged = [...base];
  extra.forEach((entry) => {
    const exists = merged.some(
      (item) => item.name === entry.name && item.line1 === entry.line1 && item.line2 === entry.line2
    );
    if (!exists) merged.push(entry);
  });
  return merged;
};

const fetchJwstOverrideTle = async () => {
  const directText = JWST_TLE_TEXT.trim();
  if (directText) {
    const parsed = parseTle(directText);
    return parsed.length ? parsed : [];
  }

  if (!JWST_TLE_URL) return [];
  const response = await fetch(JWST_TLE_URL);
  if (!response.ok) throw new Error("JWST TLE override fetch failed");
  const text = await response.text();
  return parseTle(text);
};

const fetchJsonTleByCatalog = async (catalog) => {
  let lastError;
  for (const baseUrl of TLE_JSON_BASE_URLS) {
    try {
      const response = await fetch(`${baseUrl}/${catalog}`);
      if (!response.ok) throw new Error("TLE JSON fetch failed");
      const payload = await response.json();
      if (!payload?.line1 || !payload?.line2) continue;
      return [
        {
          name: payload.name || `CATALOG ${catalog}`,
          line1: payload.line1,
          line2: payload.line2
        }
      ];
    } catch (err) {
      lastError = err;
    }
  }
  if (lastError) throw lastError;
  return [];
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

const fetchTleText = async (path) => {
  let lastError;
  for (const baseUrl of TLE_BASE_URLS) {
    try {
      const response = await fetch(`${baseUrl}${path}`);
      if (!response.ok) throw new Error("TLE fetch failed");
      return await response.text();
    } catch (err) {
      lastError = err;
    }
  }
  throw lastError || new Error("TLE fetch failed");
};

export const fetchTleGroups = async (groups) => {
  const cached = loadCache();

  const fetchFresh = async () => {
    const requests = groups.map(async (group) => {
      const text = await fetchTleText(
        `/NORAD/elements/gp.php?GROUP=${group}&FORMAT=tle`
      );
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
    return merged;
  };

  if (!cached) {
    try {
      return await fetchFresh();
    } catch (err) {
      const stale = loadCache(true);
      return stale?.length ? stale : [];
    }
  }

  try {
    const fresh = await fetchFresh();
    return fresh.length ? fresh : cached;
  } catch (err) {
    return cached;
  }
};

export const fetchTleByCatalog = async (catalogNumbers) => {
  if (!catalogNumbers?.length) return [];
  const wantsJwst = catalogNumbers.includes(50463);
  try {
    const requests = catalogNumbers.map(async (catalog) => {
      const text = await fetchTleText(
        `/NORAD/elements/gp.php?CATNR=${catalog}&FORMAT=tle`
      );
      return parseTle(text);
    });

    const results = await Promise.allSettled(requests);
    let merged = results.flatMap((result) =>
      result.status === "fulfilled" ? result.value : []
    );
    if (wantsJwst) {
      const override = await fetchJwstOverrideTle();
      if (override.length) merged = mergeTleLists(merged, override);
    }
    if (merged.length) return merged;

    const fallbackResults = await Promise.allSettled(
      catalogNumbers.map((catalog) => fetchJsonTleByCatalog(catalog))
    );
    let fallbackMerged = fallbackResults.flatMap((result) =>
      result.status === "fulfilled" ? result.value : []
    );
    if (wantsJwst) {
      const override = await fetchJwstOverrideTle();
      if (override.length) fallbackMerged = mergeTleLists(fallbackMerged, override);
    }
    return fallbackMerged;
  } catch (err) {
    try {
      const fallbackResults = await Promise.allSettled(
        catalogNumbers.map((catalog) => fetchJsonTleByCatalog(catalog))
      );
      let merged = fallbackResults.flatMap((result) =>
        result.status === "fulfilled" ? result.value : []
      );
      if (wantsJwst) {
        const override = await fetchJwstOverrideTle();
        if (override.length) merged = mergeTleLists(merged, override);
      }
      if (merged.length) return merged;
    } catch (fallbackErr) {
      // ignore fallback errors
    }
    const stale = loadCache(true);
    return stale?.length ? stale : [];
  }
};

export const fetchTleByName = async (names) => {
  if (!names?.length) return [];
  const wantsJwst = names.some((name) => /jwst|webb/i.test(name));
  try {
    const requests = names.map(async (name) => {
      const encoded = encodeURIComponent(name);
      const text = await fetchTleText(
        `/NORAD/elements/gp.php?NAME=${encoded}&FORMAT=tle`
      );
      return parseTle(text);
    });

    const results = await Promise.allSettled(requests);
    let merged = results.flatMap((result) =>
      result.status === "fulfilled" ? result.value : []
    );
    if (wantsJwst) {
      const override = await fetchJwstOverrideTle();
      if (override.length) merged = mergeTleLists(merged, override);
    }
    return merged;
  } catch (err) {
    const stale = loadCache(true);
    return stale?.length ? stale : [];
  }
};

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
