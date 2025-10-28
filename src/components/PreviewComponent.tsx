import { OrbitControls } from "@react-three/drei";
import { Canvas, useLoader } from "@react-three/fiber";
import type React from "react";
import { useEffect, useState } from "react";
import { Vector3 } from "three";
import { STLLoader } from "three/examples/jsm/loaders/STLLoader.js";
import { useColorContext } from "../context/ColorContext";

const LIMIT_DIMENSIONS_MM = { length: 250, width: 250, height: 310 }; // in mm

interface PreviewComponentProps {
  color: string;
  url: string;
  onExceedsLimit: (limit: boolean) => void;
  onError: (error: string) => void;
  imageUrl?: string; // Optional image URL for photo display
}

interface ModelProps {
  url: string;
  color: number;
  onExceedsLimit: (limit: boolean) => void;
  onError: (error: string) => void;
  onHoverDimensions: (
    dimensions: { width: number; height: number; depth: number } | null,
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

  useEffect(() => {
    if (geometry) {
      geometry.computeBoundingBox();
      const size = geometry.boundingBox?.getSize(new Vector3());
      const center = geometry.boundingBox?.getCenter(new Vector3());

      if (center) {
        geometry.translate(-center.x, -center.y, -center.z); // Center the model
      }

      if (size) {
        const modelExceedsLimit =
          size.x > LIMIT_DIMENSIONS_MM.length ||
          size.y > LIMIT_DIMENSIONS_MM.width ||
          size.z > LIMIT_DIMENSIONS_MM.height;

        onExceedsLimit(modelExceedsLimit);

        if (modelExceedsLimit) {
          onError(
            `Model dimensions exceed our limit of ${LIMIT_DIMENSIONS_MM.length} (L) x ${LIMIT_DIMENSIONS_MM.width} (W) x ${LIMIT_DIMENSIONS_MM.height} (H) mm.`,
          );
        }
      }
    }

    return () => {
      geometry.dispose();
    };
  }, [geometry, onExceedsLimit, onError]);

  return (
    <mesh
      geometry={geometry}
      rotation={[-Math.PI / 2, 0, Math.PI]}
      position={[0, 0, 0]}
      // Added hover events
      onPointerOver={() => {
        if (geometry.boundingBox && onHoverDimensions) {
          const size = geometry.boundingBox.getSize(new Vector3());
          onHoverDimensions({
            width: size.x,
            height: size.z, // height along Z-axis
            depth: size.y,
          });
        }
      }}
      onPointerOut={() => {
        if (onHoverDimensions) onHoverDimensions(null);
      }}>
      <meshStandardMaterial color={color} />
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

  // Added: hover dimensions state
  const [hoveredDimensions, setHoveredDimensions] = useState<{
    width: number;
    height: number;
    depth: number;
  } | null>(null);

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
    <div className="flex flex-col items-center relative">
      <Canvas
        style={{ width: "600px", height: "400px" }}
        camera={{ fov: 50, position: [0, 0, 170] }}
        dpr={Math.min(window.devicePixelRatio, 1)}>
        <ambientLight intensity={0.5} />
        <directionalLight position={[1, 2, 1]} intensity={0.5} />
        <OrbitControls />
        {url && (
          <Model
            url={url}
            color={parseInt(color.replace("#", ""), 16)}
            onExceedsLimit={onExceedsLimit}
            onError={onError}
            onHoverDimensions={setHoveredDimensions} // Added
          />
        )}
      </Canvas>

      {/* Added: show dimensions tooltip on hover */}
      {hoveredDimensions && (
        <div className="absolute top-2 right-2 bg-white p-2 rounded shadow z-50 text-sm">
          <p>Width: {hoveredDimensions.width.toFixed(1)} mm</p>
          <p>Height: {hoveredDimensions.height.toFixed(1)} mm</p>
          <p>Depth: {hoveredDimensions.depth.toFixed(1)} mm</p>
        </div>
      )}
    </div>
  );
};

export default PreviewComponent;
