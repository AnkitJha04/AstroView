export const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

export const wrap360 = (deg) => ((deg % 360) + 360) % 360;

export const degToRad = (deg) => (deg * Math.PI) / 180;

export const radToDeg = (rad) => (rad * 180) / Math.PI;

export const projectAzAlt = (az, alt, view, width, height) => {
  const azRad = degToRad(az);
  const altRad = degToRad(alt);
  const az0 = degToRad(view.az);
  const alt0 = degToRad(view.alt);

  const deltaAz = azRad - az0;
  const sinAlt = Math.sin(altRad);
  const cosAlt = Math.cos(altRad);
  const sinAlt0 = Math.sin(alt0);
  const cosAlt0 = Math.cos(alt0);

  const cosC = sinAlt0 * sinAlt + cosAlt0 * cosAlt * Math.cos(deltaAz);
  const clampedCosC = Math.min(1, Math.max(-1, cosC));
  const c = Math.acos(clampedCosC);

  const maxAngular = degToRad(view.fov / 2);
  if (c > maxAngular) return null;

  const sinC = Math.sin(c);
  const radius = Math.min(width, height) * 0.5;
  const scale = sinC === 0 ? 0 : (c / maxAngular) * radius;

  const sinA = sinC === 0 ? 0 : (cosAlt * Math.sin(deltaAz)) / sinC;
  const cosA =
    sinC === 0
      ? 1
      : (sinAlt - sinAlt0 * Math.cos(c)) / (cosAlt0 * sinC);

  const theta = Math.atan2(sinA, cosA);
  const cx = width * 0.5;
  const cy = height * 0.5;

  return {
    x: cx + scale * Math.sin(theta),
    y: cy - scale * Math.cos(theta),
    angularDistance: c
  };
};
