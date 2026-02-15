import { useEffect, useMemo, useRef, useState } from "react";
import { clamp, projectAzAlt } from "../lib/astro/skyMath";

const drawBackground = (ctx, width, height) => {
  const deep = ctx.createRadialGradient(
    width * 0.4,
    height * 0.35,
    width * 0.1,
    width * 0.5,
    height * 0.5,
    width * 0.85
  );
  deep.addColorStop(0, "#1a1038");
  deep.addColorStop(0.4, "#120f22");
  deep.addColorStop(1, "#0d0d0d");
  ctx.fillStyle = deep;
  ctx.fillRect(0, 0, width, height);

  const glow = ctx.createRadialGradient(
    width * 0.6,
    height * 0.75,
    width * 0.05,
    width * 0.6,
    height * 0.75,
    width * 0.6
  );
  glow.addColorStop(0, "rgba(112, 0, 255, 0.18)");
  glow.addColorStop(0.5, "rgba(60, 35, 140, 0.08)");
  glow.addColorStop(1, "rgba(13, 13, 13, 0)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, width, height);

  ctx.save();
  ctx.translate(width * 0.5, height * 0.45);
  ctx.rotate(-0.35);
  const band = ctx.createLinearGradient(-width, 0, width, 0);
  band.addColorStop(0, "rgba(2, 6, 23, 0)");
  band.addColorStop(0.35, "rgba(176, 176, 176, 0.12)");
  band.addColorStop(0.55, "rgba(112, 0, 255, 0.2)");
  band.addColorStop(0.8, "rgba(176, 176, 176, 0.1)");
  band.addColorStop(1, "rgba(2, 6, 23, 0)");
  ctx.fillStyle = band;
  ctx.fillRect(-width, -height * 0.2, width * 2, height * 0.4);
  ctx.restore();

  const vignette = ctx.createRadialGradient(
    width * 0.5,
    height * 0.5,
    width * 0.2,
    width * 0.5,
    height * 0.5,
    width * 0.9
  );
  vignette.addColorStop(0, "rgba(13, 13, 13, 0)");
  vignette.addColorStop(1, "rgba(13, 13, 13, 0.75)");
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, width, height);
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

const drawObjects = (ctx, objects, view, width, height, selectedId) => {
  const plotted = [];

  objects.forEach((obj) => {
    if (obj.alt < -2) return;

    const point = projectAzAlt(obj.az, obj.alt, view, width, height);
    if (!point) return;

    const baseSize = obj.type === "star" ? clamp(4 - obj.mag * 0.7, 0.6, 3.4) : 4;
    const size = selectedId === obj.id ? baseSize + 2 : baseSize;

    if (obj.type === "satellite") {
      ctx.save();
      ctx.strokeStyle = "rgba(112, 0, 255, 0.6)";
      ctx.lineWidth = 1;
      ctx.shadowColor = "rgba(112, 0, 255, 0.7)";
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.moveTo(point.x - size * 2.5, point.y + size * 2.5);
      ctx.lineTo(point.x + size * 2.5, point.y - size * 2.5);
      ctx.stroke();
      ctx.restore();
    }

    ctx.beginPath();
    ctx.fillStyle = obj.color || "#ffffff";
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
      const labelColor = obj.type === "satellite"
        ? `rgba(112, 0, 255, ${labelAlpha})`
        : obj.type === "star"
          ? `rgba(229, 229, 229, ${labelAlpha})`
          : `rgba(176, 176, 176, ${labelAlpha})`;
      ctx.fillStyle = labelColor;
      ctx.shadowColor = "rgba(2, 6, 23, 0.85)";
      ctx.shadowBlur = 6;
      ctx.fillText(label, point.x + size + 4, point.y - size - 2);
      ctx.restore();
    }

    if (selectedId === obj.id) {
      ctx.strokeStyle = "rgba(248, 250, 252, 0.8)";
      ctx.lineWidth = 1;
      ctx.stroke();
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

    drawBackground(ctx, size.width, size.height);
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
      selectedId
    );
  }, [objects, view, size, selectedId]);

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
    <div ref={containerRef} className="absolute inset-0 z-0">
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
