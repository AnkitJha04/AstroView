import { useCallback, useEffect, useRef, useState } from "react";

export const useGeolocation = () => {
  const [status, setStatus] = useState("idle");
  const [coords, setCoords] = useState(null);
  const [error, setError] = useState(null);
  const watchId = useRef(null);

  const start = useCallback(() => {
    if (!navigator.geolocation) {
      setStatus("unsupported");
      return;
    }

    setStatus("active");
    watchId.current = navigator.geolocation.watchPosition(
      (position) => {
        setCoords({
          lat: position.coords.latitude,
          lon: position.coords.longitude,
          altitude: position.coords.altitude ?? 0,
          accuracy: position.coords.accuracy ?? null
        });
        setError(null);
      },
      (geoError) => {
        setError(geoError.message || "Location unavailable");
        setStatus("denied");
      },
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 10000 }
    );
  }, []);

  useEffect(() =>
    () => {
      if (watchId.current !== null) {
        navigator.geolocation.clearWatch(watchId.current);
      }
    },
  []);

  return { status, coords, error, start };
};
