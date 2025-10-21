import React from "react";

interface GalleryProps {
  images: string[];
  onImageClick: (index: number) => void;
  selectedImageIndex?: number | null;
}

const Gallery: React.FC<GalleryProps> = ({
  images,
  onImageClick,
  selectedImageIndex,
}) => {
  if (!images || images.length === 0) {
    return (
      <div className="flex items-center justify-center h-32 bg-gray-100 rounded-lg">
        <p className="text-gray-500 text-sm">No images available</p>
      </div>
    );
  }

  return (
    <div className="flex flex-row flex-wrap justify-center gap-4 mt-4">
      {images.map((image, index) => (
        <div
          key={index}
          onClick={() => onImageClick(index)}
          className={`relative cursor-pointer rounded-lg overflow-hidden border-2 transition-all duration-200 ${
            selectedImageIndex === index
              ? "border-indigo-500 ring-2 ring-indigo-300"
              : "border-gray-200 hover:border-indigo-400"
          }`}
        >
          <img
            src={image}
            alt={`Product ${index + 1}`}
            className="w-24 h-24 lg:w-28 lg:h-28 object-cover transition-transform duration-200 hover:scale-105"
            loading="lazy"
          />
        </div>
      ))}
    </div>
  );
};

export default Gallery;
