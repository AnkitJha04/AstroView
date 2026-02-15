import { Canvas, useFrame, useLoader, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { clamp, degToRad } from "../lib/astro/skyMath";
import nebulaBg from "../assets/nebula.jpg";

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
    <meshBasicMaterial
      color="#0b1020"
      side={THREE.BackSide}
      transparent
      opacity={0.18}
      depthWrite={false}
    />
  </mesh>
);

const FocusMarker = ({ target }) => {
  const meshRef = useRef(null);
  const { camera } = useThree();

  const position = useMemo(() => {
    if (!target) return null;
    const theta = degToRad(90 - target.alt);
    const phi = degToRad(target.az);
    const radius = 100;
    const x = radius * Math.sin(theta) * Math.sin(phi);
    const y = radius * Math.cos(theta);
    const z = radius * Math.sin(theta) * Math.cos(phi);
    return [x, y, z];
  }, [target]);

  useFrame(({ clock }) => {
    if (!meshRef.current) return;
    const pulse = 0.9 + Math.sin(clock.getElapsedTime() * 3) * 0.12;
    meshRef.current.scale.set(pulse, pulse, pulse);
    meshRef.current.lookAt(camera.position);
  });

  if (!position) return null;
  return (
    <mesh ref={meshRef} position={position}>
      <ringGeometry args={[0.9, 1.35, 40]} />
      <meshBasicMaterial
        color={target.color || "#f8fafc"}
        transparent
        opacity={0.9}
        depthWrite={false}
      />
    </mesh>
  );
};

const NebulaSphere = () => {
  const texture = useLoader(THREE.TextureLoader, nebulaBg);
  useMemo(() => {
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(1, 1);
    texture.needsUpdate = true;
    return null;
  }, [texture]);

  return (
    <mesh>
      <sphereGeometry args={[140, 64, 64]} />
      <meshBasicMaterial
        map={texture}
        side={THREE.BackSide}
        transparent
        opacity={0.6}
        depthWrite={false}
      />
    </mesh>
  );
};

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

const InteractionLayer = ({ objects, view, onViewChange, onSelect }) => {
  const { gl, camera, size } = useThree();
  const dragStart = useRef({ x: 0, y: 0, az: 0, alt: 0 });
  const clickStart = useRef({ x: 0, y: 0, moved: false });
  const dragging = useRef(false);
  const dataRef = useRef({ objects, view, onViewChange, onSelect });
  const sizeRef = useRef(size);
  const cameraRef = useRef(camera);

  useEffect(() => {
    dataRef.current = { objects, view, onViewChange, onSelect };
  }, [objects, view, onViewChange, onSelect]);

  useEffect(() => {
    sizeRef.current = size;
  }, [size]);

  useEffect(() => {
    cameraRef.current = camera;
  }, [camera]);

  useEffect(() => {
    const element = gl.domElement;
    if (!element) return undefined;

    const getScreenPosition = (obj) => {
      if (obj.alt < -2) return null;
      const theta = degToRad(90 - obj.alt);
      const phi = degToRad(obj.az);
      const radius = 100;
      const x = radius * Math.sin(theta) * Math.sin(phi);
      const y = radius * Math.cos(theta);
      const z = radius * Math.sin(theta) * Math.cos(phi);
      const vector = new THREE.Vector3(x, y, z).project(cameraRef.current);
      const screenX = (vector.x * 0.5 + 0.5) * sizeRef.current.width;
      const screenY = (1 - (vector.y * 0.5 + 0.5)) * sizeRef.current.height;
      return { x: screenX, y: screenY };
    };

    const handlePointerDown = (event) => {
      dragging.current = true;
      const currentView = dataRef.current.view;
      dragStart.current = {
        x: event.clientX,
        y: event.clientY,
        az: currentView.az,
        alt: currentView.alt
      };
      clickStart.current = { x: event.clientX, y: event.clientY, moved: false };
      event.target?.setPointerCapture?.(event.pointerId);
    };

    const handlePointerMove = (event) => {
      if (!dragging.current) return;
      const deltaX = event.clientX - dragStart.current.x;
      const deltaY = event.clientY - dragStart.current.y;
      if (Math.abs(event.clientX - clickStart.current.x) > 6 || Math.abs(event.clientY - clickStart.current.y) > 6) {
        clickStart.current.moved = true;
      }
      const az = dragStart.current.az - deltaX * 0.2;
      const alt = clamp(dragStart.current.alt + deltaY * 0.2, -85, 85);
      dataRef.current.onViewChange?.({ az, alt });
    };

    const handlePointerUp = (event) => {
      dragging.current = false;
      event.target?.releasePointerCapture?.(event.pointerId);
      if (clickStart.current.moved || !dataRef.current.onSelect) return;
      const rect = element.getBoundingClientRect();
      const localX = event.clientX - rect.left;
      const localY = event.clientY - rect.top;
      const target = dataRef.current.objects
        .map((obj) => {
          const point = getScreenPosition(obj);
          if (!point) return null;
          return {
            obj,
            distance: Math.hypot(point.x - localX, point.y - localY)
          };
        })
        .filter(Boolean)
        .sort((a, b) => a.distance - b.distance)[0];

      if (target && target.distance < 18) {
        dataRef.current.onSelect(target.obj);
      }
    };

    const handleWheel = (event) => {
      event.preventDefault();
      const currentView = dataRef.current.view;
      const nextFov = clamp(currentView.fov + event.deltaY * 0.05, 30, 120);
      dataRef.current.onViewChange?.({ fov: nextFov });
    };

    element.addEventListener("pointerdown", handlePointerDown);
    element.addEventListener("pointermove", handlePointerMove);
    element.addEventListener("pointerup", handlePointerUp);
    element.addEventListener("pointerleave", handlePointerUp);
    element.addEventListener("wheel", handleWheel, { passive: false });

    return () => {
      element.removeEventListener("pointerdown", handlePointerDown);
      element.removeEventListener("pointermove", handlePointerMove);
      element.removeEventListener("pointerup", handlePointerUp);
      element.removeEventListener("pointerleave", handlePointerUp);
      element.removeEventListener("wheel", handleWheel);
    };
  }, [gl]);

  return null;
};

export default function SkyDome({ objects, view, onViewChange, onSelect, selectedId, isLoading, status }) {
  const focusTarget = useMemo(
    () => objects.find((obj) => obj.id === selectedId) || null,
    [objects, selectedId]
  );
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
        onCreated={({ gl }) => {
          gl.setClearColor(0x000000, 0);
        }}
      >
        <CameraRig view={view} />
        <NebulaSphere />
        <FocusMarker target={focusTarget} />
        <InteractionLayer
          objects={objects}
          view={view}
          onViewChange={onViewChange}
          onSelect={onSelect}
        />
        <SkyShell />
        <SkyPoints objects={objects} />
        <SkyLabels objects={objects} />
      </Canvas>
    </div>
  );
}
