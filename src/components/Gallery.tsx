import type React from "react";

interface GalleryProps {
  images: string[];
  onImageClick: (index: number) => void;
  selectedIndex?: number;
}

const Gallery: React.FC<GalleryProps> = ({
  images,
  onImageClick,
  selectedIndex,
}) => {
  if (!images || images.length === 0) {
    return (
      <div className="flex items-center justify-center h-32 bg-gray-100 rounded-lg">
        <p className="text-gray-500 text-sm">No images available</p>
      </div>
    );
  }

  return (
    <div className="flex flex-row gap-4 justify-center mt-4">
      {images.map((src, index) => {
        return (
          <div
            key={`${src}-${index}`}
            className={`relative cursor-pointer rounded-lg overflow-hidden border-2 hover:border-indigo-500 ${
              selectedIndex === index
                ? "border-indigo-500 ring-2 ring-indigo-200"
                : "border-gray-200"
            }`}
            onClick={() => onImageClick(index)}>
            <img
              src={src}
              alt={`Product view ${index + 1}`}
              className="w-full h-24 lg:h-28 object-cover transition-transform duration-200 hover:scale-105"
              loading="lazy"
              decoding="async"
            />
          </div>
        );
      })}
    </div>
  );
};

export default Gallery;
