import { useCallback, useEffect, useState } from "react";
import { clamp, wrap360 } from "../astro/skyMath";

const getHeading = (event) => {
  if (typeof event.webkitCompassHeading === "number") {
    return wrap360(event.webkitCompassHeading);
  }

  const alpha = event.alpha ?? 0;
  const beta = event.beta ?? 0;
  const gamma = event.gamma ?? 0;

  const x = (beta * Math.PI) / 180;
  const y = (gamma * Math.PI) / 180;
  const z = (alpha * Math.PI) / 180;

  const cX = Math.cos(x);
  const cY = Math.cos(y);
  const cZ = Math.cos(z);
  const sX = Math.sin(x);
  const sY = Math.sin(y);
  const sZ = Math.sin(z);

  const vX = -cZ * sY - sZ * sX * cY;
  const vY = -sZ * sY + cZ * sX * cY;

  let heading = Math.atan2(vX, vY);
  if (heading < 0) heading += 2 * Math.PI;
  return wrap360((heading * 180) / Math.PI);
};

export const useDeviceOrientation = () => {
  const [status, setStatus] = useState("idle");
  const [orientation, setOrientation] = useState(null);

  const start = useCallback(async () => {
    if (typeof window === "undefined" || !window.DeviceOrientationEvent) {
      setStatus("unsupported");
      return;
    }

    try {
      if (typeof DeviceOrientationEvent.requestPermission === "function") {
        const result = await DeviceOrientationEvent.requestPermission();
        if (result !== "granted") {
          setStatus("denied");
          return;
        }
      }
      setStatus("active");
    } catch (err) {
      setStatus("denied");
    }
  }, []);

  useEffect(() => {
    if (status !== "active") return;

    const handleOrientation = (event) => {
      const heading = getHeading(event);
      const pitch = clamp(90 - (event.beta ?? 0), -90, 90);
      const roll = clamp(event.gamma ?? 0, -90, 90);

      setOrientation({ heading, pitch, roll, raw: event });
    };

    window.addEventListener("deviceorientation", handleOrientation, true);
    return () => window.removeEventListener("deviceorientation", handleOrientation);
  }, [status]);

  return { status, orientation, start };
};
