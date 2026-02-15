import { useEffect, useMemo, useRef, useState } from "react";
import { clamp, projectAzAlt } from "../lib/astro/skyMath";
import nebulaBg from "../assets/nebula.jpg";

const TYPE_COLORS = {
  sun: "#fbbf24",
  moon: "#e5e7eb",
  planet: "#f59e0b",
  star: "#ffffff",
  satellite: "#7c3aed",
  "deep-sky": "#22d3ee",
  nebula: "#22d3ee",
  galaxy: "#38bdf8",
  cluster: "#38bdf8",
  comet: "#34d399",
  asteroid: "#f97316"
};

const normalizeHex = (value) => {
  if (!value) return null;
  if (value.startsWith("#")) return value;
  return null;
};

const hexToRgb = (value) => {
  const hex = normalizeHex(value);
  if (!hex) return null;
  const clean = hex.replace("#", "");
  if (clean.length !== 6) return null;
  const num = Number.parseInt(clean, 16);
  if (!Number.isFinite(num)) return null;
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255
  };
};

const getObjectColor = (obj) => {
  return obj.color || TYPE_COLORS[obj.type] || "#e2e8f0";
};

const toRgba = (hex, alpha) => {
  const rgb = hexToRgb(hex);
  if (!rgb) return `rgba(226, 232, 240, ${alpha})`;
  return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha})`;
};

const drawBackground = (ctx, width, height, backgroundImage, view) => {
  if (!backgroundImage) return;

  const scale = Math.max(width / backgroundImage.width, height / backgroundImage.height);
  const tileWidth = backgroundImage.width * scale;
  const tileHeight = backgroundImage.height * scale;
  const az = ((view.az % 360) + 360) % 360;
  const alt = clamp(view.alt, -85, 85);
  const xShift = (az / 360) * tileWidth;
  const yShift = -((alt + 90) / 180) * tileHeight;
  const startX = -((xShift % tileWidth) + tileWidth) % tileWidth;
  const startY = -((yShift % tileHeight) + tileHeight) % tileHeight;

  ctx.save();
  ctx.globalAlpha = 0.6;
  for (let x = startX; x < width; x += tileWidth) {
    for (let y = startY; y < height; y += tileHeight) {
      ctx.drawImage(backgroundImage, x, y, tileWidth, tileHeight);
    }
  }
  ctx.restore();
};

const drawConstellations = (ctx, lines, view, width, height) => {
  ctx.strokeStyle = "rgba(148, 163, 184, 0.35)";
  ctx.lineWidth = 1;

  lines.forEach((line) => {
    const start = projectAzAlt(line.start.az, line.start.alt, view, width, height);
    const end = projectAzAlt(line.end.az, line.end.alt, view, width, height);
    if (!start || !end) return;
    ctx.beginPath();
    ctx.moveTo(start.x, start.y);
    ctx.lineTo(end.x, end.y);
    ctx.stroke();
  });
};

const drawHorizon = (ctx, width, height, view) => {
  ctx.beginPath();
  for (let az = 0; az <= 360; az += 4) {
    const point = projectAzAlt(az, 0, view, width, height);
    if (!point) continue;
    if (az === 0) ctx.moveTo(point.x, point.y);
    else ctx.lineTo(point.x, point.y);
  }
  ctx.strokeStyle = "rgba(148, 163, 184, 0.35)";
  ctx.lineWidth = 1;
  ctx.stroke();
};

const drawCardinals = (ctx, width, height, view) => {
  const labels = [
    { az: 0, label: "N" },
    { az: 90, label: "E" },
    { az: 180, label: "S" },
    { az: 270, label: "W" }
  ];

  ctx.fillStyle = "rgba(226, 232, 240, 0.7)";
  ctx.font = "12px \"Inter\", sans-serif";

  labels.forEach((item) => {
    const point = projectAzAlt(item.az, 0, view, width, height);
    if (!point) return;
    ctx.fillText(item.label, point.x - 4, point.y - 6);
  });
};

const drawObjects = (ctx, objects, view, width, height, selectedId, pulse) => {
  const plotted = [];
  const pulseValue = Number.isFinite(pulse) ? pulse : 0;
  const pulseScale = 1 + Math.sin(pulseValue / 220) * 0.12;

  objects.forEach((obj) => {
    if (obj.alt < -2) return;

    const point = projectAzAlt(obj.az, obj.alt, view, width, height);
    if (!point) return;

    const baseSize = obj.type === "star" ? clamp(4 - obj.mag * 0.7, 0.6, 3.4) : 4;
    const size = selectedId === obj.id ? baseSize + 2 : baseSize;

    const baseColor = getObjectColor(obj);

    if (obj.type === "satellite") {
      ctx.save();
      ctx.strokeStyle = toRgba(baseColor, 0.7);
      ctx.lineWidth = 1;
      ctx.shadowColor = toRgba(baseColor, 0.8);
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.moveTo(point.x - size * 2.5, point.y + size * 2.5);
      ctx.lineTo(point.x + size * 2.5, point.y - size * 2.5);
      ctx.stroke();
      ctx.restore();
    }

    ctx.beginPath();
    ctx.fillStyle = baseColor;
    ctx.arc(point.x, point.y, size, 0, Math.PI * 2);
    ctx.fill();

    const label = obj.name || "";
    if (label) {
      let labelAlpha = 0.85;
      if (obj.type === "star") {
        if (obj.mag <= 2) labelAlpha = 0.9;
        else if (obj.mag <= 4) labelAlpha = 0.6;
        else labelAlpha = 0.32;
      } else if (obj.type && /nebula|galaxy|cluster|deep/i.test(obj.type)) {
        labelAlpha = 0.5;
      }

      ctx.save();
      ctx.font = "10px \"Inter\", sans-serif";
      const labelColor = toRgba(baseColor, labelAlpha);
      ctx.fillStyle = labelColor;
      ctx.shadowColor = "rgba(2, 6, 23, 0.85)";
      ctx.shadowBlur = 6;
      ctx.fillText(label, point.x + size + 4, point.y - size - 2);
      ctx.restore();
    }

    if (selectedId === obj.id) {
      ctx.save();
      ctx.strokeStyle = toRgba(baseColor, 0.9);
      ctx.lineWidth = 1.6;
      ctx.shadowColor = toRgba(baseColor, 0.65);
      ctx.shadowBlur = 12;
      ctx.beginPath();
      ctx.arc(point.x, point.y, (size + 6) * pulseScale, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(point.x - (size + 10), point.y);
      ctx.lineTo(point.x + (size + 10), point.y);
      ctx.moveTo(point.x, point.y - (size + 10));
      ctx.lineTo(point.x, point.y + (size + 10));
      ctx.stroke();
      ctx.restore();
    }

    plotted.push({ ...obj, x: point.x, y: point.y, size });
  });

  return plotted;
};

export default function SkyCanvas({ objects, view, onSelect, selectedId, constellations }) {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const [size, setSize] = useState({ width: 0, height: 0 });
  const plottedRef = useRef([]);
  const draggingRef = useRef(false);
  const dragStartRef = useRef({ x: 0, y: 0, az: 0, alt: 0 });
  const [backgroundImage, setBackgroundImage] = useState(null);
  const [pulse, setPulse] = useState(0);

  const handleResize = useMemo(() => {
    const resize = () => {
      if (!containerRef.current) return;
      setSize({
        width: containerRef.current.clientWidth,
        height: containerRef.current.clientHeight
      });
    };
    return resize;
  }, []);

  useEffect(() => {
    handleResize();
    const observer = new ResizeObserver(handleResize);
    if (containerRef.current) observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [handleResize]);

  useEffect(() => {
    const image = new Image();
    image.onload = () => setBackgroundImage(image);
    image.src = nebulaBg;
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || size.width === 0 || size.height === 0) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = size.width * dpr;
    canvas.height = size.height * dpr;
    canvas.style.width = `${size.width}px`;
    canvas.style.height = `${size.height}px`;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.scale(dpr, dpr);

    drawBackground(ctx, size.width, size.height, backgroundImage, view);
    drawHorizon(ctx, size.width, size.height, view);
    if (constellations?.length) {
      drawConstellations(ctx, constellations, view, size.width, size.height);
    }
    drawCardinals(ctx, size.width, size.height, view);
    plottedRef.current = drawObjects(
      ctx,
      objects,
      view,
      size.width,
      size.height,
      selectedId,
      pulse
    );
  }, [objects, view, size, selectedId, constellations, backgroundImage, pulse]);

  useEffect(() => {
    if (!selectedId) return undefined;
    let frameId;
    const tick = (time) => {
      setPulse(time);
      frameId = window.requestAnimationFrame(tick);
    };
    frameId = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(frameId);
  }, [selectedId]);

  const handlePointerDown = (event) => {
    if (event.button !== 0) return;
    const rect = event.currentTarget.getBoundingClientRect();
    draggingRef.current = true;
    dragStartRef.current = {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
      az: view.az,
      alt: view.alt
    };
  };

  const handlePointerMove = (event) => {
    if (!draggingRef.current) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const deltaX = event.clientX - rect.left - dragStartRef.current.x;
    const deltaY = event.clientY - rect.top - dragStartRef.current.y;

    const az = dragStartRef.current.az - deltaX * 0.2;
    const alt = clamp(dragStartRef.current.alt + deltaY * 0.2, -85, 85);
    onSelect({ type: "view", az, alt });
  };

  const handlePointerUp = (event) => {
    if (!draggingRef.current) return;
    draggingRef.current = false;

    const rect = event.currentTarget.getBoundingClientRect();
    const localX = event.clientX - rect.left;
    const localY = event.clientY - rect.top;

    const moved =
      Math.abs(localX - dragStartRef.current.x) > 6 ||
      Math.abs(localY - dragStartRef.current.y) > 6;

    if (moved) return;

    const target = plottedRef.current
      .map((obj) => ({
        obj,
        distance: Math.hypot(obj.x - localX, obj.y - localY)
      }))
      .sort((a, b) => a.distance - b.distance)[0];

    if (target && target.distance < 18) {
      onSelect(target.obj);
    }
  };

  const handleWheel = (event) => {
    event.preventDefault();
    const nextFov = clamp(view.fov + event.deltaY * 0.05, 30, 120);
    onSelect({ type: "view", fov: nextFov });
  };

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 z-0"
      style={{ backgroundImage: `url(${nebulaBg})`, backgroundSize: "cover", backgroundPosition: "center" }}
    >
      <canvas
        ref={canvasRef}
        className="w-full h-full touch-none"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
        onWheel={handleWheel}
      />
    </div>
  );
}
