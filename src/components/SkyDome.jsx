import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { clamp, degToRad } from "../lib/astro/skyMath";

const buildPointGeometry = (objects, radius) => {
  const positions = [];
  const colors = [];

  objects.forEach((obj) => {
    if (obj.alt < -5) return;

    const theta = degToRad(90 - obj.alt);
    const phi = degToRad(obj.az);
    const x = radius * Math.sin(theta) * Math.sin(phi);
    const y = radius * Math.cos(theta);
    const z = radius * Math.sin(theta) * Math.cos(phi);

    positions.push(x, y, z);

    const color = new THREE.Color(obj.color || "#ffffff");
    colors.push(color.r, color.g, color.b);
  });

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(positions, 3)
  );
  geometry.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
  return geometry;
};

const SkyPoints = ({ objects }) => {
  const geometry = useMemo(() => buildPointGeometry(objects, 100), [objects]);
  return (
    <points geometry={geometry}>
      <pointsMaterial
        vertexColors
        size={0.8}
        sizeAttenuation
        transparent
        opacity={0.9}
        depthWrite={false}
      />
    </points>
  );
};

const createLabelTexture = (text, color) => {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  const fontSize = 36;
  const padding = 16;
  ctx.font = `600 ${fontSize}px Inter, sans-serif`;
  const width = Math.ceil(ctx.measureText(text).width + padding * 2);
  const height = fontSize + padding * 2;
  canvas.width = width;
  canvas.height = height;
  ctx.font = `600 ${fontSize}px Inter, sans-serif`;
  ctx.fillStyle = "rgba(13, 13, 13, 0.7)";
  ctx.fillRect(0, 0, width, height);
  ctx.fillStyle = color;
  ctx.shadowColor = "rgba(13, 13, 13, 0.9)";
  ctx.shadowBlur = 10;
  ctx.fillText(text, padding, fontSize + padding * 0.4);
  const texture = new THREE.CanvasTexture(canvas);
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.needsUpdate = true;
  return { texture, width, height };
};

const SkyLabels = ({ objects }) => {
  const labels = useMemo(
    () =>
      objects
        .filter((obj) => obj.alt > -2 && obj.name)
        .map((obj) => {
          const theta = degToRad(90 - obj.alt);
          const phi = degToRad(obj.az);
          const radius = 104;
          const x = radius * Math.sin(theta) * Math.sin(phi);
          const y = radius * Math.cos(theta);
          const z = radius * Math.sin(theta) * Math.cos(phi);
          const color = obj.type === "satellite" ? "#7000ff" : obj.type === "star" ? "#e5e5e5" : "#fbbf24";
          const labelTexture = createLabelTexture(obj.name, color);
          if (!labelTexture) return null;
          return {
            id: obj.id,
            position: [x, y, z],
            texture: labelTexture.texture,
            scale: [labelTexture.width * 0.02, labelTexture.height * 0.02, 1]
          };
        })
        .filter(Boolean),
    [objects]
  );

  return labels.map((label) => (
    <sprite key={label.id} position={label.position} scale={label.scale}>
      <spriteMaterial
        map={label.texture}
        transparent
        depthWrite={false}
      />
    </sprite>
  ));
};

const SkyShell = () => (
  <mesh>
    <sphereGeometry args={[120, 48, 48]} />
    <meshBasicMaterial color="#0d0d0d" side={THREE.BackSide} />
  </mesh>
);

const CameraRig = ({ view }) => {
  const { camera } = useThree();
  useFrame(() => {
    camera.rotation.order = "YXZ";
    camera.rotation.y = degToRad(view.az);
    camera.rotation.x = degToRad(-view.alt);
    camera.fov = view.fov;
    camera.updateProjectionMatrix();
  });
  return null;
};

export default function SkyDome({ objects, view, onViewChange, isLoading, status }) {
  const [dragging, setDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0, az: 0, alt: 0 });

  const handlePointerDown = (event) => {
    setDragging(true);
    dragStart.current = {
      x: event.clientX,
      y: event.clientY,
      az: view.az,
      alt: view.alt
    };
  };

  const handlePointerMove = (event) => {
    if (!dragging) return;
    const deltaX = event.clientX - dragStart.current.x;
    const deltaY = event.clientY - dragStart.current.y;
    const az = dragStart.current.az - deltaX * 0.2;
    const alt = clamp(dragStart.current.alt + deltaY * 0.2, -85, 85);
    onViewChange({ az, alt });
  };

  const handlePointerUp = () => {
    setDragging(false);
  };

  return (
    <div className="absolute inset-0 z-0">
      <div className="absolute top-6 left-1/2 z-30 -translate-x-1/2 rounded-full border border-white/10 bg-slate-950/70 px-4 py-2 text-[11px] text-slate-200 backdrop-blur">
        {isLoading ? "Loading 360 sky..." : status}
      </div>
      {isLoading && (
        <div className="absolute inset-0 z-20 flex items-center justify-center">
          <div className="flex items-center gap-3 rounded-full border border-cyan-400/30 bg-slate-950/80 px-5 py-3 text-xs text-cyan-100 backdrop-blur">
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-cyan-200/30 border-t-cyan-200" />
            Syncing starfield
          </div>
        </div>
      )}
      <Canvas
        className="absolute inset-0 z-0"
        camera={{ position: [0, 0, 0.1], fov: view.fov }}
        gl={{ antialias: true, alpha: true }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
      >
        <CameraRig view={view} />
        <SkyShell />
        <SkyPoints objects={objects} />
        <SkyLabels objects={objects} />
      </Canvas>
    </div>
  );
}
