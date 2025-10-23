// PreviewComponent.tsx
import React, { useEffect, useState } from "react";
import { Canvas, useLoader, useThree } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { useColorContext } from "../context/ColorContext";
import * as THREE from "three";
import { STLLoader } from "three/examples/jsm/loaders/STLLoader.js";

const LIMIT_DIMENSIONS_MM = { length: 250, width: 250, height: 310 }; // in mm

interface PreviewComponentProps {
  color: string;
  url: string;
  onExceedsLimit: (limit: boolean) => void;
  onError: (error: string) => void;
  imageUrl?: string;
}

interface ModelProps {
  url: string;
  color: number;
  onExceedsLimit: (limit: boolean) => void;
  onError: (error: string) => void;
  onHoverDimensions?: (
    dims: { width?: number; height?: number; depth?: number } | null,
    position?: { x: number; y: number }
  ) => void;
}

const Model: React.FC<ModelProps> = ({
  url,
  color,
  onExceedsLimit,
  onError,
  onHoverDimensions,
}) => {
  const geometry = useLoader(STLLoader, url);
  const { camera, size: canvasSize } = useThree();
  const [size, setSize] = useState<THREE.Vector3 | null>(null);

  useEffect(() => {
    if (geometry) {
      geometry.computeBoundingBox();
      const modelSize = geometry.boundingBox?.getSize(new THREE.Vector3());
      const center = geometry.boundingBox?.getCenter(new THREE.Vector3());

      if (center) geometry.translate(-center.x, -center.y, -center.z);

      if (modelSize) {
        setSize(modelSize);
        const modelExceedsLimit =
          modelSize.x > LIMIT_DIMENSIONS_MM.length ||
          modelSize.y > LIMIT_DIMENSIONS_MM.width ||
          modelSize.z > LIMIT_DIMENSIONS_MM.height;

        onExceedsLimit(modelExceedsLimit);

        if (modelExceedsLimit) {
          onError(
            `Model dimensions exceed our limit of ${LIMIT_DIMENSIONS_MM.length} (L) x ${LIMIT_DIMENSIONS_MM.width} (W) x ${LIMIT_DIMENSIONS_MM.height} (H) mm.`
          );
        }
      }
    }

    return () => geometry.dispose();
  }, [geometry, onExceedsLimit, onError]);

  if (!size) return null;

  // Convert 3D world coordinates to 2D screen coords
  const getScreenPosition = (point: THREE.Vector3) => {
    const vector = point.clone().project(camera);
    return {
      x: ((vector.x + 1) / 2) * canvasSize.width,
      y: ((-vector.y + 1) / 2) * canvasSize.height,
    };
  };

  const handlePointer = (
    dims: { width?: number; height?: number; depth?: number },
    e: any
  ) => {
    const pos = getScreenPosition(e.point);
    onHoverDimensions?.(dims, pos);
  };

  return (
    <mesh
      geometry={geometry}
      rotation={[-Math.PI / 2, 0, Math.PI]}
      position={[0, 0, 0]}
    >
      <meshStandardMaterial color={color} />

      {/* Width helper */}
      <mesh
        position={[size.x / 2, 0, 0]}
        visible={false}
        onPointerMove={(e) => handlePointer({ width: size.x }, e)}
        onPointerOut={() => onHoverDimensions?.(null)}
      >
        <boxGeometry args={[0.1, size.y, size.z]} />
      </mesh>

      {/* Depth helper */}
      <mesh
        position={[0, size.y / 2, 0]}
        visible={false}
        onPointerMove={(e) => handlePointer({ depth: size.y }, e)}
        onPointerOut={() => onHoverDimensions?.(null)}
      >
        <boxGeometry args={[size.x, 0.1, size.z]} />
      </mesh>

      {/* Height helper */}
      <mesh
        position={[0, 0, size.z / 2]}
        visible={false}
        onPointerMove={(e) => handlePointer({ height: size.z }, e)}
        onPointerOut={() => onHoverDimensions?.(null)}
      >
        <boxGeometry args={[size.x, size.y, 0.1]} />
      </mesh>
    </mesh>
  );
};

const PreviewComponent: React.FC<PreviewComponentProps> = ({
  url,
  onExceedsLimit,
  onError,
  imageUrl,
}) => {
  const { state } = useColorContext();
  const { color } = state;

  const [hoveredDimensions, setHoveredDimensions] = useState<{
    dims?: { width?: number; height?: number; depth?: number };
    position?: { x: number; y: number };
  } | null>(null);

  const handleHoverDimensions = (
    dims: { width?: number; height?: number; depth?: number } | null,
    position?: { x: number; y: number }
  ) => {
    if (dims && position) setHoveredDimensions({ dims, position });
    else setHoveredDimensions(null);
  };

  if (imageUrl) {
    return (
      <div className="flex flex-col items-center">
        <div className="w-full max-w-[600px] h-[400px] bg-gray-100 rounded-lg overflow-hidden">
          <img
            src={imageUrl}
            alt="Product preview"
            className="w-full h-full object-contain"
          />
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex flex-col items-center">
      <Canvas
        style={{ width: "600px", height: "400px" }}
        camera={{ fov: 50, position: [0, 0, 170] }}
        dpr={Math.min(window.devicePixelRatio, 1)}
      >
        <ambientLight intensity={0.5} />
        <directionalLight position={[1, 2, 1]} intensity={0.5} />
        <OrbitControls />
        {url && (
          <Model
            url={url}
            color={parseInt(color.replace("#", ""), 16)}
            onExceedsLimit={onExceedsLimit}
            onError={onError}
            onHoverDimensions={handleHoverDimensions}
          />
        )}
      </Canvas>

      {hoveredDimensions &&
        hoveredDimensions.position &&
        hoveredDimensions.dims && (
          <div
            style={{
              position: "absolute",
              top: hoveredDimensions.position.y,
              left: hoveredDimensions.position.x,
              transform: "translate(10px, 10px)",
              backgroundColor: "rgba(255,255,255,0.9)",
              padding: "6px 10px",
              borderRadius: "8px",
              boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
              pointerEvents: "none",
              zIndex: 9999,
            }}
          >
            {hoveredDimensions.dims.width && (
              <p>Width: {hoveredDimensions.dims.width.toFixed(1)} mm</p>
            )}
            {hoveredDimensions.dims.height && (
              <p>Height: {hoveredDimensions.dims.height.toFixed(1)} mm</p>
            )}
            {hoveredDimensions.dims.depth && (
              <p>Depth: {hoveredDimensions.dims.depth.toFixed(1)} mm</p>
            )}
          </div>
        )}
    </div>
  );
};

export default PreviewComponent;
