import * as Astronomy from "astronomy-engine";
import { wrap360 } from "./skyMath";

const BODY_LIST = [
  { id: "Sun", name: "Sun", type: "sun", color: "#fbbf24" },
  { id: "Moon", name: "Moon", type: "moon", color: "#e5e7eb" },
  { id: "Mercury", name: "Mercury", type: "planet", color: "#cbd5e1" },
  { id: "Venus", name: "Venus", type: "planet", color: "#fde68a" },
  { id: "Mars", name: "Mars", type: "planet", color: "#f87171" },
  { id: "Jupiter", name: "Jupiter", type: "planet", color: "#facc15" },
  { id: "Saturn", name: "Saturn", type: "planet", color: "#f59e0b" },
  { id: "Uranus", name: "Uranus", type: "planet", color: "#7dd3fc" },
  { id: "Neptune", name: "Neptune", type: "planet", color: "#60a5fa" },
  { id: "Pluto", name: "Pluto", type: "planet", color: "#94a3b8" }
];

const equatorialOfDateFromRaDec = (time, raHours, decDeg) => {
  const sphere = {
    lat: decDeg,
    lon: raHours * 15,
    dist: 1
  };
  const vec = Astronomy.VectorFromSphere(sphere, time);
  const rot = Astronomy.Rotation_EQJ_EQD(time);
  const eqd = Astronomy.RotateVector(rot, vec);
  return Astronomy.EquatorFromVector(eqd);
};

export const getSolarSystemObjects = (time, observer) =>
  BODY_LIST.map((body) => {
    const equ = Astronomy.Equator(body.id, time, observer, true, true);
    const equJ2000 = Astronomy.Equator(body.id, time, observer, false, true);
    const hor = Astronomy.Horizon(time, observer, equ.ra, equ.dec, "normal");
    const illum = Astronomy.Illumination(body.id, time);

    return {
      id: body.id.toLowerCase(),
      name: body.name,
      type: body.type,
      az: wrap360(hor.azimuth),
      alt: hor.altitude,
      mag: illum.mag,
      ra: equJ2000.ra,
      dec: equJ2000.dec,
      color: body.color
    };
  });

export const getStarObjects = (time, observer, stars) =>
  stars.map((star) => {
    const eqd = equatorialOfDateFromRaDec(time, star.ra, star.dec);
    const hor = Astronomy.Horizon(time, observer, eqd.ra, eqd.dec, "normal");

    return {
      id: star.id,
      name: star.name,
      type: "star",
      az: wrap360(hor.azimuth),
      alt: hor.altitude,
      mag: star.mag,
      ra: star.ra,
      dec: star.dec,
      color: "#ffffff"
    };
  });

export const getDeepSkyObjects = (time, observer, targets) =>
  targets.map((item) => {
    const eqd = equatorialOfDateFromRaDec(time, item.ra, item.dec);
    const hor = Astronomy.Horizon(time, observer, eqd.ra, eqd.dec, "normal");

    return {
      id: item.id,
      name: item.name,
      type: item.type,
      az: wrap360(hor.azimuth),
      alt: hor.altitude,
      mag: item.mag,
      ra: item.ra,
      dec: item.dec,
      color: item.color
    };
  });

export const getConstellationLines = (time, observer, constellations) =>
  constellations.flatMap((group) =>
    group.lines.map((pair, index) => {
      const [start, end] = pair;
      const startEqd = equatorialOfDateFromRaDec(time, start[0], start[1]);
      const endEqd = equatorialOfDateFromRaDec(time, end[0], end[1]);
      const startHor = Astronomy.Horizon(
        time,
        observer,
        startEqd.ra,
        startEqd.dec,
        "normal"
      );
      const endHor = Astronomy.Horizon(
        time,
        observer,
        endEqd.ra,
        endEqd.dec,
        "normal"
      );

      return {
        id: `${group.id}-${index}`,
        name: group.name,
        start: { az: wrap360(startHor.azimuth), alt: startHor.altitude },
        end: { az: wrap360(endHor.azimuth), alt: endHor.altitude }
      };
    })
  );
